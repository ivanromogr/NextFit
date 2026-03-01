import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  ImageBackground,
  ActivityIndicator,
  Dimensions,
  Platform
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { 
  Dumbbell, Calendar, Activity, Plus, Play, CheckCircle, Flame, ArrowRight, User, Bell, BarChart2 
} from 'lucide-react-native';

import { obtenerResumenDashboard, getCliente } from '../api/endpoints'; 
import { useAuth } from '../components/context/AuthContext';

const { width } = Dimensions.get('window');

export default function DashboardClienteScreen() {
  const navigation = useNavigation();
  const { userId } = useAuth();
  
  const [resumen, setResumen] = useState(null);
  const [perfil, setPerfil] = useState({ nombre: 'Atleta', fotoPerfil: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cargarDatos = async () => {
      if (!userId) return;
      try {
        const [resumenData, userData] = await Promise.all([
          obtenerResumenDashboard(userId),
          getCliente(userId)
        ]);

        if (resumenData) setResumen(resumenData);
        if (userData) {
          setPerfil({
            nombre: userData.nombre || 'Atleta',
            fotoPerfil: userData.fotoPerfil || ''
          });
        }
      } catch (error) {
        console.error("Error cargando datos del dashboard:", error);
      } finally {
        setLoading(false);
      }
    };
    cargarDatos();
  }, [userId]);

  const progresoSemana = resumen && resumen.entrenosObjetivo > 0 
    ? Math.min((resumen.entrenosHechos / resumen.entrenosObjetivo) * 100, 100) 
    : 0;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FACC15" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      
      {/* 1. HEADER */}
      <View style={styles.headerRow}>
        <View style={styles.greetingBox}>
          <Text style={styles.title}>Hola, {perfil.nombre.split(' ')[0]} 👋</Text>
          <Text style={styles.subtitle}>Aquí tienes tu resumen.</Text>
        </View>
        
        <View style={styles.profileSection}>
          <TouchableOpacity style={styles.bellBox}>
            <Bell size={20} color="white" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Perfil')}>
            {perfil.fotoPerfil ? (
              <Image source={{ uri: perfil.fotoPerfil }} style={styles.avatarImg} />
            ) : (
              <View style={styles.avatarImgPlaceholder}>
                <User size={24} color="#FACC15" />
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. PANEL DE CONTROL (BOTONES) */}
      <View style={styles.actionRow}>
        <Text style={styles.sectionTitle}>PANEL DE CONTROL</Text>
      </View>
      
      {/* FILA DE 3 BOTONES - AJUSTADO SEGÚN TU SOLICITUD */}
      <View style={styles.actionButtonsRow}>
        <TouchableOpacity 
          style={styles.btnSecondary} 
          onPress={() => navigation.navigate('Rutinas')}
        >
          <Dumbbell size={18} color="white" />
          <Text style={styles.btnSecondaryText}>Mis Rutinas</Text>
        </TouchableOpacity>
        
        {/* BOTÓN DE ESTADÍSTICAS MOVIDO AQUÍ */}
        <TouchableOpacity 
          style={styles.btnSecondary} 
          onPress={() => navigation.navigate('ProgresoCliente')}
        >
          <BarChart2 size={18} color="white" />
          <Text style={styles.btnSecondaryText}>Estadísticas</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.btnPrimary} 
          onPress={() => navigation.navigate('Nuevo')}
        >
          <Plus size={18} color="#0A0A0A" />
          <Text style={styles.btnPrimaryText}>Crear</Text>
        </TouchableOpacity>
      </View>

      {/* 3. GRID DE ESTADÍSTICAS */}
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { width: '100%' }]}>
          <View style={styles.statHeader}>
            <Text style={styles.statLabel}>OBJETIVO SEMANAL</Text>
            <View style={[styles.iconWrap, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
              <Activity size={20} color="#3B82F6" />
            </View>
          </View>
          <View style={styles.statValueRow}>
            <Text style={styles.statValue}>{resumen?.entrenosHechos || 0}</Text>
            <Text style={styles.statUnit}> / {resumen?.entrenosObjetivo || 6}</Text>
          </View>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${progresoSemana}%`, backgroundColor: '#3B82F6' }]} />
          </View>
        </View>

        <View style={styles.statsRowTwo}>
          <View style={[styles.statCard, { width: '48%' }]}>
            <View style={styles.statHeader}>
              <Text style={styles.statLabel}>VOLUMEN</Text>
              <View style={[styles.iconWrap, { backgroundColor: 'rgba(250, 204, 21, 0.1)' }]}>
                <Dumbbell size={20} color="#FACC15" />
              </View>
            </View>
            <View style={styles.statValueRow}>
              <Text style={styles.statValue}>{resumen?.volumenSemana || "2.110"}</Text>
              <Text style={styles.statUnit}> kg</Text>
            </View>
          </View>

          <View style={[styles.statCard, { width: '48%' }]}>
            <View style={styles.statHeader}>
              <Text style={styles.statLabel}>RACHA</Text>
              <View style={[styles.iconWrap, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                <Flame size={20} color="#EF4444" />
              </View>
            </View>
            <View style={styles.statValueRow}>
              <Text style={styles.statValue}>3</Text>
              <Text style={styles.statUnit}> DÍAS</Text>
            </View>
          </View>
        </View>
      </View>

      {/* 4. HERO SECTION (DINÁMICA) */}
      <View style={styles.heroContainer}>
        {resumen?.eventoHoy && !resumen.eventoHoy.completado ? (
          <ImageBackground 
            source={{ uri: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=800&auto=format&fit=crop" }} 
            style={styles.heroCard}
            imageStyle={styles.heroImageRadius}
          >
            <View style={styles.heroOverlay} />
            <View style={styles.heroContent}>
              <View style={styles.heroTag}>
                <Flame size={14} color="#FACC15" />
                <Text style={styles.heroTagText}>OBJETIVO DE HOY</Text>
              </View>
              <Text style={styles.heroTitle}>{resumen.eventoHoy.rutinaNombre}</Text>
              <Text style={styles.heroSub}>Prepárate y dale caña cuando estés listo.</Text>
              
              <TouchableOpacity style={styles.playBtn} onPress={() => navigation.navigate('Sesion', { rutinaId: resumen.eventoHoy.rutinaId })}>
                <Play size={20} color="#0A0A0A" fill="#0A0A0A" />
                <Text style={styles.playBtnText}>EMPEZAR SESIÓN</Text>
              </TouchableOpacity>
            </View>
          </ImageBackground>
        ) : (
          <View style={[styles.heroCard, styles.heroCardSuccess]}>
            <View style={styles.heroContent}>
              <View style={styles.heroTagSuccess}>
                <CheckCircle size={14} color="#4ade80" />
                <Text style={styles.heroTagTextSuccess}>MISIÓN CUMPLIDA</Text>
              </View>
              <Text style={styles.heroTitle}>¡DÍA COMPLETADO!</Text>
              <Text style={styles.heroSub}>Has cumplido tu objetivo. Descansa y recupérate.</Text>
            </View>
          </View>
        )}
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050505' },
  scrollContent: { padding: 20, paddingBottom: 40, paddingTop: Platform.OS === 'ios' ? 60 : 40 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#050505' },
  
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
  greetingBox: { flex: 1 },
  title: { fontSize: 28, fontWeight: '900', color: 'white', letterSpacing: -0.5 },
  subtitle: { color: 'rgba(255,255,255,0.5)', fontSize: 14, marginTop: 4 },
  
  profileSection: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bellBox: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#18181b', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#27272a' },
  avatarImg: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: '#FACC15' },
  avatarImgPlaceholder: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: '#FACC15', backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center' },
  
  sectionTitle: { fontWeight: '800', fontSize: 15, color: 'white', marginBottom: 15, letterSpacing: 0.5 },
  actionButtonsRow: { flexDirection: 'row', gap: 8, marginBottom: 30 },
  
  btnSecondary: { flex: 1, flexDirection: 'row', backgroundColor: '#18181b', paddingVertical: 14, borderRadius: 14, alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: '#27272a' },
  btnSecondaryText: { color: 'white', fontWeight: '700', fontSize: 13 },
  
  btnPrimary: { flex: 1, flexDirection: 'row', backgroundColor: '#FACC15', paddingVertical: 14, borderRadius: 14, alignItems: 'center', justifyContent: 'center', gap: 6 },
  btnPrimaryText: { color: '#0A0A0A', fontWeight: '800', fontSize: 13 },

  statsGrid: { marginBottom: 30 },
  statCard: { backgroundColor: '#18181b', borderRadius: 24, padding: 20, marginBottom: 12, borderWidth: 1, borderColor: '#27272a' },
  statsRowTwo: { flexDirection: 'row', justifyContent: 'space-between' },
  statHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  statLabel: { color: 'rgba(255,255,255,0.4)', fontWeight: '800', fontSize: 10, letterSpacing: 1 },
  iconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statValueRow: { flexDirection: 'row', alignItems: 'baseline' },
  statValue: { fontSize: 32, fontWeight: '900', color: 'white', letterSpacing: -1 },
  statUnit: { fontSize: 16, color: 'rgba(255,255,255,0.4)', fontWeight: '600' },
  progressBarBg: { width: '100%', height: 6, backgroundColor: '#27272a', borderRadius: 3, marginTop: 15, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 3 },

  heroContainer: { marginBottom: 20 },
  heroCard: { minHeight: 200, borderRadius: 24, overflow: 'hidden', padding: 24, justifyContent: 'center' },
  heroImageRadius: { borderRadius: 24 },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.7)' },
  heroContent: { zIndex: 1 },
  heroTag: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(250, 204, 21, 0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 6, marginBottom: 12 },
  heroTagText: { color: '#FACC15', fontSize: 10, fontWeight: '900' },
  heroTitle: { color: 'white', fontSize: 28, fontWeight: '900', marginBottom: 8 },
  heroSub: { color: 'rgba(255,255,255,0.6)', fontSize: 14, lineHeight: 20, marginBottom: 15 },
  playBtn: { backgroundColor: '#FACC15', alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 30, gap: 8 },
  playBtnText: { color: '#0A0A0A', fontWeight: '900', fontSize: 13 },
  
  heroCardSuccess: { backgroundColor: 'rgba(21, 128, 61, 0.1)', borderWidth: 1, borderColor: 'rgba(34, 197, 94, 0.2)' },
  heroTagSuccess: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(34, 197, 94, 0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 6, marginBottom: 12 },
  heroTagTextSuccess: { color: '#4ade80', fontSize: 10, fontWeight: '900' }
});