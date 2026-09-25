import React, { useState, useEffect, useMemo } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Alert,
  Platform,
  UIManager,
  LayoutAnimation,
  SafeAreaView,
  KeyboardAvoidingView
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { completarOnboardingCliente } from "../../api/endpoints";
import { useAuth } from "../../components/context/AuthContext";

// Iconos
import { ChevronLeft, Check, Dumbbell, User, Ruler, Weight, Flame, Activity } from "lucide-react-native";

// Componentes UI
import GymButton from "../../components/ui/GymButton";
import GymInput from "../../components/ui/GymInput";
import GymDateInput from "../../components/ui/GymDateInput"; 

// Habilitar animaciones en Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const STEPS = ["genero", "fechaNacimiento", "altura", "peso", "objetivo"];

const GymSelectionCard = ({ title, icon: Icon, selected, onPress, variant = "row" }) => {
  const isGrid = variant === "grid";

  return (
    <TouchableOpacity 
      style={[
        isGrid ? styles.cardGrid : styles.cardRow, 
        selected && styles.cardActive
      ]} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={isGrid ? styles.contentGrid : styles.contentRow}>
        {Icon && (
          <Icon 
            size={isGrid ? 32 : 22} 
            color={selected ? "#0A0A0A" : "#FACC15"} 
            style={isGrid ? { marginBottom: 12 } : { marginRight: 15 }} 
          />
        )}
        <Text 
          style={[
            isGrid ? styles.textGrid : styles.textRow, 
            selected && styles.textActive
          ]}
          numberOfLines={2}
          adjustsFontSizeToFit
        >
          {title}
        </Text>
      </View>
      
      {!isGrid && (
        <View style={[styles.radioCircle, selected && styles.radioCircleActive]}>
          {selected && <View style={styles.radioDot} />}
        </View>
      )}
    </TouchableOpacity>
  );
};

