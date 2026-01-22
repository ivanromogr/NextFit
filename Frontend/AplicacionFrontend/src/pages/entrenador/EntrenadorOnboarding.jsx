import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { completarOnboardingEntrenador } from "../../api/endpoints";

// Iconos
import {
  ChevronLeft, Check, Dumbbell, User, Briefcase,
  GraduationCap, Laptop, Users, FileText, Zap,
  Activity, HeartPulse, Trophy, Utensils, Swords,
  ChevronDown
} from "lucide-react";

// Componentes UI
import GymButton from "../../components/ui/GymButton";
import GymInput from "../../components/ui/GymInput";
import GymDateInput from "../../components/ui/GymDateInput";
import GymSelectionCard from "../../components/ui/GymSelectionCard";

const STEPS = ["identidad", "especialidad", "experiencia", "detalles"];

const LISTA_TITULACIONES = [
  "Grado en CAFD / INEF",
  "Doble Grado CAFD + Fisioterapia",
  "Técnico Superior (TSAF / TAFAD)",
  "Máster en Alto Rendimiento",
  "Certificación NSCA (CPT / CSCS)",
  "Certificación ACSM / NASM / ACE",
  "Entrenador Nacional (FEFF / IFBB)",
  "CrossFit Level 1 / 2",
  "Instructor de Yoga / Pilates",
  "Estudiante de CAFD",
  "Experiencia Propia / Autodidacta",
  "Otro"
];

