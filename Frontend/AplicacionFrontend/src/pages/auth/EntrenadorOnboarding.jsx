import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { completarOnboardingEntrenador } from "../../api/endpoints";

// Iconos Pro de Lucide (Añadidos Utensils y Swords)
import { 
  ChevronLeft, Check, Dumbbell, User, Briefcase, 
  GraduationCap, Laptop, Users, FileText, Zap, 
  Activity, HeartPulse, Trophy, Utensils, Swords 
} from "lucide-react";

// Componentes UI Personalizados
import GymButton from "../../components/ui/GymButton";
import GymInput from "../../components/ui/GymInput";
import GymDateInput from "../../components/ui/GymDateInput";
import GymSelectionCard from "../../components/ui/GymSelectionCard";

const STEPS = ["identidad", "especialidad", "experiencia", "detalles"];

export default function EntrenadorOnboarding() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  // Estado con los datos del Entrenador
  const [data, setData] = useState({
    genero: "",
    fechaNacimiento: "",
    especialidad: [], // Array para selección múltiple
    aniosExperiencia: "",
    modalidadTrabajo: "",
    formacion: "",
    descripcionPerfil: ""
  });

  // Recuperar ID
  useEffect(() => {
    let idRecuperado = location.state?.userId || localStorage.getItem("registration_userId");
    if (idRecuperado) {
        setUserId(idRecuperado);
    } else {
        console.warn("⚠️ Modo desarrollo: Sin ID de usuario.");
    }
  }, [location, navigate]);

  const currentStep = STEPS[stepIndex];
  const totalSteps = STEPS.length;
  const progressPercent = ((stepIndex + 1) / totalSteps) * 100;

  // --- LÓGICA DE SELECCIÓN MÚLTIPLE ---
  const toggleEspecialidad = (esp) => {
    const current = data.especialidad;
    if (current.includes(esp)) {
      setData({ ...data, especialidad: current.filter(item => item !== esp) });
    } else {
      setData({ ...data, especialidad: [...current, esp] });
    }
  };

  // --- VALIDACIONES DE BLOQUEO ---
  const isStepValid = () => {
    switch (currentStep) {
      case "identidad":
        return data.genero !== "" && data.fechaNacimiento !== "";
      
      case "especialidad":
        // Validamos que haya seleccionado AL MENOS UNA
        return data.especialidad.length > 0;

      case "experiencia":
        const anios = parseFloat(data.aniosExperiencia);
        return !isNaN(anios) && anios >= 0 && data.modalidadTrabajo !== "";

      case "detalles":
        return data.formacion.trim().length > 2 && data.descripcionPerfil.trim().length > 15;

      default: return false;
    }
  };

  // --- ENVÍO DE DATOS ---
  const handleNext = async () => {
    if (stepIndex < totalSteps - 1) {
      setStepIndex(stepIndex + 1);
      return;
    }

    if (!userId) { alert("Error crítico: Falta ID de usuario"); return; }

    try {
      setLoading(true);

      // Calcular edad real
      const hoy = new Date();
      const nacimiento = new Date(data.fechaNacimiento);
      let edadCalculada = hoy.getFullYear() - nacimiento.getFullYear();
      const m = hoy.getMonth() - nacimiento.getMonth();
      if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) {
        edadCalculada--;
      }

      const payload = {
        idEntrenador: userId,
        genero: data.genero,
        edad: edadCalculada,
        // Convertimos el array a string separado por comas
        especialidad: data.especialidad.join(", "), 
        aniosExperiencia: parseInt(data.aniosExperiencia),
        modalidadTrabajo: data.modalidadTrabajo,
        formacion: data.formacion,
        descripcionPerfil: data.descripcionPerfil,
        fotoPerfil: null 
      };

      console.log("Enviando perfil entrenador:", payload);
      await completarOnboardingEntrenador(payload);
      
      localStorage.removeItem("registration_userId");
      navigate("/entrenador/dashboard"); 

    } catch (error) {
      console.error(error);
      alert("Error al guardar: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // LISTA COMPLETA DE ESPECIALIDADES (10 OPCIONES)
  const especialidades = [
    { id: "Musculación", icon: Dumbbell },
    { id: "CrossFit", icon: Zap },
    { id: "HIIT / Funcional", icon: Activity },
    { id: "Pérdida de Peso", icon: HeartPulse },
    { id: "Calistenia", icon: Trophy },
    { id: "Yoga / Pilates", icon: User },
    { id: "Powerlifting", icon: Dumbbell },
    { id: "Rehabilitación", icon: HeartPulse },
    { id: "Nutrición", icon: Utensils },       // NUEVO
    { id: "Boxeo / Artes Marciales", icon: Swords }, // NUEVO
  ];

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', minHeight: '100vh', padding: '24px', display: 'flex', flexDirection: 'column' }}>
      
      {/* HEADER */}
      <header style={{ marginBottom: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <button 
            onClick={() => stepIndex > 0 && setStepIndex(stepIndex - 1)}
            disabled={stepIndex === 0 || loading}
            style={{ 
                background: 'none', border: 'none', 
                color: stepIndex === 0 ? '#333' : 'white', 
                cursor: stepIndex === 0 ? 'default' : 'pointer',
                opacity: stepIndex === 0 ? 0.5 : 1,
                display: 'flex', alignItems: 'center'
            }}
          >
            <ChevronLeft size={32} />
          </button>
          <span style={{ 
              color: '#FACC15', fontFamily: 'Teko, sans-serif', 
              fontSize: '1.4rem', letterSpacing: '1px', textTransform: 'uppercase' 
          }}>
            COACH PRO · PASO {stepIndex + 1}/{totalSteps}
          </span>
        </div>
        
        <div style={{ height: '4px', background: '#333', borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{ 
              width: `${progressPercent}%`, height: '100%', background: '#FACC15', 
              boxShadow: '0 0 10px rgba(250, 204, 21, 0.6)', 
              transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)' 
          }} />
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main style={{ flex: 1 }}>
        <h1 style={{ 
            fontSize: '2.5rem', lineHeight: '1', marginBottom: '10px', 
            fontStyle: 'italic', color: 'white', textTransform: 'uppercase',
            fontFamily: 'Teko, sans-serif'
        }}>
          {currentStep === "identidad" && "TU PERFIL"}
          {currentStep === "especialidad" && "TUS PUNTOS FUERTES"}
          {currentStep === "experiencia" && "TRAYECTORIA"}
          {currentStep === "detalles" && "TU MARCA PERSONAL"}
        </h1>
        
        <p style={{ color: '#a3a3a3', marginBottom: '30px', fontSize: '1rem' }}>
          {currentStep === "identidad" && "Datos básicos para configurar tu ficha de entrenador."}
          {currentStep === "especialidad" && "Selecciona todas las disciplinas que dominas."}
          {currentStep === "experiencia" && "Define cómo trabajas y tu nivel de veteranía."}
          {currentStep === "detalles" && "Tu formación y una biografía potente son clave para venderte."}
        </p>

        {/* PASO 1: IDENTIDAD */}
        {currentStep === "identidad" && (
          <div className="animate-enter">
            <div style={{ display: 'grid', gap: '12px', marginBottom: '24px' }}>
                <GymSelectionCard title="Hombre" icon={User} selected={data.genero === "MASCULINO"} onClick={() => setData({ ...data, genero: "MASCULINO" })} />
                <GymSelectionCard title="Mujer" icon={User} selected={data.genero === "FEMENINO"} onClick={() => setData({ ...data, genero: "FEMENINO" })} />
            </div>
            <GymDateInput 
                label="Fecha de Nacimiento" 
                value={data.fechaNacimiento} 
                onChange={(e) => setData({ ...data, fechaNacimiento: e.target.value })}
                maxDate={new Date(new Date().setFullYear(new Date().getFullYear() - 18))}
            />
            <p style={{ fontSize: '0.85rem', color: '#525252', marginTop: '-15px', fontStyle: 'italic' }}>
                * Requisito legal: Debes ser mayor de edad (+18) para ejercer.
            </p>
          </div>
        )}

        {/* PASO 2: ESPECIALIDAD (SELECCIÓN MÚLTIPLE) */}
        {currentStep === "especialidad" && (
          <div className="animate-enter">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {especialidades.map((esp) => (
                  <GymSelectionCard 
                      key={esp.id} 
                      title={esp.id} 
                      icon={esp.icon} 
                      selected={data.especialidad.includes(esp.id)} 
                      onClick={() => toggleEspecialidad(esp.id)} 
                  />
              ))}
            </div>
            <p style={{ marginTop: '15px', textAlign: 'center', color: '#FACC15', fontSize: '0.9rem' }}>
               {data.especialidad.length === 0 
                 ? "Selecciona al menos una" 
                 : `${data.especialidad.length} disciplina(s) seleccionada(s)`}
            </p>
          </div>
        )}

        {/* PASO 3: EXPERIENCIA */}
        {currentStep === "experiencia" && (
          <div className="animate-enter">
            <GymInput label="Años de Experiencia" type="number" placeholder="Ej: 5" icon={Briefcase} value={data.aniosExperiencia} onChange={(e) => setData({ ...data, aniosExperiencia: e.target.value })} />
            <label style={{ display: 'block', margin: '24px 0 12px', color: '#a1a1aa', fontSize: '0.85rem', fontWeight: '700', letterSpacing: '1px' }}>
                MODALIDAD DE TRABAJO PREFERIDA
            </label>
            <div style={{ display: 'grid', gap: '12px' }}>
                <GymSelectionCard title="Solo Online" icon={Laptop} selected={data.modalidadTrabajo === "ONLINE"} onClick={() => setData({ ...data, modalidadTrabajo: "ONLINE" })} />
                <GymSelectionCard title="Presencial" icon={Users} selected={data.modalidadTrabajo === "PRESENCIAL"} onClick={() => setData({ ...data, modalidadTrabajo: "PRESENCIAL" })} />
                <GymSelectionCard title="Híbrido (Ambos)" icon={Zap} selected={data.modalidadTrabajo === "HIBRIDO"} onClick={() => setData({ ...data, modalidadTrabajo: "HIBRIDO" })} />
            </div>
          </div>
        )}

        {/* PASO 4: DETALLES */}
        {currentStep === "detalles" && (
          <div className="animate-enter">
            <GymInput label="Titulación / Formación" placeholder="Ej: Grado CAFD + Máster Alto Rendimiento" icon={GraduationCap} value={data.formacion} onChange={(e) => setData({ ...data, formacion: e.target.value })} />
            <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', marginBottom: '10px', color: '#a1a1aa', fontSize: '0.85rem', fontWeight: '700', letterSpacing: '1px' }}>
                    BIOGRAFÍA / SOBRE TI
                </label>
                <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', top: '16px', left: '16px', color: '#FACC15', pointerEvents: 'none' }}>
                        <FileText size={20} />
                    </div>
                    <textarea
                        rows="6"
                        placeholder="Hola, soy especialista en hipertrofia y ayudo a..."
                        value={data.descripcionPerfil}
                        onChange={(e) => setData({ ...data, descripcionPerfil: e.target.value })}
                        style={{
                            width: '100%',
                            padding: '16px',
                            paddingLeft: '48px',
                            backgroundColor: '#18181b',
                            border: '1px solid #3f3f46',
                            borderRadius: '12px',
                            color: 'white',
                            fontSize: '1rem',
                            outline: 'none',
                            fontFamily: 'Inter, sans-serif',
                            resize: 'none',
                            transition: 'border-color 0.3s'
                        }}
                        onFocus={(e) => { e.target.style.borderColor = '#FACC15'; e.target.style.backgroundColor = '#000'; }}
                        onBlur={(e) => { e.target.style.borderColor = '#3f3f46'; e.target.style.backgroundColor = '#18181b'; }}
                    />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px' }}>
                    <span style={{ fontSize: '0.8rem', color: data.descripcionPerfil.length < 15 ? '#EF4444' : '#a1a1aa' }}>
                        {data.descripcionPerfil.length < 15 ? "Mínimo 15 caracteres" : "¡Perfecto!"}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: '#525252' }}>{data.descripcionPerfil.length} caracteres</span>
                </div>
            </div>
          </div>
        )}

      </main>

      <footer style={{ marginTop: '20px' }}>
        <GymButton fullWidth disabled={!isStepValid() || loading} onClick={handleNext}>
          {loading ? "GUARDANDO..." : (stepIndex === totalSteps - 1 ? "FINALIZAR ALTA" : "SIGUIENTE")}
          {!loading && <Check size={20} />}
        </GymButton>
      </footer>
    </div>
  );
}