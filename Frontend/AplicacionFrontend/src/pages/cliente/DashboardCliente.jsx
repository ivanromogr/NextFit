import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Dumbbell, Calendar, Activity, Plus, Play, CheckCircle, Flame, ArrowRight, User, Bell, X, Trophy, Info, Target 
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

    // Estados para Notificaciones
    const [showNotis, setShowNotis] = useState(false);
    const [notificaciones, setNotificaciones] = useState([]);

    useEffect(() => {
        const cargarDatos = async () => {
            if (!userId) return;
            try {
                const [resumenData, userData] = await Promise.all([
                    obtenerResumenDashboard(userId),
                    getCliente(userId)
                ]);

                if (resumenData) {
                    setResumen(resumenData);
                    generarNotificacionesReales(resumenData); // Generamos notificaciones con los datos
                }
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
                leido: false // NO LEÍDA por defecto
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

        // Si no hay nada, mensaje de bienvenida
        if (nuevasNotis.length === 0) {
            nuevasNotis.push({
                id: 'bienvenida',
                tipo: 'info',
                titulo: "👋 Todo listo",
                texto: "Aún no tienes entrenamientos pendientes ni rachas. ¡Ve al calendario!",
                tiempo: "Ahora",
                leido: true
            });
        }

        setNotificaciones(nuevasNotis);
    };

    // Función para abrir el panel y marcar como leídas
    const toggleNotificaciones = () => {
        setShowNotis(!showNotis);
        if (!showNotis) {
            setNotificaciones(prev => prev.map(noti => ({ ...noti, leido: true })));
        }
    };

    const hayNotificacionesSinLeer = notificaciones.some(noti => !noti.leido);
    const progresoSemana = resumen && resumen.entrenosObjetivo > 0 
        ? Math.min((resumen.entrenosHechos / resumen.entrenosObjetivo) * 100, 100) 
        : 0;
    const irASesion = (rutinaId) => navigate(`/cliente/sesion/${rutinaId}`);

    // --- ESTILOS PREMIUM ---
    const styles = {
        page: { 
            padding: 'var(--spacing-xl) var(--spacing-2xl)', 
            background: '#050505', 
            minHeight: '100vh', 
            color: 'white', 
            fontFamily: "'Inter', system-ui, sans-serif",
            '@media (max-width: 767px)': {
                padding: 'var(--spacing-md) var(--spacing-md)'
            }
        },
        
        // 1. Cabecera (Header)
        headerRow: { 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: 'var(--spacing-xl)',
            '@media (max-width: 767px)': {
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: 'var(--spacing-md)',
                marginBottom: 'var(--spacing-lg)'
            }
        },
        greetingBox: { display: 'flex', flexDirection: 'column', gap: '4px' },
        title: { 
            fontSize: 'clamp(1.5rem, 4vw, 2rem)', 
            fontWeight: 900, 
            letterSpacing: '-0.5px', 
            margin: 0 
        },
        subtitle: { 
            color: 'rgba(255,255,255,0.5)', 
            fontSize: '0.95rem', 
            fontWeight: 500,
            '@media (max-width: 767px)': {
                fontSize: '0.85rem'
            }
        },
        
        profileSection: { 
            display: 'flex', 
            alignItems: 'center', 
            gap: 'var(--spacing-lg)',
            '@media (max-width: 767px)': {
                alignSelf: 'flex-end'
            }
        },
        
        // Contenedor de la campana (Relativo para el Dropdown)
        bellWrapper: { position: 'relative' },
        bellBox: { width: '45px', height: '45px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'rgba(255,255,255,0.03)', transition: 'all 0.3s' },
        notificationDot: { position: 'absolute', top: 0, right: 0, width: '12px', height: '12px', borderRadius: '50%', background: '#EF4444', border: '2px solid #050505' },
        
        // Panel Flotante de Notificaciones
        notiDropdown: { 
            position: 'absolute', 
            top: '55px', 
            right: 0, 
            width: '380px', 
            background: 'rgba(18, 18, 20, 0.95)', 
            backdropFilter: 'blur(15px)', 
            border: '1px solid rgba(255,255,255,0.1)', 
            borderRadius: '20px', 
            padding: '20px', 
            zIndex: 100, 
            boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
            '@media (max-width: 767px)': {
                width: 'calc(100vw - 2rem)',
                maxWidth: '380px',
                right: '-1rem',
                top: '60px',
                borderRadius: '16px',
                padding: '16px'
            }
        },
        notiHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '15px' },
        notiTitle: { margin: 0, fontSize: '1.2rem', fontWeight: 900 },
        notiCloseBtn: { background: 'transparent', border: 'none', color: '#888', cursor: 'pointer', display: 'flex' },
        notiItem: (unread) => ({ display: 'flex', gap: '15px', padding: '15px', borderRadius: '14px', background: unread ? 'rgba(250, 204, 21, 0.05)' : 'transparent', borderLeft: unread ? '3px solid #FACC15' : '3px solid transparent', transition: 'background 0.2s', marginBottom: '8px', alignItems: 'flex-start' }),
        notiIconWrap: { width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
        notiItemTitle: { margin: '0 0 5px 0', fontSize: '0.95rem', fontWeight: 800, color: 'white' },
        notiItemDesc: { margin: 0, fontSize: '0.85rem', color: '#aaa', lineHeight: '1.4' },
        notiItemTime: { display: 'block', fontSize: '0.75rem', color: '#666', marginTop: '8px', fontWeight: 600 },

        avatarImg: { width: '55px', height: '55px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #FACC15', padding: '2px', boxShadow: '0 0 15px rgba(250, 204, 21, 0.15)', cursor: 'pointer' },
        
        // Botones de acción
        actionRow: { 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: 'var(--spacing-lg)',
            '@media (max-width: 767px)': {
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: 'var(--spacing-md)',
                marginBottom: 'var(--spacing-md)'
            }
        },
        btnSecondary: { 
            background: 'rgba(255,255,255,0.05)', 
            border: '1px solid rgba(255,255,255,0.1)', 
            color: 'white', 
            padding: '12px 24px', 
            borderRadius: '14px', 
            fontWeight: 700, 
            cursor: 'pointer', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '10px', 
            transition: 'all 0.2s',
            '@media (max-width: 767px)': {
                padding: '10px 20px',
                fontSize: '0.9rem'
            }
        },
        btnPrimary: { 
            background: 'linear-gradient(135deg, #FACC15 0%, #EAB308 100%)', 
            color: 'black', 
            border: 'none', 
            padding: '12px 28px', 
            borderRadius: '14px', 
            fontWeight: 900, 
            cursor: 'pointer', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            boxShadow: '0 10px 25px rgba(250, 204, 21, 0.25)', 
            transition: 'all 0.2s transform',
            '@media (max-width: 767px)': {
                padding: '10px 24px',
                fontSize: '0.9rem'
            }
        },

        // Grid Estadísticas
        statsGrid: { 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
            gap: 'var(--spacing-lg)', 
            marginBottom: 'var(--spacing-2xl)',
            '@media (max-width: 767px)': {
                gridTemplateColumns: '1fr',
                gap: 'var(--spacing-md)',
                marginBottom: 'var(--spacing-xl)'
            }
        },
        statCard: { 
            background: 'linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)', 
            border: '1px solid rgba(255,255,255,0.05)', 
            borderRadius: '24px', 
            padding: 'var(--spacing-lg)', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '15px', 
            backdropFilter: 'blur(10px)',
            '@media (max-width: 767px)': {
                padding: 'var(--spacing-md)',
                borderRadius: '16px'
            }
        },
        iconWrap: { width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
        statValue: { fontSize: '2.2rem', fontWeight: 900, display: 'flex', alignItems: 'baseline', gap: '5px' },
        statUnit: { fontSize: '1rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600 },
        progressBarBg: { width:'100%', height:'8px', background:'rgba(255,255,255,0.1)', borderRadius:'10px', overflow:'hidden' },
        progressBarFill: (pct) => ({ width: `${pct}%`, height:'100%', background: pct >= 100 ? '#4ade80' : '#FACC15', borderRadius:'10px', transition:'width 1s ease-in-out' }),

        // Hero
        heroCard: { 
            background: 'url("https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=2000&auto=format&fit=crop") center/cover', 
            borderRadius: '30px', 
            position: 'relative', 
            overflow: 'hidden', 
            padding: 'var(--spacing-2xl)',
            '@media (max-width: 767px)': {
                borderRadius: '20px',
                padding: 'var(--spacing-lg)'
            }
        },
        heroOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(to right, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.4) 100%)', zIndex: 1 },
        heroContent: { 
            position: 'relative', 
            zIndex: 2, 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            flexWrap: 'wrap', 
            gap: 'var(--spacing-lg)',
            '@media (max-width: 767px)': {
                flexDirection: 'column',
                textAlign: 'center',
                gap: 'var(--spacing-md)'
            }
        },
        heroTag: { 
            background: 'rgba(250, 204, 21, 0.15)', 
            color: '#FACC15', 
            border: '1px solid rgba(250, 204, 21, 0.3)', 
            padding: '8px 16px', 
            borderRadius: '20px', 
            fontSize: '0.8rem', 
            fontWeight: 800, 
            letterSpacing: '1px', 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '6px', 
            backdropFilter: 'blur(5px)' 
        },
        heroTitle: { 
            margin: '15px 0 10px 0', 
            fontSize: 'clamp(1.8rem, 5vw, 2.5rem)', 
            fontWeight: 900, 
            letterSpacing: '-1px', 
            textTransform: 'uppercase' 
        },
        heroSub: { 
            margin: 0, 
            color: 'rgba(255,255,255,0.7)', 
            fontSize: '1.05rem', 
            maxWidth: '400px', 
            lineHeight: '1.5',
            '@media (max-width: 767px)': {
                fontSize: '0.95rem',
                maxWidth: '100%'
            }
        },
        playBtn: { 
            background: '#FACC15', 
            color: 'black', 
            border: 'none', 
            padding: '16px 36px', 
            borderRadius: '50px', 
            fontSize: '1rem', 
            fontWeight: 900, 
            cursor: 'pointer', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '10px', 
            boxShadow: '0 0 25px rgba(250, 204, 21, 0.3)', 
            textTransform: 'uppercase', 
            transition: 'transform 0.2s',
            '@media (max-width: 767px)': {
                padding: '14px 28px',
                fontSize: '0.9rem',
                width: '100%',
                justifyContent: 'center'
            }
        },

        // Enlace
        libraryLink: { 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            background: 'linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)', 
            padding: 'var(--spacing-xl)', 
            borderRadius: '24px', 
            border: '1px solid rgba(255,255,255,0.05)', 
            cursor: 'pointer', 
            transition: 'border-color 0.2s', 
            marginTop: 'var(--spacing-xl)',
            '@media (max-width: 767px)': {
                padding: 'var(--spacing-lg)',
                borderRadius: '16px',
                marginTop: 'var(--spacing-lg)',
                flexDirection: 'column',
                textAlign: 'center',
                gap: 'var(--spacing-md)'
            }
        }
    };

    if (loading) {
        return (
            <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#050505', color: '#FACC15' }}>
                <Activity size={40} className="animate-pulse" />
            </div>
        );
    }

    return (
        <div style={styles.page}>
            
            {/* 1. HEADER */}
            <div style={styles.headerRow}>
                <div style={styles.greetingBox}>
                    <h1 style={styles.title}>Hola, <span style={{color: '#FACC15'}}>{perfil.nombre.split(' ')[0]}</span> 👋</h1>
                    <span style={styles.subtitle}>Aquí tienes el resumen de tu actividad.</span>
                </div>
                
                <div style={styles.profileSection}>
                    {/* 🔔 BOTÓN CAMPANA Y DROPDOWN */}
                    <div style={styles.bellWrapper}>
                        <div style={styles.bellBox} onClick={toggleNotificaciones} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}>
                            <Bell size={20} color="white" />
                        </div>
                        
                        {/* Puntito Rojo Dinámico */}
                        {hayNotificacionesSinLeer && <div style={styles.notificationDot} />}

                        {/* Dropdown de Notificaciones */}
                        {showNotis && (
                            <div style={styles.notiDropdown}>
                                <div style={styles.notiHeader}>
                                    <h3 style={styles.notiTitle}>Tu Actividad</h3>
                                    <button onClick={() => setShowNotis(false)} style={styles.notiCloseBtn}><X size={20}/></button>
                                </div>
                                <div style={{maxHeight: '400px', overflowY: 'auto', paddingRight: '5px'}}>
                                    {notificaciones.map(noti => (
                                        <div key={noti.id} style={styles.notiItem(!noti.leido)}>
                                            <div style={styles.notiIconWrap}>
                                                {noti.tipo === 'alerta' ? <Flame size={20} color="#EF4444" /> :
                                                 noti.tipo === 'logro' ? <Trophy size={20} color="#FACC15" /> : 
                                                 noti.tipo === 'exito' ? <CheckCircle size={20} color="#4ade80" /> :
                                                 <Info size={20} color="#3B82F6" />}
                                            </div>
                                            <div>
                                                <h4 style={styles.notiItemTitle}>{noti.titulo}</h4>
                                                <p style={styles.notiItemDesc}>{noti.texto}</p>
                                                <span style={styles.notiItemTime}>{noti.tiempo}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div onClick={() => navigate('/cliente/perfil')}>
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

            {/* 2. PANEL DE CONTROL */}
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

            {/* 3. GRID ESTADÍSTICAS */}
            <div style={styles.statsGrid}>
                <div style={styles.statCard}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 800, fontSize: '0.8rem', letterSpacing: '1px' }}>OBJETIVO SEMANAL</span>
                        <div style={{ ...styles.iconWrap, background: 'rgba(59, 130, 246, 0.1)' }}>
                            <Target size={20} color="#3B82F6" />
                        </div>
                    </div>
                    <div style={styles.statValue}>
                        {resumen?.entrenosHechos || 0} <span style={styles.statUnit}>/ {resumen?.entrenosObjetivo || 4} días</span>
                    </div>
                    <div style={styles.progressBarBg}>
                        <div style={styles.progressBarFill(progresoSemana)}></div>
                    </div>
                </div>

                <div style={styles.statCard}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 800, fontSize: '0.8rem', letterSpacing: '1px' }}>VOLUMEN TOTAL</span>
                        <div style={{ ...styles.iconWrap, background: 'rgba(250, 204, 21, 0.05)' }}>
                            <Dumbbell size={20} color="#aaa" />
                        </div>
                    </div>
                    <div style={styles.statValue}>
                        {(resumen?.volumenSemana || 0).toLocaleString()} <span style={styles.statUnit}>kg movidos</span>
                    </div>
                </div>

                <div style={styles.statCard}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 800, fontSize: '0.8rem', letterSpacing: '1px' }}>RACHA ACTUAL</span>
                        <div style={{ ...styles.iconWrap, background: 'rgba(239, 68, 68, 0.1)' }}>
                            <Flame size={20} color="#EF4444" />
                        </div>
                    </div>
                    <div style={styles.statValue}>
                        {/* 🎯 AQUÍ APLICAMOS LA RACHA DEL BACKEND */}
                        {resumen?.rachaActual || 0} <span style={styles.statUnit}>días seguidos</span>
                    </div>
                </div>
            </div>

            {/* 4. HERO SECTION */}
            <div>
                {resumen?.eventoHoy && !resumen.eventoHoy.completado ? (
                    <div style={styles.heroCard}>
                        <div style={styles.heroOverlay}></div>
                        <div style={styles.heroContent}>
                            <div>
                                <span style={styles.heroTag}><Flame size={14}/> HOY TOCA SUDAR</span>
                                <h2 style={styles.heroTitle}>{resumen.eventoHoy.rutinaNombre}</h2>
                                <p style={styles.heroSub}>Todo programado en tu calendario. Prepárate y dale caña cuando estés listo.</p>
                            </div>
                            <button style={styles.playBtn} onClick={() => irASesion(resumen.eventoHoy.rutinaId)} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                                <Play size={20} fill="black"/> EMPEZAR SESIÓN
                            </button>
                        </div>
                    </div>
                ) : resumen?.eventoHoy && resumen.eventoHoy.completado ? (
                    <div style={{...styles.heroCard, background: '#052e16', border: '1px solid rgba(74, 222, 128, 0.3)'}}>
                        <div style={styles.heroContent}>
                            <div>
                                <span style={{...styles.heroTag, background:'rgba(74, 222, 128, 0.15)', color:'#4ade80', borderColor:'transparent'}}><CheckCircle size={14}/> MISIÓN CUMPLIDA</span>
                                <h2 style={styles.heroTitle}>¡DÍA SUPERADO!</h2>
                                <p style={{...styles.heroSub, color:'#86efac'}}>Has cumplido tu objetivo de hoy. Descansa y recupérate para mañana.</p>
                            </div>
                            <div style={{background:'rgba(255,255,255,0.05)', padding:'20px', borderRadius:'50%'}}>
                                <CheckCircle size={60} color="#4ade80"/>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div style={{...styles.heroCard, background: 'transparent', border: '1px dashed #333'}}>
                        <div style={styles.heroContent}>
                            <div>
                                <span style={{...styles.heroTag, background:'#1a1a1a', color:'#888', borderColor:'transparent'}}><Calendar size={14}/> DÍA DE DESCANSO</span>
                                <h2 style={{...styles.heroTitle, color:'#666'}}>NADA PROGRAMADO HOY</h2>
                                <p style={styles.heroSub}>El músculo crece mientras descansas. Disfruta de tu día libre o visita tu calendario.</p>
                            </div>
                            <button style={{...styles.playBtn, background:'#1a1a1a', color:'white', boxShadow:'none'}} onClick={() => navigate('/cliente/calendario')}>
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