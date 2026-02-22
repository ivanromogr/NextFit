import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Dumbbell, Calendar, Activity, Plus, Play, CheckCircle, Flame, ArrowRight 
} from 'lucide-react';
import { obtenerResumenDashboard } from '../../api/endpoints';
import { useAuth } from '../../context/AuthContext';

export default function DashboardCliente() {
    const navigate = useNavigate();
    const { userId } = useAuth();
    const [resumen, setResumen] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const cargarDatos = async () => {
            if (!userId) return;
            try {
                const resumenData = await obtenerResumenDashboard(userId);
                setResumen(resumenData);
            } catch (error) {
                console.error("Error cargando dashboard:", error);
            } finally {
                setLoading(false);
            }
        };
        cargarDatos();
    }, [userId]);

    const irASesion = (rutinaId) => navigate(`/cliente/sesion/${rutinaId}`);

    // --- ESTILOS PRO ---
    const styles = {
        page: { padding: '40px', background: '#09090b', minHeight: '100vh', color: 'white', fontFamily: 'sans-serif' },
        
        // Cabecera
        header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' },
        title: { fontSize: '2rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '-1px', margin:0 },
        subtitle: { color: '#71717a', margin:'5px 0 0 0', fontSize:'1rem' },
        actions: { display: 'flex', gap: '10px' },
        
        // Botones cabecera
        btnSmall: { background: '#18181b', border: '1px solid #333', color: '#ccc', padding: '10px 18px', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', fontWeight: 'bold', transition: 'all 0.2s' },
        
        // GRID DE ESTADÍSTICAS
        statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '20px', marginBottom: '50px' },
        statCard: { background: '#121214', padding: '24px', borderRadius: '16px', border: '1px solid #27272a', display: 'flex', flexDirection: 'column' },
        statLabel: { color: '#71717a', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '1px' },
        statValue: { fontSize: '1.8rem', fontWeight: '900', color: 'white' },
        statIcon: (color) => ({ marginBottom: '12px', color: color }),
        progressBarBg: { width:'100%', height:'6px', background:'#27272a', borderRadius:'3px', marginTop:'15px' },
        progressBarFill: (pct) => ({ width: `${pct}%`, height:'100%', background: pct >= 100 ? '#22c55e' : '#3b82f6', borderRadius:'3px', transition:'width 1s ease' }),

        // SECCIÓN HERO (El foco principal)
        heroSection: { marginBottom: '50px' },
        heroCard: { 
            background: 'linear-gradient(145deg, #18181b 0%, #0c0c0e 100%)', 
            borderRadius: '24px', padding: '50px', 
            border: '1px solid #333', position: 'relative', overflow: 'hidden',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '30px',
            boxShadow: '0 20px 50px -10px rgba(0,0,0,0.3)'
        },
        heroContent: { zIndex: 2, maxWidth: '600px' },
        heroTag: { background: 'rgba(250, 204, 21, 0.15)', color: '#FACC15', padding: '6px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '800', textTransform: 'uppercase', marginBottom: '15px', display: 'inline-block' },
        heroTitle: { fontSize: '3rem', fontWeight: '900', marginBottom: '15px', lineHeight: 1, textTransform: 'uppercase' },
        heroSub: { color: '#a1a1aa', fontSize: '1.1rem', lineHeight: 1.6 },
        
        // Botón gigante de Play
        playBtn: { 
            background: '#FACC15', color: 'black', border: 'none', padding: '18px 40px', 
            borderRadius: '50px', fontSize: '1.1rem', fontWeight: '900', cursor: 'pointer', 
            display: 'flex', alignItems: 'center', gap: '12px',
            boxShadow: '0 0 30px rgba(250, 204, 21, 0.3)', textTransform: 'uppercase',
            transition: 'transform 0.2s'
        },
        
        // TARJETA ENLACE A BIBLIOTECA
        libraryLink: {
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: '#121214', padding: '30px', borderRadius: '20px',
            border: '1px solid #27272a', cursor: 'pointer', transition: 'border-color 0.2s'
        }
    };

    if (loading) return <div style={{padding:40, color:'white', display:'flex', justifyContent:'center'}}>Cargando Panel de Control...</div>;

    // Calculamos % de la barra de progreso
    const progresoSemana = resumen ? Math.min((resumen.entrenosHechos / resumen.entrenosObjetivo) * 100, 100) : 0;

    return (
        <div style={styles.page}>
            {/* 1. HEADER */}
            <div style={styles.header}>
                <div>
                    <h1 style={styles.title}>Panel de Control</h1>
                    <p style={styles.subtitle}>Resumen de tu actividad semanal.</p>
                </div>
                <div style={styles.actions}>
                    <button 
                        style={styles.btnSmall} 
                        onClick={() => navigate('/cliente/rutinas')} // RUTA A MenuCliente.jsx
                    >
                        <Dumbbell size={18}/> Ver mis Rutinas
                    </button>
                    <button 
                        style={{...styles.btnSmall, background:'#FACC15', color:'black', borderColor:'#FACC15'}} 
                        onClick={() => navigate('/cliente/nuevo')} // RUTA A CrearHub.jsx
                    >
                        <Plus size={18}/> Crear
                    </button>
                </div>
            </div>

            {/* 2. BARRA DE ESTADÍSTICAS */}
            <div style={styles.statsGrid}>
                {/* Tarjeta 1: Objetivo Semanal */}
                <div style={styles.statCard}>
                    <Activity style={styles.statIcon('#3b82f6')} size={28}/>
                    <span style={styles.statLabel}>Objetivo Semanal</span>
                    <div style={{display:'flex', alignItems:'baseline', gap:'8px'}}>
                        <span style={styles.statValue}>{resumen?.entrenosHechos || 0}</span>
                        <span style={{color:'#555', fontSize:'1.2rem', fontWeight:'bold'}}>/ {resumen?.entrenosObjetivo || 4}</span>
                    </div>
                    <div style={styles.progressBarBg}>
                        <div style={styles.progressBarFill(progresoSemana)}></div>
                    </div>
                </div>

                {/* Tarjeta 2: Volumen */}
                <div style={styles.statCard}>
                    <Dumbbell style={styles.statIcon('#FACC15')} size={28}/>
                    <span style={styles.statLabel}>Volumen Total</span>
                    <span style={styles.statValue}>{(resumen?.volumenSemana || 0).toLocaleString()} <span style={{fontSize:'1rem', color:'#555'}}>kg</span></span>
                </div>

                {/* Tarjeta 3: Racha */}
                <div style={styles.statCard}>
                    <Flame style={styles.statIcon('#ef4444')} size={28}/>
                    <span style={styles.statLabel}>Racha Actual</span>
                    <span style={styles.statValue}>3 <span style={{fontSize:'1rem', color:'#555'}}>DÍAS</span></span>
                </div>
            </div>

            {/* 3. HERO SECTION: ¿QUÉ TOCA HOY? */}
            <div style={styles.heroSection}>
                {resumen?.eventoHoy && !resumen.eventoHoy.completado ? (
                    // CASO A: Tienes entreno hoy pendiente
                    <div style={styles.heroCard}>
                        <div style={styles.heroContent}>
                            <span style={styles.heroTag}>🔥 OBJETIVO DE HOY</span>
                            <h2 style={styles.heroTitle}>{resumen.eventoHoy.rutinaNombre}</h2>
                            <p style={styles.heroSub}>Todo programado en tu calendario. Prepárate y dale caña cuando estés listo.</p>
                        </div>
                        <button style={styles.playBtn} onClick={() => irASesion(resumen.eventoHoy.rutinaId)}>
                            <Play size={24} fill="black"/> EMPEZAR SESIÓN
                        </button>
                    </div>
                ) : resumen?.eventoHoy && resumen.eventoHoy.completado ? (
                     // CASO B: Ya has entrenado hoy
                     <div style={{...styles.heroCard, background: 'linear-gradient(145deg, #14532d 0%, #052e16 100%)', borderColor:'#15803d'}}>
                        <div style={styles.heroContent}>
                            <span style={{...styles.heroTag, background:'rgba(34, 197, 94, 0.2)', color:'#4ade80'}}>✅ MISIÓN CUMPLIDA</span>
                            <h2 style={styles.heroTitle}>¡DÍA COMPLETADO!</h2>
                            <p style={{...styles.heroSub, color:'#86efac'}}>Has cumplido tu objetivo de hoy. Descansa y recupérate para mañana.</p>
                        </div>
                        <div style={{background:'rgba(255,255,255,0.1)', padding:'20px', borderRadius:'50%'}}>
                            <CheckCircle size={50} color="#4ade80"/>
                        </div>
                    </div>
                ) : (
                    // CASO C: No hay nada programado
                    <div style={{...styles.heroCard, borderStyle:'dashed', borderColor:'#333', background:'transparent'}}>
                        <div style={styles.heroContent}>
                            <span style={{...styles.heroTag, background:'#27272a', color:'#aaa'}}>💤 DÍA DE DESCANSO</span>
                            <h2 style={{...styles.heroTitle, color:'#555'}}>NADA PROGRAMADO HOY</h2>
                            <p style={styles.heroSub}>Disfruta de tu día libre o visita tu biblioteca para hacer una rutina extra.</p>
                        </div>
                        <div style={{display:'flex', gap:'15px'}}>
                            <button style={{...styles.playBtn, background:'#27272a', color:'white', boxShadow:'none', fontSize:'0.9rem'}} onClick={() => navigate('/cliente/calendario')}>
                                <Calendar size={20}/> CALENDARIO
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* 4. ENLACE A TU BIBLIOTECA (MenuCliente) */}
            <div 
                style={styles.libraryLink}
                onClick={() => navigate('/cliente/rutinas')} 
                onMouseEnter={(e) => e.currentTarget.style.borderColor = '#FACC15'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = '#27272a'}
            >
                <div>
                    <h3 style={{fontSize:'1.5rem', fontWeight:'900', marginBottom:'5px', textTransform:'uppercase'}}>Tu Biblioteca</h3>
                    <p style={{color:'#71717a', margin:0}}>Accede a todos tus planes de entrenamiento, rutinas IA y personalizadas.</p>
                </div>
                <div style={{background:'#27272a', padding:'15px', borderRadius:'50%'}}>
                    <ArrowRight size={24} color="white"/>
                </div>
            </div>
        </div>
    );
}