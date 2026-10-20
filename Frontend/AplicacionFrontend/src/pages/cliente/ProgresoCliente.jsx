import React, { useState, useEffect, useCallback, useReducer } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    obtenerStatsGlobales, 
    obtenerProgresoEjercicio, 
    obtenerEjercicios,
    obtenerEjerciciosConHistorial,
    obtenerPRs 
} from '../../api/endpoints';
import { useAuth } from '../../context/AuthContext';

import ProgresoChart from '../../components/ui/ProgresoChart';
import ConsistenciaChart from '../../components/ui/ConsistenciaChart';
import DistribucionMuscularChart from '../../components/ui/DistribucionMuscularChart';
import PersonalRecordsList from '../../components/ui/PersonalRecordsList';

import { Trophy, Dumbbell, Calendar, ArrowUp, ArrowDown, ArrowLeft } from 'lucide-react';

// Keep each asynchronous result tied to its athlete/exercise and retry generation.
function useProgressResource(key, load, enabled = true) {
    const [revision, retry] = useReducer(value => value + 1, 0);
    const [result, setResult] = useState(null);
    const requestKey = `${key}:${revision}`;
    useEffect(() => {
        if (!enabled) return;
        let active = true;
        Promise.resolve().then(load).then(data => {
            if (active) setResult({ key: requestKey, data, error: false });
        }).catch(() => {
            if (active) setResult({ key: requestKey, error: true });
        });
        return () => { active = false; };
    }, [requestKey, load, enabled]);
    const current = result?.key === requestKey ? result : null;
    return { data: current?.data, error: !!current?.error, loading: enabled && !current, retry };
}

function ProgressFailure({ children, retry, label }) {
    return <div role="alert" style={{ padding: '16px', color: '#fca5a5' }}>
        <p>{children}</p>
        <button type="button" onClick={retry} style={{ background: '#18181b', color: '#FACC15',
            border: '1px solid #3f3f46', borderRadius: '8px', padding: '10px 14px', font: 'inherit', cursor: 'pointer' }}>{label}</button>
    </div>;
}

