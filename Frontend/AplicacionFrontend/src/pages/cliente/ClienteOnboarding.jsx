import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { completarOnboardingCliente } from "../../api/endpoints";
import { useAuth } from "../../context/AuthContext";

// Iconos
import { ChevronLeft, Check, Dumbbell, User, Ruler, Weight, Flame, Activity } from "lucide-react";

// Componentes UI
import GymButton from "../../components/ui/GymButton";
import GymInput from "../../components/ui/GymInput";
import GymDateInput from "../../components/ui/GymDateInput";
import GymSelectionCard from "../../components/ui/GymSelectionCard";

const STEPS = ["genero", "fechaNacimiento", "altura", "peso", "objetivo"];

export default function ClienteOnboarding() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  // Estados
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  // Micro-animación entre pasos (sin librerías)
  const [animateKey, setAnimateKey] = useState(0);

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
      idRecuperado = sessionStorage.getItem("registration_userId") || localStorage.getItem("registration_userId");
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
  const progressPercent = ((stepIndex + 1) / totalSteps) * 100;

  // --- LÓGICA DE VALIDACIÓN (MISMA) ---
  const getValidationResult = () => {
    switch (currentStep) {
      case "genero":
        return data.genero !== "";

      case "fechaNacimiento":
        if (!data.fechaNacimiento) return false;
        {
          const hoy = new Date();
          const nacimiento = new Date(data.fechaNacimiento);
          let edad = hoy.getFullYear() - nacimiento.getFullYear();
          const m = hoy.getMonth() - nacimiento.getMonth();
          if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) edad--;
          return edad >= 14 && edad <= 100;
        }

      case "altura": {
        const alt = parseFloat(data.alturaCm);
        return !isNaN(alt) && alt >= 100 && alt <= 250;
      }

      case "peso": {
        const peso = parseFloat(data.pesoKg);
        return !isNaN(peso) && peso >= 30 && peso <= 300;
      }

      case "objetivo":
        return data.objetivo !== "";

      default:
        return false;
    }
  };

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

  const stepMeta = useMemo(() => {
    switch (currentStep) {
      case "genero":
        return {
          title: "IDENTIDAD",
          subtitle: "Selecciona tu sexo biológico para calcular tu metabolismo basal.",
        };
      case "fechaNacimiento":
        return {
          title: "TU EDAD",
          subtitle: "¿Cuándo naciste? Esto es clave para personalizar tu plan.",
        };
      case "altura":
        return {
          title: "ESTATURA",
          subtitle: "Introduce tu altura en centímetros para calcular tu IMC.",
        };
      case "peso":
        return {
          title: "PESO ACTUAL",
          subtitle: "Tu punto de partida. Lo actualizaremos conforme progreses.",
        };
      case "objetivo":
        return {
          title: "OBJETIVO",
          subtitle: "¿Qué quieres lograr con nosotros? Adaptaremos el entreno.",
        };
      default:
        return { title: "", subtitle: "" };
    }
  }, [currentStep]);

  // --- MANEJO DE NAVEGACIÓN (MISMO, con animKey) ---
  const goBack = () => {
    if (stepIndex <= 0 || loading) return;
    setStepIndex(stepIndex - 1);
    setAnimateKey((k) => k + 1);
  };

  const handleNext = async () => {
    if (stepIndex < totalSteps - 1) {
      setStepIndex(stepIndex + 1);
      setAnimateKey((k) => k + 1);
      return;
    }

    if (!userId) {
      alert("Error crítico: No se ha identificado al usuario.");
      return;
    }

    try {
      setLoading(true);

      const payload = {
        idCliente: userId,
        ...data,
        alturaCm: parseFloat(data.alturaCm),
        pesoKg: parseFloat(data.pesoKg),
      };

      const resp = await completarOnboardingCliente(payload);

      const idDevuelto = resp?.idCliente || resp?.id || userId;
      if (idDevuelto) {
        sessionStorage.setItem("clienteId", idDevuelto);
        localStorage.setItem("clienteId", idDevuelto);
        login(idDevuelto, "cliente");
        setUserId(idDevuelto);
      }

      sessionStorage.removeItem("registration_userId");
      localStorage.removeItem("registration_userId");
      navigate("/cliente/dashboard");
    } catch (error) {
      console.error(error);
      alert("Hubo un error al guardar: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // --- ESTILOS PREMIUM (solo este componente) ---
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
      maxWidth: 640,
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
      fontSize: "1.2rem",
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
      gap: 12,
      minHeight: 260,
    },
    error: {
      color: "#EF4444",
      marginTop: 4,
      fontSize: "0.95rem",
      fontWeight: 600,
      background: "rgba(239, 68, 68, 0.10)",
      padding: "12px 12px",
      borderRadius: 14,
      border: "1px solid rgba(239,68,68,0.35)",
      display: "flex",
      alignItems: "center",
      gap: 10,
    },
    footer: {
      display: "flex",
      flexDirection: "column",
      gap: 10,
      marginTop: 2,
    },
    hint: {
      color: "rgba(255,255,255,0.35)",
      fontSize: 12,
      textAlign: "center",
    },
    stepWrap: {
      animation: "nfFadeUp .22s ease both",
    },
  };

  return (
    <div style={styles.root}>
      {/* key para reiniciar la animación al cambiar de paso */}
      <div style={styles.card}>
        {/* Header */}
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
            PASO {stepIndex + 1} <span style={{ opacity: 0.55 }}>/</span> {totalSteps}
          </div>
        </div>

        {/* Progress */}
        <div style={styles.progressTrack}>
          <div style={styles.progressFill} />
        </div>

        {/* Title + subtitle */}
        <div>
          <h1 style={styles.title}>{stepMeta.title}</h1>
          <p style={styles.subtitle}>{stepMeta.subtitle}</p>
        </div>

        {/* Content */}
        <div key={animateKey} style={{ ...styles.content, ...styles.stepWrap }}>
          {currentStep === "genero" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <GymSelectionCard
                title="Masculino"
                icon={User}
                selected={data.genero === "MASCULINO"}
                onClick={() => setData({ ...data, genero: "MASCULINO" })}
              />
              <GymSelectionCard
                title="Femenino"
                icon={User}
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

          {currentStep === "fechaNacimiento" && (
            <GymDateInput
              label="Fecha de Nacimiento"
              value={data.fechaNacimiento}
              onChange={(e) => setData({ ...data, fechaNacimiento: e.target.value })}
            />
          )}

          {currentStep === "altura" && (
            <GymInput
              label="Altura en CM"
              type="number"
              placeholder="Ej: 175"
              suffix="CM"
              icon={Ruler}
              value={data.alturaCm}
              onChange={(e) => setData({ ...data, alturaCm: e.target.value })}
            />
          )}

          {currentStep === "peso" && (
            <GymInput
              label="Peso en KG"
              type="number"
              placeholder="Ej: 70.5"
              suffix="KG"
              icon={Weight}
              value={data.pesoKg}
              onChange={(e) => setData({ ...data, pesoKg: e.target.value })}
            />
          )}

          {currentStep === "objetivo" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <GymSelectionCard
                title="Perder Grasa"
                icon={Flame}
                selected={data.objetivo === "PERDER_GRASA"}
                onClick={() => setData({ ...data, objetivo: "PERDER_GRASA" })}
              />
              <GymSelectionCard
                title="Ganar Músculo"
                icon={Dumbbell}
                selected={data.objetivo === "GANAR_MASA"}
                onClick={() => setData({ ...data, objetivo: "GANAR_MASA" })}
              />
              <GymSelectionCard
                title="Rendimiento"
                icon={Activity}
                selected={data.objetivo === "RENDIMIENTO"}
                onClick={() => setData({ ...data, objetivo: "RENDIMIENTO" })}
              />
            </div>
          )}

          {errorMessage && (
            <div style={styles.error}>
              <span style={{ fontSize: 18 }}>⚠️</span>
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <GymButton fullWidth disabled={!isStepValid || loading} onClick={handleNext}>
            {loading
              ? "GUARDANDO PERFIL..."
              : stepIndex === totalSteps - 1
              ? "FINALIZAR REGISTRO"
              : "CONTINUAR"}
            {!loading && <Check size={20} />}
          </GymButton>

          <div style={styles.hint}>
            {stepIndex < totalSteps - 1
              ? "Completa este paso para seguir."
              : "Revisa que todo esté correcto antes de finalizar."}
          </div>
        </div>
      </div>

      {/* Animación inline */}
      <style>{`
        @keyframes nfFadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
