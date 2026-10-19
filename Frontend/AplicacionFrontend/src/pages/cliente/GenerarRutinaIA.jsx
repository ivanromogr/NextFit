import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { generarRutinaAuto } from '../../api/endpoints';
import { useAuth } from '../../context/AuthContext';

// Iconos
import { 
    ChevronLeft, Target, Activity, Calendar, Play, 
    BrainCircuit, Dumbbell, Flame, Trophy, CheckCircle2,
    Signal, CalendarDays
} from 'lucide-react';

// --- DATOS DE CONFIGURACIÓN ---
const OBJETIVOS = [
    { id: "GANAR_MASA", label: "HIPERTROFIA", desc: "Volumen Muscular", icon: <Dumbbell size={28}/> },
    { id: "FUERZA", label: "FUERZA", desc: "Powerlifting / 5x5", icon: <Trophy size={28}/> },
    { id: "PERDER_GRASA", label: "DEFINICIÓN", desc: "Metabólico / Cardio", icon: <Flame size={28}/> }
];

const NIVELES = [
    { id: "PRINCIPIANTE", label: "Principiante", desc: "0-1 año" },
    { id: "INTERMEDIO", label: "Intermedio", desc: "1-3 años" },
    { id: "AVANZADO", label: "Avanzado", desc: "+3 años" }
];

const FRECUENCIAS = [
    { id: "3", label: "3 Días", desc: "Full Body" },
    { id: "4", label: "4 Días", desc: "Torso/Pierna" },
    { id: "5", label: "5 Días", desc: "Híbrida" },
    { id: "6", label: "6 Días", desc: "PPL" }
];

// --- COMPONENTE TARJETA DE SELECCIÓN (Estilo Web App) ---
const SelectionCard = ({ selected, onClick, title, subtitle, icon, variant = "default", disabled = false }) => {
    // Estilos dinámicos según si es una tarjeta grande (objetivo) o pequeña (nivel/frecuencia)
    const isBig = variant === "big";
    
    const containerStyle = {
        background: selected ? 'rgba(250, 204, 21, 0.1)' : '#1a1a1a',
        border: selected ? '2px solid #FACC15' : '1px solid #333',
        borderRadius: '16px',
        padding: isBig ? '25px' : '15px 20px',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: isBig ? 'column' : 'row', // Vertical para objetivos, Horizontal para el resto
        alignItems: isBig ? 'center' : 'center',
        justifyContent: isBig ? 'center' : 'space-between',
        textAlign: isBig ? 'center' : 'left',
        gap: isBig ? '15px' : '12px',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        transform: selected ? 'translateY(-2px)' : 'translateY(0)',
        boxShadow: selected ? '0 10px 30px -10px rgba(250, 204, 21, 0.2)' : 'none',
        height: '100%', width: '100%', font: 'inherit',
        opacity: disabled ? 0.6 : 1 // Para igualar alturas en grid
    };

    return (
        <button
            type="button"
            aria-pressed={selected}
            aria-label={title}
            disabled={disabled}
            style={containerStyle} 
            onClick={onClick}
            onMouseEnter={e => { if(!selected) { e.currentTarget.style.borderColor = '#666'; e.currentTarget.style.background = '#222'; }}}
            onMouseLeave={e => { if(!selected) { e.currentTarget.style.borderColor = '#333'; e.currentTarget.style.background = '#1a1a1a'; }}}
        >
            {/* Icono */}
            {icon && (
                <span style={{
                    color: selected ? '#000' : '#666',
                    background: selected ? '#FACC15' : 'rgba(255,255,255,0.05)',
                    padding: '10px', borderRadius: '12px',
                    transition: 'all 0.2s'
                }}>
                    {icon}
                </span>
            )}

            {/* Texto */}
            <span style={{flex: 1, display: 'block'}}>
                <span style={{
                    display: 'block', fontWeight: '800',
                    fontSize: isBig ? '1.1rem' : '0.95rem', 
                    color: selected ? '#FACC15' : 'white',
                    textTransform: 'uppercase', letterSpacing: '0.5px'
                }}>
                    {title}
                </span>
                {subtitle && (
                    <span style={{display: 'block', fontSize: '0.75rem', color: '#777', marginTop: '4px', fontWeight: '500'}}>
                        {subtitle}
                    </span>
                )}
            </span>

            {/* Check para tarjetas pequeñas */}
            {!isBig && selected && <CheckCircle2 size={18} color="#FACC15" />}
        </button>
    );
};

