import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { completarOnboardingCliente } from "../../api/endpoints";

// Iconos
import { ChevronLeft, Check, Dumbbell, User, Ruler, Weight, Flame, Activity } from "lucide-react";

// Componentes UI Personalizados (Asegúrate de tenerlos en esta ruta)
import GymButton from "../../components/ui/GymButton";
import GymInput from "../../components/ui/GymInput";
import GymDateInput from "../../components/ui/GymDateInput";
import GymSelectionCard from "../../components/ui/GymSelectionCard";

const STEPS = ["genero", "fechaNacimiento", "altura", "peso", "objetivo"];

export default function ClienteOnboarding() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Estados
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  const [data, setData] = useState({
    genero: "",
    fechaNacimiento: "",
    alturaCm: "",
    pesoKg: "",
    objetivo: "",
  });

  // Recuperar ID al cargar (desde State o LocalStorage)
  useEffect(() => {
    let idRecuperado = location.state?.userId;
    if (!idRecuperado) {
        idRecuperado = localStorage.getItem("registration_userId");
    }
    
    if (idRecuperado) {
        setUserId(idRecuperado);
    } else {
        console.warn("⚠️ No se encontró ID de usuario. Asegúrate de venir del registro.");
        // Opcional: navigate("/auth/login");
    }
  }, [location]);

  const currentStep = STEPS[stepIndex];
  const totalSteps = STEPS.length;
  // Calculamos porcentaje para la barra (stepIndex + 1 porque empieza en 0)
  const progressPercent = ((stepIndex + 1) / totalSteps) * 100;

  // --- LÓGICA DE VALIDACIÓN ---
  const getValidationResult = () => {
    switch (currentStep) {
      case "genero":
        return data.genero !== ""; // Debe haber seleccionado algo
      
      case "fechaNacimiento":
        if (!data.fechaNacimiento) return false;
        const hoy = new Date();
        const nacimiento = new Date(data.fechaNacimiento);
        let edad = hoy.getFullYear() - nacimiento.getFullYear();
        const m = hoy.getMonth() - nacimiento.getMonth();
        if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) {
            edad--;
        }
        // Validamos rango lógico (14 a 100 años)
        return edad >= 14 && edad <= 100;

      case "altura":
        const alt = parseFloat(data.alturaCm);
        // Validamos que sea número y rango lógico (1m a 2.5m)
        return !isNaN(alt) && alt >= 100 && alt <= 250;

      case "peso":
        const peso = parseFloat(data.pesoKg);
        // Validamos rango lógico (30kg a 300kg)
        return !isNaN(peso) && peso >= 30 && peso <= 300;

      case "objetivo":
        return data.objetivo !== "";

      default:
        return false;
    }
  };

  // Mensajes de error específicos para ayudar al usuario
  const getErrorMessage = () => {
    if (currentStep === "fechaNacimiento" && data.fechaNacimiento) {
        const year = new Date(data.fechaNacimiento).getFullYear();
        if (year > new Date().getFullYear() - 14) return "Debes tener al menos 14 años.";
        if (year < new Date().getFullYear() - 100) return "Fecha no válida.";
    }
    if (currentStep === "altura" && data.alturaCm) {
        const val = parseFloat(data.alturaCm);
        if (val < 100 || val > 250) return "Introduce una altura válida (100-250 cm).";
    }
    if (currentStep === "peso" && data.pesoKg) {
        const val = parseFloat(data.pesoKg);
        if (val < 30 || val > 300) return "Introduce un peso válido (30-300 kg).";
    }
    return null;
  };

  const isStepValid = getValidationResult();
  const errorMessage = getErrorMessage();

  // --- MANEJO DE NAVEGACIÓN ---
  const handleNext = async () => {
    // Si no es el último paso, avanzamos
    if (stepIndex < totalSteps - 1) {
      setStepIndex(stepIndex + 1);
      return;
    }
    
    // Si es el último paso, enviamos al backend
    if (!userId) { 
        alert("Error crítico: No se ha identificado al usuario."); 
        return; 
    }

    try {
      setLoading(true);
      
      const payload = { 
        idCliente: userId, 
        ...data,
        // Convertimos a números para asegurar compatibilidad con Java
        alturaCm: parseFloat(data.alturaCm),
        pesoKg: parseFloat(data.pesoKg)
      };
      
      console.log("Enviando datos...", payload);
      const resp = await completarOnboardingCliente(payload);

      // Si el backend devuelve un id, guardamos ese id como 'clienteId'
      const idDevuelto = resp?.idCliente || resp?.id || userId;
      if (idDevuelto) {
        localStorage.setItem("clienteId", idDevuelto);
        setUserId(idDevuelto);
      }

      // Limpieza del ID temporal y redirección
      localStorage.removeItem("registration_userId"); 
      navigate("/cliente/dashboard");

    } catch (error) {
      console.error(error);
      alert("Hubo un error al guardar: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      maxWidth: '500px', 
      margin: '0 auto', 
      minHeight: '100vh', 
      padding: '24px', 
      display: 'flex', 
      flexDirection: 'column' 
    }}>
      
      {/* HEADER: Navegación y Barra de Progreso */}
      <header style={{ marginBottom: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <button 
            onClick={() => stepIndex > 0 && setStepIndex(stepIndex - 1)}
            disabled={stepIndex === 0 || loading}
            style={{ 
                background: 'none', border: 'none', 
                color: stepIndex === 0 ? '#333' : 'white', 
                cursor: stepIndex === 0 ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center',
                transition: 'opacity 0.2s'
            }}
          >
            <ChevronLeft size={32} />
          </button>
          <span style={{ 
              color: '#FACC15', fontWeight: '700', 
              fontFamily: 'Teko, sans-serif', fontSize: '1.4rem', letterSpacing: '1px' 
          }}>
            PASO {stepIndex + 1}/{totalSteps}
          </span>
        </div>

        {/* Barra Neón */}
        <div style={{ height: '4px', background: '#333', borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{ 
            width: `${progressPercent}%`, 
            height: '100%', 
            background: '#FACC15', 
            boxShadow: '0 0 10px rgba(250, 204, 21, 0.6)', // Glow effect
            transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)' 
          }} />
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        
        {/* Títulos Dinámicos */}
        <h1 style={{ 
            fontSize: '2.5rem', lineHeight: '1', marginBottom: '10px', 
            fontStyle: 'italic', color: 'white', textTransform: 'uppercase',
            fontFamily: 'Teko, sans-serif'
        }}>
          {currentStep === "genero" && "IDENTIDAD"}
          {currentStep === "fechaNacimiento" && "TU EDAD"}
          {currentStep === "altura" && "ESTATURA"}
          {currentStep === "peso" && "PESO ACTUAL"}
          {currentStep === "objetivo" && "OBJETIVO"}
        </h1>
        
        <p style={{ color: '#a3a3a3', marginBottom: '30px', fontSize: '1rem' }}>
          {currentStep === "genero" && "Selecciona tu sexo biológico para calcular tu metabolismo basal."}
          {currentStep === "fechaNacimiento" && "¿Cuándo naciste? Esto es clave para personalizar tu plan."}
          {currentStep === "altura" && "Introduce tu altura en centímetros para calcular tu IMC."}
          {currentStep === "peso" && "Tu punto de partida. Lo actualizaremos conforme progreses."}
          {currentStep === "objetivo" && "¿Qué quieres lograr con nosotros? Adaptaremos el entreno."}
        </p>

        {/* --- PASO 1: GÉNERO --- */}
        {currentStep === "genero" && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <GymSelectionCard 
              title="Masculino" icon={User} 
              selected={data.genero === "MASCULINO"} 
              onClick={() => setData({ ...data, genero: "MASCULINO" })} 
            />
            <GymSelectionCard 
              title="Femenino" icon={User} 
              selected={data.genero === "FEMENINO"} 
              onClick={() => setData({ ...data, genero: "FEMENINO" })} 
            />
            <GymSelectionCard 
              title="Prefiero no decirlo" 
              selected={data.genero === "NO_DECIR"} 
              onClick={() => setData({ ...data, genero: "NO_DECIR" })} 
            />
          </div>
        )}

        {/* --- PASO 2: FECHA --- */}
        {currentStep === "fechaNacimiento" && (
           <GymDateInput 
             label="Fecha de Nacimiento"
             value={data.fechaNacimiento} 
             onChange={(e) => setData({ ...data, fechaNacimiento: e.target.value })} 
           />
        )}

        {/* --- PASO 3: ALTURA --- */}
        {currentStep === "altura" && (
           <GymInput 
             label="Altura en CM" type="number" placeholder="Ej: 175" suffix="CM" icon={Ruler}
             value={data.alturaCm} 
             onChange={(e) => setData({ ...data, alturaCm: e.target.value })} 
           />
        )}

        {/* --- PASO 4: PESO --- */}
        {currentStep === "peso" && (
           <GymInput 
             label="Peso en KG" type="number" placeholder="Ej: 70.5" suffix="KG" icon={Weight}
             value={data.pesoKg} 
             onChange={(e) => setData({ ...data, pesoKg: e.target.value })} 
           />
        )}

        {/* --- PASO 5: OBJETIVO --- */}
        {currentStep === "objetivo" && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <GymSelectionCard 
              title="Perder Grasa" icon={Flame} 
              selected={data.objetivo === "PERDER_GRASA"} 
              onClick={() => setData({ ...data, objetivo: "PERDER_GRASA" })} 
            />
            <GymSelectionCard 
              title="Ganar Músculo" icon={Dumbbell} 
              selected={data.objetivo === "GANAR_MASA"} 
              onClick={() => setData({ ...data, objetivo: "GANAR_MASA" })} 
            />
            <GymSelectionCard 
              title="Rendimiento" icon={Activity} 
              selected={data.objetivo === "RENDIMIENTO"} 
              onClick={() => setData({ ...data, objetivo: "RENDIMIENTO" })} 
            />
          </div>
        )}

        {/* Mensaje de Error (Validación) */}
        {errorMessage && (
            <div style={{ 
                color: '#EF4444', marginTop: '10px', fontSize: '0.9rem', fontWeight: '500',
                background: 'rgba(239, 68, 68, 0.1)', padding: '12px', borderRadius: '8px', border: '1px solid #EF4444',
                display: 'flex', alignItems: 'center', gap: '8px'
            }}>
                <span>⚠️</span> {errorMessage}
            </div>
        )}

      </main>

      {/* FOOTER: Botón de Acción */}
      <footer style={{ marginTop: '30px' }}>
        <GymButton 
          fullWidth 
          // 🔒 BLOQUEO: Si no es válido, el botón se deshabilita
          disabled={!isStepValid || loading} 
          onClick={handleNext}
        >
          {loading ? "GUARDANDO PERFIL..." : (stepIndex === totalSteps - 1 ? "FINALIZAR REGISTRO" : "CONTINUAR")}
          {!loading && <Check size={20} />}
        </GymButton>
      </footer>
    </div>
  );
}