export default function ClienteOnboardingScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { login } = useAuth(); // Para el autologin final

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

  useEffect(() => {
    const initId = async () => {
      let idRecuperado = route.params?.userId;
      if (!idRecuperado) {
        idRecuperado = await AsyncStorage.getItem("registration_userId");
      }
      if (idRecuperado) setUserId(idRecuperado);
      else console.warn("⚠️ No se encontró ID de usuario.");
    };
    initId();
  }, [route.params]);

  const currentStep = STEPS[stepIndex];
  const totalSteps = STEPS.length;
  const progressPercent = ((stepIndex + 1) / totalSteps) * 100;

  const getValidationResult = () => {
    switch (currentStep) {
      case "genero": return data.genero !== "";
      case "fechaNacimiento":
        if (!data.fechaNacimiento || data.fechaNacimiento.length !== 10) return false;
        const hoy = new Date();
        const nacimiento = new Date(data.fechaNacimiento);
        if (isNaN(nacimiento.getTime())) return false; 
        let edad = hoy.getFullYear() - nacimiento.getFullYear();
        const m = hoy.getMonth() - nacimiento.getMonth();
        if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) edad--;
        return edad >= 14 && edad <= 100;
      case "altura":
        const alt = parseFloat(data.alturaCm);
        return !isNaN(alt) && alt >= 100 && alt <= 250;
      case "peso":
        const peso = parseFloat(data.pesoKg);
        return !isNaN(peso) && peso >= 30 && peso <= 300;
      case "objetivo":
        return data.objetivo !== "";
      default:
        return false;
    }
  };

  const getErrorMessage = () => {
    if (currentStep === "fechaNacimiento" && data.fechaNacimiento.length === 10) {
      const year = new Date(data.fechaNacimiento).getFullYear();
      if (year > new Date().getFullYear() - 14) return "Debes tener al menos 14 años.";
      if (year < new Date().getFullYear() - 100) return "Fecha no válida.";
    }
    if (currentStep === "altura" && data.alturaCm) {
      const val = parseFloat(data.alturaCm);
      if (val < 100 || val > 250) return "Altura válida: 100-250 cm.";
    }
    if (currentStep === "peso" && data.pesoKg) {
      const val = parseFloat(data.pesoKg);
      if (val < 30 || val > 300) return "Peso válido: 30-300 kg.";
    }
    return null;
  };

  const isStepValid = getValidationResult();
  const errorMessage = getErrorMessage();

  const stepMeta = useMemo(() => {
    switch (currentStep) {
      case "genero": return { title: "IDENTIDAD", subtitle: "Selecciona tu sexo biológico para calcular tu metabolismo basal." };
      case "fechaNacimiento": return { title: "TU EDAD", subtitle: "Selecciona tu fecha de nacimiento en el calendario." };
      case "altura": return { title: "ESTATURA", subtitle: "Introduce tu altura en centímetros." };
      case "peso": return { title: "PESO ACTUAL", subtitle: "Tu punto de partida. Lo actualizaremos conforme progreses." };
      case "objetivo": return { title: "OBJETIVO", subtitle: "¿Qué quieres lograr? Adaptaremos el entreno a ti." };
      default: return { title: "", subtitle: "" };
    }
  }, [currentStep]);

  const triggerAnimation = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  };

  const goBack = () => {
    if (stepIndex <= 0 || loading) return;
    triggerAnimation();
    setStepIndex(stepIndex - 1);
  };

  const handleNext = async () => {
    if (stepIndex < totalSteps - 1) {
      triggerAnimation();
      setStepIndex(stepIndex + 1);
      return;
    }

    if (!userId) {
      Alert.alert("Error", "No se ha identificado al usuario.");
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

      await completarOnboardingCliente(payload);
      await AsyncStorage.removeItem("registration_userId");

      // Auto-Login: Mandamos al usuario directo al Dashboard
      await login(userId, "CLIENTE");

    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Hubo un error al guardar tu perfil.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView 
        style={styles.flexContainer} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        
        <View style={styles.headerContainer}>
          <View style={styles.topRow}>
            <TouchableOpacity 
              style={[styles.backBtn, (stepIndex === 0 || loading) && styles.backBtnDisabled]} 
              onPress={goBack}
              disabled={stepIndex === 0 || loading}
            >
              <ChevronLeft size={24} color={(stepIndex === 0 || loading) ? "rgba(255,255,255,0.25)" : "white"} />
            </TouchableOpacity>

            <View style={styles.stepPill}>
              <Text style={styles.stepPillText}>ATLETA <Text style={{ opacity: 0.5 }}>·</Text> PASO {stepIndex + 1}/{totalSteps}</Text>
            </View>
          </View>

          {/* Barra de progreso de lado a lado */}
          <View style={styles.progressTrackFull}>
            <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          
          <View style={styles.titleContainer}>
            <Text style={styles.title}>{stepMeta.title}</Text>
            <Text style={styles.subtitle}>{stepMeta.subtitle}</Text>
          </View>

          <View style={styles.content}>
            
            {/* PASO 1 */}
            {currentStep === "genero" && (
              <View style={styles.stepContainer}>
                {/* Cuadrícula para Hombre/Mujer */}
                <View style={styles.gridContainer}>
                  <GymSelectionCard variant="grid" title="Hombre" icon={User} selected={data.genero === "MASCULINO"} onPress={() => setData({ ...data, genero: "MASCULINO" })} />
                  <GymSelectionCard variant="grid" title="Mujer" icon={User} selected={data.genero === "FEMENINO"} onPress={() => setData({ ...data, genero: "FEMENINO" })} />
                </View>
                {/* Botón ancho para "Prefiero no decirlo" */}
                <GymSelectionCard variant="row" title="Prefiero no decirlo" icon={User} selected={data.genero === "NO_DECIR"} onPress={() => setData({ ...data, genero: "NO_DECIR" })} />
              </View>
            )}

            {currentStep === "fechaNacimiento" && (
              <GymDateInput
                label="FECHA DE NACIMIENTO"
                value={data.fechaNacimiento}
                onChangeText={(val) => setData({ ...data, fechaNacimiento: val })}
                maxDate={new Date()} 
              />
            )}

            {currentStep === "altura" && (
              <GymInput
                label="ALTURA"
                keyboardType="numeric"
                placeholder="Ej: 175"
                icon={Ruler}
                value={data.alturaCm}
                onChangeText={(val) => setData({ ...data, alturaCm: val })}
              />
            )}

            {currentStep === "peso" && (
              <GymInput
                label="PESO ACTUAL"
                keyboardType="numeric"
                placeholder="Ej: 70.5"
                icon={Weight}
                value={data.pesoKg}
                onChangeText={(val) => setData({ ...data, pesoKg: val })}
              />
            )}

            {/* PASO 5: OBJETIVOS EN CUADRÍCULA */}
            {currentStep === "objetivo" && (
              <View style={styles.stepContainer}>
                <View style={styles.gridContainer}>
                  <GymSelectionCard variant="grid" title="Perder Grasa" icon={Flame} selected={data.objetivo === "PERDER_GRASA"} onPress={() => setData({ ...data, objetivo: "PERDER_GRASA" })} />
                  <GymSelectionCard variant="grid" title="Ganar Músculo" icon={Dumbbell} selected={data.objetivo === "GANAR_MASA"} onPress={() => setData({ ...data, objetivo: "GANAR_MASA" })} />
                </View>
                {/* Rendimiento abajo, ancho completo */}
                <GymSelectionCard variant="row" title="Rendimiento / Fuerza" icon={Activity} selected={data.objetivo === "RENDIMIENTO"} onPress={() => setData({ ...data, objetivo: "RENDIMIENTO" })} />
              </View>
            )}

            {errorMessage ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>⚠️ {errorMessage}</Text>
              </View>
            ) : null}

          </View>

          <View style={styles.footerContainer}>
            <GymButton fullWidth disabled={!isStepValid || loading} onPress={handleNext}>
              {loading ? "GUARDANDO..." : (stepIndex === totalSteps - 1 ? "FINALIZAR REGISTRO" : "CONTINUAR")}
            </GymButton>

            <Text style={styles.hint}>
              {stepIndex < totalSteps - 1 ? "Completa este paso para seguir." : "Revisa que todo esté correcto antes de finalizar."}
            </Text>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#09090b' },
  flexContainer: { flex: 1 },
  
  // CABECERA EDGE-TO-EDGE
  headerContainer: {
    width: '100%',
    paddingTop: Platform.OS === 'android' ? 20 : 10,
    backgroundColor: '#09090b',
    zIndex: 10,
  },
  topRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 24,
    marginBottom: 20 
  },
  progressTrackFull: { 
    height: 4, 
    backgroundColor: 'rgba(255,255,255,0.08)', 
    width: '100%',
  },
  progressFill: { height: '100%', backgroundColor: '#FACC15' },

  backBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  backBtnDisabled: { opacity: 0.5 },
  stepPill: { backgroundColor: 'rgba(250,204,21,0.1)', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20 },
  stepPillText: { color: '#FACC15', fontWeight: '900', fontSize: 12, letterSpacing: 1 },
  
  // CONTENIDO SCROLL
  scrollContainer: { 
    flexGrow: 1, 
    justifyContent: 'flex-start', 
    paddingHorizontal: 24, 
    paddingTop: 30, 
    paddingBottom: 40 
  },
  
  titleContainer: { marginBottom: 35 },
  title: { fontSize: 36, fontWeight: '900', color: 'white', fontStyle: 'italic', marginBottom: 8, textTransform: 'uppercase' },
  subtitle: { fontSize: 15, color: 'rgba(255,255,255,0.6)', lineHeight: 22 },
  
  content: { flex: 1, justifyContent: 'flex-start' },
  stepContainer: { width: '100%', paddingBottom: 10 }, 
  
  // SOLUCIÓN DEL GRID (48% exacto)
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%', marginBottom: 15 },
  
  cardGrid: { width: '48%', backgroundColor: 'rgba(255,255,255,0.03)', paddingVertical: 24, paddingHorizontal: 10, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 15, minHeight: 125 },
  contentGrid: { alignItems: 'center', justifyContent: 'center' },
  textGrid: { color: 'white', fontSize: 14, fontWeight: '700', textAlign: 'center' },

  cardRow: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.03)', padding: 20, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', marginBottom: 12 },
  contentRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  textRow: { color: 'white', fontSize: 16, fontWeight: '700' },

  cardActive: { backgroundColor: '#FACC15', borderColor: '#FACC15' },
  textActive: { color: '#0A0A0A' },

  radioCircle: { height: 22, width: 22, borderRadius: 11, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center' },
  radioCircleActive: { borderColor: '#0A0A0A' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#0A0A0A' },

  errorBox: { marginTop: 15, backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' },
  errorText: { color: '#EF4444', fontWeight: '600', fontSize: 13, textAlign: 'center' },
  
  footerContainer: { marginTop: 20 },
  hint: { color: 'rgba(255,255,255,0.35)', fontSize: 13, textAlign: 'center', marginTop: 20, fontWeight: '500' },
});
