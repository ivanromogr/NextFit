import { useState } from "react";
import { Link, useNavigate } from "react-router-dom"; // Importamos useNavigate
import { loginForm } from "../../api/endpoints"; 
import GymButton from "../../components/ui/GymButton";
import GymInput from "../../components/ui/GymInput";
import { Mail, Lock, Zap, ArrowRight } from "lucide-react";

export default function Login() {
  const navigate = useNavigate(); // Hook para redirigir sin recargar la página
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // 1. Llamamos al endpoint de login
      const resp = await loginForm(form);

      // 2. Verificamos si la respuesta es correcta (Status 200)
      // Gracias al CustomSuccessHandler modificado, resp.data tendrá el ID y el ROL
      if (resp.status === 200 && resp.data?.id) {
         console.log("LOGIN EXITOSO:", resp.data);
         
         const { role, id } = resp.data;

         // 3. Guardamos la sesión en LocalStorage (CRÍTICO para evitar bucles)
         localStorage.setItem("registration_userId", id); // Backup por compatibilidad
         
         if (role === "cliente") {
             localStorage.setItem("clienteId", id);
         } else if (role === "entrenador") {
             localStorage.setItem("entrenadorId", id);
         }

         // 4. Redirección manual según el rol
         if (role === "entrenador") {
            navigate("/entrenador/dashboard");
         } else {
            navigate("/cliente/dashboard");
         }

      } else {
         // Si llegamos aquí, el servidor respondió 200 pero sin datos válidos
         setError("Error: No se pudieron obtener los datos del usuario.");
      }

    } catch (err) {
      console.error("Error en Login:", err);
      // Capturamos el error. Si el backend redirige a error (404/401), mostramos credenciales incorrectas.
      // Esto pasa porque tu SecurityConfig original redirige si falla la password.
      const status = err.response?.status;
      if (status === 401 || status === 404) {
          setError("Credenciales incorrectas.");
      } else {
          setError("Error de conexión con el servidor.");
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
      backgroundColor: '#000' // Fondo negro simple
    }}>
      
      {/* TARJETA DE LOGIN */}
      <div style={{
        width: '100%',
        maxWidth: '400px',
        padding: '40px 30px',
        backgroundColor: 'rgba(20, 20, 20, 0.95)', 
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '20px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(10px)'
      }}>

        <div style={{ textAlign: 'center', marginBottom: '35px' }}>
          <div style={{ 
            display: 'inline-flex', padding: '12px', 
            borderRadius: '50%', background: 'rgba(250, 204, 21, 0.1)',
            marginBottom: '15px', border: '1px solid rgba(250, 204, 21, 0.3)'
          }}>
             <Zap size={32} color="#FACC15" fill="#FACC15" />
          </div>
          
          <h1 style={{ margin: 0, fontSize: '2.8rem', lineHeight: 1, color: 'white', fontStyle: 'italic' }}>
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

        <div style={{ marginTop: '30px', textAlign: 'center', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <p style={{ color: '#a3a3a3', fontSize: '0.9rem', marginBottom: '10px' }}>
            ¿Aún no eres miembro?
          </p>
          
          <Link 
            to="/registro" 
            style={{ 
              textDecoration: 'none', color: '#FACC15', fontWeight: 'bold', 
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              textTransform: 'uppercase', fontSize: '0.9rem', letterSpacing: '1px'
            }}
          >
            Crear cuenta gratis <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}