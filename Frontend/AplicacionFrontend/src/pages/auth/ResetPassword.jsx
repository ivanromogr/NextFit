import { useState, useRef, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { resetPassword } from "../../api/endpoints";
import GymButton from "../../components/ui/GymButton";
import GymInput from "../../components/ui/GymInput";
import "../../styles/auth.css";

const invalidMessage = "El enlace de recuperación no es válido o ha caducado.";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const initialToken = params.get("token") || "";
  return <ResetForm key={initialToken} initialToken={initialToken} />;
}

function ResetForm({ initialToken }) {
  const [token, setToken] = useState(initialToken);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const hasToken = Boolean(token);

  const request = useRef({ active: true, pending: false });
  useEffect(() => {
    const current = request.current;
    current.active = true;
    return () => { current.active = false; };
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    if (!request.current.active || request.current.pending) return;
    if (password.length < 8 || password.length > 128) return setError("La contraseña debe tener entre 8 y 128 caracteres.");
    if (password !== confirmation) return setError("Las contraseñas no coinciden.");
    request.current.pending = true;
    setLoading(true); setError("");
    try {
      await resetPassword(token, password);
      if (!request.current.active) return;
      setToken(""); setPassword(""); setConfirmation(""); setDone(true);
    } catch (requestError) {
      if (!request.current.active) return;
      if (requestError.response?.data?.code === "INVALID_RESET_TOKEN" || requestError.response?.status === 400) setError(invalidMessage);
      else setError("No se pudo restablecer la contraseña. Inténtalo de nuevo más tarde.");
    } finally {
      request.current.pending = false;
      if (request.current.active) setLoading(false);
    }
  };

  if (!hasToken && !done) return <InvalidReset />;
  return <div className="auth-root"><div className="auth-card">
    <div className="auth-header"><h1>{done ? "Contraseña restablecida" : "Nueva contraseña"}</h1></div>
    {done ? <><div className="auth-success" role="status">Tu contraseña se ha restablecido. Inicia sesión con tu nueva contraseña.</div><div className="auth-footer"><Link to="/auth/login" className="auth-link">Ir a iniciar sesión</Link></div></> :
      <form className="auth-form" onSubmit={submit}>
        <GymInput id="new-password" label="Nueva contraseña" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
        <GymInput id="confirm-password" label="Confirmar contraseña" type="password" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} autoComplete="new-password" />
        {error && <div className="auth-error" role="alert">{error}</div>}
        <GymButton type="submit" fullWidth loading={loading}>RESTABLECER CONTRASEÑA</GymButton>
      </form>}
  </div></div>;
}

function InvalidReset() { return <div className="auth-root"><div className="auth-card"><div className="auth-error" role="alert">{invalidMessage}</div><div className="auth-footer"><Link to="/forgot-password" className="auth-link">Solicitar un nuevo enlace</Link></div></div></div>; }
