import { useState } from "react";
import { useNavigate, Link } from "react-router-dom"; // Importamos Link
import { registerUser } from "../../api/endpoints";
import GymButton from "../../components/ui/GymButton";
import GymInput from "../../components/ui/GymInput";
import GymCard from "../../components/ui/GymCard";

import { User, Lock, Mail, Dumbbell, Trophy, ArrowRight, Zap } from "lucide-react";

export default function Register() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [form, setForm] = useState({
    nombre: "", apellido: "", email: "", contraseña: "", rol: "CLIENTE",
  });

  const handleChange = (field) => (e) => {
    setForm({ ...form, [field]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const resp = await registerUser(form);

      if (resp && resp.status >= 200 && resp.status < 300) {
        const dataBackend = resp.data || {};
        // Intentamos distintas keys por compatibilidad (clienteId / idCliente / id)
        let idUsuario = (form.rol === "CLIENTE") ? (dataBackend.clienteId || dataBackend.idCliente || dataBackend.id) : (dataBackend.entrenadorId || dataBackend.idEntrenador || dataBackend.id);

        if (idUsuario) localStorage.setItem("registration_userId", idUsuario);

        const ruta = form.rol === "CLIENTE" ? "/cliente/onboarding" : "/entrenador/onboarding";
        navigate(ruta, { state: { userId: idUsuario } });
      }

    } catch (err) {
      if (err.response) {
        // Errores enviados por el servidor (ej: 409 -> usuario existe)
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
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      padding: '20px',
      // El fondo ya viene del index.css, aquí solo aseguramos posición
    }}>
      
      {/* TARJETA PRINCIPAL */}
      <div style={{
        width: '100%',
        maxWidth: '500px',
        padding: '40px',
        borderRadius: '20px',
        // Fondo NEGRO SEMI-TRANSPARENTE (Glassmorphism oscuro)
        backgroundColor: 'rgba(10, 10, 10, 0.95)', 
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 20px 50px rgba(0,0,0,0.8)' // Sombra fuerte para despegarlo del fondo
      }}>
        
        {/* CABECERA */}
        <div style={{ marginBottom: '30px', textAlign: 'left' }}>
          <h1 style={{ 
            fontSize: '3rem', 
            fontWeight: '900', 
            margin: '0', 
            fontStyle: 'italic', 
            lineHeight: '0.9',
            color: 'white' // 👈 IMPORTANTE: Texto blanco
          }}>
            ÚNETE AL <br/>
            <span style={{ color: '#FACC15' }}>TEAM.</span>
          </h1>
          <p style={{ color: '#a1a1aa', marginTop: '10px', fontSize: '1rem' }}>
            Empieza tu transformación hoy mismo.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          
          {/* SELECCIÓN DE ROL */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '10px', color: '#737373', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '1px' }}>
              SELECCIONA TU PERFIL
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
               <GymCard 
                 title="Atleta" 
                 icon={Trophy} 
                 selected={form.rol === "CLIENTE"}
                 onClick={() => setForm({...form, rol: "CLIENTE"})}
               />
               <GymCard 
                 title="Coach" 
                 icon={Dumbbell} 
                 selected={form.rol === "ENTRENADOR"}
                 onClick={() => setForm({...form, rol: "ENTRENADOR"})}
               />
            </div>
          </div>

          {/* Nombre y Apellido */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <GymInput 
              label="Nombre" placeholder="Juan"
              value={form.nombre} onChange={handleChange("nombre")}
            />
            <GymInput 
              label="Apellido" placeholder="Pérez"
              value={form.apellido} onChange={handleChange("apellido")}
            />
          </div>

          <GymInput 
            label="Email" type="email" placeholder="juan@gym.com" icon={Mail}
            value={form.email} onChange={handleChange("email")}
          />

          <GymInput 
            label="Contraseña" type="password" placeholder="Mínimo 6 caracteres" icon={Lock}
            value={form.contraseña} onChange={handleChange("contraseña")}
          />

          {error && (
            <div style={{ 
              padding: '12px', borderRadius: '8px', 
              background: 'rgba(239, 68, 68, 0.1)', 
              border: '1px solid #ef4444', color: '#ef4444',
              marginBottom: '20px', fontSize: '0.9rem', textAlign: 'center'
            }}>
              ⚠️ {error}
            </div>
          )}

          <GymButton fullWidth loading={loading} onClick={handleSubmit}>
            {loading ? "CREANDO CUENTA..." : "COMENZAR AHORA"} <ArrowRight size={20} />
          </GymButton>

        </form>

        {/* LINK LOGIN ARREGLADO */}
        <div style={{ marginTop: '24px', textAlign: 'center', borderTop: '1px solid #262626', paddingTop: '20px' }}>
            <span style={{ color: '#737373', fontSize: '0.9rem' }}>¿Ya tienes cuenta? </span>
            <Link 
                to="/auth/login"
                style={{ 
                    color: '#FACC15', 
                    fontWeight: 'bold', 
                    textDecoration: 'none', 
                    marginLeft: '5px',
                    textTransform: 'uppercase',
                    fontSize: '0.9rem'
                }}
            >
                Inicia sesión aquí
            </Link>
        </div>

      </div>
    </div>
  );
}