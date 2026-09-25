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
  TextInput,
  Modal,
  SafeAreaView,
  KeyboardAvoidingView
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { completarOnboardingEntrenador } from "../../api/endpoints";
import { useAuth } from "../../components/context/AuthContext"; 

// Iconos
import {
  ChevronLeft, Check, Dumbbell, User, Briefcase,
  GraduationCap, Laptop, Users, FileText, Zap,
  Activity, HeartPulse, Trophy, Utensils, Swords,
  ChevronDown, X
} from "lucide-react-native";

// Componentes UI
import GymButton from "../../components/ui/GymButton";
import GymInput from "../../components/ui/GymInput";
import GymDateInput from "../../components/ui/GymDateInput"; 

// Habilitar animaciones en Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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

// COMPONENTE: Tarjetas (Grid o Row)
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

export default function EntrenadorOnboardingScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { login } = useAuth(); 

  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  
  const [modalVisible, setModalVisible] = useState(false);

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
    const initId = async () => {
      let idRecuperado = route.params?.userId;
      if (!idRecuperado) idRecuperado = await AsyncStorage.getItem("registration_userId");
      
      if (idRecuperado) setUserId(idRecuperado);
      else console.warn("⚠️ Sin ID de usuario.");
    };
    initId();
  }, [route.params]);

  const currentStep = STEPS[stepIndex];
  const totalSteps = STEPS.length;
  const progressPercent = ((stepIndex + 1) / totalSteps) * 100;

  // Helper: Calcular edad desde fecha de nacimiento
  const getAge = (birthDate) => {
    if (!birthDate || birthDate.length !== 10) return null;
    const hoy = new Date();
    const nacimiento = new Date(birthDate);
    if (isNaN(nacimiento.getTime())) return null;
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const m = hoy.getMonth() - nacimiento.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) edad--;
    return edad;
  };

  const stepMeta = useMemo(() => {
    switch (currentStep) {
      case "identidad": return { title: "TU PERFIL", subtitle: "Datos básicos para configurar tu ficha." };
      case "especialidad": return { title: "PUNTOS FUERTES", subtitle: "Selecciona las disciplinas que dominas." };
      case "experiencia": return { title: "TRAYECTORIA", subtitle: "Define cómo trabajas y tu veteranía." };
      case "detalles": return { title: "MARCA PERSONAL", subtitle: "Formación y biografía para venderte." };
      default: return { title: "", subtitle: "" };
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
      case "identidad": return data.genero !== "" && data.fechaNacimiento.length === 10;
      case "especialidad": return data.especialidad.length > 0;
      case "experiencia":
        const anios = parseFloat(data.aniosExperiencia);
        return !isNaN(anios) && anios >= 0 && data.modalidadTrabajo !== "";
      case "detalles": return data.formacion !== "" && data.descripcionPerfil.trim().length >= 15;
      default: return false;
    }
  };

  const triggerAnimation = () => LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

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

    if (!userId) { Alert.alert("Error", "Falta ID de usuario"); return; }

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
        edad: isNaN(edadCalculada) ? 18 : edadCalculada,
        especialidad: data.especialidad.join(", "),
        aniosExperiencia: parseInt(data.aniosExperiencia) || 0,
        modalidadTrabajo: data.modalidadTrabajo,
        formacion: data.formacion,
        descripcionPerfil: data.descripcionPerfil,
      };

      await completarOnboardingEntrenador(payload);
      await AsyncStorage.removeItem("registration_userId");
      await login(userId, "ENTRENADOR");

    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Hubo un error al guardar tu perfil.");
    } finally {
      setLoading(false);
    }
  };

  const especialidades = [
    { id: "Musculación", icon: Dumbbell },
    { id: "CrossFit", icon: Zap },
    { id: "HIIT", icon: Activity },
    { id: "Pérdida de Peso", icon: HeartPulse },
    { id: "Calistenia", icon: Trophy },
    { id: "Yoga / Pilates", icon: User },
    { id: "Nutrición", icon: Utensils },
    { id: "Artes Marciales", icon: Swords },
  ];

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
              <Text style={styles.stepPillText}>COACH <Text style={{ opacity: 0.5 }}>·</Text> PASO {stepIndex + 1}/{totalSteps}</Text>
            </View>
          </View>

          {/* Barra de progreso de lado a lado de la pantalla */}
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
            {currentStep === "identidad" && (
              <View style={styles.stepContainer}>
                <View style={styles.gridContainer}>
                  <GymSelectionCard variant="grid" title="Hombre" icon={User} selected={data.genero === "MASCULINO"} onPress={() => setData({ ...data, genero: "MASCULINO" })} />
                  <GymSelectionCard variant="grid" title="Mujer" icon={User} selected={data.genero === "FEMENINO"} onPress={() => setData({ ...data, genero: "FEMENINO" })} />
                </View>

                <GymDateInput
                  label="FECHA DE NACIMIENTO"
                  value={data.fechaNacimiento}
                  onChangeText={(val) => setData({ ...data, fechaNacimiento: val })}
                  maxDate={new Date()}
                />
                <Text style={styles.helperLegal}>* Requisito legal: Debes ser mayor de edad (+18).</Text>
              </View>
            )}

            {/* PASO 2 */}
            {currentStep === "especialidad" && (
              <View style={styles.stepContainer}>
                <View style={styles.gridContainer}>
                  {especialidades.map((esp) => (
                    <GymSelectionCard key={esp.id} variant="grid" title={esp.id} icon={esp.icon} selected={data.especialidad.includes(esp.id)} onPress={() => toggleEspecialidad(esp.id)} />
                  ))}
                </View>
                <Text style={styles.countLine}>
                  {data.especialidad.length === 0 ? "Selecciona al menos una" : `${data.especialidad.length} disciplinas seleccionadas`}
                </Text>
              </View>
            )}

            {/* PASO 3 */}
            {currentStep === "experiencia" && (
              <View style={styles.stepContainer}>
                <GymInput label="Años de Experiencia" keyboardType="numeric" placeholder="Ej: 5" icon={Briefcase} value={data.aniosExperiencia} onChangeText={(val) => setData({ ...data, aniosExperiencia: val })} />

                <Text style={styles.label}>MODALIDAD DE TRABAJO</Text>
                <View style={{ gap: 10 }}>
                  <GymSelectionCard variant="row" title="Solo Online" icon={Laptop} selected={data.modalidadTrabajo === "ONLINE"} onPress={() => setData({ ...data, modalidadTrabajo: "ONLINE" })} />
                  <GymSelectionCard variant="row" title="Presencial" icon={Users} selected={data.modalidadTrabajo === "PRESENCIAL"} onPress={() => setData({ ...data, modalidadTrabajo: "PRESENCIAL" })} />
                  <GymSelectionCard variant="row" title="Híbrido (Ambos)" icon={Zap} selected={data.modalidadTrabajo === "HIBRIDO"} onPress={() => setData({ ...data, modalidadTrabajo: "HIBRIDO" })} />
                </View>
              </View>
            )}

            {/* PASO 4 */}
            {currentStep === "detalles" && (
              <View style={styles.stepContainer}>
                
                <Text style={styles.label}>TITULACIÓN PRINCIPAL</Text>
                <TouchableOpacity style={styles.selectWrap} activeOpacity={0.8} onPress={() => setModalVisible(true)}>
                  <GraduationCap size={20} color="#FACC15" style={styles.selectIconLeft} />
                  <Text style={[styles.selectText, !data.formacion && { color: 'rgba(255,255,255,0.4)' }]}>
                    {data.formacion || "Selecciona tu formación..."}
                  </Text>
                  <ChevronDown size={20} color="#FACC15" style={styles.selectIconRight} />
                </TouchableOpacity>

                <Text style={[styles.label, { marginTop: 20 }]}>BIOGRAFÍA / SOBRE TI</Text>
                <View style={styles.textareaWrap}>
                  <FileText size={20} color="#FACC15" style={styles.textareaIcon} />
                  <TextInput
                    style={styles.textarea}
                    multiline
                    numberOfLines={6}
                    placeholder="Hola, soy especialista en hipertrofia..."
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    value={data.descripcionPerfil}
                    onChangeText={(val) => setData({ ...data, descripcionPerfil: val })}
                    textAlignVertical="top"
                  />
                </View>
                
                <View style={styles.rowBetween}>
                  <Text style={[styles.micro, { color: data.descripcionPerfil.length >= 15 ? 'rgba(255,255,255,0.6)' : '#EF4444' }]}>
                    {data.descripcionPerfil.length < 15 ? "Mínimo 15 caracteres" : "¡Perfecto!"}
                  </Text>
                  <Text style={styles.microRight}>{data.descripcionPerfil.length}/250</Text>
                </View>

              </View>
            )}
          </View>
          
          <View style={styles.footerContainer}>
            <GymButton fullWidth disabled={!isStepValid() || loading} onPress={handleNext}>
              {loading ? "GUARDANDO..." : (stepIndex === totalSteps - 1 ? "FINALIZAR ALTA" : "SIGUIENTE")}
            </GymButton>
            <Text style={styles.hint}>
              {stepIndex < totalSteps - 1 ? "Completa este paso para continuar." : "Revisa tu perfil antes de finalizar."}
            </Text>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* MODAL SELECTOR TITULACIÓN */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Titulaciones</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}><X size={24} color="white" /></TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 400 }}>
              {LISTA_TITULACIONES.map((item, index) => (
                <TouchableOpacity 
                  key={index} style={styles.modalOption}
                  onPress={() => { setData({ ...data, formacion: item }); setModalVisible(false); }}
                >
                  <Text style={[styles.modalOptionText, data.formacion === item && { color: '#FACC15', fontWeight: 'bold' }]}>{item}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#09090b' },
  flexContainer: { flex: 1 },
  
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
    height: 4, // Barra más fina y elegante para Edge-to-Edge
    backgroundColor: 'rgba(255,255,255,0.08)', 
    width: '100%',
  },
  progressFill: { height: '100%', backgroundColor: '#FACC15' },

  backBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  backBtnDisabled: { opacity: 0.5 },
  stepPill: { backgroundColor: 'rgba(250,204,21,0.1)', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20 },
  stepPillText: { color: '#FACC15', fontWeight: '900', fontSize: 12 },
  
  scrollContainer: { 
    flexGrow: 1, 
    justifyContent: 'flex-start', 
    paddingHorizontal: 24, 
    paddingTop: 30, // Espacio después de la barra de progreso
    paddingBottom: 40 
  },
  
  titleContainer: { marginBottom: 35 },
  title: { fontSize: 36, fontWeight: '900', color: 'white', fontStyle: 'italic', marginBottom: 8, textTransform: 'uppercase' },
  subtitle: { fontSize: 15, color: 'rgba(255,255,255,0.6)', lineHeight: 22 },
  
  content: { flex: 1, justifyContent: 'flex-start' },
  stepContainer: { width: '100%', paddingBottom: 20 }, 
  
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%', marginBottom: 20 },
  
  cardGrid: { width: '48%', backgroundColor: 'rgba(255,255,255,0.03)', paddingVertical: 24, paddingHorizontal: 10, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 16, minHeight: 125 },
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

  helperLegal: { fontSize: 13, color: 'rgba(255,255,255,0.4)', fontStyle: 'italic', marginTop: 10, marginBottom: 20 },
  countLine: { color: '#FACC15', fontWeight: '800', fontSize: 14, textAlign: 'center', marginTop: 5 },
  label: { color: '#a1a1aa', fontSize: 12, fontWeight: '800', letterSpacing: 1, marginTop: 15, marginBottom: 12 },
  
  selectWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(24,24,27,0.92)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 16, padding: 18, marginBottom: 10 },
  selectIconLeft: { marginRight: 15 },
  selectText: { flex: 1, color: 'white', fontSize: 15 },
  selectIconRight: { marginLeft: 15 },

  textareaWrap: { flexDirection: 'row', backgroundColor: 'rgba(24,24,27,0.92)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 16, padding: 18 },
  textareaIcon: { marginRight: 15, marginTop: 2 },
  textarea: { flex: 1, color: 'white', fontSize: 15, minHeight: 120 },
  
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  micro: { fontSize: 12, fontWeight: '700' },
  microRight: { fontSize: 12, color: 'rgba(255,255,255,0.35)', fontWeight: '600' },
  
  footerContainer: { marginTop: 20 },
  hint: { color: 'rgba(255,255,255,0.35)', fontSize: 13, textAlign: 'center', marginTop: 20, fontWeight: '500' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#18181b', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, paddingBottom: 50 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  modalTitle: { color: 'white', fontSize: 22, fontWeight: '900' },
  modalOption: { paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  modalOptionText: { color: 'white', fontSize: 17, fontWeight: '500' }
});