export default function EntrenadorOnboarding() {
  const navigate = useNavigate();
  const location = useLocation();

  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [animateKey, setAnimateKey] = useState(0);

  const [data, setData] = useState({
    genero: "",
    fechaNacimiento: "",
    especialidad: [],
    aniosExperiencia: "",
    modalidadTrabajo: "",
    formacion: "",
    descripcionPerfil: ""
  });

  useEffect(() => {
    let idRecuperado = location.state?.userId || localStorage.getItem("registration_userId");
    if (idRecuperado) setUserId(idRecuperado);
    else console.warn("⚠️ Modo desarrollo: Sin ID de usuario.");
  }, [location, navigate]);

  const currentStep = STEPS[stepIndex];
  const totalSteps = STEPS.length;
  const progressPercent = ((stepIndex + 1) / totalSteps) * 100;

  const stepMeta = useMemo(() => {
    switch (currentStep) {
      case "identidad":
        return { title: "TU PERFIL", subtitle: "Datos básicos para configurar tu ficha de entrenador." };
      case "especialidad":
        return { title: "TUS PUNTOS FUERTES", subtitle: "Selecciona todas las disciplinas que dominas." };
      case "experiencia":
        return { title: "TRAYECTORIA", subtitle: "Define cómo trabajas y tu nivel de veteranía." };
      case "detalles":
        return { title: "TU MARCA PERSONAL", subtitle: "Formación y una biografía potente para venderte." };
      default:
        return { title: "", subtitle: "" };
    }
  }, [currentStep]);

  const toggleEspecialidad = (esp) => {
    const current = data.especialidad;
    if (current.includes(esp)) {
      setData({ ...data, especialidad: current.filter(item => item !== esp) });
    } else {
      setData({ ...data, especialidad: [...current, esp] });
    }
  };

  const isStepValid = () => {
    switch (currentStep) {
      case "identidad":
        return data.genero !== "" && data.fechaNacimiento !== "";
      case "especialidad":
        return data.especialidad.length > 0;
      case "experiencia": {
        const anios = parseFloat(data.aniosExperiencia);
        return !isNaN(anios) && anios >= 0 && data.modalidadTrabajo !== "";
      }
      case "detalles":
        return data.formacion !== "" && data.descripcionPerfil.trim().length > 15;
      default:
        return false;
    }
  };

  const handleNext = async () => {
    if (stepIndex < totalSteps - 1) {
      setStepIndex(stepIndex + 1);
      setAnimateKey((k) => k + 1);
      return;
    }

    if (!userId) { alert("Error crítico: Falta ID de usuario"); return; }

    try {
      setLoading(true);

      const hoy = new Date();
      const nacimiento = new Date(data.fechaNacimiento);
      let edadCalculada = hoy.getFullYear() - nacimiento.getFullYear();
      const m = hoy.getMonth() - nacimiento.getMonth();
      if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) edadCalculada--;

      const payload = {
        idEntrenador: userId,
        genero: data.genero,
        edad: edadCalculada,
        especialidad: data.especialidad.join(", "),
        aniosExperiencia: parseInt(data.aniosExperiencia),
        modalidadTrabajo: data.modalidadTrabajo,
        formacion: data.formacion,
        descripcionPerfil: data.descripcionPerfil,
        fotoPerfil: null
      };

      await completarOnboardingEntrenador(payload);

      localStorage.setItem("entrenadorId", userId);
      localStorage.removeItem("registration_userId");
      navigate("/entrenador/dashboard");
    } catch (error) {
      console.error(error);
      alert("Error al guardar: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    if (stepIndex <= 0 || loading) return;
    setStepIndex(stepIndex - 1);
    setAnimateKey((k) => k + 1);
  };

  const especialidades = [
    { id: "Musculación", icon: Dumbbell },
    { id: "CrossFit", icon: Zap },
    { id: "HIIT / Funcional", icon: Activity },
    { id: "Pérdida de Peso", icon: HeartPulse },
    { id: "Calistenia", icon: Trophy },
    { id: "Yoga / Pilates", icon: User },
    { id: "Powerlifting", icon: Dumbbell },
    { id: "Rehabilitación", icon: HeartPulse },
    { id: "Nutrición", icon: Utensils },
    { id: "Boxeo / Artes Marciales", icon: Swords },
  ];

  const styles = {
    root: {
      minHeight: "100vh",
      padding: "clamp(18px, 3vw, 34px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    card: {
      width: "100%",
      maxWidth: 720,
      borderRadius: 28,
      padding: "clamp(18px, 3.2vw, 34px)",
      background:
        "radial-gradient(circle at top left, rgba(250,204,21,0.10), transparent 55%), rgba(10,10,10,0.86)",
      border: "1px solid rgba(255,255,255,0.10)",
      boxShadow: "0 30px 90px rgba(0,0,0,0.65)",
      backdropFilter: "blur(10px)",
      display: "flex",
      flexDirection: "column",
      gap: 18,
    },
    topRow: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    backBtn: (disabled) => ({
      width: 44,
      height: 44,
      borderRadius: 14,
      border: "1px solid rgba(255,255,255,0.10)",
      background: disabled ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.06)",
      color: disabled ? "rgba(255,255,255,0.25)" : "white",
      cursor: disabled ? "default" : "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      transition: "transform .12s ease, background .12s ease, border-color .12s ease",
      outline: "none",
    }),
    stepPill: {
      display: "inline-flex",
      alignItems: "center",
      gap: 10,
      padding: "8px 14px",
      borderRadius: 999,
      border: "1px solid rgba(250,204,21,0.18)",
      background: "rgba(250,204,21,0.10)",
      color: "#FACC15",
      fontWeight: 900,
      letterSpacing: 1,
      fontFamily: "Teko, sans-serif",
      fontSize: "1.1rem",
      textTransform: "uppercase",
    },
    progressTrack: {
      height: 6,
      background: "rgba(255,255,255,0.10)",
      borderRadius: 999,
      overflow: "hidden",
    },
    progressFill: {
      width: `${progressPercent}%`,
      height: "100%",
      background: "linear-gradient(90deg, #FACC15, #EAB308)",
      boxShadow: "0 0 18px rgba(250, 204, 21, 0.35)",
      transition: "width 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
    },
    title: {
      margin: 0,
      fontSize: "clamp(2.2rem, 4vw, 3rem)",
      lineHeight: 1,
      fontStyle: "italic",
      color: "white",
      textTransform: "uppercase",
      fontFamily: "Teko, sans-serif",
      letterSpacing: 1,
    },
    subtitle: {
      margin: 0,
      color: "rgba(255,255,255,0.60)",
      fontSize: "1rem",
      lineHeight: 1.5,
    },
    content: {
      marginTop: 6,
      display: "flex",
      flexDirection: "column",
      gap: 14,
      minHeight: 320,
    },
    hint: {
      marginTop: -6,
      color: "rgba(255,255,255,0.35)",
      fontSize: 12,
      textAlign: "center",
    },
    stepWrap: { animation: "nfFadeUp .22s ease both" },
    label: {
      display: "block",
      margin: "22px 0 12px",
      color: "#a1a1aa",
      fontSize: "0.85rem",
      fontWeight: 700,
      letterSpacing: "1px",
      textTransform: "uppercase",
    },
    helperLegal: {
      fontSize: "0.85rem",
      color: "rgba(255,255,255,0.40)",
      marginTop: -10,
      fontStyle: "italic",
    },
    grid2: {
      display: "grid",
      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
      gap: 12,
    },
    gridEspecialidades: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
      gap: 12,
    },
    countLine: {
      marginTop: 6,
      textAlign: "center",
      color: "#FACC15",
      fontSize: "0.9rem",
      fontWeight: 700,
    },
    fieldWrap: {
      width: "100%",
      borderRadius: 14,
      border: "1px solid rgba(255,255,255,0.12)",
      background: "rgba(24,24,27,0.92)",
      overflow: "hidden",
      transition: "border-color .18s ease, box-shadow .18s ease, background .18s ease",
    },
    selectWrap: { position: "relative", width: "100%" },
    selectIconLeft: {
      position: "absolute",
      left: 16,
      top: "50%",
      transform: "translateY(-50%)",
      pointerEvents: "none",
      zIndex: 1,
      color: "#FACC15",
    },
    selectIconRight: {
      position: "absolute",
      right: 16,
      top: "50%",
      transform: "translateY(-50%)",
      pointerEvents: "none",
      zIndex: 1,
      color: "#FACC15",
    },
    select: {
      width: "100%",
      padding: 16,
      paddingLeft: 48,
      paddingRight: 48,
      backgroundColor: "transparent",
      border: "none",
      color: "white",
      fontSize: "1rem",
      outline: "none",
      appearance: "none",
      cursor: "pointer",
      fontFamily: "Inter, sans-serif",
    },
    textareaWrap: { position: "relative" },
    textareaIcon: {
      position: "absolute",
      top: 16,
      left: 16,
      color: "#FACC15",
      pointerEvents: "none",
    },
    textarea: {
      width: "100%",
      padding: 16,
      paddingLeft: 48,
      backgroundColor: "transparent",
      border: "none",
      color: "white",
      fontSize: "1rem",
      outline: "none",
      fontFamily: "Inter, sans-serif",
      resize: "none",
      minHeight: 140,
    },
    rowBetween: { display: "flex", justifyContent: "space-between", marginTop: 6 },
    micro: (ok) => ({ fontSize: "0.8rem", color: ok ? "rgba(255,255,255,0.60)" : "#EF4444", fontWeight: 600 }),
    microRight: { fontSize: "0.8rem", color: "rgba(255,255,255,0.35)" },
  };

  return (
    <div style={styles.root}>
      <div style={styles.card}>
        <div style={styles.topRow}>
          <button
            onClick={goBack}
            disabled={stepIndex === 0 || loading}
            style={styles.backBtn(stepIndex === 0 || loading)}
            onMouseEnter={(e) => {
              if (stepIndex === 0 || loading) return;
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.background = "rgba(255,255,255,0.10)";
              e.currentTarget.style.borderColor = "rgba(250,204,21,0.18)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.background = "rgba(255,255,255,0.06)";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)";
            }}
            aria-label="Volver"
          >
            <ChevronLeft size={24} />
          </button>

          <div style={styles.stepPill}>
            COACH PRO <span style={{ opacity: 0.55 }}>·</span> PASO {stepIndex + 1}
            <span style={{ opacity: 0.55 }}>/</span> {totalSteps}
          </div>
        </div>

        <div style={styles.progressTrack}>
          <div style={styles.progressFill} />
        </div>

        <div>
          <h1 style={styles.title}>{stepMeta.title}</h1>
          <p style={styles.subtitle}>{stepMeta.subtitle}</p>
        </div>

        <div key={animateKey} style={{ ...styles.content, ...styles.stepWrap }}>
          {/* PASO 1 */}
          {currentStep === "identidad" && (
            <>
              <div style={styles.grid2}>
                <GymSelectionCard
                  title="Hombre"
                  icon={User}
                  selected={data.genero === "MASCULINO"}
                  onClick={() => setData({ ...data, genero: "MASCULINO" })}
                />
                <GymSelectionCard
                  title="Mujer"
                  icon={User}
                  selected={data.genero === "FEMENINO"}
                  onClick={() => setData({ ...data, genero: "FEMENINO" })}
                />
              </div>

              <GymDateInput
                label="Fecha de Nacimiento"
                value={data.fechaNacimiento}
                onChange={(e) => setData({ ...data, fechaNacimiento: e.target.value })}
                maxDate={new Date(new Date().setFullYear(new Date().getFullYear() - 18))}
              />

              <p style={styles.helperLegal}>
                * Requisito legal: Debes ser mayor de edad (+18) para ejercer.
              </p>
            </>
          )}

          {/* PASO 2 */}
          {currentStep === "especialidad" && (
            <>
              <div style={styles.gridEspecialidades}>
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

              <div style={styles.countLine}>
                {data.especialidad.length === 0
                  ? "Selecciona al menos una"
                  : `${data.especialidad.length} disciplina(s) seleccionada(s)`}
              </div>
            </>
          )}

          {/* PASO 3 */}
          {currentStep === "experiencia" && (
            <>
              <GymInput
                label="Años de Experiencia"
                type="number"
                placeholder="Ej: 5"
                icon={Briefcase}
                value={data.aniosExperiencia}
                onChange={(e) => setData({ ...data, aniosExperiencia: e.target.value })}
              />

              <label style={styles.label}>Modalidad de trabajo preferida</label>
              <div style={{ display: "grid", gap: 12 }}>
                <GymSelectionCard
                  title="Solo Online"
                  icon={Laptop}
                  selected={data.modalidadTrabajo === "ONLINE"}
                  onClick={() => setData({ ...data, modalidadTrabajo: "ONLINE" })}
                />
                <GymSelectionCard
                  title="Presencial"
                  icon={Users}
                  selected={data.modalidadTrabajo === "PRESENCIAL"}
                  onClick={() => setData({ ...data, modalidadTrabajo: "PRESENCIAL" })}
                />
                <GymSelectionCard
                  title="Híbrido (Ambos)"
                  icon={Zap}
                  selected={data.modalidadTrabajo === "HIBRIDO"}
                  onClick={() => setData({ ...data, modalidadTrabajo: "HIBRIDO" })}
                />
              </div>
            </>
          )}

          {/* PASO 4 */}
          {currentStep === "detalles" && (
            <>
              <label style={{ ...styles.label, marginTop: 6 }}>Titulación / Formación</label>
              <div
                style={styles.fieldWrap}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "rgba(250,204,21,0.55)";
                  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(250,204,21,0.12)";
                  e.currentTarget.style.background = "rgba(24,24,27,0.96)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
                  e.currentTarget.style.boxShadow = "none";
                  e.currentTarget.style.background = "rgba(24,24,27,0.92)";
                }}
              >
                <div style={styles.selectWrap}>
                  <span style={styles.selectIconLeft}>
                    <GraduationCap size={20} />
                  </span>

                  <select
                    value={data.formacion}
                    onChange={(e) => setData({ ...data, formacion: e.target.value })}
                    style={{
                      ...styles.select,
                      color: data.formacion ? "white" : "rgba(255,255,255,0.45)",
                    }}
                  >
                    <option value="" disabled>
                      Selecciona tu formación...
                    </option>
                    {LISTA_TITULACIONES.map((titulo, index) => (
                      <option key={index} value={titulo} style={{ background: "#121214", color: "white" }}>
                        {titulo}
                      </option>
                    ))}
                  </select>

                  <span style={styles.selectIconRight}>
                    <ChevronDown size={20} />
                  </span>
                </div>
              </div>

              <label style={styles.label}>Biografía / Sobre ti</label>
              <div
                style={styles.fieldWrap}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "rgba(250,204,21,0.55)";
                  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(250,204,21,0.12)";
                  e.currentTarget.style.background = "rgba(24,24,27,0.96)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
                  e.currentTarget.style.boxShadow = "none";
                  e.currentTarget.style.background = "rgba(24,24,27,0.92)";
                }}
              >
                <div style={styles.textareaWrap}>
                  <span style={styles.textareaIcon}>
                    <FileText size={20} />
                  </span>

                  <textarea
                    rows={6}
                    placeholder="Hola, soy especialista en hipertrofia y ayudo a..."
                    value={data.descripcionPerfil}
                    onChange={(e) => setData({ ...data, descripcionPerfil: e.target.value })}
                    style={styles.textarea}
                  />
                </div>
              </div>

              <div style={styles.rowBetween}>
                <span style={styles.micro(data.descripcionPerfil.length >= 15)}>
                  {data.descripcionPerfil.length < 15 ? "Mínimo 15 caracteres" : "¡Perfecto!"}
                </span>
                <span style={styles.microRight}>{data.descripcionPerfil.length} caracteres</span>
              </div>
            </>
          )}
        </div>

        <GymButton fullWidth disabled={!isStepValid() || loading} onClick={handleNext}>
          {loading ? "GUARDANDO..." : (stepIndex === totalSteps - 1 ? "FINALIZAR ALTA" : "SIGUIENTE")}
          {!loading && <Check size={20} />}
        </GymButton>

        <div style={styles.hint}>
          {stepIndex < totalSteps - 1 ? "Completa este paso para continuar." : "Revisa tu perfil antes de finalizar."}
        </div>

        <style>{`
          @keyframes nfFadeUp {
            from { opacity: 0; transform: translateY(10px); }
            to   { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    </div>
  );
}