// --- PANTALLA PRINCIPAL ---
const GenerarRutinaIA = ({ clienteIdProp = null, onSuccess = null, onCancel = null }) => {
    const navigate = useNavigate();
    const { userId: authUserId } = useAuth();
    const [loading, setLoading] = useState(false);
    const [userId, setUserId] = useState(null);
    const [error, setError] = useState('');
    const [saved, setSaved] = useState(false);
    const operation = useRef(false);
    const mounted = useRef(true);
    useEffect(() => {
        mounted.current = true;
        return () => { mounted.current = false; };
    }, []);

    const [formData, setFormData] = useState({
        objetivo: "GANAR_MASA",
        nivel: "INTERMEDIO",
        diasPorSemana: "4"
    });

    useEffect(() => {
        const id = clienteIdProp || authUserId || localStorage.getItem("clienteId");
        if (!id) {
            if (!clienteIdProp) navigate("/auth/login");
            return;
        }
        setUserId(id);
    }, [clienteIdProp, authUserId, navigate]);

    const handleBack = () => {
        if (onCancel) onCancel();
        else navigate("/cliente/dashboard");
    };

    const handleGenerar = async (e) => {
        if (e) e.preventDefault();
        
        if (operation.current) return;
        if (!userId) {
            setError('Inicia sesión de nuevo para generar tu plan.');
            return;
        }
        operation.current = true;
        setError('');
        setLoading(true);
        try {
            await generarRutinaAuto({
                idCliente: userId,
                clienteId: userId,
                objetivo: formData.objetivo,
                nivel: formData.nivel,
                diasPorSemana: parseInt(formData.diasPorSemana, 10),
                lugar: "GIMNASIO"
            });
        } catch {
            operation.current = false;
            if (mounted.current) {
                setError('No se ha podido confirmar la creación del plan. Revisa tus rutinas antes de volver a intentarlo.');
                setLoading(false);
            }
            return;
        }
        if (!mounted.current) return;
        setSaved(true);
        setLoading(false);
        if (onSuccess) onSuccess();
        else navigate("/cliente/dashboard");
    };

    // --- ESTILOS DE LA PÁGINA ---
    const styles = {
        container: { 
            minHeight: '100vh', 
            backgroundImage: 'url("/imagenes/fondo-ia.jpg")', 
            backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', 
            position: 'relative', fontFamily: 'sans-serif'
        },
        overlay: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(5, 5, 5, 0.90)', backdropFilter: 'blur(8px)', zIndex: 1 },
        contentWrapper: { position: 'relative', zIndex: 2, width: '100%', maxWidth: '950px' }, // Ancho más grande para estilo Web
        
        mainCard: { 
            background: '#0a0a0a', border: '1px solid #222', borderRadius: '30px', 
            padding: '50px', boxShadow: '0 40px 80px rgba(0,0,0,0.8)', position: 'relative', overflow: 'hidden' 
        },
        
        header: { textAlign: 'center', marginBottom: '50px' },
        title: { fontSize: '3rem', fontFamily: 'sans-serif', fontWeight: '900', textTransform: 'uppercase', margin: 0, color: 'white', lineHeight: 0.9, letterSpacing: '-1px' },
        subtitle: { color: '#888', fontSize: '1.1rem', marginTop: '10px' },

        // Layouts de Grid Web
        sectionLabel: { display: 'flex', alignItems: 'center', gap: '10px', color: '#FACC15', fontSize: '0.9rem', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '20px', letterSpacing:'1px' },
        
        // Grid Horizontal para objetivos (3 columnas)
        objectivesGrid: { 
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '40px' 
        },
        
        // Grid dividido para Nivel y Frecuencia (2 columnas grandes)
        detailsRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', marginBottom: '40px' },
        
        // Grids internos pequeños
        listGrid: { display: 'flex', flexDirection: 'column', gap: '12px' },
        freqGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' },

        // Botón
        btnAction: {
            width: '100%', padding: '22px', background: 'linear-gradient(135deg, #FACC15 0%, #EAB308 100%)', 
            color: 'black', border: 'none', borderRadius: '16px', fontSize: '1.2rem', fontWeight: '800', 
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
            textTransform: 'uppercase', letterSpacing: '1px', transition: 'all 0.2s',
            boxShadow: '0 10px 30px rgba(250, 204, 21, 0.3)',
            opacity: loading ? 0.7 : 1
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.overlay}></div>

            <div style={styles.contentWrapper}>
                <button onClick={handleBack} style={{background:'transparent', border:'none', color:'#aaa', display:'flex', alignItems:'center', gap:'8px', marginBottom:'25px', cursor:'pointer', fontSize:'0.9rem', fontWeight:'bold', transition:'color 0.2s'}}>
                    <ChevronLeft size={20}/> VOLVER AL DASHBOARD
                </button>

                <div style={styles.mainCard}>
                    {/* Efecto de luz superior */}
                    <div style={{position:'absolute', top:0, left:'50%', transform:'translateX(-50%)', width:'40%', height:'4px', background:'#FACC15', boxShadow:'0 0 40px 5px #FACC15', borderRadius:'0 0 10px 10px'}}></div>

                    <div style={styles.header}>
                        <div style={{display:'inline-flex', alignItems:'center', justifyContent:'center', background:'rgba(250,204,21,0.1)', padding:'15px', borderRadius:'20px', marginBottom:'20px', border:'1px solid rgba(250,204,21,0.2)'}}>
                            <BrainCircuit size={40} color="#FACC15" />
                        </div>
                        <h1 style={styles.title}>Generador de <span style={{color:'#FACC15'}}>rutinas</span></h1>
                        <p style={styles.subtitle}>Crea un plan automático según tu objetivo y los días de entrenamiento.</p>
                    </div>

                    {/* 1. OBJETIVOS (FILA DE TARJETAS GRANDES) */}
                    <div>
                        <div style={styles.sectionLabel}><Target size={18}/> 1. Selecciona tu Objetivo Principal</div>
                        <div style={styles.objectivesGrid}>
                            {OBJETIVOS.map(opt => (
                                <SelectionCard
                                    disabled={loading || saved}
                                    key={opt.id}
                                    variant="big"
                                    title={opt.label}
                                    subtitle={opt.desc}
                                    icon={opt.icon}
                                    selected={formData.objetivo === opt.id}
                                    onClick={() => setFormData({...formData, objetivo: opt.id})}
                                />
                            ))}
                        </div>
                    </div>

                    {/* 2. NIVEL Y FRECUENCIA (COLUMNAS PARALELAS) */}
                    <div style={styles.detailsRow}>
                        
                        {/* Columna Izquierda: Nivel */}
                        <div>
                            <div style={styles.sectionLabel}><Signal size={18}/> 2. Tu Experiencia</div>
                            <div style={styles.listGrid}>
                                {NIVELES.map(opt => (
                                    <SelectionCard
                                    disabled={loading || saved}
                                        key={opt.id}
                                        title={opt.label}
                                        subtitle={opt.desc}
                                        selected={formData.nivel === opt.id}
                                        onClick={() => setFormData({...formData, nivel: opt.id})}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Columna Derecha: Frecuencia */}
                        <div>
                            <div style={styles.sectionLabel}><CalendarDays size={18}/> 3. Disponibilidad Semanal</div>
                            <div style={styles.freqGrid}>
                                {FRECUENCIAS.map(opt => (
                                    <SelectionCard
                                    disabled={loading || saved}
                                        key={opt.id}
                                        title={opt.label}
                                        subtitle={opt.desc}
                                        selected={formData.diasPorSemana === opt.id}
                                        onClick={() => setFormData({...formData, diasPorSemana: opt.id})}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                    {error && <p role="alert" style={{ color: '#fca5a5' }}>{error}</p>}
                    {saved && <p role="status">Tu plan se ha guardado.</p>}
                    {/* BOTÓN GENERAR */}
                    <button 
                        style={styles.btnAction} 
                        aria-busy={loading}
                        onClick={handleGenerar} 
                        disabled={loading || saved}
                        onMouseEnter={e => !loading && (e.currentTarget.style.transform = 'translateY(-3px)')}
                        onMouseLeave={e => !loading && (e.currentTarget.style.transform = 'translateY(0)')}
                    >
                        {loading ? "GENERANDO RUTINAS..." : "GENERAR PLAN PERSONALIZADO"}
                        {!loading && <Play size={24} fill="black"/>}
                    </button>

                </div>
            </div>
        </div>
    );
};

export default GenerarRutinaIA;
