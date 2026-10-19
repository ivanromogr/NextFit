import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, RefreshCw, Flag, CheckCircle2, Clock, X } from 'lucide-react';
import { api } from '../../api/endpoints';
import { useAuth } from '../../context/AuthContext';
import './moderation.css';

const reasons = { HARASSMENT: 'Acoso o amenazas', SPAM: 'Spam o publicidad', INAPPROPRIATE: 'Contenido inapropiado', OTHER: 'Otro motivo' };
const statuses = { PENDING: 'Pendiente', CONFIRMED: 'Confirmada', DISMISSED: 'Descartada' };
const actions = { DISMISS: 'Descartar denuncia', CONFIRM: 'Confirmar sin restricción', RESTRICT_CHAT: 'Confirmar y restringir chat', LIFT_RESTRICTION: 'Levantar restricción' };
const date = value => new Date(value).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' });
const reportPath = report => `/api/moderation/reports/${report.reporterId}/${report.messageId}`;

function Attachment({ report }) {
    const [source, setSource] = useState(null);
    const [error, setError] = useState('');
    useEffect(() => {
        let active = true, objectUrl;
        api.get(`${reportPath(report)}/attachment`, { responseType: 'blob' }).then(({ data }) => {
            if (!active) return;
            objectUrl = URL.createObjectURL(data);
            setSource(objectUrl);
        }).catch(() => { if (active) setError('El adjunto no está disponible.'); });
        return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
    }, [report]);
    return error ? <p role="alert">{error}</p> : source ? <img className="moderation-attachment" src={source} alt="Adjunto del mensaje denunciado" /> : <p>Cargando adjunto…</p>;
}

