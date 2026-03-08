import React, { useState, useCallback, useMemo } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, 
  ActivityIndicator, RefreshControl, Platform
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Dumbbell, Play, Plus, Activity, Edit3, User, Sparkles, ChevronDown, ChevronUp } from 'lucide-react-native';

import { obtenerRutinasCliente } from '../../api/endpoints';
import { useAuth } from '../../components/context/AuthContext';

export default function RutinasClienteScreen() {
  const navigation = useNavigation();
  const { userId } = useAuth();
  
  const [rutinas, setRutinas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filtroActivo, setFiltroActivo] = useState('propias'); // 'propias' | 'asignadas'
  
  const [carpetasExpandidas, setCarpetasExpandidas] = useState({});

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

  const toggleCarpeta = (key) => {
    setCarpetasExpandidas(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // ==========================================
  // 🧠 LÓGICA DE AGRUPACIÓN (IGUAL QUE LA WEB)
  // ==========================================
  const getIAPlanKey = (rutina) => {
    const nombre = (rutina?.nombre || "").trim();
    if (nombre.toLowerCase().startsWith("día")) {
      const parts = nombre.split(" - ");
      if (parts.length >= 2) return parts.slice(1).join(" - ").trim();
    }
    return `${rutina?.objetivo || "PLAN"}|${rutina?.nivel || ""}`.trim();
  };

  const parseDiaNumero = (rutina) => {
    const nombre = (rutina?.nombre || "").toLowerCase();
    const match = nombre.match(/día\s*(\d+)/i);
    return match ? parseInt(match[1], 10) : 9999;
  };

  // 1. Separamos por creador
  const rutinasAsignadas = rutinas.filter(r => r.creador === 'ENTRENADOR');
  const rutinasPropiasNoIA = rutinas.filter(r => r.creador !== 'ENTRENADOR' && r.creador !== 'IA');
  const rutinasIA = rutinas.filter(r => r.creador === 'IA');

  // 2. Agrupamos las de IA
  const iaPlanGroups = useMemo(() => {
    const map = new Map();
    for (const r of rutinasIA) {
      const key = getIAPlanKey(r);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(r);
    }
    for (const [k, arr] of map.entries()) {
      arr.sort((a, b) => parseDiaNumero(a) - parseDiaNumero(b));
      map.set(k, arr);
    }
    return Array.from(map.entries()).map(([key, items]) => ({
      isFolder: true,
      key,
      items,
      objetivo: items?.[0]?.objetivo || "IA",
      nivel: items?.[0]?.nivel || "",
      id: `folder_${key}`
    }));
  }, [rutinasIA]);

  // 3. Montamos la lista final a mostrar según el filtro
  const dataAMostrar = useMemo(() => {
    if (filtroActivo === 'asignadas') return rutinasAsignadas;
    // Si son propias, juntamos los Grupos IA y las rutinas sueltas
    return [...iaPlanGroups, ...rutinasPropiasNoIA];
  }, [filtroActivo, rutinasAsignadas, rutinasPropiasNoIA, iaPlanGroups]);


  // ==========================================
  // 🎨 RENDERIZADO (TARJETA RUTINA NORMAL)
  // ==========================================
  const renderRutinaIndividual = (item, isInsideFolder = false) => (
    <View key={item.id} style={[styles.card, isInsideFolder && styles.cardInsideFolder]}>
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

      <View style={styles.cardFooter}>
        {filtroActivo === 'propias' ? (
          <TouchableOpacity 
            style={styles.editBtn} 
            onPress={() => navigation.navigate('EditarRutina', { rutinaId: item.id })}
          >
            <Edit3 size={18} color="#a1a1aa" />
          </TouchableOpacity>
        ) : (
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

  // ==========================================
  // 📁 RENDERIZADO (TARJETA PLAN IA / GRUPO)
  // ==========================================
  const renderItem = ({ item }) => {
    
    // Si es un grupo IA (Carpeta)
    if (item.isFolder) {
      const isExpanded = carpetasExpandidas[item.key];
      const daysCount = item.items.length;
      const totalEjercicios = item.items.reduce((acc, r) => acc + (r.detalles?.length || 0), 0);
      const nivelLabel = (item.nivel || "").toString().replace(/_/g, " ");
      const objetivoLabel = (item.objetivo || "IA").toString().replace(/_/g, " ");
      const title = item.key?.includes("|") ? `Plan ${objetivoLabel}` : item.key;
      const preview = item.items?.[0]?.detalles?.map((d) => d.ejercicio.nombre).join(", ") || "Sin ejercicios previos";

      return (
        <View style={styles.iaContainer}>
          <TouchableOpacity 
            style={styles.iaCard} 
            activeOpacity={0.8}
            onPress={() => toggleCarpeta(item.key)}
          >
            {/* Cabecera Tarjeta IA */}
            <View style={styles.iaTopRow}>
              <View style={styles.iaPill}>
                <Sparkles size={14} color="#FACC15" />
                <Text style={styles.iaPillText}>PLAN IA</Text>
              </View>
              <Text style={styles.iaDaysText}>{daysCount} DÍAS</Text>
            </View>

            <Text style={styles.iaTitle}>{title}</Text>
            
            <Text style={styles.iaSub}>
              Objetivo: <Text style={{color: 'white', fontWeight: '800'}}>{objetivoLabel}</Text>
              {nivelLabel ? <Text> · Nivel: <Text style={{color: 'white', fontWeight: '800'}}>{nivelLabel}</Text></Text> : ''}
            </Text>

            {/* Grid Estadísticas */}
            <View style={styles.iaStatsRow}>
              <View style={styles.iaStatBox}>
                <Text style={styles.iaStatLabel}>DÍAS</Text>
                <Text style={styles.iaStatValue}>{daysCount}</Text>
              </View>
              <View style={styles.iaStatBox}>
                <Text style={styles.iaStatLabel}>EJERCICIOS</Text>
                <Text style={styles.iaStatValue}>{totalEjercicios}</Text>
              </View>
              <View style={styles.iaStatBox}>
                <Text style={styles.iaStatLabel}>NIVEL</Text>
                <Text style={styles.iaStatValue}>{nivelLabel || "—"}</Text>
              </View>
            </View>

            {/* Barra Visual */}
            <View style={styles.iaBarBg}>
              <View style={[styles.iaBarFill, { width: `${Math.min(100, 20 + daysCount * 15)}%` }]} />
            </View>

            <Text style={styles.iaPreviewText} numberOfLines={1}>{preview}</Text>

            {/* Botón Ver Días */}
            <View style={styles.iaBtn}>
              <Text style={styles.iaBtnText}>{isExpanded ? 'OCULTAR DÍAS' : 'VER DÍAS DEL PLAN'}</Text>
              {isExpanded ? <ChevronUp size={18} color="black"/> : <ChevronDown size={18} color="black"/>}
            </View>
          </TouchableOpacity>

          {/* Días Desplegados */}
          {isExpanded && (
            <View style={styles.folderContent}>
              <View style={styles.folderLine} />
              {item.items.map(rutina => renderRutinaIndividual(rutina, true))}
            </View>
          )}
        </View>
      );
    }
    
    // Si es una rutina normal no agrupada
    return renderRutinaIndividual(item, false);
  };

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

      {/* SELECTOR DE PESTAÑAS */}
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

      {/* LISTA */}
      <FlatList
        data={dataAMostrar}
        keyExtractor={(item) => item.id?.toString() || item.key}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FACC15" />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <Dumbbell size={40} color="#FACC15" />
            </View>
            <Text style={styles.emptyTitle}>
              {filtroActivo === 'propias' ? "No tienes rutinas" : "No tienes planes asignados"}
            </Text>
            <Text style={styles.emptySub}>
              {filtroActivo === 'propias' 
                ? "Usa la IA o crea tu primer plan."
                : "Cuando tu entrenador te asigne un plan, aparecerá aquí."}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050505' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#050505' },
  
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingHorizontal: 20, paddingBottom: 15, backgroundColor: '#0a0a0a' },
  headerTitle: { color: 'white', fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
  addBtn: { backgroundColor: '#FACC15', width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },

  tabContainer: { flexDirection: 'row', backgroundColor: '#121214', marginHorizontal: 20, marginBottom: 15, borderRadius: 12, padding: 4, borderWidth: 1, borderColor: '#1f1f22' },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabBtnActive: { backgroundColor: '#27272a' },
  tabText: { color: '#71717a', fontSize: 13, fontWeight: '700' },
  tabTextActive: { color: 'white', fontWeight: '800' },

  listContent: { paddingHorizontal: 20, paddingBottom: 100 },

  // ==========================
  // TARJETA PLAN IA (IDÉNTICA A LA WEB)
  // ==========================
  iaContainer: { marginBottom: 20 },
  iaCard: { backgroundColor: '#0a0a0a', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: 'rgba(250, 204, 21, 0.3)', overflow: 'hidden' },
  iaTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  iaPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(250, 204, 21, 0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  iaPillText: { color: '#FACC15', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  iaDaysText: { color: '#FACC15', fontSize: 13, fontWeight: '900', letterSpacing: 0.5 },
  
  iaTitle: { color: 'white', fontSize: 20, fontWeight: '900', textTransform: 'uppercase', letterSpacing: -0.5, marginBottom: 5 },
  iaSub: { color: '#a1a1aa', fontSize: 13, marginBottom: 15 },
  
  iaStatsRow: { flexDirection: 'row', gap: 10, marginBottom: 15 },
  iaStatBox: { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#1f1f22' },
  iaStatLabel: { color: '#a1a1aa', fontSize: 10, fontWeight: '800', marginBottom: 4 },
  iaStatValue: { color: 'white', fontSize: 16, fontWeight: '900' },
  
  iaBarBg: { height: 6, backgroundColor: '#1f1f22', borderRadius: 3, marginBottom: 15 },
  iaBarFill: { height: '100%', backgroundColor: '#FACC15', borderRadius: 3 },
  
  iaPreviewText: { color: '#52525b', fontSize: 12, marginBottom: 20 },
  
  iaBtn: { backgroundColor: '#FACC15', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 14, gap: 8 },
  iaBtnText: { color: '#0A0A0A', fontSize: 14, fontWeight: '900', letterSpacing: 0.5 },

  // ==========================
  // CARPETA DESPLEGABLE
  // ==========================
  folderContent: { paddingLeft: 15, paddingTop: 15, position: 'relative' },
  folderLine: { position: 'absolute', left: 25, top: 0, bottom: 20, width: 2, backgroundColor: '#27272a', zIndex: -1, borderBottomLeftRadius: 10 },

  // ==========================
  // TARJETA RUTINA NORMAL (Y ANIDADA)
  // ==========================
  card: { backgroundColor: '#0a0a0a', borderRadius: 20, padding: 20, marginBottom: 15, borderWidth: 1, borderColor: '#1f1f22' },
  cardInsideFolder: { backgroundColor: '#121214', borderWidth: 1, borderColor: '#27272a', marginLeft: 20, padding: 16, borderRadius: 16 },
  
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  title: { color: 'white', fontSize: 17, fontWeight: '900', textTransform: 'uppercase', marginBottom: 4, letterSpacing: 0.5 },
  subtitle: { color: '#71717a', fontSize: 13, lineHeight: 18 },

  tagsRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#18181b', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  tagText: { color: '#a1a1aa', fontSize: 11, fontWeight: '800' },

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
});