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
  Dimensions
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { 
  Dumbbell, Calendar, Activity, Plus, Play, CheckCircle, Flame, ArrowRight, User, Bell 
} from 'lucide-react-native';

// OJO: Asegúrate de tener estas funciones adaptadas en tu api/endpoints.js para React Native
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

  const irASesion = (rutinaId) => {
    // Ajusta la ruta a como la llames en tu Stack/Tab Navigator
    navigation.navigate('Sesion', { rutinaId }); 
  };

  // Calculamos % de la barra de progreso
  const progresoSemana = resumen && resumen.entrenosObjetivo > 0 
    ? Math.min((resumen.entrenosHechos / resumen.entrenosObjetivo) * 100, 100) 
    : 0;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FACC15" />
        <Text style={styles.loadingText}>CARGANDO TU ESPACIO...</Text>
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
          <TouchableOpacity style={styles.bellBox} activeOpacity={0.7}>
            <Bell size={20} color="white" />
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.navigate('Perfil')}>
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

      {/* 2. BOTONES RÁPIDOS */}
      <View style={styles.actionRow}>
        <Text style={styles.sectionTitle}>PANEL DE CONTROL</Text>
      </View>
      <View style={styles.actionButtonsRow}>
        <TouchableOpacity 
          style={styles.btnSecondary} 
          activeOpacity={0.7} 
          onPress={() => navigation.navigate('Rutinas')}
        >
          <Dumbbell size={18} color="white" />
          <Text style={styles.btnSecondaryText}>Mis Rutinas</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.btnPrimary} 
          activeOpacity={0.8} 
          onPress={() => navigation.navigate('Nuevo')}
        >
          <Plus size={20} color="#0A0A0A" />
          <Text style={styles.btnPrimaryText}>Crear</Text>
        </TouchableOpacity>
      </View>

      {/* 3. GRID DE ESTADÍSTICAS */}
      <View style={styles.statsGrid}>
        {/* Tarjeta 1: Objetivo Semanal (Ancho completo) */}
        <View style={[styles.statCard, { width: '100%' }]}>
          <View style={styles.statHeader}>
            <Text style={styles.statLabel}>OBJETIVO SEMANAL</Text>
            <View style={[styles.iconWrap, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
              <Activity size={20} color="#3B82F6" />
            </View>
          </View>
          <View style={styles.statValueRow}>
            <Text style={styles.statValue}>{resumen?.entrenosHechos || 0}</Text>
            <Text style={styles.statUnit}> / {resumen?.entrenosObjetivo || 4}</Text>
          </View>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${progresoSemana}%`, backgroundColor: progresoSemana >= 100 ? '#4ade80' : '#3B82F6' }]} />
          </View>
        </View>

        {/* Tarjetas 2 y 3 (Mitad de ancho cada una) */}
        <View style={styles.statsRowTwo}>
          <View style={[styles.statCard, { width: '48%' }]}>
            <View style={styles.statHeader}>
              <Text style={styles.statLabel}>VOLUMEN</Text>
              <View style={[styles.iconWrap, { backgroundColor: 'rgba(250, 204, 21, 0.1)' }]}>
                <Dumbbell size={20} color="#FACC15" />
              </View>
            </View>
            <View style={styles.statValueRow}>
              <Text style={styles.statValue}>{(resumen?.volumenSemana || 0).toLocaleString()}</Text>
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

      {/* 4. HERO SECTION (Qué toca hoy) */}
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
              
              <TouchableOpacity style={styles.playBtn} activeOpacity={0.8} onPress={() => irASesion(resumen.eventoHoy.rutinaId)}>
                <Play size={20} color="#0A0A0A" fill="#0A0A0A" />
                <Text style={styles.playBtnText}>EMPEZAR SESIÓN</Text>
              </TouchableOpacity>
            </View>
          </ImageBackground>
        ) : resumen?.eventoHoy && resumen.eventoHoy.completado ? (
          <View style={[styles.heroCard, styles.heroCardSuccess]}>
            <View style={styles.heroContent}>
              <View style={[styles.heroTag, { backgroundColor: 'rgba(34, 197, 94, 0.2)' }]}>
                <CheckCircle size={14} color="#4ade80" />
                <Text style={[styles.heroTagText, { color: '#4ade80' }]}>MISIÓN CUMPLIDA</Text>
              </View>
              <Text style={styles.heroTitle}>¡DÍA COMPLETADO!</Text>
              <Text style={styles.heroSub}>Has cumplido tu objetivo. Descansa y recupérate.</Text>
            </View>
            <View style={styles.successIconBox}>
              <CheckCircle size={45} color="#4ade80" />
            </View>
          </View>
        ) : (
          <View style={[styles.heroCard, styles.heroCardRest]}>
            <View style={styles.heroContent}>
              <View style={[styles.heroTag, { backgroundColor: '#27272a' }]}>
                <Calendar size={14} color="#aaa" />
                <Text style={[styles.heroTagText, { color: '#aaa' }]}>DÍA DE DESCANSO</Text>
              </View>
              <Text style={[styles.heroTitle, { color: '#71717a' }]}>NADA PROGRAMADO HOY</Text>
              <Text style={styles.heroSub}>El músculo crece mientras descansas.</Text>
              
              <TouchableOpacity style={styles.restBtn} activeOpacity={0.8} onPress={() => navigation.navigate('Calendario')}>
                <Text style={styles.restBtnText}>IR AL CALENDARIO</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* 5. ENLACE A BIBLIOTECA */}
      <TouchableOpacity 
        style={styles.libraryLink} 
        activeOpacity={0.7} 
        onPress={() => navigation.navigate('Rutinas')}
      >
        <View style={styles.libraryTextCont}>
          <Text style={styles.libraryTitle}>TU BIBLIOTECA</Text>
          <Text style={styles.librarySub}>Accede a todos tus planes de entrenamiento y rutinas.</Text>
        </View>
        <View style={styles.libraryIconBox}>
          <ArrowRight size={24} color="#FACC15" />
        </View>
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#050505' },
  loadingText: { color: '#FACC15', fontWeight: '800', letterSpacing: 2, fontSize: 12, marginTop: 15 },
  
  container: { flex: 1, backgroundColor: '#050505' },
  scrollContent: { padding: 20, paddingBottom: 40, paddingTop: 60 }, // Padding Top para evitar el Notch/Isla Dinámica
  
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 35 },
  greetingBox: { flex: 1 },
  title: { fontSize: 26, fontWeight: '900', color: 'white', letterSpacing: -0.5 },
  subtitle: { color: 'rgba(255,255,255,0.5)', fontSize: 14, fontWeight: '500', marginTop: 4 },
  
  profileSection: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  bellBox: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.03)' },
  avatarImg: { width: 50, height: 50, borderRadius: 25, borderWidth: 2, borderColor: '#FACC15' },
  avatarImgPlaceholder: { width: 50, height: 50, borderRadius: 25, borderWidth: 2, borderColor: '#FACC15', backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center' },
  
  actionRow: { marginBottom: 15 },
  sectionTitle: { fontWeight: '800', fontSize: 16, letterSpacing: -0.5, color: 'white' },
  actionButtonsRow: { flexDirection: 'row', gap: 12, marginBottom: 30 },
  btnSecondary: { flex: 1, flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', paddingVertical: 14, borderRadius: 14, alignItems: 'center', justifyContent: 'center', gap: 8 },
  btnSecondaryText: { color: 'white', fontWeight: '700', fontSize: 14 },
  btnPrimary: { flex: 1, flexDirection: 'row', backgroundColor: '#FACC15', paddingVertical: 14, borderRadius: 14, alignItems: 'center', justifyContent: 'center', gap: 6 },
  btnPrimaryText: { color: '#0A0A0A', fontWeight: '900', fontSize: 14 },

  statsGrid: { marginBottom: 35 },
  statCard: { backgroundColor: '#18181b', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', borderRadius: 20, padding: 20, marginBottom: 12 },
  statsRowTwo: { flexDirection: 'row', justifyContent: 'space-between' },
  statHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  statLabel: { color: 'rgba(255,255,255,0.5)', fontWeight: '800', fontSize: 10, letterSpacing: 1 },
  iconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statValueRow: { flexDirection: 'row', alignItems: 'baseline' },
  statValue: { fontSize: 28, fontWeight: '900', color: 'white' },
  statUnit: { fontSize: 14, color: 'rgba(255,255,255,0.4)', fontWeight: '600' },
  progressBarBg: { width: '100%', height: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3, marginTop: 15, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 3 },

  heroContainer: { marginBottom: 25 },
  heroCard: { minHeight: 220, borderRadius: 24, overflow: 'hidden', padding: 25, justifyContent: 'center' },
  heroImageRadius: { borderRadius: 24 },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.65)' }, // Oscurecido para texto legible
  heroContent: { position: 'relative', zIndex: 2 },
  heroTag: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(250, 204, 21, 0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 6, marginBottom: 15 },
  heroTagText: { color: '#FACC15', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  heroTitle: { color: 'white', fontSize: 26, fontWeight: '900', textTransform: 'uppercase', marginBottom: 8 },
  heroSub: { color: 'rgba(255,255,255,0.7)', fontSize: 14, lineHeight: 20, marginBottom: 20 },
  playBtn: { backgroundColor: '#FACC15', alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 30, gap: 8 },
  playBtnText: { color: '#0A0A0A', fontWeight: '900', fontSize: 13 },
  
  heroCardSuccess: { backgroundColor: '#052e16', borderWidth: 1, borderColor: '#15803d', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  successIconBox: { backgroundColor: 'rgba(255,255,255,0.05)', padding: 15, borderRadius: 40 },
  
  heroCardRest: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#333', borderStyle: 'dashed' },
  restBtn: { backgroundColor: '#27272a', alignSelf: 'flex-start', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 30 },
  restBtnText: { color: 'white', fontWeight: '900', fontSize: 12 },

  libraryLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#18181b', padding: 25, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  libraryTextCont: { flex: 1, paddingRight: 15 },
  libraryTitle: { color: 'white', fontSize: 18, fontWeight: '900', textTransform: 'uppercase', marginBottom: 5 },
  librarySub: { color: '#71717a', fontSize: 13, lineHeight: 18 },
  libraryIconBox: { backgroundColor: 'rgba(255,255,255,0.05)', padding: 12, borderRadius: 25 }
});