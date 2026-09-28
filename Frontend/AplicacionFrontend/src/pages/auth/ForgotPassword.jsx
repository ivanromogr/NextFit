import { useState } from "react";
import { Link } from "react-router-dom";
import { requestPasswordReset } from "../../api/endpoints";
import GymButton from "../../components/ui/GymButton";
import GymInput from "../../components/ui/GymInput";
import "../../styles/auth.css";

const neutralMessage = "Si existe una cuenta asociada a ese correo, recibirás instrucciones para restablecer tu contraseña.";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await requestPasswordReset(email.trim());
      setSent(true);
    } catch {
      setError("No se pudo procesar la solicitud. Inténtalo de nuevo más tarde.");
    } finally { setLoading(false); }
  };

  return <div className="auth-root"><div className="auth-card">
    <div className="auth-header"><h1>Recupera tu contraseña</h1><p className="auth-subtitle">TE ENVIAREMOS UN ENLACE SEGURO</p></div>
    {sent ? <div className="auth-success" role="status">{neutralMessage}</div> : <form className="auth-form" onSubmit={submit}>
      <GymInput id="forgot-email" label="Correo electrónico" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="usuario@email.com" />
      {error && <div className="auth-error" role="alert">{error}</div>}
      <GymButton type="submit" fullWidth loading={loading}>ENVIAR INSTRUCCIONES</GymButton>
    </form>}
    <div className="auth-footer"><Link to="/auth/login" className="auth-link">Volver a iniciar sesión</Link></div>
  </div></div>;
}
