import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSessions, logoutAllSessions, revokeSession } from "../../api/endpoints";
import { useAuth } from "../../context/AuthContext";

const formatDate = (value) => value ? new Date(value).toLocaleString() : "No disponible";
const clientLabel = (clientType) => clientType === "MOBILE" ? "Móvil" : "Web";

export default function SesionesActivas() {
  const [sessions, setSessions] = useState([]);
  const [message, setMessage] = useState("");
  const { clearLocalSession } = useAuth();
  const navigate = useNavigate();
  const load = async () => {
    try { const response = await getSessions(); setSessions(Array.isArray(response.data) ? response.data : []); }
    catch { setMessage("No se pudieron cargar las sesiones activas"); }
  };
  useEffect(() => {
    let mounted = true;
    getSessions().then((response) => { if (mounted) setSessions(Array.isArray(response.data) ? response.data : []); })
      .catch(() => { if (mounted) setMessage("No se pudieron cargar las sesiones activas"); });
    return () => { mounted = false; };
  }, []);
  const revoke = async (familyId) => {
    try { await revokeSession(familyId); await load(); }
    catch { setMessage("No se pudo cerrar esa sesión"); }
  };
  const logoutAll = async () => {
    if (!window.confirm("¿Cerrar todas las sesiones activas?")) return;
    try { await logoutAllSessions(); clearLocalSession(); navigate("/auth/login", { replace: true }); }
    catch { setMessage("No se pudieron cerrar todas las sesiones"); }
  };
  return <section aria-labelledby="active-sessions-title">
    <h2 id="active-sessions-title">Sesiones activas</h2>
    <p>Por seguridad, no se muestra ningún identificador ni token de sesión.</p>
    {message && <p role="status">{message}</p>}
    <ul>{sessions.map((session) => <li key={session.familyId}>
      <strong>{clientLabel(session.clientType)}</strong>
      <span> Inicio: {formatDate(session.createdAt)}. Expira: {formatDate(session.expiresAt)}.</span>
      <button type="button" onClick={() => revoke(session.familyId)}>Cerrar sesión</button>
    </li>)}</ul>
    <button type="button" onClick={logoutAll}>Cerrar todas las sesiones</button>
  </section>;
}
