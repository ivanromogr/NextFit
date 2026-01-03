import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom"; 
import { registerUser } from "../../api/endpoints";
import GymButton from "../../components/ui/GymButton";
import GymInput from "../../components/ui/GymInput";
import GymCard from "../../components/ui/GymCard";

import { Dumbbell, Trophy, ArrowRight, Mail, Lock } from "lucide-react";
// ✅ IMPORTAMOS EL LOGO
import logoNextFit from '../../assets/logo-nextfit.png';

export default function Register() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [form, setForm] = useState({
    nombre: "", apellido: "", email: "", contraseña: "", rol: "CLIENTE",
  });

  // Responsive
  const [isNarrow, setIsNarrow] = useState(typeof window !== 'undefined' ? window.innerWidth <= 600 : false);
  useEffect(() => {
    const onResize = () => setIsNarrow(window.innerWidth <= 600);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

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
        let idUsuario = (form.rol === "CLIENTE") ? (dataBackend.clienteId || dataBackend.idCliente || dataBackend.id) : (dataBackend.entrenadorId || dataBackend.idEntrenador || dataBackend.id);

        if (idUsuario) localStorage.setItem("registration_userId", idUsuario);

        const ruta = form.rol === "CLIENTE" ? "/cliente/onboarding" : "/entrenador/onboarding";
        navigate(ruta, { state: { userId: idUsuario } });
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

  // --- ESTILOS DE ALINEACIÓN ---
  const headerContainerStyle = {
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center', // Centrado verticalmente para que queden a la misma altura
      marginBottom: '40px',
      flexDirection: isNarrow ? 'column-reverse' : 'row',
      gap: isNarrow ? '20px' : '0'
  };

  // Amarillo original de tu app
  const brandYellow = '#FACC15'; 

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      padding: '20px',
      background: '#000' 
    }}>
      
      {/* TARJETA PRINCIPAL */}
      <div style={{
        width: '100%',
        maxWidth: '550px',
        padding: '50px',
        borderRadius: '30px',
        backgroundColor: '#0a0a0a', 
        border: '1px solid #222',
        boxShadow: '0 20px 60px rgba(0,0,0,0.9)'
      }}>
        
        {/* CABECERA ALINEADA */}
        <div style={headerContainerStyle}>
          
          {/* TÍTULO A LA IZQUIERDA */}
          <div style={{ flex: 1 }}>
            <h1 style={{ 
              fontSize: '3rem', 
              fontWeight: '900', 
              margin: '0', 
              fontStyle: 'italic', 
              lineHeight: '0.9',
              color: 'white',
              fontFamily: "'Teko', sans-serif",
              textTransform: 'uppercase'
            }}>
              ÚNETE AL <br/>
              <span style={{ color: brandYellow }}>TEAM.</span>
            </h1>
            <p style={{ color: '#666', marginTop: '10px', fontSize: '0.95rem', fontWeight:'500' }}>
              Empieza tu transformación hoy.
            </p>
          </div>

          {/* LOGO A LA DERECHA */}
          <div style={{ width: isNarrow ? '100%' : '100px', display:'flex', justifyContent: isNarrow ? 'center' : 'flex-end' }}>
            <img 
                src={logoNextFit} 
                alt="NEXTFIT" 
                style={{ 
                    width: '200%', 
                    height: 'auto', 
                    objectFit: 'contain',
                    // Sombra sutil con el amarillo original
                    filter: `drop-shadow(0 0 15px rgba(250, 204, 21, 0.2))` 
                }} 
            />
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          
          {/* SELECCIÓN DE ROL */}
          <div style={{ marginBottom: '30px' }}>
            <label style={{ display: 'block', marginBottom: '12px', color: '#444', fontSize: '0.75rem', fontWeight: '800', letterSpacing: '2px', textTransform:'uppercase' }}>
              SELECCIONA TU PERFIL
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
               <GymCard 
                 title="ATLETA" 
                 icon={Trophy} 
                 selected={form.rol === "CLIENTE"}
                 onClick={() => setForm({...form, rol: "CLIENTE"})}
               />
               <GymCard 
                 title="COACH" 
                 icon={Dumbbell} 
                 selected={form.rol === "ENTRENADOR"}
                 onClick={() => setForm({...form, rol: "ENTRENADOR"})}
               />
            </div>
          </div>

          {/* INPUTS */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom:'15px' }}>
            <GymInput 
              label="Nombre" placeholder="Juan"
              value={form.nombre} onChange={handleChange("nombre")}
            />
            <GymInput 
              label="Apellido" placeholder="Pérez"
              value={form.apellido} onChange={handleChange("apellido")}
            />
          </div>

          <div style={{marginBottom:'15px'}}>
            <GymInput 
                label="Email" type="email" placeholder="juan@gym.com" icon={Mail}
                value={form.email} onChange={handleChange("email")}
            />
          </div>

          <div style={{marginBottom:'30px'}}>
            <GymInput 
                label="Contraseña" type="password" placeholder="Mínimo 6 caracteres" icon={Lock}
                value={form.contraseña} onChange={handleChange("contraseña")}
            />
          </div>

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

        {/* FOOTER */}
        <div style={{ marginTop: '30px', textAlign: 'center', borderTop: '1px solid #222', paddingTop: '25px' }}>
            <span style={{ color: '#666', fontSize: '0.9rem' }}>¿Ya tienes cuenta? </span>
            <Link 
                to="/auth/login"
                style={{ 
                    color: brandYellow, 
                    fontWeight: '800', 
                    textDecoration: 'none', 
                    marginLeft: '8px',
                    textTransform: 'uppercase',
                    fontSize: '0.9rem',
                    letterSpacing: '0.5px'
                }}
            >
                Inicia sesión aquí
            </Link>
        </div>

      </div>
    </div>
  );
}