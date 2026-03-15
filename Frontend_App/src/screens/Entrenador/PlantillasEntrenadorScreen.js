import React, { useState, useCallback } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  ActivityIndicator, SafeAreaView, StatusBar, Alert, Platform
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../components/context/AuthContext';

import { 
  Copy, Plus, Edit, Trash2, BookOpen, ChevronLeft 
} from 'lucide-react-native';

import { obtenerPlantillasEntrenador, eliminarRutina } from '../../api/endpoints';

export default function PlantillasEntrenadorScreen() {
  const navigation = useNavigation();
  const { userId: entrenadorId } = useAuth();

  const [plantillas, setPlantillas] = useState([]);
  const [loading, setLoading] = useState(true);

  const cargarPlantillas = async () => {
    console.log("⏳ Cargando plantillas para el entrenador:", entrenadorId);
    setLoading(true);
    try {
      // Si la función no existe, esto evitará que la app crashee
      if (typeof obtenerPlantillasEntrenador !== 'function') {
        throw new Error("La función obtenerPlantillasEntrenador no está definida en endpoints.js");
      }
      
      const data = await obtenerPlantillasEntrenador(entrenadorId);
      console.log("✅ Plantillas cargadas:", data?.length);
      setPlantillas(data || []);
    } catch (error) {
      console.error("❌ Error al cargar plantillas:", error);
      Alert.alert("Error", "No se pudieron cargar las plantillas.");
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (entrenadorId) {
        cargarPlantillas();
      } else {
        console.log("⚠️ No hay entrenadorId disponible aún.");
        setLoading(false);
      }
    }, [entrenadorId])
  );

  const handleCrearNueva = () => {
    navigation.navigate('CrearRutina', { isTemplate: true });
  };

  const handleEditar = (plantillaId) => {
    navigation.navigate('EditarRutina', { rutinaId: plantillaId });
  };

  const handleEliminar = (plantillaId, nombre) => {
    Alert.alert(
      "Eliminar Plantilla",
      `¿Seguro que quieres borrar '${nombre}'?\n\nNo afectará a los clientes que ya la tengan copiada.`,
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Eliminar", 
          style: "destructive",
          onPress: async () => {
            try {
              await eliminarRutina(plantillaId);
              cargarPlantillas();
            } catch (error) {
              Alert.alert("Error", "No se pudo eliminar la plantilla.");
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <ChevronLeft size={24} color="white" />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FACC15" />
          <Text style={{color: '#FACC15', marginTop: 10, fontWeight: 'bold'}}>Cargando biblioteca...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#050505" />
      
      {/* BOTÓN VOLVER ATRÁS */}
      <View style={styles.headerTop}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ChevronLeft size={24} color="#a1a1aa" />
          <Text style={styles.backText}>Volver al Panel</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* --- HEADER --- */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View style={styles.iconWrap}>
              <Copy size={28} color="#FACC15" />
            </View>
            <View style={{ flex: 1, marginLeft: 15 }}>
              <Text style={styles.title}>PLANTILLAS</Text>
              <Text style={styles.subTitle}>Rutinas maestras para tus atletas.</Text>
            </View>
          </View>
          
          <TouchableOpacity style={styles.primaryBtn} onPress={handleCrearNueva}>
            <Plus size={20} color="#000" />
            <Text style={styles.primaryBtnText}>NUEVA PLANTILLA</Text>
          </TouchableOpacity>
        </View>

        {/* --- GRID DE PLANTILLAS --- */}
        <View style={styles.grid}>
          {plantillas.length === 0 ? (
            <View style={styles.emptyState}>
              <Copy size={48} color="rgba(255,255,255,0.1)" style={{ marginBottom: 20 }} />
              <Text style={styles.emptyTitle}>Tu biblioteca está vacía</Text>
              <Text style={styles.emptySub}>
                Crea rutinas maestras (ej. "Fuerza Base") y asígnalas a múltiples clientes al instante.
              </Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={handleCrearNueva}>
                <Plus size={20} color="#000" />
                <Text style={styles.primaryBtnText}>CREAR LA PRIMERA</Text>
              </TouchableOpacity>
            </View>
          ) : (
            plantillas.map((rutina) => (
              <View key={rutina.id} style={styles.card}>
                
                <View style={styles.cardHeader}>
                  <View style={styles.pill}>
                    <Text style={styles.pillText}>{rutina.objetivo || 'General'}</Text>
                  </View>
                  <BookOpen size={20} color="rgba(255,255,255,0.2)" />
                </View>

                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle}>{rutina.nombre}</Text>
                  <Text style={styles.cardInfo}>
                    {rutina.nivel || 'Multinivel'} • <Text style={{ color: 'white', fontWeight: '700' }}>{rutina.detalles?.length || 0}</Text> ejercicios
                  </Text>
                </View>

                <View style={styles.actions}>
                  <TouchableOpacity style={styles.editBtn} onPress={() => handleEditar(rutina.id)}>
                    <Edit size={16} color="white" />
                    <Text style={styles.editBtnText}>Editar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.deleteBtn} onPress={() => handleEliminar(rutina.id, rutina.nombre)}>
                    <Trash2 size={16} color="#ef4444" />
                    <Text style={styles.deleteBtnText}>Eliminar</Text>
                  </TouchableOpacity>
                </View>
                
              </View>
            ))
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#050505' },
  loadingContainer: { flex: 1, backgroundColor: '#050505', justifyContent: 'center', alignItems: 'center' },
  
  headerTop: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? 20 : 10, paddingBottom: 10 },
  backBtn: { flexDirection: 'row', alignItems: 'center' },
  backText: { color: '#a1a1aa', fontSize: 14, fontWeight: '600', marginLeft: 5 },

  scrollContent: { padding: 20, paddingBottom: 100 },
  
  // HEADER
  header: { marginBottom: 30, paddingBottom: 25, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 25 },
  iconWrap: { backgroundColor: 'rgba(250, 204, 21, 0.1)', padding: 15, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(250, 204, 21, 0.2)' },
  title: { fontSize: 28, fontWeight: '900', color: 'white', textTransform: 'uppercase', letterSpacing: -0.5 },
  subTitle: { color: 'rgba(255,255,255,0.5)', fontSize: 14, marginTop: 4 },
  
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FACC15', paddingVertical: 16, borderRadius: 16, gap: 8 },
  primaryBtnText: { color: '#000', fontWeight: '900', fontSize: 15, letterSpacing: 0.5 },

  // GRID Y TARJETAS
  grid: { gap: 20 },
  card: { backgroundColor: '#111113', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', borderRadius: 20, padding: 20 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 15 },
  pill: { backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  pillText: { color: 'white', fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  
  cardBody: { marginBottom: 20 },
  cardTitle: { color: 'white', fontSize: 20, fontWeight: '900', textTransform: 'uppercase', marginBottom: 6 },
  cardInfo: { color: 'rgba(255,255,255,0.5)', fontSize: 14 },

  // BOTONERA DE ACCIÓN
  actions: { flexDirection: 'row', gap: 10, paddingTop: 20, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', borderStyle: 'dashed' },
  editBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.05)', paddingVertical: 12, borderRadius: 12, gap: 8 },
  editBtnText: { color: 'white', fontSize: 14, fontWeight: '800' },
  deleteBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(239, 68, 68, 0.1)', paddingVertical: 12, borderRadius: 12, gap: 8 },
  deleteBtnText: { color: '#ef4444', fontSize: 14, fontWeight: '800' },

  // EMPTY STATE
  emptyState: { alignItems: 'center', padding: 40, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', borderStyle: 'dashed', marginTop: 10 },
  emptyTitle: { color: 'white', fontSize: 20, fontWeight: '900', marginBottom: 10, textAlign: 'center' },
  emptySub: { color: 'rgba(255,255,255,0.5)', fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 25 },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FACC15', paddingVertical: 16, paddingHorizontal: 24, borderRadius: 16, gap: 8, width: '100%' },
});