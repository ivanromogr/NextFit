import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { registerUser } from "../../api/endpoints";
import { useAuth } from "../../context/AuthContext";
import GymButton from "../../components/ui/GymButton";
import GymInput from "../../components/ui/GymInput";
import GymCard from "../../components/ui/GymCard";
import { Dumbbell, Trophy, ArrowRight, Mail, Lock } from "lucide-react";
import logoNextFit from "../../assets/logo-nextfit.png";
import "../../styles/auth.css";


export default function Register() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    nombre: "", apellido: "", email: "", contrasena: "", rol: "CLIENTE", acceptTerms: false, acceptPrivacy: false, marketingConsent: false,
  });

  const [isNarrow, setIsNarrow] = useState(typeof window !== 'undefined' ? window.innerWidth <= 600 : false);
  useEffect(() => {
    const onResize = () => setIsNarrow(window.innerWidth <= 600);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const handleChange = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.acceptTerms) {
      setError("Debes aceptar los Términos de uso para continuar.");
      return;
    }
    if (!form.acceptPrivacy) {
      setError("Debes aceptar la Política de privacidad para continuar.");
      return;
    }
    setLoading(true);

    try {
      const resp = await registerUser(form);

      if (resp && resp.status >= 200 && resp.status < 300) {
        const session = login(resp.data);
        navigate(session.role === "CLIENTE" ? "/cliente/onboarding" : "/entrenador/onboarding");
      }
    } catch (err) {
      if (err.response) {
        const data = err.response.data;
        setError(typeof data === "string" ? data : (data?.message || "Error al registrar usuario."));
      } else {
        setError("Error de conexión.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-root">
      <div className="auth-card" style={{ maxWidth: 560, padding: isNarrow ? "32px 18px" : "44px 36px" }}>
        <div className="auth-header" style={{ textAlign: "left", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 18 }}>
          <div style={{ flex: 1 }}>
            <h1 style={{
              fontSize: isNarrow ? "2.2rem" : "3rem",
              fontWeight: 900,
              margin: 0,
              fontStyle: "italic",
              lineHeight: 0.9,
              color: "white",
              fontFamily: "'Teko', sans-serif",
              textTransform: "uppercase"
            }}>
              ÚNETE AL <br />
              <span style={{ color: "#FACC15" }}>TEAM.</span>
            </h1>
            <p style={{ color: "rgba(255,255,255,0.45)", marginTop: 10, fontSize: "0.95rem", fontWeight: 600 }}>
              Empieza tu transformación hoy.
            </p>
          </div>

          <div style={{ width: isNarrow ? "120px" : "140px", display: "flex", justifyContent: "flex-end" }}>
            <img src={logoNextFit} alt="NEXTFIT" style={{ width: "100%", height: "auto", filter: "drop-shadow(0 0 15px rgba(250, 204, 21, 0.2))" }} />
          </div>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} style={{ marginTop: 22 }}>
          <div>
            <label style={{ display: "block", marginBottom: 12, color: "rgba(255,255,255,0.45)", fontSize: "0.75rem", fontWeight: 900, letterSpacing: "2px", textTransform: "uppercase" }}>
              SELECCIONA TU PERFIL
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <GymCard
                title="ATLETA"
                icon={Trophy}
                selected={form.rol === "CLIENTE"}
                onClick={() => setForm({ ...form, rol: "CLIENTE" })}
              />
              <GymCard
                title="COACH"
                icon={Dumbbell}
                selected={form.rol === "ENTRENADOR"}
                onClick={() => setForm({ ...form, rol: "ENTRENADOR" })}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: isNarrow ? "1fr" : "1fr 1fr", gap: 12 }}>
            <GymInput label="Nombre" placeholder="Juan" value={form.nombre} onChange={handleChange("nombre")} autoComplete="given-name" />
            <GymInput label="Apellido" placeholder="Pérez" value={form.apellido} onChange={handleChange("apellido")} autoComplete="family-name" />
          </div>

          <GymInput
            label="Email"
            type="email"
            placeholder="juan@gym.com"
            icon={Mail}
            value={form.email}
            onChange={handleChange("email")}
            autoComplete="email"
          />
          <label><input type="checkbox" checked={form.acceptTerms} onChange={e => setForm({...form,acceptTerms:e.target.checked})} /> He leído y acepto los <Link to="/terms">Términos de uso</Link></label>
          <label><input type="checkbox" checked={form.acceptPrivacy} onChange={e => setForm({...form,acceptPrivacy:e.target.checked})} /> He leído y acepto la <Link to="/privacy">Política de privacidad</Link></label>
          <label><input type="checkbox" checked={form.marketingConsent} onChange={e => setForm({...form,marketingConsent:e.target.checked})} /> Quiero recibir comunicaciones de NextFit (opcional)</label>

          <GymInput
            label="Contraseña"
            type="password"
            placeholder="Mínimo 6 caracteres"
            icon={Lock}
            value={form.contrasena}
            onChange={handleChange("contrasena")}
            autoComplete="new-password"
          />

          {error && <div className="auth-error">⚠️ {error}</div>}

          <GymButton fullWidth loading={loading} onClick={handleSubmit}>
            {loading ? "CREANDO CUENTA..." : "COMENZAR AHORA"} <ArrowRight size={20} />
          </GymButton>
        </form>

        <div className="auth-footer">
          <p style={{ marginBottom: 0 }}>
            ¿Ya tienes cuenta?{" "}
            <Link to="/auth/login" className="auth-link" style={{ letterSpacing: "0.5px" }}>
              Inicia sesión aquí
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
