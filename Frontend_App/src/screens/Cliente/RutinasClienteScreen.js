import React, { useState, useCallback } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, 
  ActivityIndicator, RefreshControl, Platform
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Dumbbell, Play, Plus, Activity, Edit3, User } from 'lucide-react-native';

import { obtenerRutinasCliente } from '../../api/endpoints';
import { useAuth } from '../../components/context/AuthContext';

export default function RutinasClienteScreen() {
  const navigation = useNavigation();
  const { userId } = useAuth();
  
  const [rutinas, setRutinas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Nuevo estado para controlar qué pestaña vemos
  const [filtroActivo, setFiltroActivo] = useState('propias'); // 'propias' | 'asignadas'

  const cargarRutinas = async () => {
    try {
      const data = await obtenerRutinasCliente(userId);
      setRutinas(data || []);
    } catch (error) {
      console.error("Error cargando rutinas:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (userId) {
        setLoading(true);
        cargarRutinas();
      }
    }, [userId])
  );

  const onRefresh = () => {
    setRefreshing(true);
    cargarRutinas();
  };

  // Filtrado de rutinas según la pestaña seleccionada
  const rutinasPropias = rutinas.filter(r => r.creador !== 'ENTRENADOR');
  const rutinasAsignadas = rutinas.filter(r => r.creador === 'ENTRENADOR');
  const dataAMostrar = filtroActivo === 'propias' ? rutinasPropias : rutinasAsignadas;

  const renderRutina = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={{flex: 1}}>
          <Text style={styles.title}>{item.nombre}</Text>
          <Text style={styles.subtitle} numberOfLines={2}>
            {item.descripcion || "Sin descripción detallada."}
          </Text>
        </View>
      </View>

      <View style={styles.tagsRow}>
        <View style={styles.tag}>
          <Dumbbell size={12} color="#a1a1aa" />
          <Text style={styles.tagText}>
            {item.detalles?.length || item.ejercicios?.length || 0} Ejercicios
          </Text>
        </View>
        <View style={styles.tag}>
          <Activity size={12} color="#3b82f6" />
          <Text style={[styles.tagText, {color: '#3b82f6'}]}>{item.objetivo || 'General'}</Text>
        </View>
      </View>

      {/* FOOTER DE LA TARJETA: Botón Editar + Botón Iniciar */}
      <View style={styles.cardFooter}>
        {filtroActivo === 'propias' ? (
          <TouchableOpacity 
            style={styles.editBtn} 
            onPress={() => navigation.navigate('EditarRutina', { rutinaId: item.id })}
          >
            <Edit3 size={18} color="#a1a1aa" />
          </TouchableOpacity>
        ) : (
          // Etiqueta de Entrenador (Para rutinas asignadas)
          <View style={styles.coachBadge}>
            <User size={14} color="#a1a1aa" />
            <Text style={styles.coachBadgeText}>Por Coach</Text>
          </View>
        )}

        <TouchableOpacity 
          style={styles.btnStart} 
          onPress={() => navigation.navigate('PantallaSesionEntrenamiento', { 
            rutinaId: item.id, 
            nombre: item.nombre 
          })}
        >
          <Play size={14} color="#0A0A0A" fill="#0A0A0A" />
          <Text style={styles.btnStartText}>INICIAR</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FACC15" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>RUTINAS</Text>
        <TouchableOpacity 
          style={styles.addBtn}
          onPress={() => navigation.navigate('CrearRutina', { isTemplate: false })}
        >
          <Plus size={20} color="#0A0A0A" />
        </TouchableOpacity>
      </View>

      {/* SELECTOR DE PESTAÑAS (TABS) */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tabBtn, filtroActivo === 'propias' && styles.tabBtnActive]}
          onPress={() => setFiltroActivo('propias')}
        >
          <Text style={[styles.tabText, filtroActivo === 'propias' && styles.tabTextActive]}>
            Mis Creaciones
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabBtn, filtroActivo === 'asignadas' && styles.tabBtnActive]}
          onPress={() => setFiltroActivo('asignadas')}
        >
          <Text style={[styles.tabText, filtroActivo === 'asignadas' && styles.tabTextActive]}>
            Asignadas
          </Text>
        </TouchableOpacity>
      </View>

      {/* LISTA DE RUTINAS */}
      <FlatList
        data={dataAMostrar}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderRutina}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FACC15" />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <Dumbbell size={40} color="#FACC15" />
            </View>
            <Text style={styles.emptyTitle}>
              {filtroActivo === 'propias' ? "No tienes rutinas propias" : "No tienes rutinas asignadas"}
            </Text>
            <Text style={styles.emptySub}>
              {filtroActivo === 'propias' 
                ? "Crea tu primer plan de entrenamiento personalizado."
                : "Cuando tu entrenador te asigne un plan, aparecerá aquí."}
            </Text>
            {filtroActivo === 'propias' && (
              <TouchableOpacity 
                style={styles.emptyBtn}
                onPress={() => navigation.navigate('CrearRutina', { isTemplate: false })}
              >
                <Text style={styles.emptyBtnText}>Crear Rutina</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050505' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#050505' },
  
  header: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', 
    paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingHorizontal: 20, paddingBottom: 15,
    backgroundColor: '#0a0a0a'
  },
  headerTitle: { color: 'white', fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
  addBtn: { backgroundColor: '#FACC15', width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },

  // DISEÑO DE TABS
  tabContainer: { 
    flexDirection: 'row', backgroundColor: '#121214', marginHorizontal: 20, marginBottom: 15, 
    borderRadius: 12, padding: 4, borderWidth: 1, borderColor: '#1f1f22'
  },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabBtnActive: { backgroundColor: '#27272a' },
  tabText: { color: '#71717a', fontSize: 13, fontWeight: '700' },
  tabTextActive: { color: 'white', fontWeight: '800' },

  listContent: { paddingHorizontal: 20, paddingBottom: 100 },

  // DISEÑO DE TARJETA
  card: { backgroundColor: '#0a0a0a', borderRadius: 20, padding: 20, marginBottom: 15, borderWidth: 1, borderColor: '#1f1f22' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  title: { color: 'white', fontSize: 17, fontWeight: '900', textTransform: 'uppercase', marginBottom: 4, letterSpacing: 0.5 },
  subtitle: { color: '#71717a', fontSize: 13, lineHeight: 18 },

  tagsRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#18181b', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  tagText: { color: '#a1a1aa', fontSize: 11, fontWeight: '800' },

  // FOOTER DE TARJETA (Botones)
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#18181b', paddingTop: 15 },
  editBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#18181b', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#27272a' },
  coachBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  coachBadgeText: { color: '#a1a1aa', fontSize: 12, fontWeight: '700' },
  
  btnStart: { flexDirection: 'row', backgroundColor: '#FACC15', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20, justifyContent: 'center', alignItems: 'center', gap: 6 },
  btnStartText: { color: '#0A0A0A', fontWeight: '900', fontSize: 12, letterSpacing: 0.5 },

  // ESTADOS VACÍOS
  emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 60, paddingHorizontal: 20 },
  emptyIconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(250, 204, 21, 0.05)', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  emptyTitle: { color: 'white', fontSize: 18, fontWeight: '900', marginBottom: 8 },
  emptySub: { color: '#71717a', fontSize: 14, textAlign: 'center', marginBottom: 30, lineHeight: 22 },
  emptyBtn: { backgroundColor: '#1A1A1A', paddingVertical: 14, paddingHorizontal: 30, borderRadius: 14, borderWidth: 1, borderColor: '#333' },
  emptyBtnText: { color: 'white', fontWeight: '800', fontSize: 14 }
});