//  1. ACEPTAMOS PROPS
export default function ProgresoCliente({ clienteIdProp, isCoachMode = false }) {
    const navigate = useNavigate();
    const { userId } = useAuth();

    // Si viene prop (Entrenador), la usa. Si no, Context (Cliente).
    const clienteId = clienteIdProp || userId;

    const entrenadorId = isCoachMode ? userId : null;
    const scope = JSON.stringify([clienteId, entrenadorId]);
    const [selection, setSelection] = useState(null);
    const loadStats = useCallback(async () => {
        const data = await obtenerStatsGlobales(clienteId, entrenadorId);
        if (!Number.isFinite(data?.totalEntrenos) || !Number.isFinite(data?.horasEntrenadas)
            || !['number', 'string'].includes(typeof data?.volumenTotal)) throw new Error('Invalid statistics');
        return data;
    }, [clienteId, entrenadorId]);
    const loadRecords = useCallback(async () => {
        const data = await obtenerPRs(clienteId, entrenadorId);
        if (!Array.isArray(data)) throw new Error('Invalid records');
        return data;
    }, [clienteId, entrenadorId]);
    const loadExercises = useCallback(async () => {
        const history = await obtenerEjerciciosConHistorial(clienteId, entrenadorId);
        if (!Array.isArray(history)) throw new Error('Invalid exercise history');
        const data = history.length ? history : await obtenerEjercicios();
        if (!Array.isArray(data)) throw new Error('Invalid exercises');
        return data;
    }, [clienteId, entrenadorId]);
    const stats = useProgressResource(scope, loadStats, !!clienteId);
    const records = useProgressResource(scope, loadRecords, !!clienteId);
    const exerciseList = useProgressResource(scope, loadExercises, !!clienteId);
    const globalStats = stats.data;
    const ejercicios = exerciseList.data || [];
    const selectedEjercicio = selection?.scope === scope && ejercicios.some(item => item.id === selection.id)
        ? selection.id : ejercicios[0]?.id || '';
    const loadChart = useCallback(async () => {
        const data = await obtenerProgresoEjercicio(clienteId, selectedEjercicio, entrenadorId);
        if (data == null || (!Array.isArray(data) && Object.keys(data).length === 0)) return { grafica: [], pr: 0 };
        const grafica = Array.isArray(data) ? data : data.grafica;
        if (!Array.isArray(grafica)) throw new Error('Invalid chart');
        return { grafica, pr: data.pr || 0 };
    }, [clienteId, selectedEjercicio, entrenadorId]);
    const chart = useProgressResource(JSON.stringify([scope, selectedEjercicio]), loadChart, !!clienteId && !!selectedEjercicio);
    const volume = String(globalStats?.volumenTotal ?? '').replace(/\s*t$/i, '');

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
            padding: 'var(--spacing-xl) var(--spacing-2xl)', 
            color: 'white', 
            minHeight: '100vh', 
            background: isCoachMode ? '#000000' : '#09090b', // Fondo distinto para Coach
            fontFamily: 'sans-serif', 
            paddingBottom: '100px'},
        header: { 
            display: 'flex', 
            alignItems: 'center', 
            marginBottom: 'var(--spacing-xl)', 
            gap:'var(--spacing-md)'},
        title: { 
            fontSize: 'clamp(1.5rem, 4vw, 1.8rem)', 
            fontWeight: '900', 
            textTransform: 'uppercase', 
            margin: 0 
        },
        subTitle: { 
            fontSize: 'clamp(1.2rem, 3vw, 1.4rem)', 
            fontWeight: '900', 
            marginBottom: '15px', 
            textTransform: 'uppercase', 
            color: '#e4e4e7' 
        },
        
        grid: { 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
            gap: 'var(--spacing-md)', 
            marginBottom: 'var(--spacing-xl)'},
        statCard: { 
            background: '#121214', 
            padding: 'var(--spacing-lg)', 
            borderRadius: '12px', 
            border: '1px solid #27272a'},
        statLabel: { 
            color: '#71717a', 
            fontSize: '0.8rem', 
            fontWeight: 'bold', 
            textTransform: 'uppercase', 
            marginBottom: '5px' 
        },
        statValue: { 
            fontSize: '1.5rem', 
            fontWeight: '900', 
            color: 'white'},
        iconBox: { 
            marginBottom: '10px', 
            color: '#FACC15' 
        },

        divider: { 
            height: '1px', 
            background: '#27272a', 
            margin: 'var(--spacing-2xl) 0'},
        
        topChartsGrid: { 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
            gap: 'var(--spacing-lg)', 
            marginBottom: 'var(--spacing-lg)'},
        midSectionGrid: { 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', 
            gap: 'var(--spacing-lg)', 
            marginBottom: 'var(--spacing-xl)'},

        selectorContainer: { 
            marginBottom: 'var(--spacing-lg)' 
        },
        select: { 
            width: '100%', 
            padding: '12px', 
            background: '#18181b', 
            color: 'white', 
            border: '1px solid #333', 
            borderRadius: '8px', 
            fontSize: '1rem', 
            outline: 'none', 
            cursor: 'pointer'}
    };

    return (
        <div style={styles.page}>
            <div style={styles.header}>
                {/* 3. BOTÓN VOLVER (Importante para el entrenador) */}
                <button 
                    onClick={() => navigate(-1)} 
                    style={{
                        background:'none', 
                        border:'none', 
                        color:'#777', 
                        cursor:'pointer', 
                        display:'flex', 
                        alignItems:'center', 
                        gap:'5px',
                        padding: 'var(--spacing-sm)',
                        borderRadius: '6px',
                        transition: 'background 0.2s'}}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                >
                    <ArrowLeft/> {isCoachMode ? 'VOLVER' : ''}
                </button>
                <div>
                    <h1 style={styles.title}>Progreso {isCoachMode ? 'del Atleta' : ''}</h1>
                    {isCoachMode && <span style={{
                        color:'#FACC15', 
                        fontSize:'0.75rem', 
                        fontWeight:'bold', 
                        background:'#222', 
                        padding:'2px 8px', 
                        borderRadius:'4px'}}>VISTA ENTRENADOR</span>}
                </div>
            </div>

            {/* 1. KPIs */}
            {stats.loading && <p role="status">Cargando estadísticas…</p>}
            {stats.error && <ProgressFailure retry={stats.retry} label="Reintentar estadísticas">No se pudieron cargar las estadísticas.</ProgressFailure>}
            {globalStats && <div style={styles.grid}>
                <div style={styles.statCard}>
                    <div style={styles.iconBox}><Trophy size={24}/></div>
                    <div style={styles.statLabel}>Entrenos</div>
                    <div style={styles.statValue}>{globalStats?.totalEntrenos || 0}</div>
                </div>
                <div style={styles.statCard}>
                    <div style={styles.iconBox}><Dumbbell size={24}/></div>
                    <div style={styles.statLabel}>Volumen Total</div>
                    <div style={styles.statValue}>{volume} <span style={{fontSize:'1rem', color:'#555'}}>t</span></div>
                    {renderCambioVolumen()}
                </div>
                <div style={styles.statCard}>
                    <div style={styles.iconBox}><Calendar size={24}/></div>
                    <div style={styles.statLabel}>Horas</div>
                    <div style={styles.statValue}>{globalStats?.horasEntrenadas || 0}h</div>
                </div>
            </div>}

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
                {records.loading && <p role="status">Cargando récords…</p>}
                {records.error && <ProgressFailure retry={records.retry} label="Reintentar récords">No se pudieron cargar los récords.</ProgressFailure>}
                {records.data && <PersonalRecordsList prs={records.data} />}
            </div>

            <div style={styles.divider}></div>

            {/* 4. ANÁLISIS DETALLADO (1RM) */}
            <h2 style={styles.subTitle}>Análisis Detallado</h2>
            <div style={styles.selectorContainer}>
                {exerciseList.loading && <p role="status">Cargando ejercicios…</p>}
                {exerciseList.error && <ProgressFailure retry={exerciseList.retry} label="Reintentar ejercicios">No se pudieron cargar los ejercicios.</ProgressFailure>}
                {exerciseList.data && (ejercicios.length > 0 ? (
                    <select aria-label="Ejercicio del progreso" style={styles.select} value={selectedEjercicio} onChange={(e) => setSelection({ scope, id: e.target.value })}>
                        {ejercicios.map(ej => <option key={ej.id} value={ej.id}>{ej.nombre}</option>)}
                    </select>
                ) : (
                    <div style={{color:'#777'}}>No hay datos de ejercicios.</div>
                ))}
            </div>

            {chart.loading && (
                <div role="status" style={{padding: '40px', textAlign: 'center', color: '#666', fontStyle: 'italic'}}>Cargando gráfica...</div>
            )}
            {chart.error && <ProgressFailure retry={chart.retry} label="Reintentar gráfica">No se pudo cargar la gráfica.</ProgressFailure>}
            {selectedEjercicio && chart.data && <ProgresoChart data={chart.data.grafica} titulo="Fuerza Estimada (1RM)" pr={chart.data.pr}/>}
        </div>
    );
}
