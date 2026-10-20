import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSessions, logoutAllSessions, revokeSession } from "../../api/endpoints";
import { useAuth } from "../../context/AuthContext";
import useAccountList from "../../hooks/useAccountList";

const formatDate = (value) => value && Number.isFinite(new Date(value).getTime())
  ? new Date(value).toLocaleString() : "No disponible";
const clientLabel = (type) => type === "MOBILE" ? "Móvil" : type === "WEB" ? "Web" : "Otro dispositivo";
const loadSessions = async () => {
  const response = await getSessions();
  if (!Array.isArray(response.data) || response.data.some(session => !session || typeof session.familyId !== 'string')) {
    throw new Error('Invalid sessions response');
  }
  return response.data;
};

export default function SesionesActivas() {
  const { userId, clearLocalSession } = useAuth();
  return <SessionList key={userId || 'anonymous'} userId={userId} clearLocalSession={clearLocalSession} />;
}

function SessionList({ userId, clearLocalSession }) {
  const { data: sessions, loading, error: loadError, refresh } = useAccountList(userId, loadSessions);
  const [message, setMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(false);
  const request = useRef({ active: true, busy: false });
  const navigate = useNavigate();
  useEffect(() => {
    const current = request.current;
    current.active = true;
    return () => { current.active = false; };
  }, []);

  const begin = () => {
    if (request.current.busy || !request.current.active) return false;
    request.current.busy = true;
    setBusy(true);
    setMessage('');
    setActionError('');
    return true;
  };
  const finish = () => {
    request.current.busy = false;
    if (request.current.active) setBusy(false);
  };
  const revoke = async (familyId) => {
    if (!begin()) return;
    try {
      await revokeSession(familyId);
      if (!request.current.active) return;
      setMessage('Se ha cerrado la sesión seleccionada.');
      refresh();
    } catch {
      if (request.current.active) setActionError('No se pudo cerrar esa sesión. Inténtalo de nuevo.');
    } finally { finish(); }
  };
  const logoutAll = async () => {
    if (request.current.busy || !window.confirm("¿Cerrar todas las sesiones activas?")) return;
    if (!begin()) return;
    try {
      await logoutAllSessions();
      if (!request.current.active) return;
      clearLocalSession();
      navigate("/auth/login", { replace: true });
    } catch {
      if (request.current.active) setActionError('No se pudieron cerrar todas las sesiones. Inténtalo de nuevo.');
    } finally { finish(); }
  };
  return <section aria-labelledby="active-sessions-title">
    <h2 id="active-sessions-title">Sesiones activas</h2>
    <p>Revisa tus accesos desde la web y el móvil. No se muestran identificadores ni tokens.</p>
    {message && <p role="status">{message}</p>}
    {actionError && <p role="alert">{actionError}</p>}
    {loading && <p role="status">Cargando sesiones…</p>}
    {loadError && <div role="alert">
      <p>No se pudieron cargar las sesiones activas.</p>
      <button type="button" onClick={refresh} disabled={busy}>Reintentar sesiones</button>
    </div>}
    {!loading && !loadError && sessions.length === 0 && <p>No hay sesiones activas.</p>}
    <ul>{sessions.map((session) => <li key={session.familyId}>
      <strong>{clientLabel(session.clientType)}</strong>
      <span> Inicio: {formatDate(session.createdAt)}. Expira: {formatDate(session.expiresAt)}.</span>
      <button type="button" disabled={busy} onClick={() => revoke(session.familyId)}>Cerrar sesión</button>
    </li>)}</ul>
    <button type="button" disabled={busy} onClick={logoutAll}>{busy ? 'Procesando…' : 'Cerrar todas las sesiones'}</button>
  </section>;
}
