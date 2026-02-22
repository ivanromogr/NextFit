import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // 👈 Necesario para el botón volver
import { 
    obtenerStatsGlobales, 
    obtenerProgresoEjercicio, 
    obtenerEjercicios, 
    obtenerPRs 
} from '../../api/endpoints';
import { useAuth } from '../../context/AuthContext';

import ProgresoChart from '../../components/ui/ProgresoChart';
import ConsistenciaChart from '../../components/ui/ConsistenciaChart';
import DistribucionMuscularChart from '../../components/ui/DistribucionMuscularChart';
import PersonalRecordsList from '../../components/ui/PersonalRecordsList';

import { Trophy, Dumbbell, Calendar, ArrowUp, ArrowDown, ArrowLeft } from 'lucide-react';

// 👇 1. ACEPTAMOS PROPS
export default function ProgresoCliente({ clienteIdProp, isCoachMode = false }) {
    const navigate = useNavigate();
    const { userId } = useAuth();

    // 👇 2. LÓGICA HÍBRIDA: Si viene prop (Entrenador), la usa. Si no, Context (Cliente).
    const clienteId = clienteIdProp || userId;

    const [globalStats, setGlobalStats] = useState(null);
    const [ejercicios, setEjercicios] = useState([]);
    const [selectedEjercicio, setSelectedEjercicio] = useState("");
    const [chartData, setChartData] = useState([]);
    const [pr, setPr] = useState(0);
    const [prs, setPrs] = useState([]); 
    const [loadingChart, setLoadingChart] = useState(false);

    useEffect(() => {
        if (!clienteId) return;

        // 1. Cargar Estadísticas Globales
        obtenerStatsGlobales(clienteId).then(setGlobalStats).catch(console.error);

        // 2. Cargar Récords Personales (PRs)
        obtenerPRs(clienteId).then(setPrs).catch(console.error);

        // 3. Cargar Lista de Ejercicios
        obtenerEjercicios().then(lista => {
            setEjercicios(lista || []);
            if (lista && lista.length > 0) setSelectedEjercicio(lista[0].id);
        }).catch(console.error);
    }, [clienteId]);

    useEffect(() => {
        if (!clienteId || !selectedEjercicio) return;

        setLoadingChart(true);
        obtenerProgresoEjercicio(clienteId, selectedEjercicio).then(data => {
            if (data) {
                // Adaptamos si el backend devuelve estructura diferente
                const datos = Array.isArray(data) ? data : (data.grafica || []);
                setChartData(datos);
                setPr(data.pr || 0);
            } else {
                setChartData([]);
                setPr(0);
            }
            setLoadingChart(false);
        }).catch(() => setLoadingChart(false));
    }, [selectedEjercicio, clienteId]);

    const renderCambioVolumen = () => {
        const cambio = globalStats?.comparativaVolumen || 0;
        if (cambio === 0) return <span style={{color:'#71717a', fontSize:'0.8rem'}}>Igual que semana pasada</span>;
        
        const esPositivo = cambio > 0;
        return (
            <div style={{display:'flex', alignItems:'center', gap:'4px', fontSize:'0.8rem', color: esPositivo ? '#4ade80' : '#ef4444', marginTop:'5px'}}>
                {esPositivo ? <ArrowUp size={14}/> : <ArrowDown size={14}/>}
                <span>{Math.abs(cambio)}% vs semana pasada</span>
            </div>
        );
    };

    const styles = {
        page: { 
            padding: '30px', 
            color: 'white', 
            minHeight: '100vh', 
            background: isCoachMode ? '#000000' : '#09090b', // Fondo distinto para Coach
            fontFamily: 'sans-serif', 
            paddingBottom: '100px' 
        },
        header: { display: 'flex', alignItems: 'center', marginBottom: '30px', gap:'15px' },
        title: { fontSize: '1.8rem', fontWeight: '900', textTransform: 'uppercase', margin: 0 },
        subTitle: { fontSize: '1.4rem', fontWeight: '900', marginBottom: '15px', textTransform: 'uppercase', color: '#e4e4e7' },
        
        grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px', marginBottom: '30px' },
        statCard: { background: '#121214', padding: '20px', borderRadius: '12px', border: '1px solid #27272a' },
        statLabel: { color: '#71717a', fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '5px' },
        statValue: { fontSize: '1.5rem', fontWeight: '900', color: 'white' },
        iconBox: { marginBottom: '10px', color: '#FACC15' },

        divider: { height: '1px', background: '#27272a', margin: '40px 0' },
        
        topChartsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '20px' },
        midSectionGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px', marginBottom: '30px' },

        selectorContainer: { marginBottom: '20px' },
        select: { width: '100%', padding: '12px', background: '#18181b', color: 'white', border: '1px solid #333', borderRadius: '8px', fontSize: '1rem', outline: 'none', cursor: 'pointer' }
    };

    return (
        <div style={styles.page}>
            <div style={styles.header}>
                {/* 3. BOTÓN VOLVER (Importante para el entrenador) */}
                <button onClick={() => navigate(-1)} style={{background:'none', border:'none', color:'#777', cursor:'pointer', display:'flex', alignItems:'center', gap:'5px'}}>
                    <ArrowLeft/> {isCoachMode ? 'VOLVER' : ''}
                </button>
                <div>
                    <h1 style={styles.title}>Progreso {isCoachMode ? 'del Atleta' : ''}</h1>
                    {isCoachMode && <span style={{color:'#FACC15', fontSize:'0.75rem', fontWeight:'bold', background:'#222', padding:'2px 8px', borderRadius:'4px'}}>VISTA ENTRENADOR</span>}
                </div>
            </div>

            {/* 1. KPIs */}
            <div style={styles.grid}>
                <div style={styles.statCard}>
                    <div style={styles.iconBox}><Trophy size={24}/></div>
                    <div style={styles.statLabel}>Entrenos</div>
                    <div style={styles.statValue}>{globalStats?.totalEntrenos || 0}</div>
                </div>
                <div style={styles.statCard}>
                    <div style={styles.iconBox}><Dumbbell size={24}/></div>
                    <div style={styles.statLabel}>Volumen Total</div>
                    <div style={styles.statValue}>{globalStats?.volumenTotal || "0"} <span style={{fontSize:'1rem', color:'#555'}}>t</span></div>
                    {renderCambioVolumen()}
                </div>
                <div style={styles.statCard}>
                    <div style={styles.iconBox}><Calendar size={24}/></div>
                    <div style={styles.statLabel}>Horas</div>
                    <div style={styles.statValue}>{globalStats?.horasEntrenadas || 0}h</div>
                </div>
            </div>

            {/* 2. GRÁFICAS GENERALES (Consistencia + Radar) */}
            <div style={styles.topChartsGrid}>
                {globalStats && (
                    <ConsistenciaChart 
                        dataSemanal={globalStats.graficaSemanal} 
                        dataDiaria={globalStats.graficaDiaria} 
                    />
                )}
                {globalStats?.distribucionMuscular?.length > 0 && (
                    <DistribucionMuscularChart data={globalStats.distribucionMuscular} />
                )}
            </div>

            <div style={styles.divider}></div>

            {/* 3. SECCIÓN DE RÉCORDS PERSONALES */}
            <div style={styles.midSectionGrid}>
                <PersonalRecordsList prs={prs} />
            </div>

            <div style={styles.divider}></div>

            {/* 4. ANÁLISIS DETALLADO (1RM) */}
            <h2 style={styles.subTitle}>Análisis Detallado</h2>
            <div style={styles.selectorContainer}>
                {ejercicios.length > 0 ? (
                    <select style={styles.select} value={selectedEjercicio} onChange={(e) => setSelectedEjercicio(e.target.value)}>
                        {ejercicios.map(ej => <option key={ej.id} value={ej.id}>{ej.nombre}</option>)}
                    </select>
                ) : (
                    <div style={{color:'#777'}}>No hay datos de ejercicios.</div>
                )}
            </div>

            {loadingChart ? (
                <div style={{padding: '40px', textAlign: 'center', color: '#666', fontStyle: 'italic'}}>Cargando gráfica...</div>
            ) : (
                <ProgresoChart data={chartData} titulo="Fuerza Estimada (1RM)" pr={pr}/>
            )}
        </div>
    );
}