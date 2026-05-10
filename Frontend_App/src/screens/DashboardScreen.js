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
  Platform,
  Modal
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { 
  Dumbbell, Activity, Plus, Play, CheckCircle, Flame, User, Bell, BarChart2, Target, X, Trophy, Info
} from 'lucide-react-native';

import { obtenerResumenDashboard } from '../api/endpoints'; 
import { useAuth } from '../components/context/AuthContext';

const { width } = Dimensions.get('window');

export default function DashboardClienteScreen() {
  const navigation = useNavigation();
  const { userId } = useAuth();
  
  const [resumen, setResumen] = useState(null);
  const [perfil, setPerfil] = useState({ nombre: 'Atleta', fotoPerfil: '' });
  const [loading, setLoading] = useState(true);
  
  // Estados para las Notificaciones Reales
  const [showNotis, setShowNotis] = useState(false);
  const [notificaciones, setNotificaciones] = useState([]);

  useEffect(() => {
    const cargarDatos = async () => {
      if (!userId) return;
      try {
        const resumenData = await obtenerResumenDashboard(userId);

        if (resumenData) {
          setResumen(resumenData);
          generarNotificacionesReales(resumenData); // 👈 Generamos las notificaciones basadas en datos reales
        }
      } catch (error) {
        console.error("Error cargando datos del dashboard:", error);
      } finally {
        setLoading(false);
      }
    };
    cargarDatos();
  }, [userId]);

  // ==========================================
  // 🎯 GENERADOR DINÁMICO DE NOTIFICACIONES
  // ==========================================
  const generarNotificacionesReales = (data) => {
    const nuevasNotis = [];
    
    // 1. Alerta de Entrenamiento de Hoy
    if (data.eventoHoy && !data.eventoHoy.completado) {
      nuevasNotis.push({
        id: 'entreno_hoy',
        tipo: 'alerta',
        titulo: "🔥 ¡Hora de mutar!",
        texto: `Hoy te toca destrozar: ${data.eventoHoy.rutinaNombre}. ¡A por ello!`,
        tiempo: "Hoy",
        leido: false // Aparecerá como NO LEÍDA
      });
    }

    // 2. Logro de Racha
    if (data.rachaActual > 0) {
      nuevasNotis.push({
        id: 'racha',
        tipo: 'logro',
        titulo: "💪 Racha Imparable",
        texto: `Llevas ${data.rachaActual} días seguidos entrenando. No rompas la cadena.`,
        tiempo: "Actual",
        leido: true
      });
    }

    // 3. Logro Semanal
    if (data.entrenosHechos >= (data.entrenosObjetivo || 4) && data.entrenosHechos > 0) {
      nuevasNotis.push({
        id: 'objetivo',
        tipo: 'exito',
        titulo: "🎯 Objetivo Semanal",
        texto: "¡Misión cumplida! Has alcanzado tu meta de la semana.",
        tiempo: "Esta semana",
        leido: true
      });
    }

    // Si no hay notificaciones, ponemos una de bienvenida
    if (nuevasNotis.length === 0) {
      nuevasNotis.push({
        id: 'bienvenida',
        tipo: 'info',
        titulo: "👋 Todo listo",
        texto: "Aún no tienes entrenamientos pendientes ni rachas, ¡empieza a crear tu rutina!",
        tiempo: "Ahora",
        leido: true
      });
    }

    setNotificaciones(nuevasNotis);
  };

  // Función para abrir el panel y marcar todo como leído
  const abrirNotificaciones = () => {
    setShowNotis(true);
    // Marcamos todas como leídas para que el punto rojo desaparezca
    setNotificaciones(prev => prev.map(noti => ({ ...noti, leido: true })));
  };

  // Saber si hay alguna notificación sin leer (para mostrar el punto rojo)
  const hayNotificacionesSinLeer = notificaciones.some(noti => !noti.leido);

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
    <View style={styles.mainWrapper}>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* 1. HEADER */}
        <View style={styles.headerRow}>
          <View style={styles.greetingBox}>
            <Text style={styles.title}>Hola, <Text style={{color: '#FACC15'}}>{perfil.nombre.split(' ')[0]}</Text> 👋</Text>
            <Text style={styles.subtitle}>Aquí tienes tu resumen de hoy.</Text>
          </View>
          
          <View style={styles.profileSection}>
            {/* BOTÓN CAMPANA RECONSTRUIDO */}
            <TouchableOpacity style={styles.bellBox} onPress={abrirNotificaciones}>
              <Bell size={20} color="white" />
              {/* EL PUNTO ROJO SOLO SALE SI HAY NOTIS SIN LEER */}
              {hayNotificacionesSinLeer && <View style={styles.notificationDot} />}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate('Perfil')} style={styles.avatarWrapper}>
              {perfil.fotoPerfil ? (
                <Image source={{ uri: perfil.fotoPerfil }} style={styles.avatarImg} />
              ) : (
                <View style={styles.avatarImgPlaceholder}>
                  <User size={22} color="#050505" />
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* 2. PANEL DE CONTROL */}
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity style={styles.btnAction} onPress={() => navigation.navigate('Rutinas')}>
            <View style={styles.btnActionIcon}><Dumbbell size={22} color="#aaa" /></View>
            <Text style={styles.btnActionText}>Rutinas</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.btnAction} onPress={() => navigation.navigate('ProgresoCliente')}>
            <View style={styles.btnActionIcon}><BarChart2 size={22} color="#aaa" /></View>
            <Text style={styles.btnActionText}>Progreso</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.btnActionPrimary} onPress={() => navigation.navigate('CrearRutina', { isTemplate: false })}>
            <View style={styles.btnActionIconPrimary}><Plus size={24} color="#FACC15" /></View>
            <Text style={styles.btnActionTextPrimary}>Crear</Text>
          </TouchableOpacity>
        </View>

        {/* 3. GRID DE ESTADÍSTICAS */}
        <View style={styles.statsGrid}>
          {/* OBJETIVO SEMANAL */}
          <View style={[styles.statCard, { width: '100%' }]}>
            <View style={styles.statHeader}>
              <Text style={styles.statLabel}>OBJETIVO SEMANAL</Text>
              <View style={[styles.iconWrap, { backgroundColor: 'rgba(250, 204, 21, 0.1)' }]}>
                <Target size={18} color="#FACC15" />
              </View>
            </View>
            <View style={styles.statValueRow}>
              <Text style={styles.statValue}>{resumen?.entrenosHechos || 0}</Text>
              <Text style={styles.statUnit}> / {resumen?.entrenosObjetivo || 4} días</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${progresoSemana}%` }]} />
            </View>
          </View>

          <View style={styles.statsRowTwo}>
            {/* VOLUMEN */}
            <View style={[styles.statCard, { width: '48%' }]}>
              <View style={styles.statHeader}>
                <Text style={styles.statLabel}>VOLUMEN</Text>
                <View style={[styles.iconWrap, { backgroundColor: 'rgba(255, 255, 255, 0.05)' }]}>
                  <Dumbbell size={16} color="#aaa" />
                </View>
              </View>
              <View style={styles.statValueRowCol}>
                <Text style={styles.statValueSmall} numberOfLines={1} adjustsFontSizeToFit>
                  {resumen?.volumenSemana || "0"}
                </Text>
                <Text style={styles.statUnitSub}>kg movidos</Text>
              </View>
            </View>

            {/* RACHA */}
            <View style={[styles.statCard, { width: '48%' }]}>
              <View style={styles.statHeader}>
                <Text style={styles.statLabel}>RACHA</Text>
                <View style={[styles.iconWrap, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                  <Flame size={18} color="#EF4444" />
                </View>
              </View>
              <View style={styles.statValueRowCol}>
                <Text style={styles.statValueSmall}>{resumen?.rachaActual || 0}</Text>
                <Text style={styles.statUnitSub}>días seguidos</Text>
              </View>
            </View>
          </View>
        </View>

        {/* 4. HERO SECTION (ENTRENO DE HOY) */}
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
                  <Text style={styles.heroTagText}>HOY TOCA SUDAR</Text>
                </View>
                <Text style={styles.heroTitle} numberOfLines={2}>{resumen.eventoHoy.rutinaNombre}</Text>
                <Text style={styles.heroSub}>Prepárate mentalmente y dale caña.</Text>
                
                <TouchableOpacity 
                  style={styles.playBtn} 
                  onPress={() => navigation.navigate('PantallaSesionEntrenamiento', { 
                    rutinaId: resumen.eventoHoy.rutinaId,
                    nombre: resumen.eventoHoy.rutinaNombre,
                    eventoIdCalendario: resumen.eventoHoy.id
                  })}
                >
                  <Play size={18} color="#0A0A0A" fill="#0A0A0A" />
                  <Text style={styles.playBtnText}>EMPEZAR SESIÓN</Text>
                </TouchableOpacity>
              </View>
            </ImageBackground>
          ) : (
            <View style={[styles.heroCard, styles.heroCardSuccess]}>
              <View style={styles.heroContent}>
                <View style={styles.heroTagSuccess}>
                  <CheckCircle size={16} color="#4ade80" />
                  <Text style={styles.heroTagTextSuccess}>MISIÓN CUMPLIDA</Text>
                </View>
                <Text style={styles.heroTitle}>¡DÍA SUPERADO!</Text>
                <Text style={styles.heroSub}>Has destrozado el objetivo de hoy. Toca descansar y recuperarse para la próxima batalla.</Text>
              </View>
            </View>
          )}
        </View>

      </ScrollView>

      {/* --- PANEL DE NOTIFICACIONES DINÁMICO --- */}
      <Modal visible={showNotis} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalDismissArea} onPress={() => setShowNotis(false)} />
          
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Tu Actividad</Text>
              <TouchableOpacity onPress={() => setShowNotis(false)} style={styles.closeBtn}>
                <X size={20} color="#888" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{maxHeight: Dimensions.get('window').height * 0.6}}>
              {notificaciones.map((noti) => (
                <View key={noti.id} style={[styles.notiItem, !noti.leido && styles.notiItemUnread]}>
                  <View style={styles.notiIconWrap}>
                    {noti.tipo === 'alerta' ? <Flame size={20} color="#EF4444" /> :
                     noti.tipo === 'logro' ? <Trophy size={20} color="#FACC15" /> : 
                     noti.tipo === 'exito' ? <CheckCircle size={20} color="#4ade80" /> :
                     <Info size={20} color="#3B82F6" />}
                  </View>
                  <View style={styles.notiTextWrap}>
                    <Text style={styles.notiTitle}>{noti.titulo}</Text>
                    <Text style={styles.notiDesc}>{noti.texto}</Text>
                    <Text style={styles.notiTime}>{noti.tiempo}</Text>
                  </View>
                  {/* Si no estuviera leída, saldría el puntito amarillo en la tarjeta */}
                  {!noti.leido && <View style={styles.notiUnreadDot} />}
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  mainWrapper: { flex: 1, backgroundColor: '#050505' },
  container: { flex: 1, backgroundColor: '#050505' },
  scrollContent: { padding: 20, paddingBottom: 50, paddingTop: Platform.OS === 'ios' ? 60 : 40 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#050505' },
  
  // HEADER
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 35 },
  greetingBox: { flex: 1, paddingRight: 10 },
  title: { fontSize: 32, fontWeight: '900', color: 'white', letterSpacing: -0.5 },
  subtitle: { color: '#888', fontSize: 14, marginTop: 4 },
  
  profileSection: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  bellBox: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#121214', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#222' },
  notificationDot: { position: 'absolute', top: 10, right: 12, width: 10, height: 10, borderRadius: 5, backgroundColor: '#EF4444', borderWidth: 2, borderColor: '#121214' },
  avatarWrapper: { padding: 2, borderRadius: 26, borderWidth: 2, borderColor: '#FACC15' },
  avatarImg: { width: 44, height: 44, borderRadius: 22 },
  avatarImgPlaceholder: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FACC15', alignItems: 'center', justifyContent: 'center' },
  
  // ACTION BUTTONS
  actionButtonsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 35 },
  btnAction: { flex: 1, backgroundColor: '#121214', paddingVertical: 18, borderRadius: 24, alignItems: 'center', borderWidth: 1, borderColor: '#222', marginHorizontal: 5 },
  btnActionIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  btnActionText: { color: 'white', fontWeight: '700', fontSize: 13 },
  
  btnActionPrimary: { flex: 1, backgroundColor: 'rgba(250, 204, 21, 0.05)', paddingVertical: 18, borderRadius: 24, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(250, 204, 21, 0.3)', marginHorizontal: 5 },
  btnActionIconPrimary: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(250, 204, 21, 0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  btnActionTextPrimary: { color: '#FACC15', fontWeight: '800', fontSize: 13 },

  // STATS GRID
  statsGrid: { marginBottom: 35 },
  statCard: { backgroundColor: '#121214', borderRadius: 24, padding: 22, marginBottom: 15, borderWidth: 1, borderColor: '#222' },
  statsRowTwo: { flexDirection: 'row', justifyContent: 'space-between' },
  statHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  statLabel: { color: '#777', fontWeight: '900', fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase' },
  iconWrap: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  
  statValueRow: { flexDirection: 'row', alignItems: 'baseline' },
  statValue: { fontSize: 40, fontWeight: '900', color: 'white', letterSpacing: -1 },
  statUnit: { fontSize: 16, color: '#888', fontWeight: '700', marginLeft: 5 },
  
  statValueRowCol: { flexDirection: 'column', alignItems: 'flex-start' },
  statValueSmall: { fontSize: 32, fontWeight: '900', color: 'white', letterSpacing: -1 },
  statUnitSub: { fontSize: 12, color: '#888', fontWeight: '600', marginTop: 2 },

  progressBarBg: { width: '100%', height: 8, backgroundColor: '#222', borderRadius: 4, marginTop: 20, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 4, backgroundColor: '#FACC15' },

  // HERO SECTION
  heroContainer: { marginBottom: 20 },
  heroCard: { minHeight: 220, borderRadius: 28, overflow: 'hidden', padding: 25, justifyContent: 'center', borderWidth: 1, borderColor: '#222' },
  heroImageRadius: { borderRadius: 28 },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(5, 5, 5, 0.75)' },
  heroContent: { zIndex: 1 },
  heroTag: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(250, 204, 21, 0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 6, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(250, 204, 21, 0.3)' },
  heroTagText: { color: '#FACC15', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  heroTitle: { color: 'white', fontSize: 32, fontWeight: '900', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  heroSub: { color: '#aaa', fontSize: 14, lineHeight: 22, marginBottom: 20 },
  playBtn: { backgroundColor: '#FACC15', alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 22, borderRadius: 30, gap: 8 },
  playBtnText: { color: '#0A0A0A', fontWeight: '900', fontSize: 14, letterSpacing: 0.5 },
  
  heroCardSuccess: { backgroundColor: '#121214', borderWidth: 1, borderColor: 'rgba(74, 222, 128, 0.3)' },
  heroTagSuccess: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(74, 222, 128, 0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 6, marginBottom: 12 },
  heroTagTextSuccess: { color: '#4ade80', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },

  // --- ESTILOS MODAL NOTIFICACIONES ---
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalDismissArea: { flex: 1 },
  modalContent: { backgroundColor: '#121214', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, paddingBottom: Platform.OS === 'ios' ? 40 : 25, borderWidth: 1, borderColor: '#222' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { color: 'white', fontSize: 20, fontWeight: '900', letterSpacing: 0.5 },
  closeBtn: { padding: 5, backgroundColor: '#1a1a1a', borderRadius: 15 },
  
  notiItem: { flexDirection: 'row', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#1a1a1a', alignItems: 'center' },
  notiItemUnread: { backgroundColor: 'rgba(250, 204, 21, 0.05)', borderRadius: 12, paddingHorizontal: 10, borderLeftWidth: 3, borderLeftColor: '#FACC15' },
  notiIconWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center', marginRight: 15 },
  notiTextWrap: { flex: 1 },
  notiTitle: { color: 'white', fontSize: 15, fontWeight: '800', marginBottom: 4 },
  notiDesc: { color: '#888', fontSize: 13, lineHeight: 18 },
  notiTime: { color: '#555', fontSize: 11, marginTop: 6, fontWeight: '600' },
  notiUnreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#FACC15', marginLeft: 10 }
});