export default function ModerationPage() {
    const { role, userId } = useAuth();
    const [allowed, setAllowed] = useState(null);
    const [accessError, setAccessError] = useState(false);
    const [filter, setFilter] = useState('PENDING');
    const [page, setPage] = useState(0);
    const [queue, setQueue] = useState(null);
    const [queueError, setQueueError] = useState('');
    const [revision, setRevision] = useState(0);
    const [detail, setDetail] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [action, setAction] = useState('DISMISS');
    const [note, setNote] = useState('');
    const [busy, setBusy] = useState(false);
    const [confirm, setConfirm] = useState(false);
    const [showAttachment, setShowAttachment] = useState(false);
    const detailRequest = useRef(0);
    const submitting = useRef(false);
    const dialog = useRef(null);
    const effectiveAction = detail?.status === 'CONFIRMED' && detail?.canLiftRestriction ? 'LIFT_RESTRICTION' : action;
    const base = role === 'ENTRENADOR' ? '/entrenador' : '/cliente';

    const clearAccess = () => { detailRequest.current += 1; setAllowed(false); setQueue(null); setDetail(null); setConfirm(false); };
    useEffect(() => {
        let active = true;
        setAllowed(null); setAccessError(false); setDetail(null); setQueue(null);
        api.get('/api/moderation/access').then(({ data }) => { if (active) setAllowed(data.allowed === true); })
            .catch(() => { if (active) { setAllowed(false); setAccessError(true); } });
        return () => { active = false; detailRequest.current += 1; };
    }, [userId]);
    useEffect(() => {
        if (!allowed) return;
        let active = true;
        setQueue(null); setQueueError('');
        api.get('/api/moderation/reports', { params: { status: filter, page, size: 20 } }).then(({ data }) => {
            if (active) setQueue(data);
        }).catch(err => {
            if (!active) return;
            if (err.response?.status === 403) clearAccess();
            else setQueueError('No se pudieron cargar las denuncias.');
        });
        return () => { active = false; };
    }, [allowed, filter, page, revision]);
    useEffect(() => {
        if (!confirm) return;
        const previous = document.activeElement, element = dialog.current;
        element?.showModal();
        return () => { element?.close(); previous?.focus?.(); };
    }, [confirm]);

    const open = async report => {
        const request = ++detailRequest.current;
        setDetail(null); setDetailLoading(true); setError(''); setNotice(''); setShowAttachment(false); setNote(''); setAction('DISMISS');
        try {
            const { data } = await api.get(reportPath(report));
            if (request === detailRequest.current) setDetail(data);
        } catch (err) {
            if (request === detailRequest.current) {
                if (err.response?.status === 403) clearAccess();
                else setError('No se pudo abrir la denuncia. Actualiza la lista e inténtalo de nuevo.');
            }
        } finally { if (request === detailRequest.current) setDetailLoading(false); }
    };
    const submit = async () => {
        if (!detail || submitting.current) return;
        submitting.current = true; setBusy(true); setError('');
        const request = detailRequest.current;
        try {
            const { data } = await api.post(`${reportPath(detail)}/decisions`, { action: effectiveAction, note: note.trim(), expectedVersion: detail.version });
            if (request === detailRequest.current) {
                setDetail(data); setNotice('Decisión registrada.'); setNote(''); setConfirm(false); setShowAttachment(false); setRevision(value => value + 1);
            }
        } catch (err) {
            if (request !== detailRequest.current) return;
            if (err.response?.status === 403) clearAccess();
            else setError(err.response?.status === 409 ? 'Otra decisión ha cambiado esta denuncia. Cancela y actualízala antes de continuar.' : 'No se pudo guardar la decisión. Inténtalo de nuevo.');
        } finally { submitting.current = false; setBusy(false); }
    };
    const changeFilter = event => {
        detailRequest.current += 1;
        setFilter(event.target.value); setPage(0); setDetail(null); setDetailLoading(false); setError(''); setNotice('');
    };

    return <main className="moderation-page">
        <header className="moderation-header">
            <div><Link to={`${base}/perfil`} className="moderation-back"><ArrowLeft size={17} /> Volver a mi cuenta</Link>
                <h1><ShieldCheck size={28} /> Moderación</h1><p>Contenido denunciado, decisiones y seguimiento.</p></div>
            {allowed && <button className="moderation-button" disabled={busy} onClick={() => { setRevision(value => value + 1); if (detail) open(detail); }}><RefreshCw size={16} /> Actualizar</button>}
        </header>
        {allowed === null ? <p role="status">Comprobando acceso…</p> : !allowed ? <section className="moderation-empty"><ShieldCheck size={36} /><h2>{accessError ? 'No se pudo comprobar el acceso' : 'Acceso restringido'}</h2><p>{accessError ? 'Vuelve a entrar cuando se restablezca la conexión.' : 'Esta sección está disponible solo para responsables de moderación autorizados.'}</p></section> : <>
            <div className="moderation-toolbar"><label htmlFor="moderation-status">Estado</label><select id="moderation-status" value={filter} onChange={changeFilter} disabled={busy}>
                {Object.entries(statuses).map(([value, label]) => <option key={value} value={value}>{label}s</option>)}
            </select><span>{queue ? `${queue.totalElements} denuncias` : 'Cargando…'}</span></div>
            <div className="moderation-grid">
                <section className="moderation-queue" aria-label="Denuncias">
                    {queueError && <p role="alert">{queueError}</p>}
                    {!queue && !queueError && <p role="status">Cargando denuncias…</p>}
                    {queue?.items.length === 0 && <div className="moderation-empty"><CheckCircle2 size={30} /><p>No hay denuncias en este estado.</p></div>}
                    {queue?.items.map(report => <button key={`${report.reporterId}/${report.messageId}`} className={`moderation-report${detail?.reporterId === report.reporterId && detail?.messageId === report.messageId ? ' selected' : ''}`} disabled={busy} onClick={() => open(report)}>
                        <span className="moderation-report-icon"><Flag size={18} /></span><span><strong>{reasons[report.reason] || report.reason}</strong><time dateTime={report.createdAt}>{date(report.createdAt)}</time></span><span className={`moderation-badge ${report.status.toLowerCase()}`}>{statuses[report.status]}</span>
                    </button>)}
                    {queue && <div className="moderation-pagination"><button className="moderation-button" disabled={busy || page === 0} onClick={() => setPage(value => value - 1)}>Anterior</button><span>{page + 1} / {Math.max(1, queue.totalPages)}</span><button className="moderation-button" disabled={busy || page + 1 >= queue.totalPages} onClick={() => setPage(value => value + 1)}>Siguiente</button></div>}
                </section>
                <section className="moderation-detail" aria-label="Detalle de la denuncia">
                    {detailLoading ? <p role="status">Abriendo denuncia…</p> : !detail ? <div className="moderation-empty"><Flag size={32} /><h2>Selecciona una denuncia</h2><p>Revisa el mensaje antes de registrar una decisión.</p></div> : <>
                        <div className="moderation-detail-heading"><h2>{reasons[detail.reason]}</h2><span className={`moderation-badge ${detail.status.toLowerCase()}`}>{statuses[detail.status]}</span></div>
                        <p className="moderation-muted">Denuncia recibida el {date(detail.createdAt)}</p>
                        {detail.evidence ? <article className="moderation-evidence"><h3>Mensaje denunciado</h3><p className="moderation-sender">{detail.evidence.senderName} · {date(detail.evidence.sentAt)}</p><blockquote>{detail.evidence.content || 'Mensaje sin texto'}</blockquote>
                            {detail.evidence.hasAttachment && (showAttachment ? <Attachment report={detail} /> : <button className="moderation-button" onClick={() => setShowAttachment(true)}>Ver adjunto denunciado</button>)}
                        </article> : <p role="alert">El mensaje ya no está disponible.</p>}
                        {detail.restricted && <p className="moderation-restriction">Esta cuenta tiene una restricción de chat activa.</p>}
                        {(detail.status === 'PENDING' || detail.canLiftRestriction) && <form className="moderation-form" onSubmit={event => { event.preventDefault(); setConfirm(true); }}>
                            <h3>{detail.status === 'PENDING' ? 'Registrar decisión' : 'Revisar restricción'}</h3>
                            <label htmlFor="moderation-action">Acción</label><select id="moderation-action" value={detail.status === 'PENDING' ? action : 'LIFT_RESTRICTION'} onChange={event => setAction(event.target.value)} disabled={busy}>
                                {detail.status === 'PENDING' ? <><option value="DISMISS">Descartar denuncia</option><option value="CONFIRM">Confirmar sin restricción</option><option value="RESTRICT_CHAT" disabled={detail.restricted}>Confirmar y restringir chat</option></> : <option value="LIFT_RESTRICTION">Levantar restricción</option>}
                            </select>
                            <p className="moderation-muted">{detail.status !== 'PENDING' ? 'La cuenta podrá volver a usar el chat. Los bloqueos personales se conservan.' : action === 'RESTRICT_CHAT' ? 'La cuenta denunciada no podrá enviar ni recibir mensajes. Podrá seguir accediendo al resto de NextFit.' : action === 'CONFIRM' ? 'Se registra el incumplimiento sin aplicar una nueva restricción.' : 'Se cierra la denuncia sin aplicar una restricción.'}</p>
                            <label htmlFor="moderation-note">Motivo de la decisión</label><textarea id="moderation-note" value={note} onChange={event => setNote(event.target.value)} maxLength={1000} rows={4} placeholder="Explica lo que has revisado y por qué tomas esta decisión." required disabled={busy} />
                            <div className="moderation-form-footer"><span>{note.length}/1000</span><button className="moderation-button primary" type="submit" disabled={!note.trim() || busy}>Revisar y confirmar</button></div>
                        </form>}
                        <section className="moderation-audit"><h3><Clock size={17} /> Historial de decisiones</h3>{detail.audit.length === 0 ? <p className="moderation-muted">Todavía no hay decisiones.</p> : detail.audit.map(entry => <article key={entry.id}><strong>{actions[entry.action]}</strong><p>{entry.note}</p><small>{date(entry.createdAt)} · Moderador {entry.operatorId.slice(0, 8)}</small></article>)}</section>
                    </>}
                    {notice && <p className="moderation-notice" role="status">{notice}</p>}
                    {error && !confirm && <p role="alert">{error}</p>}
                </section>
            </div>
        </>}
        <dialog ref={dialog} className="moderation-dialog" aria-labelledby="moderation-confirm-title" onCancel={event => { event.preventDefault(); if (!busy) setConfirm(false); }}>
            <div className="moderation-detail-heading"><h2 id="moderation-confirm-title">Confirmar decisión</h2><button aria-label="Cerrar" className="moderation-button" disabled={busy} onClick={() => setConfirm(false)}><X size={18} /></button></div>
            <p><strong>{actions[effectiveAction]}</strong></p><p className="moderation-confirm-note">{note}</p><p className="moderation-muted">La decisión y tu cuenta de moderación quedarán registradas en el historial.</p>
            {error && <p role="alert">{error}</p>}
            <div className="moderation-dialog-actions"><button className="moderation-button" disabled={busy} onClick={() => setConfirm(false)}>Cancelar</button><button className="moderation-button primary" disabled={busy} onClick={submit}>{busy ? 'Guardando…' : 'Confirmar decisión'}</button></div>
        </dialog>
    </main>;
}
