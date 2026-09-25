import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  SafeAreaView,
  ActivityIndicator,
  Modal,
  Platform,
  Dimensions
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../../components/context/AuthContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import { LineChart, BarChart } from 'react-native-gifted-charts';

// Funciones de tu API
import { 
  obtenerStatsGlobales, 
  obtenerProgresoEjercicio, 
  obtenerEjerciciosConHistorial,
  obtenerEjercicios,
  obtenerPRs 
} from '../../api/endpoints';

import { 
  Trophy, Dumbbell, Calendar, ArrowUp, ArrowDown, ChevronLeft, ChevronDown, X, Activity, Flame, Check, BarChart2
} from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

export default function ProgresoClienteScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { userId } = useAuth(); 

  const clienteIdNav = route.params?.clienteIdProp || route.params?.clienteId;
  const isCoachMode = route.params?.isCoachMode || !!clienteIdNav;
  
  const clienteId = clienteIdNav || userId;
  const entrenadorFiltroId = isCoachMode ? userId : null;

  const [globalStats, setGlobalStats] = useState(null);
  const [ejercicios, setEjercicios] = useState([]);
  const [selectedEjercicio, setSelectedEjercicio] = useState(null); 
  const [chartData, setChartData] = useState([]);
  const [pr, setPr] = useState(0);
  const [prs, setPrs] = useState([]); 
  
  const [vistaConsistencia, setVistaConsistencia] = useState('dias');

  const [loading, setLoading] = useState(true);
  const [loadingChart, setLoadingChart] = useState(false);
  const [modalVisible, setModalVisible] = useState(false); 

  useEffect(() => {
    if (!clienteId) return;

    const cargarDatos = async () => {
      try {
        setLoading(true);
        const [statsData, prsData, ejerciciosHistorial, ejerciciosBase] = await Promise.all([
          obtenerStatsGlobales(clienteId, entrenadorFiltroId),
          obtenerPRs(clienteId, entrenadorFiltroId),
          obtenerEjerciciosConHistorial(clienteId, entrenadorFiltroId),
          obtenerEjercicios()
        ]);

        if (statsData) setGlobalStats(statsData);
        if (prsData) setPrs(prsData);
        
        const listaFinalEjercicios = ejerciciosHistorial.length > 0 ? ejerciciosHistorial : ejerciciosBase;

        if (listaFinalEjercicios && listaFinalEjercicios.length > 0) {
          setEjercicios(listaFinalEjercicios);
          setSelectedEjercicio(listaFinalEjercicios[0]); 
        }
      } catch (error) {
        console.error("Error cargando progreso:", error);
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();
  }, [clienteId]);

  useEffect(() => {
    if (!clienteId || !selectedEjercicio) return;

    setLoadingChart(true);
    obtenerProgresoEjercicio(clienteId, selectedEjercicio.id, entrenadorFiltroId)
      .then(data => {
        if (data) {
          const datos = Array.isArray(data) ? data : (data.grafica || []);
          setChartData(datos);
          setPr(data.pr || 0);
        } else {
          setChartData([]);
          setPr(0);
        }
        setLoadingChart(false);
      })
      .catch(() => setLoadingChart(false));
  }, [selectedEjercicio, clienteId]);

  // ==========================================
  // 📈 LÓGICA DE GRÁFICA DE LÍNEA (1RM)
  // ==========================================
  const formattedLineData = chartData.map(item => {
    let labelText = '';
    if (item.fecha) {
      try {
        let parsedDate = Array.isArray(item.fecha) 
          ? new Date(item.fecha[0], item.fecha[1] - 1, item.fecha[2] || 1)
          : new Date(item.fecha);
        if (!isNaN(parsedDate.getTime())) {
          labelText = format(parsedDate, "d MMM", { locale: es });
        }
      } catch (e) { console.warn("Fecha inválida:", item.fecha); }
    }
    const val = parseFloat(item.peso || item.valor || item.rm || item.value || 0);
    return {
      value: val, 
      label: labelText,
      dataPointText: val > 0 ? String(val) : '', 
    };
  });

  const maxValReal = formattedLineData.length > 0 ? Math.max(...formattedLineData.map(d => d.value)) : 10;
  const stepLine = Math.max(Math.ceil(maxValReal / 4), 5);
  const maxLineValue = stepLine * 4;

  // ==========================================
  // 💪 LÓGICA DE BALANCE MUSCULAR
  // ==========================================
  const parseMuscle = (m) => {
    if (!m) return { nombre: 'S/N', pct: 0 };
    const nombreRaw = m.grupo || m.musculo || m.name || m.subject || 'S/N';
    let valorRaw = m.porcentaje ?? m.valor ?? m.value ?? m.A;
    if (valorRaw === undefined) {
      valorRaw = Object.values(m).find(v => !isNaN(parseFloat(String(v).replace('%',''))) && String(v) !== String(nombreRaw));
    }
    const pctReal = parseFloat(String(valorRaw || 0).replace('%', '')) || 0;
    return { nombre: String(nombreRaw).toUpperCase(), pct: pctReal };
  };

  const renderCambioVolumen = () => {
    const cambio = globalStats?.comparativaVolumen || 0;
    if (cambio === 0) return <Text style={styles.statSubText}>Igual que la sem. pasada</Text>;
    const esPositivo = cambio > 0;
    return (
      <View style={styles.trendBadge}>
        {esPositivo ? <ArrowUp size={12} color="#4ade80"/> : <ArrowDown size={12} color="#ef4444"/>}
        <Text style={[styles.trendText, { color: esPositivo ? '#4ade80' : '#ef4444' }]}>
          {Math.abs(cambio)}% vs sem. pasada
        </Text>
      </View>
    );
  };

  if (loading) return (
    <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#FACC15" /></View>
  );

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        {isCoachMode && (
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <ChevronLeft size={24} color="white" />
          </TouchableOpacity>
        )}
        <View style={styles.headerTextWrap}>
          <Text style={styles.title}>PROGRESO</Text>
          {isCoachMode && (
            <View style={styles.coachBadge}>
              <Text style={styles.coachBadgeText}>VISTA ENTRENADOR</Text>
            </View>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* 1. KPIs */}
        <View style={styles.kpiGrid}>
          <View style={[styles.statCard, { width: '48%' }]}>
            <View style={styles.iconBox}><Trophy size={20} color="#FACC15" /></View>
            <Text style={styles.statLabel}>ENTRENOS</Text>
            <Text style={styles.statValue}>{globalStats?.totalEntrenos || 0}</Text>
          </View>
          <View style={[styles.statCard, { width: '48%' }]}>
            <View style={styles.iconBox}><Calendar size={20} color="#FACC15" /></View>
            <Text style={styles.statLabel}>TIEMPO</Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
              <Text style={styles.statValue}>{globalStats?.horasEntrenadas || 0}</Text>
              <Text style={styles.statUnit}> h</Text>
            </View>
          </View>
          <View style={[styles.statCard, { width: '100%', marginTop: 12 }]}>
            <View style={styles.statRowBetween}>
              <View>
                <View style={styles.iconBox}><Dumbbell size={20} color="#FACC15" /></View>
                <Text style={styles.statLabel}>VOLUMEN TOTAL</Text>
                <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                  <Text style={styles.statValue}>{globalStats?.volumenTotal || "0"}</Text>
                  <Text style={styles.statUnit}> t</Text>
                </View>
              </View>
              {renderCambioVolumen()}
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        {/* 2. CONSISTENCIA (DISEÑO PÍLDORAS CON TOGGLE) */}
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionTitleWrap}>
            <BarChart2 size={20} color="#FACC15" />
            <Text style={styles.sectionTitle}>CONSISTENCIA</Text>
          </View>
          
          <View style={styles.toggleContainer}>
            <TouchableOpacity 
              style={[styles.toggleBtn, vistaConsistencia === 'dias' && styles.toggleBtnActive]}
              onPress={() => setVistaConsistencia('dias')}
            >
              <Text style={[styles.toggleText, vistaConsistencia === 'dias' && styles.toggleTextActive]}>Días</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.toggleBtn, vistaConsistencia === 'semanas' && styles.toggleBtnActive]}
              onPress={() => setVistaConsistencia('semanas')}
            >
              <Text style={[styles.toggleText, vistaConsistencia === 'semanas' && styles.toggleTextActive]}>Semanas</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.chartCard}>
          <View style={{ marginLeft: 5 }}>
            <BarChart
              data={
                (() => {
                  let dataFinal = [];

                  if (vistaConsistencia === 'dias') {
                    dataFinal = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'].map(dia => ({
                      label: dia,
                      value: 1, 
                      frontColor: '#1a1a1c', // Apagado
                      topLabelComponent: null
                    }));

                    const rawDias = globalStats?.graficaDiaria?.length 
                      ? globalStats.graficaDiaria 
                      : (globalStats?.graficaSemanal || []);

                    rawDias.forEach(item => {
                      let labelStr = String(item.fecha ?? item.etiqueta ?? item.dia ?? item.day ?? (Array.isArray(item) ? item[0] : ''));
                      let valNum = Number(item.entrenos ?? item.valor ?? item.count ?? item.value ?? item.total ?? (Array.isArray(item) ? item[1] : 0));
                      if (valNum === 0 && Object.values(item).some(v => typeof v === 'number' && v > 0)) valNum = 1;

                      let diaIndex = -1;
                      const textStr = labelStr.toUpperCase();
                      
                      // Traductor nuclear de fechas para que no falle nunca
                      if (textStr.includes('LUN')) diaIndex = 0;
                      else if (textStr.includes('MAR')) diaIndex = 1;
                      else if (textStr.includes('MI')) diaIndex = 2;
                      else if (textStr.includes('JUE')) diaIndex = 3;
                      else if (textStr.includes('VIE')) diaIndex = 4;
                      else if (textStr.includes('SÁB') || textStr.includes('SAB')) diaIndex = 5;
                      else if (textStr.includes('DOM')) diaIndex = 6;
                      else if (labelStr.match(/^\d{4}-\d{2}-\d{2}$/)) { // Formato YYYY-MM-DD
                          const parts = labelStr.split('-');
                          const d = new Date(parts[0], parts[1] - 1, parts[2]);
                          let jsDay = d.getDay();
                          diaIndex = jsDay === 0 ? 6 : jsDay - 1;
                      } else if (Array.isArray(item.fecha)) { // Formato [2024, 10, 15]
                          const d = new Date(item.fecha[0], item.fecha[1] - 1, item.fecha[2] || 1);
                          let jsDay = d.getDay();
                          diaIndex = jsDay === 0 ? 6 : jsDay - 1;
                      }

                      // 🔥 SI ENCUENTRA EL DÍA Y HAY DATO, LO ILUMINA DE AMARILLO
                      if (diaIndex >= 0 && diaIndex < 7 && valNum > 0) {
                        dataFinal[diaIndex].frontColor = '#FACC15'; 
                        dataFinal[diaIndex].topLabelComponent = () => (
                          <Text style={{color: '#FACC15', fontSize: 16, marginBottom: 2, fontWeight: '900'}}>✓</Text>
                        );
                      }
                    });

                  } else {
                    const etiquetasSemanas = ['Sem -3', 'Sem -2', 'Pasada', 'Actual'];
                    
                    dataFinal = etiquetasSemanas.map(label => ({
                        label: label,
                        value: 1,
                        frontColor: '#1a1a1c', // Gris por defecto
                        topLabelComponent: null
                    }));

                    const rawSemanas = globalStats?.graficaMensual?.length 
                      ? globalStats.graficaMensual 
                      : (globalStats?.graficaSemanal || []);

                    // Llenamos desde la semana actual hacia atrás
                    let offset = 3; // Empezamos en 'Actual'
                    const reversedSemanas = [...rawSemanas].reverse();

                    reversedSemanas.forEach(item => {
                      if (offset >= 0) {
                        let valNum = Number(item.entrenos ?? item.valor ?? item.count ?? item.value ?? item.total ?? (Array.isArray(item) ? item[1] : 0));
                        if (valNum === 0 && Object.values(item).some(v => typeof v === 'number' && v > 0)) valNum = 1;

                        if (valNum > 0) {
                            dataFinal[offset].frontColor = '#FACC15';
                            dataFinal[offset].topLabelComponent = () => (
                                <Text style={{color: '#FACC15', fontSize: 14, marginBottom: 2, fontWeight: '900'}}>{valNum}</Text>
                            );
                        }
                        offset--;
                      }
                    });
                  }

                  return dataFinal;
                })()
              }
              barWidth={vistaConsistencia === 'dias' ? 22 : 36} // Píldoras más gordas en semanas
              spacing={vistaConsistencia === 'dias' ? 18 : 30}
              initialSpacing={10} 
              roundedTop
              roundedBottom 
              barBorderRadius={18}
              yAxisThickness={0}
              xAxisThickness={0} 
              hideRules
              hideYAxisText 
              xAxisLabelTextStyle={{color: 'rgba(255,255,255,0.6)', fontSize: 10, textAlign: 'center'}}
              height={100} 
              maxValue={1.3} 
              isAnimated={false} 
            />
          </View>
          
          {/* Leyenda explicativa para que tenga sentido */}
          <Text style={styles.legendText}>
            {vistaConsistencia === 'dias' 
              ? "El check (✓) indica los días que ha completado tu entrenamiento." 
              : "Número de entrenamientos completados en las últimas 4 semanas."}
          </Text>
        </View>

        <View style={styles.divider} />

        {/* 3. BALANCE MUSCULAR */}
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionTitleWrap}>
            <Activity size={20} color="#FACC15" />
            <Text style={styles.sectionTitle}>BALANCE MUSCULAR</Text>
          </View>
        </View>

        <View style={styles.chartCard}>
          {globalStats?.distribucionMuscular?.length > 0 ? (
            globalStats.distribucionMuscular.map((mRaw, i) => {
              const { nombre, pct } = parseMuscle(mRaw);
              return (
                <View key={i} style={styles.muscleRow}>
                  <Text style={styles.muscleLabel} numberOfLines={1}>{nombre}</Text>
                  <View style={styles.muscleBarBg}>
                    <View style={[styles.muscleBarFill, { width: `${Math.min(pct, 100)}%` }]} />
                  </View>
                  <Text style={styles.musclePercent}>{pct}%</Text>
                </View>
              );
            })
          ) : (
            <Text style={styles.emptyText}>No hay datos de distribución muscular.</Text>
          )}
        </View>

        <View style={styles.divider} />

        {/* 4. ANÁLISIS 1RM */}
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionTitleWrap}>
            <Flame size={20} color="#FACC15" />
            <Text style={styles.sectionTitle}>FUERZA ESTIMADA (1RM)</Text>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.selectorBtn} 
          onPress={() => setModalVisible(true)}
          activeOpacity={0.8}
        >
          <View>
            <Text style={styles.selectorLabel}>Ejercicio seleccionado</Text>
            <Text style={styles.selectorText}>{selectedEjercicio?.nombre}</Text>
          </View>
          <ChevronDown size={20} color="#FACC15" />
        </TouchableOpacity>

        <View style={styles.chartCard}>
          {loadingChart ? <ActivityIndicator color="#FACC15" style={{marginVertical: 40}} /> : (
            formattedLineData.length > 0 ? (
              <>
                <Text style={styles.chartRecord}>Récord: <Text style={{color: '#FACC15'}}>{pr} kg</Text></Text>
                <View style={{ marginLeft: -10 }}>
                  <LineChart
                    data={formattedLineData}
                    color="#FACC15"
                    thickness={4}
                    areaChart
                    startFillColor="rgba(250, 204, 21, 0.4)" 
                    endFillColor="rgba(250, 204, 21, 0.0)"
                    startOpacity={0.3}
                    endOpacity={0}
                    curved
                    height={180}
                    hideRules
                    yAxisThickness={0}
                    xAxisThickness={1}
                    xAxisColor="rgba(255,255,255,0.2)"
                    yAxisTextStyle={{color: 'rgba(255,255,255,0.4)', fontSize: 11}}
                    xAxisLabelTextStyle={{color: 'rgba(255,255,255,0.6)', fontSize: 11}}
                    dataPointsColor="#FACC15"
                    dataPointsRadius={5} 
                    textShiftY={-12}
                    textColor="white"
                    textFontSize={12}
                    textWeight="bold"
                    maxValue={maxLineValue}
                    stepValue={stepLine}
                    noOfSections={4}
                    yAxisLabelSuffix=" kg" 
                    isAnimated
                  />
                </View>
              </>
            ) : <Text style={styles.emptyText}>Registra entrenamientos en este ejercicio para ver tu evolución.</Text>
          )}
        </View>

        <View style={styles.divider} />

        {/* 5. RÉCORDS PERSONALES */}
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionTitleWrap}>
            <Trophy size={20} color="#FACC15" />
            <Text style={styles.sectionTitle}>RÉCORDS PERSONALES</Text>
          </View>
        </View>
        <View style={styles.prsContainer}>
          {prs.length > 0 ? (
            prs.map((item, index) => (
              <View key={index} style={styles.prCard}>
                <View style={styles.prIconBox}><Trophy size={16} color="#0A0A0A" /></View>
                <Text style={styles.prName}>{item.ejercicio}</Text>
                <Text style={styles.prWeight}>{item.peso} kg</Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No tienes récords registrados aún.</Text>
          )}
        </View>

      </ScrollView>

      {/* MODAL SELECTOR DE EJERCICIOS */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ejercicios</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                <X size={20} color="white" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {ejercicios.map((ej) => (
                <TouchableOpacity 
                  key={ej.id} 
                  style={styles.modalOption} 
                  onPress={() => { setSelectedEjercicio(ej); setModalVisible(false); }}
                >
                  <Text style={[styles.modalOptionText, selectedEjercicio?.id === ej.id && { color: '#FACC15', fontWeight: '800' }]}>
                    {ej.nombre}
                  </Text>
                  {selectedEjercicio?.id === ej.id && <Check size={18} color="#FACC15" />}
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
  loadingContainer: { flex: 1, justifyContent: 'center', backgroundColor: '#09090b' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingTop: Platform.OS === 'android' ? 40 : 10, paddingBottom: 15 },
  backBtn: { marginRight: 15, padding: 5, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10 },
  headerTextWrap: { flex: 1 },
  title: { fontSize: 32, fontWeight: '900', color: 'white', fontStyle: 'italic', letterSpacing: -0.5 },
  coachBadge: { backgroundColor: 'rgba(250, 204, 21, 0.1)', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, marginTop: 4 },
  coachBadgeText: { color: '#FACC15', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 40 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  statCard: { backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', borderRadius: 20, padding: 20 },
  iconBox: { backgroundColor: 'rgba(250, 204, 21, 0.1)', width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 15 },
  statLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 5 },
  statValue: { fontSize: 32, fontWeight: '900', color: 'white' },
  statUnit: { fontSize: 16, color: 'rgba(255,255,255,0.5)', fontWeight: '600' },
  statRowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  statSubText: { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 5 },
  trendBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, gap: 5 },
  trendText: { fontSize: 12, fontWeight: '800' },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginVertical: 35 },
  
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  sectionTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionTitle: { color: 'white', fontSize: 16, fontWeight: '900', letterSpacing: 0.5 },
  
  toggleContainer: { flexDirection: 'row', backgroundColor: '#0c0c0e', borderRadius: 8, padding: 4, borderWidth: 1, borderColor: '#222' },
  toggleBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6 },
  toggleBtnActive: { backgroundColor: '#222' },
  toggleText: { color: '#666', fontSize: 12, fontWeight: '700' },
  toggleTextActive: { color: '#FACC15' },

  chartCard: { backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 24, padding: 25, paddingBottom: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', marginBottom: 20, overflow: 'hidden' },
  
  legendText: { color: 'rgba(255,255,255,0.4)', fontSize: 11, textAlign: 'center', marginTop: 15, fontStyle: 'italic' },

  chartRecord: { color: 'white', fontSize: 16, fontWeight: '800', marginBottom: 25 },
  
  muscleRow: { flexDirection: 'row', alignItems: 'center', gap: 15, marginBottom: 15 },
  muscleLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '800', width: 75 },
  muscleBarBg: { flex: 1, height: 10, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 5, overflow: 'hidden' },
  muscleBarFill: { height: '100%', backgroundColor: '#FACC15', borderRadius: 5 },
  musclePercent: { color: 'white', fontSize: 12, fontWeight: '900', width: 40, textAlign: 'right' },
  
  selectorBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', padding: 20, borderRadius: 20, marginBottom: 20 },
  selectorLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '800', textTransform: 'uppercase', marginBottom: 4 },
  selectorText: { color: 'white', fontSize: 18, fontWeight: '900' },
  
  prsContainer: { gap: 12 },
  prCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', padding: 18, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  prIconBox: { backgroundColor: '#FACC15', width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 15 },
  prName: { flex: 1, color: 'white', fontSize: 16, fontWeight: '800' },
  prWeight: { color: '#FACC15', fontSize: 20, fontWeight: '900' },
  emptyText: { color: 'rgba(255,255,255,0.4)', textAlign: 'center', fontSize: 13, fontStyle: 'italic', paddingVertical: 10 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#18181b', borderTopLeftRadius: 35, borderTopRightRadius: 35, padding: 30, paddingBottom: 50, maxHeight: height * 0.8 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  modalTitle: { color: 'white', fontSize: 24, fontWeight: '900', fontStyle: 'italic' },
  closeBtn: { backgroundColor: 'rgba(255,255,255,0.05)', padding: 8, borderRadius: 20 },
  modalOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  modalOptionText: { color: 'white', fontSize: 17, fontWeight: '600' }
});
