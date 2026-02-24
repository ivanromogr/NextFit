import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Dumbbell, Calendar, Activity, Plus, Play, CheckCircle, Flame, ArrowRight, User, Bell 
} from 'lucide-react';
import { obtenerResumenDashboard, getCliente } from '../../api/endpoints';
import { useAuth } from '../../context/AuthContext';

export default function DashboardCliente() {
    const navigate = useNavigate();
    const { userId } = useAuth();
    
    // Estados
    const [resumen, setResumen] = useState(null);
    const [perfil, setPerfil] = useState({ nombre: 'Atleta', fotoPerfil: '' });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const cargarDatos = async () => {
            if (!userId) return;
            try {
                // Cargamos ambos datos en paralelo para ser más rápidos
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

    const irASesion = (rutinaId) => navigate(`/cliente/sesion/${rutinaId}`);

    // Calculamos % de la barra de progreso de forma segura
    const progresoSemana = resumen && resumen.entrenosObjetivo > 0 
        ? Math.min((resumen.entrenosHechos / resumen.entrenosObjetivo) * 100, 100) 
        : 0;

    // --- ESTILOS PREMIUM (Glassmorphism & Branding) ---
    const styles = {
        page: { padding: '40px 50px', background: '#050505', minHeight: '100vh', color: 'white', fontFamily: "'Inter', system-ui, sans-serif" },
        
        // 1. Cabecera (Header)
        headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' },
        greetingBox: { display: 'flex', flexDirection: 'column', gap: '4px' },
        title: { fontSize: '2rem', fontWeight: 900, letterSpacing: '-0.5px', margin: 0 },
        subtitle: { color: 'rgba(255,255,255,0.5)', fontSize: '0.95rem', fontWeight: 500 },
        
        // Perfil y Notificaciones
        profileSection: { display: 'flex', alignItems: 'center', gap: '20px' },
        bellBox: { width: '45px', height: '45px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'rgba(255,255,255,0.03)', transition: 'all 0.3s' },
        avatarImg: { width: '55px', height: '55px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #FACC15', padding: '2px', boxShadow: '0 0 15px rgba(250, 204, 21, 0.15)' },
        
        // Botones de acción rápida
        actionRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' },
        btnSecondary: { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '12px 24px', borderRadius: '14px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', transition: 'all 0.2s' },
        btnPrimary: { background: 'linear-gradient(135deg, #FACC15 0%, #EAB308 100%)', color: 'black', border: 'none', padding: '12px 28px', borderRadius: '14px', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 10px 25px rgba(250, 204, 21, 0.25)', transition: 'all 0.2s transform' },

        // 2. GRID DE ESTADÍSTICAS (Glassmorphism)
        statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '40px' },
        statCard: { background: 'linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '24px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '15px', backdropFilter: 'blur(10px)' },
        iconWrap: { width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
        statValue: { fontSize: '2rem', fontWeight: 900, display: 'flex', alignItems: 'baseline', gap: '5px' },
        statUnit: { fontSize: '1rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600 },
        progressBarBg: { width:'100%', height:'6px', background:'rgba(255,255,255,0.1)', borderRadius:'10px', overflow:'hidden' },
        progressBarFill: (pct) => ({ width: `${pct}%`, height:'100%', background: pct >= 100 ? '#4ade80' : '#3B82F6', borderRadius:'10px', transition:'width 1s ease-in-out' }),

        // 3. SECCIÓN HERO (Entrenamiento del día)
        heroCard: { background: 'url("https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=2000&auto=format&fit=crop") center/cover', borderRadius: '30px', position: 'relative', overflow: 'hidden', padding: '40px' },
        heroOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(to right, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.4) 100%)', zIndex: 1 },
        heroContent: { position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' },
        heroTag: { background: 'rgba(250, 204, 21, 0.15)', color: '#FACC15', padding: '8px 16px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 800, letterSpacing: '1px', display: 'inline-flex', alignItems: 'center', gap: '6px', backdropFilter: 'blur(5px)' },
        heroTitle: { margin: '15px 0 10px 0', fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-1px', textTransform: 'uppercase' },
        heroSub: { margin: 0, color: 'rgba(255,255,255,0.7)', fontSize: '1.05rem', maxWidth: '400px', lineHeight: '1.5' },
        playBtn: { background: '#FACC15', color: 'black', border: 'none', padding: '16px 36px', borderRadius: '50px', fontSize: '1rem', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 0 25px rgba(250, 204, 21, 0.3)', textTransform: 'uppercase', transition: 'transform 0.2s' },

        // 4. TARJETA ENLACE A BIBLIOTECA
        libraryLink: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)', padding: '30px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', transition: 'border-color 0.2s', marginTop: '30px' }
    };

    if (loading) {
        return (
            <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#050505', color: '#FACC15' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
                    <Activity size={40} className="animate-pulse" />
                    <span style={{ fontWeight: 800, letterSpacing: '2px', fontSize: '0.8rem' }}>CARGANDO TU ESPACIO...</span>
                </div>
            </div>
        );
    }

    return (
        <div style={styles.page}>
            
            {/* 1. HEADER (Identidad Visual) */}
            <div style={styles.headerRow}>
                <div style={styles.greetingBox}>
                    <h1 style={styles.title}>Hola, {perfil.nombre.split(' ')[0]} 👋</h1>
                    <span style={styles.subtitle}>Aquí tienes el resumen de tu actividad.</span>
                </div>
                
                <div style={styles.profileSection}>
                    <div style={styles.bellBox} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}>
                        <Bell size={20} color="white" />
                    </div>
                    <div onClick={() => navigate('/cliente/perfil')} style={{cursor: 'pointer'}}>
                        {perfil.fotoPerfil ? (
                            <img src={perfil.fotoPerfil} alt="Perfil" style={styles.avatarImg} />
                        ) : (
                            <div style={{...styles.avatarImg, background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                                <User size={24} color="#FACC15" />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* 2. BOTONES RÁPIDOS */}
            <div style={styles.actionRow}>
                <div style={{ fontWeight: 800, fontSize: '1.2rem', letterSpacing: '-0.5px' }}>PANEL DE CONTROL</div>
                <div style={{ display: 'flex', gap: '15px' }}>
                    <button style={styles.btnSecondary} onClick={() => navigate('/cliente/rutinas')} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}>
                        <Dumbbell size={18} /> Mis Rutinas
                    </button>
                    <button style={styles.btnPrimary} onClick={() => navigate('/cliente/nuevo')} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.03)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                        <Plus size={20} /> Crear Rutina
                    </button>
                </div>
            </div>

            {/* 3. GRID DE ESTADÍSTICAS (Glassmorphism) */}
            <div style={styles.statsGrid}>
                {/* Tarjeta 1: Objetivo Semanal */}
                <div style={styles.statCard}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 800, fontSize: '0.8rem', letterSpacing: '1px' }}>OBJETIVO SEMANAL</span>
                        <div style={{ ...styles.iconWrap, background: 'rgba(59, 130, 246, 0.1)' }}>
                            <Activity size={20} color="#3B82F6" />
                        </div>
                    </div>
                    <div style={styles.statValue}>
                        {resumen?.entrenosHechos || 0} <span style={styles.statUnit}>/ {resumen?.entrenosObjetivo || 4}</span>
                    </div>
                    <div style={styles.progressBarBg}>
                        <div style={styles.progressBarFill(progresoSemana)}></div>
                    </div>
                </div>

                {/* Tarjeta 2: Volumen */}
                <div style={styles.statCard}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 800, fontSize: '0.8rem', letterSpacing: '1px' }}>VOLUMEN TOTAL</span>
                        <div style={{ ...styles.iconWrap, background: 'rgba(250, 204, 21, 0.1)' }}>
                            <Dumbbell size={20} color="#FACC15" />
                        </div>
                    </div>
                    <div style={styles.statValue}>
                        {(resumen?.volumenSemana || 0).toLocaleString()} <span style={styles.statUnit}>kg</span>
                    </div>
                </div>

                {/* Tarjeta 3: Racha */}
                <div style={styles.statCard}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 800, fontSize: '0.8rem', letterSpacing: '1px' }}>RACHA ACTUAL</span>
                        <div style={{ ...styles.iconWrap, background: 'rgba(239, 68, 68, 0.1)' }}>
                            <Flame size={20} color="#EF4444" />
                        </div>
                    </div>
                    <div style={styles.statValue}>
                        3 <span style={styles.statUnit}>DÍAS</span>
                    </div>
                </div>
            </div>

            {/* 4. HERO SECTION (Qué toca hoy) */}
            <div>
                {resumen?.eventoHoy && !resumen.eventoHoy.completado ? (
                    // CASO A: Tienes entreno pendiente
                    <div style={styles.heroCard}>
                        <div style={styles.heroOverlay}></div>
                        <div style={styles.heroContent}>
                            <div>
                                <span style={styles.heroTag}><Flame size={14}/> OBJETIVO DE HOY</span>
                                <h2 style={styles.heroTitle}>{resumen.eventoHoy.rutinaNombre}</h2>
                                <p style={styles.heroSub}>Todo programado en tu calendario. Prepárate y dale caña cuando estés listo.</p>
                            </div>
                            <button style={styles.playBtn} onClick={() => irASesion(resumen.eventoHoy.rutinaId)} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                                <Play size={20} fill="black"/> EMPEZAR SESIÓN
                            </button>
                        </div>
                    </div>
                ) : resumen?.eventoHoy && resumen.eventoHoy.completado ? (
                    // CASO B: Ya has entrenado
                    <div style={{...styles.heroCard, background: '#052e16', border: '1px solid #15803d'}}>
                        <div style={styles.heroContent}>
                            <div>
                                <span style={{...styles.heroTag, background:'rgba(34, 197, 94, 0.2)', color:'#4ade80'}}><CheckCircle size={14}/> MISIÓN CUMPLIDA</span>
                                <h2 style={styles.heroTitle}>¡DÍA COMPLETADO!</h2>
                                <p style={{...styles.heroSub, color:'#86efac'}}>Has cumplido tu objetivo de hoy. Descansa y recupérate para mañana.</p>
                            </div>
                            <div style={{background:'rgba(255,255,255,0.1)', padding:'20px', borderRadius:'50%'}}>
                                <CheckCircle size={50} color="#4ade80"/>
                            </div>
                        </div>
                    </div>
                ) : (
                    // CASO C: Día de descanso
                    <div style={{...styles.heroCard, background: 'transparent', border: '1px dashed #333'}}>
                        <div style={styles.heroContent}>
                            <div>
                                <span style={{...styles.heroTag, background:'#27272a', color:'#aaa'}}><Calendar size={14}/> DÍA DE DESCANSO</span>
                                <h2 style={{...styles.heroTitle, color:'#71717a'}}>NADA PROGRAMADO HOY</h2>
                                <p style={styles.heroSub}>El músculo crece mientras descansas. Disfruta de tu día libre o visita la biblioteca.</p>
                            </div>
                            <button style={{...styles.playBtn, background:'#27272a', color:'white', boxShadow:'none'}} onClick={() => navigate('/cliente/calendario')}>
                                IR AL CALENDARIO
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* 5. ENLACE A BIBLIOTECA */}
            <div 
                style={styles.libraryLink}
                onClick={() => navigate('/cliente/rutinas')} 
                onMouseEnter={(e) => e.currentTarget.style.borderColor = '#FACC15'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'}
            >
                <div>
                    <h3 style={{fontSize:'1.5rem', fontWeight: 900, marginBottom:'5px', textTransform:'uppercase'}}>Tu Biblioteca</h3>
                    <p style={{color:'#71717a', margin:0}}>Accede a todos tus planes de entrenamiento, rutinas IA y personalizadas.</p>
                </div>
                <div style={{background:'rgba(255,255,255,0.05)', padding:'15px', borderRadius:'50%'}}>
                    <ArrowRight size={24} color="#FACC15"/>
                </div>
            </div>
            
        </div>
    );
}