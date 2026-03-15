import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, 
  Image, Modal, ActivityIndicator, Platform, FlatList, Alert, KeyboardAvoidingView 
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { 
  Search, Trash2, Plus, X, ChevronLeft, Save, 
  Dumbbell, Image as ImageIcon
} from 'lucide-react-native';

import { obtenerRutinasCliente, obtenerEjercicios, actualizarRutina } from '../../api/endpoints';
import { useAuth } from '../../components/context/AuthContext';

const MUSCULOS = ["Todos", "Pecho", "Espalda", "Piernas", "Hombros", "Brazos", "Abdominales", "Cardio"];

export default function EditarRutinaScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { userId } = useAuth();
  
  // Recibimos el ID de la rutina y (opcionalmente) el ID del cliente si somos entrenador
  const { rutinaId, clienteId } = route.params || {};

  const [loading, setLoading] = useState(true);
  const [rutinaData, setRutinaData] = useState({ nombre: "", objetivo: "", nivel: "", descripcion: "" });
  const [detalles, setDetalles] = useState([]); 

  // Modal y Buscador
  const [isBibliotecaOpen, setIsBibliotecaOpen] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [filtroMusculo, setFiltroMusculo] = useState("Todos");
  const [allExercises, setAllExercises] = useState([]);
  const [loadingEjercicios, setLoadingEjercicios] = useState(false);

  // --- CARGA INICIAL DE DATOS ---
  useEffect(() => {
    const loadData = async () => {
      // Si somos entrenador y nos pasan clienteId, usamos ese, sino usamos nuestro userId
      const idOwner = clienteId || userId;
      
      try {
        const [rutinas, ejercicios] = await Promise.all([
          obtenerRutinasCliente(idOwner),
          obtenerEjercicios()
        ]);

        const rutinaEncontrada = rutinas.find(r => r.id === rutinaId);
        
        if (rutinaEncontrada) {
          setRutinaData({
            nombre: rutinaEncontrada.nombre,
            objetivo: rutinaEncontrada.objetivo,
            nivel: rutinaEncontrada.nivel,
            descripcion: rutinaEncontrada.descripcion
          });
          
          // Expandir las series para la UI móvil
          const detallesExpandidos = (rutinaEncontrada.detalles || []).map(d => {
            const numSeries = d.series || 3;
            const setsArray = Array.from({ length: numSeries }, () => ({
              reps: (d.repeticiones || 10).toString(),
              peso: (d.peso || 0).toString(),
              rpe: (d.rpe || 8).toString(),
              tempId: Math.random().toString(36).substr(2, 9) // ID único para React List
            }));

            return {
              ...d,
              sets: setsArray,
              notas: d.notas || "",
              ejercicioTempId: Math.random().toString(36).substr(2, 9)
            };
          });
          setDetalles(detallesExpandidos);
        } else {
            Alert.alert("Error", "No se encontró la rutina.");
            navigation.goBack();
        }
        
        setAllExercises(ejercicios || []);
      } catch (error) {
        console.error("Error cargando datos:", error);
        Alert.alert("Error", "Hubo un problema al cargar la rutina.");
      } finally {
        setLoading(false);
      }
    };
    if (rutinaId) loadData();
  }, [rutinaId]);

  // --- LÓGICA DE SERIES INDIVIDUALES ---
  const handleSetChange = (exerciseIndex, setIndex, field, value) => {
    const newDetalles = [...detalles];
    newDetalles[exerciseIndex].sets[setIndex][field] = value;
    setDetalles(newDetalles);
  };

  const addSetToExercise = (exerciseIndex) => {
    const newDetalles = [...detalles];
    const currentSets = newDetalles[exerciseIndex].sets;
    const lastSet = currentSets[currentSets.length - 1] || { reps: "10", peso: "0", rpe: "8" };
    newDetalles[exerciseIndex].sets.push({ ...lastSet, tempId: Math.random().toString(36).substr(2, 9) });
    setDetalles(newDetalles);
  };

  const removeSetFromExercise = (exerciseIndex, setIndex) => {
    const newDetalles = [...detalles];
    if (newDetalles[exerciseIndex].sets.length > 1) {
      newDetalles[exerciseIndex].sets.splice(setIndex, 1);
      setDetalles(newDetalles);
    }
  };

  const handleNoteChange = (index, value) => {
    const updated = [...detalles];
    updated[index].notas = value;
    setDetalles(updated);
  };

  const removeExercise = (index) => {
    Alert.alert(
      "Eliminar Ejercicio",
      "¿Seguro que quieres quitar este ejercicio de la rutina?",
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Eliminar", 
          style: "destructive",
          onPress: () => {
            const updated = detalles.filter((_, i) => i !== index);
            setDetalles(updated);
          }
        }
      ]
    );
  };

  const addExerciseToRoutine = (ejercicio) => {
    const nuevoDetalle = {
      ejercicio: ejercicio,
      notas: "",
      ejercicioTempId: Math.random().toString(36).substr(2, 9),
      sets: [
        { reps: "10", peso: "0", rpe: "8", tempId: Math.random().toString(36).substr(2, 9) },
        { reps: "10", peso: "0", rpe: "8", tempId: Math.random().toString(36).substr(2, 9) },
        { reps: "10", peso: "0", rpe: "8", tempId: Math.random().toString(36).substr(2, 9) }
      ]
    };
    setDetalles([...detalles, nuevoDetalle]);
    setIsBibliotecaOpen(false);
    setBusqueda("");
  };

  // --- GUARDADO AL SERVIDOR ---
  const saveChanges = async () => {
    if (!rutinaData.nombre.trim()) return Alert.alert("Falta información", "El nombre es obligatorio.");
    if (detalles.length === 0) return Alert.alert("Rutina vacía", "Añade al menos un ejercicio.");

    try {
      // ✅ CALCADO DE TU VERSIÓN WEB Y BLINDADO
      const listaProcesada = detalles.map(d => {
        const totalSets = d.sets.length;
        const firstSet = d.sets[0] || { reps: "0", peso: "0", rpe: "0" };

        return {
          ejercicio: { id: d.ejercicio?.id }, // 👈 La etiqueta que pide Java (Protegida contra nulos)
          idEjercicio: d.ejercicio?.id, 
          series: totalSets,
          repeticiones: parseInt(firstSet.reps) || 0,
          peso: parseFloat(firstSet.peso) || 0,
          rpe: parseInt(firstSet.rpe) || 0,
          notas: d.notas || "",
          dias: 1 // 👈 Añadido igual que en la web por si Java lo exige
        };
      });

      const payload = { 
        ...rutinaData, 
        id: rutinaId, // 👈 Añadimos el ID en la raíz por si el PUT lo valida
        detalles: listaProcesada, 
        ejercicios: listaProcesada
      };
      
      await actualizarRutina(rutinaId, payload);
      
      Alert.alert("¡Hecho!", "Rutina actualizada correctamente.", [
        { text: "OK", onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      Alert.alert("Error", "No se pudo actualizar la rutina.");
    }
  };

  // Filtro Modal
  const filteredExercises = allExercises.filter(ex => {
    const matchesText = ex.nombre.toLowerCase().includes(busqueda.toLowerCase());
    const matchesMuscle = filtroMusculo === "Todos" || (ex.grupoMuscular && ex.grupoMuscular.toUpperCase() === filtroMusculo.toUpperCase());
    return matchesText && matchesMuscle;
  });

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FACC15" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* HEADER PRINCIPAL */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <ChevronLeft color="white" size={28} />
        </TouchableOpacity>
        <View style={{alignItems: 'center'}}>
           <Text style={styles.headerSubtitle}>MODO EDICIÓN</Text>
           <Text style={styles.headerTitle}>ACTUALIZAR RUTINA</Text>
        </View>
        <TouchableOpacity onPress={saveChanges} style={styles.saveBtn}>
          <Save color="#0A0A0A" size={20} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : null} style={{flex: 1}}>
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          
          {/* SECCIÓN DE DATOS DE LA RUTINA */}
          <View style={styles.cardInfo}>
            <TextInput 
              style={styles.inputNombre} 
              placeholder="Nombre del entrenamiento" 
              placeholderTextColor="#555"
              value={rutinaData.nombre}
              onChangeText={(text) => setRutinaData({...rutinaData, nombre: text})}
            />
            <TextInput 
              style={styles.inputDesc} 
              placeholder="Escribe aquí el objetivo del plan..." 
              placeholderTextColor="#555"
              multiline
              value={rutinaData.descripcion}
              onChangeText={(text) => setRutinaData({...rutinaData, descripcion: text})}
            />
          </View>

          {/* ÁREA DE EJERCICIOS */}
          <View style={styles.workoutArea}>
            <View style={styles.rowBetween}>
              <Text style={styles.label}>RUTINA ACTUAL ({detalles.length})</Text>
              <TouchableOpacity style={styles.addBtn} onPress={() => setIsBibliotecaOpen(true)}>
                <Plus color="#FACC15" size={16} />
                <Text style={styles.addBtnText}>AÑADIR</Text>
              </TouchableOpacity>
            </View>

            {detalles.map((detalle, exIndex) => (
                <View key={detalle.ejercicioTempId} style={styles.exerciseCard}>
                  
                  {/* CABECERA DEL EJERCICIO */}
                  <View style={styles.exerciseHeader}>
                    {detalle.ejercicio?.imagenUrl ? (
                      <Image source={{uri: detalle.ejercicio.imagenUrl}} style={styles.exerciseImg} />
                    ) : (
                      <View style={styles.exerciseImgPlaceholder}>
                        <ImageIcon color="#333" size={24} />
                      </View>
                    )}
                    
                    <View style={styles.exerciseHeaderText}>
                      <Text style={styles.exerciseName}>{detalle.ejercicio?.nombre}</Text>
                      <Text style={styles.exerciseMuscle}>{detalle.ejercicio?.grupoMuscular}</Text>
                    </View>

                    <TouchableOpacity onPress={() => removeExercise(exIndex)} style={styles.trashBtn}>
                      <Trash2 color="#EF4444" size={20} />
                    </TouchableOpacity>
                  </View>

                  {/* CABECERA TABLA DE SERIES */}
                  <View style={styles.tableHeader}>
                    <Text style={[styles.thText, {width: 30}]}>SET</Text>
                    <Text style={[styles.thText, {flex: 1}]}>KG</Text>
                    <Text style={[styles.thText, {flex: 1}]}>REPS</Text>
                    <Text style={[styles.thText, {flex: 1}]}>RPE</Text>
                    <View style={{width: 30}} />
                  </View>

                  {/* FILAS DE SERIES */}
                  {detalle.sets.map((set, setIndex) => (
                    <View key={set.tempId} style={styles.tableRow}>
                      <Text style={styles.tdIndex}>{setIndex + 1}</Text>
                      
                      <View style={{flex: 1, paddingHorizontal: 4}}>
                        <TextInput 
                          style={[styles.gridInput, {color: '#FACC15'}]} 
                          keyboardType="numeric"
                          value={set.peso}
                          onChangeText={(v) => handleSetChange(exIndex, setIndex, 'peso', v)}
                        />
                      </View>
                      
                      <View style={{flex: 1, paddingHorizontal: 4}}>
                         <TextInput 
                          style={styles.gridInput} 
                          keyboardType="numeric"
                          value={set.reps}
                          onChangeText={(v) => handleSetChange(exIndex, setIndex, 'reps', v)}
                        />
                      </View>

                      <View style={{flex: 1, paddingHorizontal: 4}}>
                         <TextInput 
                          style={[styles.gridInput, {color: '#60A5FA'}]} 
                          keyboardType="numeric"
                          value={set.rpe}
                          onChangeText={(v) => handleSetChange(exIndex, setIndex, 'rpe', v)}
                        />
                      </View>
                      
                      <TouchableOpacity style={styles.delSetBtn} onPress={() => removeSetFromExercise(exIndex, setIndex)}>
                          <Trash2 color="#555" size={16} />
                      </TouchableOpacity>
                    </View>
                  ))}

                  <TouchableOpacity style={styles.addSetBtnRow} onPress={() => addSetToExercise(exIndex)}>
                    <Plus size={14} color="#777" />
                    <Text style={styles.addSetBtnText}>AÑADIR SERIE</Text>
                  </TouchableOpacity>

                  <TextInput 
                    style={styles.notasInput} 
                    placeholder="Instrucciones o notas técnicas..." 
                    placeholderTextColor="#444"
                    value={detalle.notas}
                    onChangeText={(v) => handleNoteChange(exIndex, v)}
                  />
                </View>
            ))}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* --- MODAL BIBLIOTECA (Estilo iOS) --- */}
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

          {loadingEjercicios ? (
            <ActivityIndicator color="#FACC15" style={{marginTop: 50}} />
          ) : (
            <FlatList 
              data={filteredExercises}
              keyExtractor={item => item.id.toString()}
              contentContainerStyle={{paddingBottom: 40}}
              renderItem={({item}) => (
                <TouchableOpacity style={styles.libItem} onPress={() => addExerciseToRoutine(item)}>
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#050505' },
  
  // HEADER
  header: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', 
    paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingHorizontal: 20, paddingBottom: 15,
    backgroundColor: '#0a0a0a', borderBottomWidth: 1, borderBottomColor: '#1A1A1A'
  },
  headerSubtitle: { color: '#FACC15', fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 2 },
  headerTitle: { color: 'white', fontWeight: '900', fontSize: 16, letterSpacing: 0.5 },
  saveBtn: { backgroundColor: '#FACC15', padding: 8, borderRadius: 20 },
  iconBtn: { padding: 5 },
  
  scroll: { flex: 1 },
  
  // INFO RUTINA
  cardInfo: { padding: 20 },
  inputNombre: { color: 'white', fontSize: 28, fontWeight: '800', marginBottom: 5 },
  inputDesc: { color: '#888', fontSize: 15, minHeight: 40, marginBottom: 15 },

  // ÁREA DE TRABAJO
  workoutArea: { paddingHorizontal: 20, paddingBottom: 40 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, marginTop: 10 },
  label: { color: '#555', fontWeight: '800', fontSize: 12, letterSpacing: 1 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#1A1A1A', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 12 },
  addBtnText: { color: '#FACC15', fontWeight: '800', fontSize: 12 },

  // TARJETA DE EJERCICIO
  exerciseCard: { backgroundColor: '#0A0A0A', borderRadius: 20, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#1A1A1A' },
  exerciseHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  exerciseImg: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#111', marginRight: 12 },
  exerciseImgPlaceholder: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#111', marginRight: 12, alignItems: 'center', justifyContent: 'center' },
  exerciseHeaderText: { flex: 1 },
  exerciseName: { color: 'white', fontWeight: '700', fontSize: 16, marginBottom: 2 },
  exerciseMuscle: { color: '#888', fontSize: 12 },
  trashBtn: { padding: 5 },

  // TABLA DE SERIES DENTRO DEL EJERCICIO
  tableHeader: { flexDirection: 'row', alignItems: 'center', paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#1A1A1A', marginBottom: 10 },
  thText: { color: '#666', fontSize: 10, fontWeight: '800', textAlign: 'center' },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  tdIndex: { width: 30, color: '#555', fontWeight: '900', fontSize: 14, textAlign: 'center' },
  gridInput: { backgroundColor: '#111', color: 'white', borderRadius: 8, textAlign: 'center', fontWeight: '800', fontSize: 15, paddingVertical: 8 },
  delSetBtn: { width: 30, alignItems: 'center', justifyContent: 'center' },
  
  addSetBtnRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, marginTop: 10, borderTopWidth: 1, borderTopColor: '#1A1A1A' },
  addSetBtnText: { color: '#777', fontWeight: '800', fontSize: 11, letterSpacing: 1 },

  notasInput: { color: '#888', fontSize: 14, marginTop: 10, borderTopWidth: 1, borderTopColor: '#1A1A1A', paddingTop: 12 },

  // --- MODAL BIBLIOTECA ---
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

  libItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#111' },
  libImg: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#111', marginRight: 15 },
  libImgPlaceholder: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#1A1A1A', marginRight: 15 },
  libTextWrap: { flex: 1, paddingRight: 10 },
  libName: { color: 'white', fontWeight: '500', fontSize: 16, marginBottom: 4 },
  libMuscle: { color: '#888', fontSize: 13 },
  libAddIcon: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(250, 204, 21, 0.1)' }
});