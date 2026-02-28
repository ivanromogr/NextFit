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

// ✅ IMPORTAMOS LAS GRÁFICAS
import { LineChart, BarChart } from 'react-native-gifted-charts';

// Funciones de tu API
import { 
  obtenerStatsGlobales, 
  obtenerProgresoEjercicio, 
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

  const clienteIdProp = route.params?.clienteId;
  const isCoachMode = !!clienteIdProp;
  const clienteId = clienteIdProp || userId;

  const [globalStats, setGlobalStats] = useState(null);
  const [ejercicios, setEjercicios] = useState([]);
  const [selectedEjercicio, setSelectedEjercicio] = useState(null); 
  const [chartData, setChartData] = useState([]);
  const [pr, setPr] = useState(0);
  const [prs, setPrs] = useState([]); 
  
  const [loading, setLoading] = useState(true);
  const [loadingChart, setLoadingChart] = useState(false);
  const [modalVisible, setModalVisible] = useState(false); 

  useEffect(() => {
    if (!clienteId) return;

    const cargarDatos = async () => {
      try {
        const [statsData, prsData, ejerciciosData] = await Promise.all([
          obtenerStatsGlobales(clienteId),
          obtenerPRs(clienteId),
          obtenerEjercicios()
        ]);

        if (statsData) setGlobalStats(statsData);
        if (prsData) setPrs(prsData);
        if (ejerciciosData && ejerciciosData.length > 0) {
          setEjercicios(ejerciciosData);
          setSelectedEjercicio(ejerciciosData[0]); 
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
    obtenerProgresoEjercicio(clienteId, selectedEjercicio.id)
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

  // ✅ Escalado matemático perfecto para evitar decimales en el eje Y
  const maxValReal = formattedLineData.length > 0 ? Math.max(...formattedLineData.map(d => d.value)) : 10;
  const stepLine = Math.max(Math.ceil(maxValReal / 4), 5); // Como mínimo salta de 5 en 5 kg
  const maxLineValue = stepLine * 4;

  // ==========================================
  // 📊 LÓGICA DE GRÁFICA DE BARRAS (CONSISTENCIA)
  // ==========================================
  const rawConsistencia = globalStats?.graficaSemanal || globalStats?.graficaDiaria || [];
  
  let consistenciaData = rawConsistencia.map((item) => {
    let labelFinal = '';
    let valorNumerico = 0;

    if (Array.isArray(item)) {
        labelFinal = String(item[0]);
        valorNumerico = Number(item[1]) || 0;
    } else if (item && typeof item === 'object') {
        valorNumerico = Number(item.entrenos ?? item.valor ?? item.count ?? item.value ?? item.total ?? 0);
        if (valorNumerico === 0) {
            const numVal = Object.values(item).find(v => typeof v === 'number');
            if (numVal !== undefined) valorNumerico = numVal;
        }

        let rawDate = item.fecha ?? item.etiqueta ?? item.dia ?? item.day;
        if (!rawDate) rawDate = Object.values(item).find(v => typeof v === 'string' && isNaN(Number(v))) || '';

        // Transformamos la fecha real en "LUN", "MAR", etc.
        if (Array.isArray(rawDate)) { 
            const d = new Date(rawDate[0], rawDate[1]-1, rawDate[2]||1);
            if (!isNaN(d)) labelFinal = format(d, 'eee', {locale: es}).toUpperCase();
        } else if (typeof rawDate === 'string' && rawDate.includes('-')) {
            const d = new Date(rawDate);
            if (!isNaN(d)) labelFinal = format(d, 'eee', {locale: es}).toUpperCase();
        } else {
            labelFinal = String(rawDate).substring(0,3).toUpperCase();
        }
    }

    return {
        label: labelFinal || '---',
        value: valorNumerico,
        frontColor: '#FACC15',
        topLabelComponent: () => (
            valorNumerico > 0 ? <Text style={{color: 'white', fontSize: 11, marginBottom: 4, fontWeight: '900'}}>{valorNumerico}</Text> : null
        )
    };
  });

  // ✅ Si el backend no manda datos de esta semana, pintamos la semana vacía (L-D)
  if (consistenciaData.length === 0 || consistenciaData.every(d => d.label === '---')) {
      consistenciaData = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'].map(dia => ({
          label: dia, value: 0, frontColor: '#FACC15'
      }));
  }

  // Escalado perfecto para las barras sin decimales
  const maxBarValReal = Math.max(...consistenciaData.map(d => d.value), 3);
  const stepBar = Math.max(Math.ceil(maxBarValReal / 3), 1);
  const maxBarValue = stepBar * 3;

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

        {/* 2. CONSISTENCIA SEMANAL */}
        <View style={styles.sectionHeader}>
          <BarChart2 size={20} color="#FACC15" />
          <View>
            <Text style={styles.sectionTitle}>CONSISTENCIA</Text>
            <Text style={styles.sectionSubtitle}>Días entrenados esta semana</Text>
          </View>
        </View>

        <View style={styles.chartCard}>
          <BarChart
            data={consistenciaData}
            barWidth={24}
            spacing={20}
            roundedTop
            barBorderRadius={6}
            frontColor="#FACC15"
            yAxisThickness={0}
            xAxisThickness={1}
            xAxisColor="rgba(255,255,255,0.1)"
            hideRules
            yAxisTextStyle={{color: 'rgba(255,255,255,0.4)', fontSize: 11}}
            xAxisLabelTextStyle={{color: 'rgba(255,255,255,0.6)', fontSize: 10, textAlign: 'center'}}
            height={160}
            isAnimated
            maxValue={maxBarValue}
            stepValue={stepBar}
            noOfSections={3}
            yAxisLabelSuffix=" d" // Añade la 'd' de días/entrenos
          />
        </View>

        <View style={styles.divider} />

        {/* 3. BALANCE MUSCULAR */}
        <View style={styles.sectionHeader}>
          <Activity size={20} color="#FACC15" />
          <Text style={styles.sectionTitle}>BALANCE MUSCULAR</Text>
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
        <View style={styles.sectionHeader}>
          <Flame size={20} color="#FACC15" />
          <View>
            <Text style={styles.sectionTitle}>FUERZA ESTIMADA (1RM)</Text>
            <Text style={styles.sectionSubtitle}>Evolución de carga máxima</Text>
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
                    yAxisLabelSuffix=" kg" // La magia que limpia el texto izquierdo
                    isAnimated
                  />
                </View>
              </>
            ) : <Text style={styles.emptyText}>Registra entrenamientos en este ejercicio para ver tu evolución.</Text>
          )}
        </View>

        <View style={styles.divider} />

        {/* 5. RÉCORDS PERSONALES */}
        <View style={styles.sectionHeader}>
          <Trophy size={20} color="#FACC15" />
          <Text style={styles.sectionTitle}>RÉCORDS PERSONALES</Text>
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
  
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  sectionTitle: { color: 'white', fontSize: 16, fontWeight: '900', letterSpacing: 0.5 },
  sectionSubtitle: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '500', marginTop: 2 },
  
  chartCard: { backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 24, padding: 25, paddingBottom: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', marginBottom: 20, overflow: 'hidden' },
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