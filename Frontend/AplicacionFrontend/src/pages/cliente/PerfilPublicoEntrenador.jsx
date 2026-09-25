import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../../api/endpoints";
import { 
    ChevronLeft, Star, ShieldCheck, MessageSquare, 
    Zap, Award, Trophy, Target, X, Users, Activity,
    TrendingUp, Verified, Sparkles
} from "lucide-react";

export default function PerfilPublicoEntrenador() {
    const { id } = useParams();
    const navigate = useNavigate();
    
    const [data, setData] = useState({ entrenador: null, valoracionMedia: 0, resenas: [] });
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [nuevaPuntuacion, setNuevaPuntuacion] = useState(5);
    const [nuevoComentario, setNuevoComentario] = useState("");

    useEffect(() => {
        const cargarDatos = async () => {
            try {
                const res = await api.get(`/api/entrenador/${id}`);
                setData(res.data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        cargarDatos();
    }, [id]);

    const enviarResena = async () => {
        try {
            await api.post(`/api/entrenador/${id}/resena`, {
                estrellas: nuevaPuntuacion,
                comentario: nuevoComentario
            });
            setShowModal(false);
            setNuevoComentario("");
            const res = await api.get(`/api/entrenador/${id}`);
            setData(res.data);
        } catch {
            alert("Error al enviar valoración");
        }
    };

    if (loading) return (
        <div style={{
            minHeight: '100vh', background: '#050505', color: 'white', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold'
        }}>
            Iniciando entorno de alto rendimiento...
        </div>
    );

    const { entrenador, valoracionMedia, resenas } = data;

    const styles = {
        wrapper: { 
            minHeight: '100vh', 
            background: '#050505', 
            color: 'white', 
            fontFamily: "'Inter', sans-serif",
            paddingBottom: '120px',
            overflowX: 'hidden'
        },
        container: { maxWidth: '1200px', margin: '0 auto', padding: '40px 24px' },
        
        // Header con profundidad y luz
        heroCard: {
            background: 'linear-gradient(180deg, #111111 0%, #080808 100%)',
            borderRadius: '40px',
            padding: '48px',
            border: '1px solid rgba(255,255,255,0.05)',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
            display: 'flex',
            gap: '56px',
            alignItems: 'center',
            position: 'relative',
            overflow: 'hidden',
            marginBottom: '40px'
        },
        
        avatarGlow: {
            position: 'relative',
            width: '200px',
            height: '200px',
            flexShrink: 0
        },
        avatar: {
            width: '100%',
            height: '100%',
            borderRadius: '32px',
            objectFit: 'cover',
            zIndex: 2,
            position: 'relative',
            border: '1.5px solid rgba(250, 204, 21, 0.4)',
            boxShadow: '0 0 30px rgba(250, 204, 21, 0.1)'
        },
        glow: {
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '140%',
            height: '140%',
            background: 'radial-gradient(circle, rgba(250, 204, 21, 0.12) 0%, transparent 70%)',
            zIndex: 1
        },

        tag: {
            padding: '8px 16px',
            borderRadius: '12px',
            fontSize: '0.75rem',
            fontWeight: '800',
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
            border: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(255,255,255,0.03)',
            color: '#a1a1aa'
        },

        pricingCard: {
            background: 'linear-gradient(135deg, #FACC15 0%, #EAB308 100%)',
            borderRadius: '32px',
            padding: '40px',
            color: 'black',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
            boxShadow: '0 20px 60px rgba(250, 204, 21, 0.15)',
            position: 'sticky',
            top: '40px',
            border: '1px solid rgba(255, 255, 255, 0.2)'
        },

        sectionCard: {
            background: 'rgba(15, 15, 15, 0.5)',
            backdropFilter: 'blur(10px)',
            borderRadius: '32px',
            padding: '40px',
            border: '1px solid rgba(255, 255, 255, 0.03)',
            transition: 'border 0.3s ease'
        }
    };

    return (
        <div style={styles.wrapper}>
            <div style={styles.container}>
                
                {/* 1. NAVEGACIÓN */}
                <button 
                    onClick={() => navigate(-1)} 
                    style={{
                        display: 'flex', alignItems: 'center', gap: '10px', background: 'none', 
                        border: 'none', color: '#666', cursor: 'pointer', marginBottom: '32px', 
                        transition: 'all 0.2s', fontWeight: '600'
                    }}
                    onMouseEnter={(e) => e.target.style.color = 'white'}
                    onMouseLeave={(e) => e.target.style.color = '#666'}
                >
                    <ChevronLeft size={20} /> Volver a la selección
                </button>

                {/* 2. HERO SECTION */}
                <div style={styles.heroCard}>
                    <div style={styles.avatarGlow}>
                        <div style={styles.glow}></div>
                        <img src={entrenador.fotoPerfil || "https://via.placeholder.com/200"} style={styles.avatar} alt="Trainer" />
                    </div>
                    
                    <div style={{flex: 1}}>
                        <div style={{display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px'}}>
                            <h1 style={{fontSize: '3.8rem', fontWeight: '900', margin: 0, letterSpacing: '-2px', textTransform: 'uppercase', lineHeight: 1}}>
                                {entrenador.nombre} {entrenador.apellido}
                            </h1>
                            <Verified size={32} color="#3b82f6" fill="rgba(59, 130, 246, 0.1)" />
                        </div>

                        <div style={{display: 'flex', gap: '10px', marginBottom: '40px'}}>
                            <div style={{...styles.tag, background: '#FACC15', color: 'black', border: 'none'}}>Online</div>
                            <div style={styles.tag}>{entrenador.genero?.toUpperCase()}</div>
                            <div style={{...styles.tag, borderColor: 'rgba(34, 197, 94, 0.3)', color: '#22c55e'}}>✓ Identidad Verificada</div>
                        </div>

                        <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '40px'}}>
                            <div>
                                <p style={{color: '#555', fontSize: '0.7rem', fontWeight: '800', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px'}}>Experiencia</p>
                                <span style={{fontSize: '1.5rem', fontWeight: '700', letterSpacing: '-0.5px'}}>{entrenador.aniosExperiencia}+ AÑOS</span>
                            </div>
                            <div>
                                <p style={{color: '#555', fontSize: '0.7rem', fontWeight: '800', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px'}}>Atletas</p>
                                <span style={{fontSize: '1.5rem', fontWeight: '700', letterSpacing: '-0.5px'}}>505 ACTIVOS</span>
                            </div>
                            <div>
                                <p style={{color: '#555', fontSize: '0.7rem', fontWeight: '800', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px'}}>Rating</p>
                                <span style={{fontSize: '1.5rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', letterSpacing: '-0.5px'}}>
                                    {valoracionMedia} <Star size={20} fill="#FACC15" color="#FACC15" />
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. CONTENT GRID */}
                <div style={{display: 'grid', gridTemplateColumns: '1.7fr 1fr', gap: '40px', alignItems: 'start'}}>
                    
                    <div style={{display: 'flex', flexDirection: 'column', gap: '40px'}}>
                        
                        <div style={styles.sectionCard}>
                            <h3 style={{display: 'flex', alignItems: 'center', gap: '12px', fontSize: '1.1rem', marginBottom: '24px', fontWeight: '800', color: '#FACC15'}}>
                                <Target size={22} /> MI METODOLOGÍA
                            </h3>
                            <p style={{fontSize: '1.15rem', lineHeight: '1.8', color: '#9494b8', margin: 0, fontWeight: '400'}}>
                                {entrenador.descripcionPerfil || "Enfoque basado en ciencia y biomecánica avanzada para maximizar el potencial genético de cada atleta mediante programación algorítmica."}
                            </p>
                        </div>

                        <div style={styles.sectionCard}>
                            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px'}}>
                                <h3 style={{display: 'flex', alignItems: 'center', gap: '12px', fontSize: '1.1rem', margin: 0, fontWeight: '800', color: '#FACC15'}}>
                                    <Users size={22} /> TESTIMONIOS RECIENTES
                                </h3>
                                <button 
                                    onClick={() => setShowModal(true)} 
                                    style={{
                                        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', 
                                        color: 'white', padding: '10px 20px', borderRadius: '14px', cursor: 'pointer', 
                                        fontWeight: '700', fontSize: '0.8rem', transition: 'all 0.3s'
                                    }}
                                    onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.08)'}
                                    onMouseLeave={(e) => e.target.style.background = 'rgba(255,255,255,0.03)'}
                                >
                                    Escribir Reseña
                                </button>
                            </div>

                            <div style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>
                                {resenas.length === 0 ? (
                                    <div style={{textAlign: 'center', color: '#444', padding: '20px'}}>No hay testimonios todavía.</div>
                                ) : (
                                    resenas.map(r => (
                                        <div key={r.id} style={{
                                            background: 'rgba(255,255,255,0.02)', padding: '24px', borderRadius: '24px', 
                                            border: '1px solid rgba(255,255,255,0.03)'
                                        }}>
                                            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '12px'}}>
                                                <div style={{display: 'flex', gap: '4px'}}>
                                                    {[...Array(5)].map((_, i) => <Star key={i} size={14} fill={i < r.estrellas ? "#FACC15" : "none"} color="#FACC15" />)}
                                                </div>
                                                <span style={{fontSize: '0.75rem', color: '#444', fontWeight: '800'}}>21 FEB 2026</span>
                                            </div>
                                            <p style={{margin: 0, color: '#a1a1aa', fontStyle: 'italic', lineHeight: '1.6', fontSize: '1rem'}}>
                                                "{r.comentario}"
                                            </p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* COLUMNA PRECIOS STICKY */}
                    <div style={styles.pricingCard}>
                        <div>
                            <p style={{fontWeight: '900', fontSize: '0.85rem', letterSpacing: '2px', marginBottom: '8px', opacity: 0.8}}>TRANSFORMACIÓN ELITE</p>
                            <div style={{display: 'flex', alignItems: 'baseline', gap: '8px'}}>
                                <span style={{fontSize: '5.2rem', fontWeight: '950', letterSpacing: '-4px', lineHeight: 1}}>{entrenador.tarifaMensual}€</span>
                                <span style={{fontSize: '1.3rem', fontWeight: '800'}}> / MES</span>
                            </div>
                        </div>
                        
                        <div style={{display: 'flex', flexDirection: 'column', gap: '18px', margin: '10px 0'}}>
                            <div style={{display: 'flex', gap: '12px', alignItems: 'center', fontWeight: '700', fontSize: '0.95rem'}}>
                                <Sparkles size={18} /> Plan de entrenamiento algorítmico
                            </div>
                            <div style={{display: 'flex', gap: '12px', alignItems: 'center', fontWeight: '700', fontSize: '0.95rem'}}>
                                <MessageSquare size={18} /> Chat directo 24/7 con el coach
                            </div>
                            <div style={{display: 'flex', gap: '12px', alignItems: 'center', fontWeight: '700', fontSize: '0.95rem'}}>
                                <TrendingUp size={18} /> Auditoría semanal de resultados
                            </div>
                        </div>

                        <button 
                            onClick={() => navigate('/cliente/chat', { state: { openChatWith: entrenador.id, nombre: entrenador.nombre + ' ' + entrenador.apellido, foto: entrenador.fotoPerfil, autoGreet: true, greetingMessage: 'Hola, me interesa iniciar la transformación' } })}
                            style={{
                                background: 'black', color: 'white', border: 'none', padding: '24px', 
                                borderRadius: '22px', fontWeight: '900', fontSize: '1.1rem', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
                                transition: 'all 0.3s ease', marginTop: '10px', boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
                            }}
                            onMouseEnter={(e) => {
                                e.target.style.transform = 'translateY(-2px)';
                                e.target.style.boxShadow = '0 15px 40px rgba(0,0,0,0.4)';
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.transform = 'translateY(0)';
                                e.target.style.boxShadow = '0 10px 30px rgba(0,0,0,0.3)';
                            }}
                        >
                            <Zap size={20} fill="white" /> INICIAR TRANSFORMACIÓN
                        </button>
                    </div>

                </div>
            </div>

            {showModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
                    background: 'rgba(0,0,0,0.96)', display: 'flex', alignItems: 'center', 
                    justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(15px)'
                }}>
                    <div style={{
                        background: '#0a0a0a', padding: '48px', borderRadius: '40px', 
                        width: '90%', maxWidth: '520px', border: '1px solid rgba(255,255,255,0.05)',
                        boxShadow: '0 0 100px rgba(0,0,0,0.5)'
                    }}>
                        <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '40px'}}>
                            <h2 style={{margin: 0, fontSize: '2rem', fontWeight: '900', letterSpacing: '-1px'}}>TU EXPERIENCIA</h2>
                            <X onClick={() => setShowModal(false)} style={{cursor: 'pointer', color: '#444'}} />
                        </div>
                        <div style={{display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '40px'}}>
                            {[1, 2, 3, 4, 5].map(n => (
                                <Star 
                                    key={n} size={42} 
                                    fill={n <= nuevaPuntuacion ? "#FACC15" : "none"} 
                                    color="#FACC15" 
                                    onClick={() => setNuevaPuntuacion(n)} 
                                    style={{cursor: 'pointer', transition: 'transform 0.2s'}}
                                    onMouseEnter={(e) => e.target.style.transform = 'scale(1.2)'}
                                    onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                                />
                            ))}
                        </div>
                        <textarea 
                            style={{
                                width: '100%', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', 
                                borderRadius: '24px', padding: '24px', color: 'white', minHeight: '160px', 
                                marginBottom: '32px', fontSize: '1.1rem', outline: 'none', resize: 'none'
                            }}
                            placeholder="Escribe tu testimonio..."
                            value={nuevoComentario}
                            onChange={(e) => setNuevoComentario(e.target.value)}
                        />
                        <button 
                            onClick={enviarResena} 
                            style={{
                                width: '100%', background: '#FACC15', color: 'black', border: 'none', 
                                padding: '22px', borderRadius: '22px', fontWeight: '900', fontSize: '1.1rem', 
                                cursor: 'pointer', boxShadow: '0 10px 30px rgba(250, 204, 21, 0.2)'
                            }}
                        >
                            ENVIAR VALORACIÓN
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
