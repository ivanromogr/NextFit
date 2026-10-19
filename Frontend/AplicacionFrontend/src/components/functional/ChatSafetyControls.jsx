import React, { useEffect, useRef, useState } from 'react';
import { Shield, Ban, X } from 'lucide-react';
import { api } from '../../api/endpoints';
import './chat-safety.css';

const reasons = [['HARASSMENT', 'Acoso o amenazas'], ['SPAM', 'Spam o publicidad'], ['INAPPROPRIATE', 'Contenido inapropiado'], ['OTHER', 'Otro motivo']];

export default function ChatSafetyControls({ otherId, onStateChange, reportMessageId, onCloseReport, revision = 0 }) {
    const [state, setState] = useState(null);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [busy, setBusy] = useState(false);
    const [confirmBlock, setConfirmBlock] = useState(false);
    const [reason, setReason] = useState('HARASSMENT');
    const dialog = useRef(null);
    const generation = useRef(0);
    const requests = useRef(0);
    const saving = useRef(false);
    const [retry, setRetry] = useState(0);
    const open = confirmBlock || !!reportMessageId;

    useEffect(() => {
        let active = true;
        generation.current += 1;
        setBusy(false); setState(null); setError(''); setNotice(''); setConfirmBlock(false);
        onStateChange(null);
        const load = () => {
            if (saving.current) return;
            const request = ++requests.current;
            return api.get(`/api/chat/safety/${otherId}`).then(({ data }) => {
            if (active && request === requests.current) { setState(data); onStateChange(data); setError(''); }
        }).catch(() => {
            if (active && request === requests.current) { setState(null); setError('No se pudo comprobar el estado del chat.'); onStateChange(null); }
        });
        };
        load();
        window.addEventListener('focus', load);
        return () => { active = false; generation.current += 1; window.removeEventListener('focus', load); };
    }, [otherId, onStateChange, revision, retry]);

    useEffect(() => {
        if (!open) return;
        const previous = document.activeElement;
        const element = dialog.current;
        element?.showModal();
        return () => { element?.close(); previous?.focus?.(); };
    }, [open]);

    const close = () => { if (!busy) { setConfirmBlock(false); onCloseReport(); } };
    const submit = async () => {
        const current = generation.current;
        requests.current += 1; saving.current = true;
        setBusy(true); setError('');
        try {
            if (reportMessageId) {
                await api.post(`/api/chat/messages/${reportMessageId}/reports`, { reason });
                if (current === generation.current) { setNotice('Denuncia registrada. Puedes bloquear el chat si necesitas dejar de recibir mensajes.'); onCloseReport(); }
            } else {
                const method = state?.blockedByMe ? 'delete' : 'put';
                const { data } = await api[method](`/api/chat/blocks/${otherId}`);
                if (current === generation.current) { setState(data); onStateChange(data); setConfirmBlock(false); setNotice(data.blockedByMe ? 'Chat bloqueado. El historial se conserva.' : 'Has desbloqueado el chat.'); }
            }
        } catch {
            if (current === generation.current) setError('No se pudo guardar el cambio. Inténtalo de nuevo.');
        } finally { saving.current = false; if (current === generation.current) setBusy(false); }
    };

    return <section className="chat-safety" aria-label="Seguridad del chat">
        <div className="chat-safety-bar">
            <span><Shield size={16} /> Seguridad del chat</span>
            <button type="button" disabled={!state || busy} onClick={() => { setError(''); setConfirmBlock(true); }}>
                <Ban size={15} /> {state?.blockedByMe ? 'Desbloquear' : 'Bloquear chat'}
            </button>
        </div>
        {state && !state.canSend && <p className="chat-safety-muted">{state.blockedByMe ? 'Has bloqueado este chat. Desbloquéalo para volver a escribir.' : 'Esta conversación no admite nuevos mensajes.'}</p>}
        {notice && <p role="status">{notice}</p>}
        {error && !open && <p role="alert">{error} {!state && <button type="button" onClick={() => setRetry(value => value + 1)}>Reintentar</button>}</p>}
        <dialog ref={dialog} aria-labelledby="chat-safety-title" className="chat-safety-dialog" onCancel={event => { event.preventDefault(); close(); }}>
            <div className="chat-safety-dialog-heading">
                <h2 id="chat-safety-title">{reportMessageId ? 'Denunciar mensaje' : state?.blockedByMe ? 'Desbloquear chat' : 'Bloquear chat'}</h2>
                <button type="button" aria-label="Cerrar" disabled={busy} onClick={close}><X size={20} /></button>
            </div>
            {reportMessageId ? <>
                <p>Selecciona el motivo. La denuncia queda registrada sin avisar a la otra persona.</p>
                <label htmlFor="chat-report-reason">Motivo</label>
                <select id="chat-report-reason" value={reason} onChange={event => setReason(event.target.value)} disabled={busy}>
                    {reasons.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
            </> : <p>{state?.blockedByMe ? 'Podrás volver a intercambiar mensajes si la conversación sigue disponible.' : 'Ninguno de los dos podrá enviar nuevos mensajes en este chat. El historial se conserva y puedes desbloquearlo cuando quieras.'}</p>}
            {error && <p role="alert">{error}</p>}
            <div className="chat-safety-dialog-actions">
                <button type="button" disabled={busy} onClick={close}>Cancelar</button>
                <button className="chat-safety-primary" type="button" disabled={busy} onClick={submit}>{busy ? 'Guardando…' : reportMessageId ? 'Enviar denuncia' : 'Confirmar'}</button>
            </div>
        </dialog>
    </section>;
}
