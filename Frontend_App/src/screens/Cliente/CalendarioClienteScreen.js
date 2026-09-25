import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Modal, 
  ScrollView,
  Alert,
  SafeAreaView,
  ActivityIndicator,
  Platform
} from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useNavigation } from '@react-navigation/native';

import { 
  obtenerEventosCalendario, 
  programarRutina, 
  eliminarEventoCalendario, 
  obtenerRutinasCliente, 
  obtenerRutinasAsignadasPorEntrenador,
  toggleCompletadoEvento 
} from '../../api/endpoints';

import { useAuth } from '../../components/context/AuthContext';

import { 
  Dumbbell, Check, X, Clock, Activity, AlertTriangle, PlusCircle, AlertCircle, Trash2, Plus, ChevronLeft
} from 'lucide-react-native';

// Configurar idioma español
LocaleConfig.locales['es'] = {
  monthNames: ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'],
  monthNamesShort: ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'],
  dayNames: ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'],
  dayNamesShort: ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'],
  today: 'Hoy'
};
LocaleConfig.defaultLocale = 'es';

export default function CalendarioClienteScreen({ route }) {
  const navigation = useNavigation();
  const { userId } = useAuth();
  
  // DETECCIÓN DEL MODO ENTRENADOR
  const clienteIdProp = route?.params?.clienteIdProp;
  const isCoachMode = !!clienteIdProp;
  const clienteId = clienteIdProp || userId;

  const [currentMonth, setCurrentMonth] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  
  const [eventos, setEventos] = useState([]);
  const [rutinas, setRutinas] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showModalAdd, setShowModalAdd] = useState(false);

  useEffect(() => {
    if (!clienteId) return;
    cargarTodo(currentMonth);
  }, [currentMonth, clienteId]);

  const cargarTodo = async (dateStr) => {
    setLoading(true);
    try {
      const [year, month] = dateStr.split('-');
      const ultimoDia = new Date(year, month, 0).getDate(); 
      const start = `${year}-${month}-01`;
      const end = `${year}-${month}-${ultimoDia}`; 

      // 1. Si es modo entrenador, le pasamos nuestro ID a Java para que filtre el calendario
      const idFiltroEntrenador = isCoachMode ? userId : null;
      const dataEventos = await obtenerEventosCalendario(clienteId, start, end, idFiltroEntrenador);
      
      // 2. Si es entrenador, solo carga SUS rutinas creadas. Si es cliente, carga todas.
      const dataRutinas = isCoachMode 
        ? await obtenerRutinasAsignadasPorEntrenador(clienteId)
        : await obtenerRutinasCliente(clienteId);
      
      setEventos(dataEventos || []);
      setRutinas(dataRutinas || []);
    } catch (error) {
      console.error("Error cargando calendario", error);
    } finally {
      setLoading(false);
    }
  };

  const rutinasDisponibles = rutinas;

  const getMarkedDates = () => {
    let marks = {};
    const eventsByDate = {};

    eventos.forEach(ev => {
      if (!eventsByDate[ev.fecha]) eventsByDate[ev.fecha] = [];
      eventsByDate[ev.fecha].push(ev);
    });

    Object.keys(eventsByDate).forEach(fecha => {
      const evs = eventsByDate[fecha];
      const isSaltado = evs.some(e => e.estado === 'SALTADO');
      const isCompletado = evs.every(e => e.estado === 'COMPLETADO');

      let bgColor = '#FACC15'; 
      let textColor = '#0A0A0A'; 

      if (isSaltado) {
        bgColor = '#ef4444';
        textColor = 'white';
      } else if (isCompletado) {
        bgColor = '#4ade80';
        textColor = '#052e16';
      }

      marks[fecha] = {
        customStyles: {
          container: { backgroundColor: bgColor, borderRadius: 14 },
          text: { color: textColor, fontWeight: 'bold' }
        }
      };
    });

    if (selectedDate) {
      const hasEvent = !!marks[selectedDate];
      const existingContainer = marks[selectedDate]?.customStyles?.container || {};
      const existingText = marks[selectedDate]?.customStyles?.text || {};

      marks[selectedDate] = {
        ...marks[selectedDate],
        customStyles: {
          container: {
            ...existingContainer,
            backgroundColor: hasEvent ? existingContainer.backgroundColor : 'transparent',
            borderWidth: 2,
            borderColor: hasEvent ? 'white' : '#FACC15',
            borderRadius: 14,
          },
          text: {
            ...existingText,
            color: hasEvent ? existingText.color : '#FACC15',
            fontWeight: '900'
          }
        }
      };
    }

    return marks;
  };

  const handleDayPress = (day) => {
    setSelectedDate(day.dateString);
  };

  const handleRutinaRapida = async (rutinaId) => {
    try {
      const fechaFormateada = format(new Date(selectedDate), 'yyyy-MM-dd');
      
      const idEntrenador = isCoachMode ? userId : undefined;
      
      await programarRutina(clienteId, rutinaId, fechaFormateada, idEntrenador);
      
      setShowModalAdd(false);
      setTimeout(() => cargarTodo(currentMonth), 300);
      Alert.alert("¡Hecho!", "Entrenamiento programado con éxito.");
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "No se pudo programar la rutina.");
    }
  };

  const handleBorrarClick = (eventoId) => {
    Alert.alert(
      "¿Eliminar Entrenamiento?",
      "Desaparecerá de la agenda.",
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Eliminar", 
          style: "destructive", 
          onPress: async () => {
            await eliminarEventoCalendario(eventoId);
            cargarTodo(currentMonth);
          } 
        }
      ]
    );
  };

  const handleToggleCompletado = async (eventoId) => {
    try {
      await toggleCompletadoEvento(eventoId);
      cargarTodo(currentMonth); 
    } catch (error) {
      console.error(error);
    }
  };

  const irAEntrenar = (rutinaId, eventoId, estado) => {
    if (isCoachMode) {
      if (estado === 'COMPLETADO') {
        navigation.navigate('PantallaSesionEntrenamiento', { 
          rutinaId: rutinaId, 
          eventoIdCalendario: eventoId, 
          isReadOnly: true,
          clienteId: clienteId // 🔥 ESTO ES LO QUE FALTABA PARA QUE BUSQUE EN EL ATLETA
        });
      } else {
        Alert.alert("Info", "Este entrenamiento aún está pendiente de realizar por el atleta.");
      }
      return;
    }
    
    // Flujo normal si eres el Atleta
    navigation.navigate('PantallaSesionEntrenamiento', { 
      rutinaId: rutinaId, 
      eventoIdCalendario: eventoId 
    }); 
  };

  const formatDuracion = (seg) => {
    if(!seg) return '';
    return `${Math.floor(seg / 60)} min`;
  };

  const eventosDelDia = eventos.filter(e => e.fecha === selectedDate);

  return (
    <SafeAreaView style={styles.root}>
      
      <View style={styles.headerRow}>
        {isCoachMode && (
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <ChevronLeft size={24} color="white" />
          </TouchableOpacity>
        )}
        <View style={styles.headerTextWrap}>
          <Text style={styles.title}>CALENDARIO</Text>
          {isCoachMode ? (
            <View style={styles.coachBadge}>
              <Text style={styles.coachBadgeText}>VISTA ENTRENADOR</Text>
            </View>
          ) : (
            <Text style={styles.subtitle}>Planifica tus entrenamientos.</Text>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <View style={styles.calendarCard}>
          <Calendar
            current={currentMonth}
            onMonthChange={(month) => setCurrentMonth(month.dateString)}
            onDayPress={handleDayPress}
            markingType={'custom'}
            markedDates={getMarkedDates()}
            theme={{
              backgroundColor: 'transparent',
              calendarBackground: 'transparent',
              textSectionTitleColor: 'rgba(255,255,255,0.4)',
              todayTextColor: '#FACC15',
              dayTextColor: '#ffffff',
              textDisabledColor: 'rgba(255,255,255,0.2)',
              arrowColor: '#FACC15',
              monthTextColor: '#ffffff',
              textDayFontWeight: '700',
              textMonthFontWeight: '900',
              textDayHeaderFontWeight: '800',
              textMonthFontSize: 18,
            }}
          />
        </View>

        {loading && <ActivityIndicator size="large" color="#FACC15" style={{marginVertical: 20}}/>}

        <View style={styles.agendaSection}>
          <View style={styles.agendaHeader}>
            <Text style={styles.agendaDateText}>
              {selectedDate && format(new Date(selectedDate), "EEEE, d 'de' MMMM", { locale: es }).toUpperCase()}
            </Text>
          </View>

          {eventosDelDia.length > 0 ? (
            <View style={styles.eventList}>
              {eventosDelDia.map(ev => {
                const isCompletado = ev.estado === 'COMPLETADO';
                const isSaltado = ev.estado === 'SALTADO';
                
                return (
                  <TouchableOpacity 
                    key={ev.id} 
                    style={[
                      styles.eventCard, 
                      isCompletado && styles.eventCardCompletado,
                      isSaltado && styles.eventCardSaltado
                    ]}
                    activeOpacity={0.8}
                    onPress={() => irAEntrenar(ev.rutinaId, ev.id, ev.estado)}
                  >
                    <View style={styles.eventCardRow}>
                      <Text style={[styles.eventTitle, isCompletado && {color: '#4ade80'}, isSaltado && {color: '#ef4444'}]} numberOfLines={1}>
                        {ev.rutinaNombre}
                      </Text>
                      
                      <View style={styles.eventActions}>
                        <TouchableOpacity style={[styles.actionBtn, {backgroundColor: 'rgba(255,255,255,0.1)'}]} onPress={(e) => { e.stopPropagation(); handleToggleCompletado(ev.id); }}>
                          {isCompletado ? <X size={14} color="white"/> : <Check size={14} color="white"/>}
                        </TouchableOpacity>
                        
                        <TouchableOpacity style={[styles.actionBtn, {backgroundColor: 'rgba(239, 68, 68, 0.15)'}]} onPress={(e) => { e.stopPropagation(); handleBorrarClick(ev.id); }}>
                          <Trash2 size={14} color="#ef4444"/>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {isCompletado && (ev.duracion || ev.volumen) && (
                      <View style={styles.eventStats}>
                        {ev.duracion && <Text style={styles.statText}><Clock size={12}/> {formatDuracion(ev.duracion)}</Text>}
                        {ev.volumen && <Text style={styles.statText}><Activity size={12}/> {ev.volumen} kg</Text>}
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyAgenda}>
              <View style={styles.emptyIconWrap}>
                <AlertCircle size={28} color="rgba(255,255,255,0.3)" />
              </View>
              <Text style={styles.emptyTextTitle}>Día libre</Text>
              <Text style={styles.emptyTextSub}>No hay entrenamientos programados para hoy.</Text>
            </View>
          )}

          <TouchableOpacity 
            style={styles.inlineAddBtn} 
            activeOpacity={0.8}
            onPress={() => setShowModalAdd(true)}
          >
            <Plus size={20} color="#0A0A0A" />
            <Text style={styles.inlineAddBtnText}>PROGRAMAR RUTINA</Text>
          </TouchableOpacity>

        </View>

      </ScrollView>

      {/* MODAL PARA AÑADIR RUTINA */}
      <Modal visible={showModalAdd} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>BIBLIOTECA</Text>
              <TouchableOpacity onPress={() => setShowModalAdd(false)}>
                <X size={24} color="rgba(255,255,255,0.5)" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Selecciona qué rutina programar para el {selectedDate && format(new Date(selectedDate), 'd de MMMM', { locale: es })}.
            </Text>

            <ScrollView style={{maxHeight: 450}} showsVerticalScrollIndicator={false}>
              {rutinasDisponibles.length > 0 ? (
                rutinasDisponibles.map(r => (
                  <TouchableOpacity 
                    key={r.id} 
                    style={styles.rutinaSelectCard}
                    onPress={() => handleRutinaRapida(r.id)}
                  >
                    <View style={styles.rutinaIconBox}>
                      <Dumbbell size={20} color="#FACC15"/>
                    </View>
                    <View style={{flex: 1}}>
                      <Text style={styles.rutinaTitle}>{r.nombre}</Text>
                      <Text style={styles.rutinaSub}>Toca para programar</Text>
                    </View>
                    <PlusCircle size={22} color="rgba(255,255,255,0.3)"/>
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.emptyState}>
                  <AlertCircle size={32} color="rgba(255,255,255,0.2)" style={{marginBottom:15}}/>
                  <Text style={styles.emptyTitle}>Sin rutinas</Text>
                  <Text style={styles.emptySub}>Crea una rutina primero para poder programarla.</Text>
                  
                  {isCoachMode && (
                      <TouchableOpacity 
                        style={styles.emptyBtn}
                        onPress={() => { setShowModalAdd(false); navigation.navigate('CrearRutina', { atletaId: clienteId }); }}
                      >
                        <Text style={styles.emptyBtnText}>CREAR RUTINA PARA EL CLIENTE</Text>
                      </TouchableOpacity>
                  )}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#09090b' },
  
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingTop: Platform.OS === 'android' ? 40 : 20, paddingBottom: 15 },
  backBtn: { marginRight: 15, padding: 5, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10 },
  headerTextWrap: { flex: 1 },
  title: { fontSize: 32, fontWeight: '900', color: 'white', fontStyle: 'italic', letterSpacing: -0.5 },
  subtitle: { color: 'rgba(255,255,255,0.5)', fontSize: 15, fontWeight: '500', marginTop: 4 },
  coachBadge: { backgroundColor: 'rgba(250, 204, 21, 0.1)', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, marginTop: 4 },
  coachBadgeText: { color: '#FACC15', fontSize: 10, fontWeight: '900', letterSpacing: 1 },

  scrollContent: { paddingHorizontal: 20, paddingBottom: 100 },
  
  calendarCard: {
    backgroundColor: '#18181b', 
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    paddingVertical: 10,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },

  agendaSection: { marginTop: 30 },
  agendaHeader: { marginBottom: 15 },
  agendaDateText: { color: 'white', fontSize: 14, fontWeight: '800', letterSpacing: 1, opacity: 0.8 },

  emptyAgenda: { backgroundColor: 'rgba(255,255,255,0.02)', padding: 30, borderRadius: 20, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', borderStyle: 'dashed', marginBottom: 20 },
  emptyIconWrap: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', marginBottom: 15 },
  emptyTextTitle: { color: 'white', fontWeight: '800', fontSize: 16, marginBottom: 5 },
  emptyTextSub: { color: 'rgba(255,255,255,0.4)', fontSize: 13, textAlign: 'center', lineHeight: 20 },

  inlineAddBtn: { flexDirection: 'row', backgroundColor: '#FACC15', paddingVertical: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center', gap: 8 },
  inlineAddBtnText: { color: '#0A0A0A', fontWeight: '900', fontSize: 14, letterSpacing: 0.5 },

  eventList: { gap: 12, marginBottom: 20 },
  eventCard: { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', padding: 18, borderRadius: 20 },
  eventCardCompletado: { backgroundColor: 'rgba(34, 197, 94, 0.1)', borderColor: 'rgba(34, 197, 94, 0.3)' },
  eventCardSaltado: { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)' },
  eventCardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eventTitle: { color: 'white', fontSize: 18, fontWeight: '800', flex: 1, marginRight: 10 },
  eventActions: { flexDirection: 'row', gap: 10 },
  actionBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  eventStats: { flexDirection: 'row', gap: 15, marginTop: 15, paddingTop: 15, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  statText: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '700', flexDirection: 'row', alignItems: 'center', gap: 5 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#18181b', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 25, paddingBottom: 50 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  modalTitle: { color: 'white', fontSize: 24, fontWeight: '900', fontStyle: 'italic' },
  modalSubtitle: { color: 'rgba(255,255,255,0.5)', fontSize: 14, marginBottom: 25 },

  rutinaSelectCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', padding: 18, borderRadius: 20, marginBottom: 12 },
  rutinaIconBox: { backgroundColor: 'rgba(255,255,255,0.05)', padding: 14, borderRadius: 14, marginRight: 15 },
  rutinaTitle: { color: 'white', fontSize: 16, fontWeight: '800', marginBottom: 4 },
  rutinaSub: { color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: '500' },

  emptyState: { alignItems: 'center', padding: 30, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', borderStyle: 'dashed' },
  emptyTitle: { color: 'white', fontWeight: '800', fontSize: 16, marginBottom: 5 },
  emptySub: { color: 'rgba(255,255,255,0.5)', fontSize: 13, marginBottom: 25 },
  emptyBtn: { backgroundColor: '#FACC15', paddingVertical: 14, paddingHorizontal: 20, borderRadius: 14, width: '100%', alignItems: 'center' },
  emptyBtnText: { color: '#0A0A0A', fontWeight: '900', fontSize: 14 }
});
