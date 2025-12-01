import { useState } from "react";
import { Link } from "react-router-dom"; // 👈 IMPORTANTE: Usamos Link
import { loginForm } from "../../api/endpoints";
import GymButton from "../../components/ui/GymButton";
import GymInput from "../../components/ui/GymInput";
import { Mail, Lock, Zap, ArrowRight } from "lucide-react";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const resp = await loginForm(form);
      if (resp.status === 200 || resp.ok) {
         // Aquí rediriges al dashboard
         window.location.href = "/cliente/dashboard"; // Forzamos recarga para asegurar limpieza
      } else {
         setError("Credenciales incorrectas");
      }
    } catch (err) {
      setError("No se pudo conectar con el servidor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      padding: '20px'
    }}>
      
      {/* TARJETA DE LOGIN */}
      <div style={{
        width: '100%',
        maxWidth: '400px',
        padding: '40px 30px',
        // Fondo semi-transparente estilo cristal
        backgroundColor: 'rgba(20, 20, 20, 0.95)', 
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '20px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8)', // Sombra profunda
        backdropFilter: 'blur(10px)'
      }}>

        {/* LOGO SUPERIOR */}
        <div style={{ textAlign: 'center', marginBottom: '35px' }}>
          <div style={{ 
            display: 'inline-flex', padding: '12px', 
            borderRadius: '50%', background: 'rgba(250, 204, 21, 0.1)',
            marginBottom: '15px', border: '1px solid rgba(250, 204, 21, 0.3)'
          }}>
             <Zap size={32} color="#FACC15" fill="#FACC15" />
          </div>
          
          {/* Título en BLANCO para que se lea */}
          <h1 style={{ 
            margin: 0, fontSize: '2.8rem', lineHeight: 1, 
            color: 'white', fontStyle: 'italic' 
          }}>
            NETX<span style={{ color: '#FACC15' }}>FIT</span>
          </h1>
          <p style={{ color: '#737373', fontSize: '0.9rem', marginTop: '8px', fontWeight: '500' }}>
            SISTEMA DE ENTRENAMIENTO
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <GymInput 
            label="Correo Electrónico"
            placeholder="usuario@email.com"
            value={form.email}
            onChange={(e) => setForm({...form, email: e.target.value})}
            icon={Mail}
          />
          
          <GymInput 
            label="Clave de Acceso"
            type="password"
            placeholder="••••••••"
            value={form.password}
            onChange={(e) => setForm({...form, password: e.target.value})}
            icon={Lock}
          />

          {error && (
            <div style={{ 
              color: '#ef4444', textAlign: 'center', marginBottom: '15px', 
              fontSize: '0.9rem', padding: '10px', background: 'rgba(239, 68, 68, 0.1)',
              borderRadius: '8px', border: '1px solid #ef4444'
            }}>
              {error}
            </div>
          )}

          <div style={{ marginTop: '10px' }}>
            <GymButton fullWidth loading={loading} onClick={handleSubmit}>
              INICIAR SESIÓN
            </GymButton>
          </div>
        </form>

        {/* ENLACE DE REGISTRO ARREGLADO */}
        <div style={{ marginTop: '30px', textAlign: 'center', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <p style={{ color: '#a3a3a3', fontSize: '0.9rem', marginBottom: '10px' }}>
            ¿Aún no eres miembro?
          </p>
          
          {/* Usamos el componente Link para evitar errores de navegación */}
          <Link 
            to="/registro" 
            style={{ 
              textDecoration: 'none',
              color: '#FACC15', 
              fontWeight: 'bold', 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '6px',
              textTransform: 'uppercase',
              fontSize: '0.9rem',
              letterSpacing: '1px'
            }}
          >
            Crear cuenta gratis <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}