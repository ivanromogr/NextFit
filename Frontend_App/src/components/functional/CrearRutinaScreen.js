import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  ActivityIndicator, Platform, Alert, TextInput, Modal, FlatList, Image, KeyboardAvoidingView
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { 
  ChevronLeft, Sparkles, Edit3, Brain, CheckCircle2, 
  Dumbbell, Flame, Trophy, Search, Plus, Trash2, Save, Image as ImageIcon
} from 'lucide-react-native';

import { generarRutinaAuto, guardarRutinaManual, obtenerEjercicios } from '../../api/endpoints';
import { useAuth } from '../../components/context/AuthContext';

const MUSCULOS = ["Todos", "Pecho", "Espalda", "Piernas", "Hombros", "Brazos", "Abdominales"];

export default function CrearRutinaScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  
  const { userId, user } = useAuth();
  const { clienteIdProp, atletaId, rutinaInicial, isTemplate: inicialIsTemplate = false } = route.params || {};

  // ✅ BLINDAJE 1: Detectamos que es entrenador si tiene el rol, o si viene de la pantalla de un atleta
  const esEntrenador = user?.role === 'ENTRENADOR' || user?.rol === 'ENTRENADOR' || !!atletaId || !!clienteIdProp;
  
  const [viewMode, setViewMode] = useState(
      esEntrenador || rutinaInicial || inicialIsTemplate ? 'manual' : 'selector'
  );
  
  useEffect(() => {
      if (esEntrenador && viewMode !== 'manual') {
          setViewMode('manual');
      }
  }, [esEntrenador]);

  const [loadingIA, setLoadingIA] = useState(false);

  // --- ESTADOS FORMULARIO IA ---
  const [aiObjetivo, setAiObjetivo] = useState(null); 
  const [aiNivel, setAiNivel] = useState(null); 
  const [aiDias, setAiDias] = useState(null); 

  // --- ESTADOS MODO MANUAL ---
  const [nombreRutina, setNombreRutina] = useState(rutinaInicial?.nombre || "");
  const [descripcionRutina, setDescripcionRutina] = useState(rutinaInicial?.descripcion || "");
  const [ejerciciosSeleccionados, setEjerciciosSeleccionados] = useState([]);
  const [isTemplate, setIsTemplate] = useState(inicialIsTemplate);
  
  const [isBibliotecaOpen, setIsBibliotecaOpen] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [filtroMusculo, setFiltroMusculo] = useState("Todos");
  const [listaEjercicios, setListaEjercicios] = useState([]);
  const [loadingEjercicios, setLoadingEjercicios] = useState(false);

  useEffect(() => {
    if (viewMode === 'manual') {
      const delayDebounce = setTimeout(() => {
        fetchEjercicios();
      }, 400);
      return () => clearTimeout(delayDebounce);
    }
  }, [busqueda, filtroMusculo, viewMode]);

  const fetchEjercicios = async () => {
    try {
      setLoadingEjercicios(true);
      const data = await obtenerEjercicios();
      const filtrados = data.filter(ex => {
        const coincideTexto = ex.nombre.toLowerCase().includes(busqueda.toLowerCase());
        const coincideMusculo = filtroMusculo === "Todos" || ex.grupoMuscular === filtroMusculo;
        return coincideTexto && coincideMusculo;
      });
      setListaEjercicios(filtrados);
    } catch (error) {
      console.error("Error biblioteca:", error);
    } finally {
      setLoadingEjercicios(false);
    }
  };

  const handleGenerarIA = async () => {
    if (!aiObjetivo || !aiNivel || !aiDias) {
      return Alert.alert("Faltan datos", "Por favor, selecciona todas las opciones para que la IA pueda diseñar tu plan.");
    }

    setLoadingIA(true);
    try {
      const payload = {
        idCliente: userId,       
        clienteId: userId,       
        objetivo: aiObjetivo,
        nivel: aiNivel,
        diasSemana: aiDias,
        dias: aiDias            
      };
      
      await generarRutinaAuto(payload);
      
      Alert.alert("¡Plan Creado! 🧠", "La IA ha diseñado tu rutina con éxito.", [
        { text: "Ver mis rutinas", onPress: () => navigation.navigate("Rutinas") }
      ]);
    } catch (error) {
      const mensajeErrorJava = error.response?.data?.message || JSON.stringify(error.response?.data) || error.message;
      Alert.alert(
        "Error del Servidor (400)", 
        typeof mensajeErrorJava === 'string' ? mensajeErrorJava : "Error desconocido, revisa la consola."
      );
    } finally {
      setLoadingIA(false);
    }
  };

  const agregarAlWorkout = (ej) => {
    const nuevo = {
      idEjercicio: ej.id,
      nombre: ej.nombre,
      musculo: ej.grupoMuscular,
      imagen: ej.imagenUrl,
      series: "3",
      reps: "12",
      peso: "0",
      rpe: "8",
      notas: "",
      tempId: Math.random().toString(36).substr(2, 9)
    };
    setEjerciciosSeleccionados([...ejerciciosSeleccionados, nuevo]);
    setIsBibliotecaOpen(false);
    setBusqueda(""); 
  };

  const actualizarCampo = (tempId, campo, valor) => {
    setEjerciciosSeleccionados(prev => prev.map(e => 
      e.tempId === tempId ? { ...e, [campo]: valor } : e
    ));
  };

  const eliminarEjercicio = (tempId) => {
    setEjerciciosSeleccionados(prev => prev.filter(e => e.tempId !== tempId));
  };

  const finalizarGuardado = async () => {
    if (!nombreRutina.trim()) return Alert.alert("Falta información", "Dale un nombre a tu rutina.");
    if (ejerciciosSeleccionados.length === 0) return Alert.alert("Rutina vacía", "Añade al menos un ejercicio.");

    const isEditing = rutinaInicial && rutinaInicial.id;

    // 1. Formato exacto de tu WEB para CREAR
    const formatoCrear = ejerciciosSeleccionados.map(e => ({
      idEjercicio: e.idEjercicio, 
      series: parseInt(e.series) || 0,
      repeticiones: parseInt(e.reps) || 0,
      peso: parseFloat(e.peso) || 0,
      rpe: parseInt(e.rpe) || 0,
      notas: e.notas || "",
      dias: 1
    }));

    // 2. Formato exacto de tu WEB para EDITAR
    const formatoEditar = ejerciciosSeleccionados.map(e => ({
      ejercicio: { id: e.idEjercicio }, // 👈 Crucial para el PUT
      idEjercicio: e.idEjercicio,
      series: parseInt(e.series) || 0,
      repeticiones: parseInt(e.reps) || 0,
      peso: parseFloat(e.peso) || 0,
      rpe: parseInt(e.rpe) || 0,
      notas: e.notas || ""
    }));

    const payload = {
      nombre: nombreRutina,
      descripcion: descripcionRutina,
      objetivo: isTemplate ? "Plantilla Maestra" : "Personalizado",
      creador: isTemplate || clienteIdProp || atletaId ? "ENTRENADOR" : "CLIENTE",
      esPlantilla: isTemplate,
      entrenadorId: isTemplate ? userId : undefined,
      idCliente: !isTemplate ? (clienteIdProp || atletaId || userId) : undefined,
      
      // ✅ MAGIA: Usamos la palabra correcta según lo que estemos haciendo
      ejercicios: isEditing ? formatoEditar : formatoCrear,
      detalles: isEditing ? formatoEditar : undefined
    };

    // Limpiamos los campos undefined (Igual que en la web)
    Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);

    try {
      if (isEditing) {
        await actualizarRutina(rutinaInicial.id, payload);
        Alert.alert("¡Actualizada!", "La rutina se ha modificado correctamente.", [{ text: "OK", onPress: () => navigation.goBack() }]);
      } else {
        await guardarRutinaManual(payload);
        Alert.alert("¡Hecho!", "Rutina creada con éxito", [{ text: "OK", onPress: () => navigation.goBack() }]);
      }
    } catch (error) {
      Alert.alert("Error al guardar", "Revisa tu conexión.");
    }
  };

  // ==========================================
  // VISTA 1: SELECTOR INICIAL (Solo para Clientes)
  // ==========================================
  if (viewMode === 'selector' && !esEntrenador) {
    return (
      <View style={styles.container}>
        <View style={styles.topBarSimple}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
            <ChevronLeft color="white" size={28} />
          </TouchableOpacity>
        </View>

        <View style={styles.centerContent}>
          <Text style={styles.mainTitle}>CREAR NUEVA RUTINA</Text>
          <Text style={styles.subTitle}>¿Cómo quieres empezar hoy?</Text>

          <TouchableOpacity style={styles.optionCard} onPress={() => setViewMode('ia')}>
            <View style={[styles.iconWrap, { backgroundColor: 'rgba(250, 204, 21, 0.1)' }]}>
              <Sparkles size={32} color="#FACC15" />
            </View>
            <Text style={styles.optionTitle}>GENERAR CON IA</Text>
            <Text style={styles.optionDesc}>Plan personalizado automático e inteligente.</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.optionCard} onPress={() => setViewMode('manual')}>
            <View style={[styles.iconWrap, { backgroundColor: 'rgba(255, 255, 255, 0.1)' }]}>
              <Edit3 size={32} color="white" />
            </View>
            <Text style={styles.optionTitle}>DISEÑAR MANUAL</Text>
            <Text style={styles.optionDesc}>Crea tu rutina ejercicio a ejercicio desde cero.</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ==========================================
  // VISTA 2: ARQUITECTO IA 
  // ==========================================
  if (viewMode === 'ia' && !esEntrenador) {
    return (
      <View style={styles.container}>
        <View style={styles.topBarSimple}>
          <TouchableOpacity onPress={() => setViewMode('selector')} style={styles.iconBtn}>
            <ChevronLeft color="white" size={28} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
          
          <View style={styles.iaHeader}>
            <View style={styles.iaIconBubble}>
                <Brain size={36} color="#FACC15" />
            </View>
            <Text style={styles.iaTitle}>ARQUITECTO <Text style={{color: '#FACC15'}}>IA</Text></Text>
            <Text style={styles.iaSub}>Diseña tu plan de entrenamiento inteligente en segundos.</Text>
          </View>

          {/* 1. OBJETIVO */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.circleNumber}><Text style={styles.numberText}>1</Text></View>
              <Text style={styles.sectionTitle}>SELECCIONA TU OBJETIVO PRINCIPAL</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 15, paddingRight: 20 }}>
              <TouchableOpacity style={[styles.iaCardLarge, aiObjetivo === 'HIPERTROFIA' && styles.iaCardActive]} onPress={() => setAiObjetivo('HIPERTROFIA')}>
                <Dumbbell size={32} color={aiObjetivo === 'HIPERTROFIA' ? '#FACC15' : '#777'} style={{marginBottom: 15}} />
                <Text style={[styles.iaCardTitle, aiObjetivo === 'HIPERTROFIA' && styles.iaTextActive]}>HIPERTROFIA</Text>
                <Text style={styles.iaCardSub}>Volumen Muscular</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.iaCardLarge, aiObjetivo === 'FUERZA' && styles.iaCardActive]} onPress={() => setAiObjetivo('FUERZA')}>
                <Trophy size={32} color={aiObjetivo === 'FUERZA' ? '#FACC15' : '#777'} style={{marginBottom: 15}} />
                <Text style={[styles.iaCardTitle, aiObjetivo === 'FUERZA' && styles.iaTextActive]}>FUERZA</Text>
                <Text style={styles.iaCardSub}>Powerlifting / 5x5</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.iaCardLarge, aiObjetivo === 'DEFINICION' && styles.iaCardActive]} onPress={() => setAiObjetivo('DEFINICION')}>
                <Flame size={32} color={aiObjetivo === 'DEFINICION' ? '#FACC15' : '#777'} style={{marginBottom: 15}} />
                <Text style={[styles.iaCardTitle, aiObjetivo === 'DEFINICION' && styles.iaTextActive]}>DEFINICIÓN</Text>
                <Text style={styles.iaCardSub}>Metabólico / Cardio</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          {/* 2. EXPERIENCIA */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.circleNumber}><Text style={styles.numberText}>2</Text></View>
              <Text style={styles.sectionTitle}>TU EXPERIENCIA</Text>
            </View>
            <View style={{ gap: 10 }}>
              <TouchableOpacity style={[styles.iaCardRow, aiNivel === 'PRINCIPIANTE' && styles.iaCardActive]} onPress={() => setAiNivel('PRINCIPIANTE')}>
                <View>
                    <Text style={[styles.iaCardTitleRow, aiNivel === 'PRINCIPIANTE' && styles.iaTextActive]}>PRINCIPIANTE</Text>
                    <Text style={styles.iaCardSub}>0-1 año</Text>
                </View>
                {aiNivel === 'PRINCIPIANTE' && <CheckCircle2 size={20} color="#FACC15"/>}
              </TouchableOpacity>
              <TouchableOpacity style={[styles.iaCardRow, aiNivel === 'INTERMEDIO' && styles.iaCardActive]} onPress={() => setAiNivel('INTERMEDIO')}>
                <View>
                    <Text style={[styles.iaCardTitleRow, aiNivel === 'INTERMEDIO' && styles.iaTextActive]}>INTERMEDIO</Text>
                    <Text style={styles.iaCardSub}>1-3 años</Text>
                </View>
                {aiNivel === 'INTERMEDIO' && <CheckCircle2 size={20} color="#FACC15"/>}
              </TouchableOpacity>
              <TouchableOpacity style={[styles.iaCardRow, aiNivel === 'AVANZADO' && styles.iaCardActive]} onPress={() => setAiNivel('AVANZADO')}>
                <View>
                    <Text style={[styles.iaCardTitleRow, aiNivel === 'AVANZADO' && styles.iaTextActive]}>AVANZADO</Text>
                    <Text style={styles.iaCardSub}>+3 años</Text>
                </View>
                {aiNivel === 'AVANZADO' && <CheckCircle2 size={20} color="#FACC15"/>}
              </TouchableOpacity>
            </View>
          </View>

          {/* 3. DISPONIBILIDAD */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.circleNumber}><Text style={styles.numberText}>3</Text></View>
              <Text style={styles.sectionTitle}>DISPONIBILIDAD SEMANAL</Text>
            </View>
            <View style={styles.gridContainer}>
              <TouchableOpacity style={[styles.iaCardGrid, aiDias === 3 && styles.iaCardActive]} onPress={() => setAiDias(3)}>
                <View>
                    <Text style={[styles.iaCardTitleRow, aiDias === 3 && styles.iaTextActive]}>3 DÍAS</Text>
                    <Text style={styles.iaCardSub}>Full Body</Text>
                </View>
                {aiDias === 3 && <CheckCircle2 size={20} color="#FACC15"/>}
              </TouchableOpacity>
              <TouchableOpacity style={[styles.iaCardGrid, aiDias === 4 && styles.iaCardActive]} onPress={() => setAiDias(4)}>
                <View>
                    <Text style={[styles.iaCardTitleRow, aiDias === 4 && styles.iaTextActive]}>4 DÍAS</Text>
                    <Text style={styles.iaCardSub}>Torso/Pierna</Text>
                </View>
                {aiDias === 4 && <CheckCircle2 size={20} color="#FACC15"/>}
              </TouchableOpacity>
              <TouchableOpacity style={[styles.iaCardGrid, aiDias === 5 && styles.iaCardActive]} onPress={() => setAiDias(5)}>
                <View>
                    <Text style={[styles.iaCardTitleRow, aiDias === 5 && styles.iaTextActive]}>5 DÍAS</Text>
                    <Text style={styles.iaCardSub}>Híbrida</Text>
                </View>
                {aiDias === 5 && <CheckCircle2 size={20} color="#FACC15"/>}
              </TouchableOpacity>
              <TouchableOpacity style={[styles.iaCardGrid, aiDias === 6 && styles.iaCardActive]} onPress={() => setAiDias(6)}>
                <View>
                    <Text style={[styles.iaCardTitleRow, aiDias === 6 && styles.iaTextActive]}>6 DÍAS</Text>
                    <Text style={styles.iaCardSub}>PPL</Text>
                </View>
                {aiDias === 6 && <CheckCircle2 size={20} color="#FACC15"/>}
              </TouchableOpacity>
            </View>
          </View>

        </ScrollView>

        <View style={styles.bottomFixed}>
          <TouchableOpacity style={styles.btnGenerar} onPress={handleGenerarIA} disabled={loadingIA}>
            {loadingIA ? (
                <ActivityIndicator color="black" />
            ) : (
                <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
                    <Sparkles size={20} color="black" />
                    <Text style={styles.btnGenerarText}>GENERAR PLAN INTELIGENTE</Text>
                </View>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ==========================================
  // VISTA 3: MODO CREACIÓN MANUAL
  // ==========================================
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => {
              if (esEntrenador || rutinaInicial) {
                  navigation.goBack();
              } else {
                  setViewMode('selector');
              }
          }} 
          style={styles.iconBtn}
        >
          <ChevronLeft color="white" size={28} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isTemplate ? "PLANTILLA" : "NUEVA RUTINA"}</Text>
        <TouchableOpacity onPress={finalizarGuardado} style={styles.saveBtn}>
          <Save color="#0A0A0A" size={20} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : null} style={{flex: 1}}>
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          
          <View style={styles.cardInfo}>
            <TextInput 
              style={styles.inputNombre} 
              placeholder="Nombre del entrenamiento" 
              placeholderTextColor="#555"
              value={nombreRutina}
              onChangeText={setNombreRutina}
            />
            <TextInput 
              style={styles.inputDesc} 
              placeholder="Añade una descripción u objetivo..." 
              placeholderTextColor="#555"
              multiline
              value={descripcionRutina}
              onChangeText={setDescripcionRutina}
            />
            
            {esEntrenador && (
               <TouchableOpacity 
                style={[styles.templateToggle, isTemplate && styles.templateToggleActive]} 
                onPress={() => setIsTemplate(!isTemplate)}
               >
                 <View style={[styles.radio, isTemplate && styles.radioActive]} />
                 <Text style={styles.templateText}>Guardar como Plantilla Maestra</Text>
               </TouchableOpacity>
            )}
          </View>

          <View style={styles.workoutArea}>
            <View style={styles.rowBetween}>
              <Text style={styles.label}>TU RUTINA ({ejerciciosSeleccionados.length})</Text>
              <TouchableOpacity style={styles.addBtn} onPress={() => setIsBibliotecaOpen(true)}>
                <Plus color="#FACC15" size={16} />
                <Text style={styles.addBtnText}>AÑADIR</Text>
              </TouchableOpacity>
            </View>

            {ejerciciosSeleccionados.length === 0 ? (
              <View style={styles.emptyBox}>
                <Dumbbell color="#1A1A1A" size={70} />
                <Text style={styles.emptyText}>No hay ejercicios añadidos</Text>
              </View>
            ) : (
              ejerciciosSeleccionados.map((item) => (
                <View key={item.tempId} style={styles.exerciseCard}>
                  
                  <View style={styles.exerciseHeader}>
                    {item.imagen ? (
                      <Image source={{uri: item.imagen}} style={styles.exerciseImg} />
                    ) : (
                      <View style={styles.exerciseImgPlaceholder}>
                        <ImageIcon color="#333" size={24} />
                      </View>
                    )}
                    
                    <View style={styles.exerciseHeaderText}>
                      <Text style={styles.exerciseName}>{item.nombre}</Text>
                      <Text style={styles.exerciseMuscle}>{item.musculo}</Text>
                    </View>

                    <TouchableOpacity onPress={() => eliminarEjercicio(item.tempId)} style={styles.trashBtn}>
                      <Trash2 color="#EF4444" size={20} />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.inputsGrid}>
                    <View style={styles.inputWrap}>
                      <Text style={styles.inputLabel}>SERIES</Text>
                      <TextInput 
                        style={styles.gridInput} 
                        keyboardType="numeric" 
                        value={item.series}
                        onChangeText={(v) => actualizarCampo(item.tempId, 'series', v)}
                      />
                    </View>
                    <View style={styles.inputWrap}>
                      <Text style={styles.inputLabel}>REPS</Text>
                      <TextInput 
                        style={styles.gridInput} 
                        keyboardType="numeric"
                        value={item.reps}
                        onChangeText={(v) => actualizarCampo(item.tempId, 'reps', v)}
                      />
                    </View>
                    <View style={styles.inputWrap}>
                      <Text style={[styles.inputLabel, {color: '#FACC15'}]}>PESO</Text>
                      <TextInput 
                        style={[styles.gridInput, {color: '#FACC15'}]} 
                        keyboardType="numeric"
                        value={item.peso}
                        onChangeText={(v) => actualizarCampo(item.tempId, 'peso', v)}
                      />
                    </View>
                    <View style={styles.inputWrap}>
                      <Text style={[styles.inputLabel, {color: '#60A5FA'}]}>RPE</Text>
                      <TextInput 
                        style={[styles.gridInput, {color: '#60A5FA'}]} 
                        keyboardType="numeric"
                        value={item.rpe}
                        onChangeText={(v) => actualizarCampo(item.tempId, 'rpe', v)}
                      />
                    </View>
                  </View>
                  
                  <TextInput 
                    style={styles.notasInput} 
                    placeholder="Instrucciones o notas técnicas..." 
                    placeholderTextColor="#444"
                    value={item.notas}
                    onChangeText={(v) => actualizarCampo(item.tempId, 'notas', v)}
                  />
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* --- MODAL BIBLIOTECA --- */}
      <Modal visible={isBibliotecaOpen} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalBody}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Agregar Ejercicio</Text>
            <TouchableOpacity onPress={() => setIsBibliotecaOpen(false)}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.searchBox}>
            <Search color="#666" size={18} />
            <TextInput 
              style={styles.searchInput} 
              placeholder="Buscar ejercicio..." 
              placeholderTextColor="#666"
              value={busqueda}
              onChangeText={setBusqueda}
            />
          </View>

          <View style={styles.filterContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{paddingHorizontal: 20}}>
              {MUSCULOS.map(m => (
                <TouchableOpacity 
                  key={m} 
                  style={[styles.filterPill, filtroMusculo === m && styles.filterPillActive]}
                  onPress={() => setFiltroMusculo(m)}
                >
                  <Text style={[styles.filterPillText, filtroMusculo === m && styles.filterPillTextActive]}>
                    {m === "Todos" ? "Todos Músculos" : m}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <Text style={styles.recentLabel}>Ejercicios Disponibles</Text>

          {loadingEjercicios ? (
            <ActivityIndicator color="#FACC15" style={{marginTop: 50}} />
          ) : (
            <FlatList 
              data={listaEjercicios}
              keyExtractor={item => item.id.toString()}
              contentContainerStyle={{paddingBottom: 40}}
              renderItem={({item}) => (
                <TouchableOpacity style={styles.libItem} onPress={() => agregarAlWorkout(item)}>
                  {item.imagenUrl ? (
                    <Image source={{uri: item.imagenUrl}} style={styles.libImg} />
                  ) : (
                    <View style={styles.libImgPlaceholder} />
                  )}
                  
                  <View style={styles.libTextWrap}>
                    <Text style={styles.libName}>{item.nombre}</Text>
                    <Text style={styles.libMuscle}>{item.grupoMuscular}</Text>
                  </View>

                  <View style={styles.libAddIcon}>
                    <Plus color="#FACC15" size={20} />
                  </View>
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050505' },
  
  // NAVEGACIÓN COMÚN
  topBarSimple: { paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingHorizontal: 20, paddingBottom: 10, backgroundColor: '#050505' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingHorizontal: 20, paddingBottom: 15, backgroundColor: '#0a0a0a', borderBottomWidth: 1, borderBottomColor: '#1A1A1A' },
  iconBtn: { padding: 5 },
  headerTitle: { color: 'white', fontWeight: '800', fontSize: 16, letterSpacing: 0.5 },
  saveBtn: { backgroundColor: '#FACC15', padding: 8, borderRadius: 20 },
  scroll: { flex: 1 },

  // PANTALLA 1: SELECTOR
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, marginTop: -50 },
  mainTitle: { color: 'white', fontSize: 30, fontWeight: '900', textTransform: 'uppercase', marginBottom: 5, letterSpacing: 1 },
  subTitle: { color: '#888', fontSize: 16, marginBottom: 40 },
  optionCard: { backgroundColor: '#121214', width: '100%', borderRadius: 24, padding: 30, alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#222' },
  iconWrap: { width: 70, height: 70, borderRadius: 35, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  optionTitle: { color: 'white', fontSize: 20, fontWeight: '900', textTransform: 'uppercase', marginBottom: 10 },
  optionDesc: { color: '#777', fontSize: 14, textAlign: 'center', lineHeight: 22, paddingHorizontal: 20 },

  // === PANTALLA 2: ARQUITECTO IA ===
  iaHeader: { alignItems: 'center', marginBottom: 40, marginTop: 10 },
  iaIconBubble: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(250, 204, 21, 0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 15, borderWidth: 1, borderColor: 'rgba(250, 204, 21, 0.3)' },
  iaTitle: { color: 'white', fontSize: 32, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
  iaSub: { color: '#aaa', fontSize: 14, textAlign: 'center', marginTop: 5 },
  
  section: { marginBottom: 35 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, gap: 10 },
  circleNumber: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#FACC15', alignItems: 'center', justifyContent: 'center' },
  numberText: { color: '#FACC15', fontSize: 12, fontWeight: '900' },
  sectionTitle: { color: '#FACC15', fontSize: 13, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' },

  iaCardActive: { borderColor: '#FACC15', backgroundColor: 'rgba(250, 204, 21, 0.05)' },
  iaTextActive: { color: '#FACC15' },
  iaCardSub: { color: '#777', fontSize: 12, marginTop: 2 },

  iaCardLarge: { backgroundColor: '#121214', width: 160, height: 160, borderRadius: 24, padding: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#222' },
  iaCardTitle: { color: 'white', fontWeight: '900', fontSize: 16, textTransform: 'uppercase' },

  iaCardRow: { backgroundColor: '#121214', borderRadius: 20, padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 2, borderColor: '#222' },
  iaCardTitleRow: { color: 'white', fontWeight: '900', fontSize: 16, textTransform: 'uppercase' },

  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  iaCardGrid: { backgroundColor: '#121214', borderRadius: 20, padding: 20, width: '48%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 2, borderColor: '#222' },

  bottomFixed: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, paddingBottom: Platform.OS === 'ios' ? 40 : 20, backgroundColor: 'rgba(5,5,5,0.95)', borderTopWidth: 1, borderTopColor: '#1A1A1A' },
  btnGenerar: { backgroundColor: '#FACC15', paddingVertical: 18, borderRadius: 16, alignItems: 'center', shadowColor: "#FACC15", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
  btnGenerarText: { color: '#0A0A0A', fontWeight: '900', fontSize: 16, letterSpacing: 0.5 },

  // PANTALLA 3: MODO MANUAL
  cardInfo: { padding: 20 },
  inputNombre: { color: 'white', fontSize: 28, fontWeight: '800', marginBottom: 5 },
  inputDesc: { color: '#888', fontSize: 15, minHeight: 40, marginBottom: 15 },
  templateToggle: { flexDirection: 'row', alignItems: 'center', marginTop: 5, opacity: 0.6 },
  templateToggleActive: { opacity: 1 },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: '#444', marginRight: 10 },
  radioActive: { backgroundColor: '#FACC15', borderColor: '#FACC15' },
  templateText: { color: 'white', fontWeight: '600', fontSize: 13 },
  workoutArea: { paddingHorizontal: 20, paddingBottom: 40 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, marginTop: 10 },
  label: { color: '#555', fontWeight: '800', fontSize: 12, letterSpacing: 1 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#1A1A1A', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 12 },
  addBtnText: { color: '#FACC15', fontWeight: '800', fontSize: 12 },
  emptyBox: { alignItems: 'center', justifyContent: 'center', marginTop: 40, opacity: 0.5 },
  emptyText: { color: 'white', fontWeight: '700', marginTop: 15, fontSize: 14 },
  exerciseCard: { backgroundColor: '#0A0A0A', borderRadius: 20, padding: 16, marginBottom: 15, borderWidth: 1, borderColor: '#1A1A1A' },
  exerciseHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  exerciseImg: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#111', marginRight: 12 },
  exerciseImgPlaceholder: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#111', marginRight: 12, alignItems: 'center', justifyContent: 'center' },
  exerciseHeaderText: { flex: 1 },
  exerciseName: { color: 'white', fontWeight: '700', fontSize: 16, marginBottom: 2 },
  exerciseMuscle: { color: '#888', fontSize: 12 },
  trashBtn: { padding: 5 },
  inputsGrid: { flexDirection: 'row', backgroundColor: '#111', borderRadius: 16, padding: 12, gap: 5 },
  inputWrap: { flex: 1, alignItems: 'center' },
  inputLabel: { color: '#555', fontSize: 9, fontWeight: '800', marginBottom: 4 },
  gridInput: { color: 'white', fontSize: 18, fontWeight: '800', textAlign: 'center', padding: 0 },
  notasInput: { color: '#888', fontSize: 14, marginTop: 15, borderTopWidth: 1, borderTopColor: '#1A1A1A', paddingTop: 12 },

  // MODAL BIBLIOTECA
  modalBody: { flex: 1, backgroundColor: '#050505' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: Platform.OS === 'ios' ? 20 : 20 },
  modalTitle: { color: 'white', fontWeight: '700', fontSize: 18 },
  cancelText: { color: '#60A5FA', fontSize: 16 }, 
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1A1A', marginHorizontal: 20, marginBottom: 15, borderRadius: 10, paddingHorizontal: 12, height: 44 },
  searchInput: { flex: 1, color: 'white', marginLeft: 10, fontSize: 16 },
  filterContainer: { marginBottom: 20 },
  filterPill: { backgroundColor: '#1A1A1A', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 10, borderWidth: 1, borderColor: '#222' },
  filterPillActive: { backgroundColor: '#27272A', borderColor: '#444' },
  filterPillText: { color: '#888', fontWeight: '600', fontSize: 13 },
  filterPillTextActive: { color: 'white' },
  recentLabel: { color: '#555', fontSize: 13, fontWeight: '600', paddingHorizontal: 20, marginBottom: 10 },
  libItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#111' },
  libImg: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#111', marginRight: 15 },
  libImgPlaceholder: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#1A1A1A', marginRight: 15 },
  libTextWrap: { flex: 1, paddingRight: 10 },
  libName: { color: 'white', fontWeight: '500', fontSize: 16, marginBottom: 4 },
  libMuscle: { color: '#888', fontSize: 13 },
  libAddIcon: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(250, 204, 21, 0.1)' }
});