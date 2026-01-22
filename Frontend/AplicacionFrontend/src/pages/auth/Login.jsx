import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loginForm } from "../../api/endpoints";
import GymButton from "../../components/ui/GymButton";
import GymInput from "../../components/ui/GymInput";
import { Mail, Lock, ArrowRight } from "lucide-react";
import logoNextFit from "../../assets/logo-nextfit.png";
import "../../styles/auth.css";


export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const resp = await loginForm(form);

      if (resp.status === 200 && resp.data?.id) {
        const { role, id } = resp.data;

        localStorage.setItem("registration_userId", id);
        if (role === "cliente") localStorage.setItem("clienteId", id);
        else if (role === "entrenador") localStorage.setItem("entrenadorId", id);

        navigate(role === "entrenador" ? "/entrenador/dashboard" : "/cliente/dashboard");
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

          
          <GymButton fullWidth loading={loading} onClick={handleSubmit}>
            INICIAR SESIÓN
          </GymButton>
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
