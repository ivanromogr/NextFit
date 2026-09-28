import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loginForm, loginWithGoogle } from "../../api/endpoints";
import { useAuth } from "../../context/AuthContext";
import GymButton from "../../components/ui/GymButton";
import GymInput from "../../components/ui/GymInput";
import { Mail, Lock, ArrowRight } from "lucide-react";
import logoNextFit from "../../assets/logo-nextfit.png";
import "../../styles/auth.css";
import GoogleSignIn from "../../components/auth/GoogleSignIn";


export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const resp = await loginForm(form);

      if (resp.status === 200 && resp.data?.accessToken && resp.data?.user) {
        const session = login(resp.data);
        navigate(session.role === "ENTRENADOR" ? "/entrenador/dashboard" : "/cliente/dashboard");
      } else {
        setError("Error: No se pudieron obtener los datos del usuario.");
      }
    } catch (err) {
      const status = err.response?.status;
      if (status === 401 || status === 404) setError("Credenciales incorrectas.");
      else setError("Error de conexión con el servidor.");
    } finally {
      setLoading(false);
    }
  };
  const handleGoogle = async (credential) => {
    setLoading(true); setError("");
    try { const resp = await loginWithGoogle(credential); const data = resp.data;
      if (data?.accessToken && data?.user) { const session = login(data); navigate(session.role === "ENTRENADOR" ? "/entrenador/dashboard" : "/cliente/dashboard"); }
      else if (data?.status === "LINK_REQUIRED") setError("Ya existe una cuenta de NextFit con este correo. Inicia sesión con tu método habitual para vincular Google desde la configuración de tu cuenta.");
      else if (data?.status === "ONBOARDING_REQUIRED" && data.pendingToken) navigate("/auth/google/onboarding", { state: { pendingToken: data.pendingToken, email: data.email } });
      else setError("No se ha podido iniciar sesión con Google.");
    } catch (err) { setError(err.response?.data?.code === "GOOGLE_AUTH_DISABLED" ? "Inicio de sesión con Google no disponible temporalmente." : "No se ha podido iniciar sesión con Google."); }
    finally { setLoading(false); }
  };

  return (
    <div className="auth-root">
      <div className="auth-card">
        <div className="auth-header">
          <img src={logoNextFit} alt="NEXTFIT" className="auth-logo" />
          <p className="auth-subtitle">SISTEMA DE ENTRENAMIENTO</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <GymInput
            label="Correo Electrónico"
            placeholder="usuario@email.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            icon={Mail}
            autoComplete="email"
          />

          <GymInput
            label="Clave de Acceso"
            type="password"
            placeholder="••••••••"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            icon={Lock}
            autoComplete="current-password"
          />

          {error && <div className="auth-error">{error}</div>}

          <Link to="/forgot-password" className="auth-link" style={{ alignSelf: "flex-end", marginTop: "-4px" }}>
            ¿Olvidaste tu contraseña?
          </Link>

          
          <GymButton fullWidth loading={loading} onClick={handleSubmit}>
            INICIAR SESIÓN
          </GymButton>
          <div style={{ textAlign: "center", color: "rgba(255,255,255,.5)" }}>o</div>
          <GoogleSignIn onCredential={handleGoogle} disabled={loading} />
        </form>

        <div className="auth-footer">
          <p>¿Aún no eres miembro?</p>
          <Link to="/registro" className="auth-link">
            Crear cuenta gratis <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}
