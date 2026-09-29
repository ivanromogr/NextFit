import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { completeAppleOnboarding } from "../../api/endpoints";
import { useAuth } from "../../context/AuthContext";
import GymButton from "../../components/ui/GymButton";
import GymCard from "../../components/ui/GymCard";
import GymInput from "../../components/ui/GymInput";
import { Dumbbell, Trophy } from "lucide-react";
import "../../styles/auth.css";

const errorMessage = (code) => ({
  SOCIAL_EMAIL_REQUIRED: "Apple no ha proporcionado un correo verificable para completar el registro. Intenta de nuevo con una cuenta de Apple que comparta el correo o utiliza otro método de registro.",
  INVALID_PENDING_SOCIAL_AUTH: "La sesión de registro ha caducado o no es válida. Vuelve a iniciar el flujo con Apple.",
  SOCIAL_PROVIDER_MISMATCH: "No se ha podido completar el registro con Apple. Vuelve a iniciar el flujo.",
  EMAIL_ALREADY_IN_USE: "Ya existe una cuenta de NextFit asociada a este correo. Inicia sesión con tu método actual.",
})[code] || "No se ha podido completar el registro con Apple.";

export default function AppleOnboarding() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({
    pendingToken: state?.pendingToken || "",
    role: "",
    nombre: state?.profile?.nombre || "",
    apellido: state?.profile?.apellido || "",
    acceptTerms: false,
    acceptPrivacy: false,
    marketingConsent: false,
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!state?.pendingToken) return <Navigate to="/auth/login" replace />;

  const submit = async (event) => {
    event.preventDefault();
    if (!form.role) return setError("Selecciona el perfil de tu cuenta.");
    if (!form.acceptTerms || !form.acceptPrivacy) return setError("Debes aceptar los Términos y la Política de privacidad.");
    setLoading(true);
    setError("");
    try {
      const { data } = await completeAppleOnboarding(form);
      const session = login(data);
      navigate(session.role === "ENTRENADOR" ? "/entrenador/onboarding" : "/cliente/onboarding", { replace: true });
    } catch (err) {
      setError(errorMessage(err.response?.data?.code));
    } finally {
      setLoading(false);
    }
  };

  return <div className="auth-root"><div className="auth-card">
    <h1 className="auth-title">Completa tu cuenta</h1>
    <p className="auth-subtitle">Elige tu perfil y acepta las condiciones para continuar.</p>
    <form className="auth-form" onSubmit={submit}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <GymCard title="ATLETA" icon={Trophy} selected={form.role === "CLIENTE"} onClick={() => setForm({ ...form, role: "CLIENTE" })} />
        <GymCard title="COACH" icon={Dumbbell} selected={form.role === "ENTRENADOR"} onClick={() => setForm({ ...form, role: "ENTRENADOR" })} />
      </div>
      <GymInput label="Nombre" value={form.nombre} onChange={(event) => setForm({ ...form, nombre: event.target.value })} autoComplete="given-name" />
      <GymInput label="Apellido" value={form.apellido} onChange={(event) => setForm({ ...form, apellido: event.target.value })} autoComplete="family-name" />
      <label><input type="checkbox" checked={form.acceptTerms} onChange={(event) => setForm({ ...form, acceptTerms: event.target.checked })} /> Acepto los <Link to="/terms">Términos de uso</Link></label>
      <label><input type="checkbox" checked={form.acceptPrivacy} onChange={(event) => setForm({ ...form, acceptPrivacy: event.target.checked })} /> Acepto la <Link to="/privacy">Política de privacidad</Link></label>
      <label><input type="checkbox" checked={form.marketingConsent} onChange={(event) => setForm({ ...form, marketingConsent: event.target.checked })} /> Quiero recibir comunicaciones (opcional)</label>
      {error && <div className="auth-error" role="alert">{error}</div>}
      <GymButton fullWidth type="submit" loading={loading}>{loading ? "COMPLETANDO..." : "CONTINUAR"}</GymButton>
    </form>
  </div></div>;
}
