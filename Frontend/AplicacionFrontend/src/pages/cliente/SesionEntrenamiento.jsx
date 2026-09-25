import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
    obtenerRutinasCliente,
    guardarSesionRealizada, 
    obtenerUltimaSesionRutina,
    obtenerRutinasAsignadasPorEntrenador 
} from '../../api/endpoints';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import {
    ChevronLeft, Check, Clock, Save,
    Plus, Info, Trash2, X, MessageSquare, Activity,
    Trophy, Eye 
} from 'lucide-react';

const obtenerYoutubeId = (url = "") => {
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([^?&/]+)/);
    return match?.[1] || null;
};

const obtenerYoutubeEmbedUrl = (url = "") => {
    const videoId = obtenerYoutubeId(url);
    if (!videoId) return null;

    const params = new URLSearchParams({
        autoplay: "1",
        mute: "1",
        loop: "1",
        playlist: videoId,
        controls: "0",
        rel: "0",
        modestbranding: "1",
        playsinline: "1"
    });

    return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
};

const obtenerYoutubeThumbnail = (url = "") => {
    const videoId = obtenerYoutubeId(url);
    return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null;
};

const esVideoDirecto = (url = "") => /\.(mp4|webm|ogg)(\?.*)?$/i.test(url);
const obtenerIdEjercicio = (detalle) => {
    const id = detalle?.ejercicio?.id || detalle?.ejercicioId || detalle?.idEjercicio;
    if (id === null || id === undefined || id === "") return null;
    return String(id);
};

const VideoEjercicio = ({ src, title, style }) => {
    const youtubeEmbedUrl = obtenerYoutubeEmbedUrl(src);

    if (youtubeEmbedUrl) {
        return (
            <iframe
                src={youtubeEmbedUrl}
                title={title}
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
                style={{ ...style, border: 0 }}
            />
        );
    }

    if (esVideoDirecto(src)) {
        return (
            <video
                src={src}
                autoPlay
                muted
                loop
                playsInline
                controls={false}
                style={style}
            />
        );
    }

    return null;
};

export default function SesionEntrenamiento() {
    const { rutinaId, clienteId: routeClienteId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const toast = useToast();
    const { userId } = useAuth();

    const eventoIdCalendario = location.state?.eventoId;
    const isReadOnly = location.state?.isReadOnly || false;
    const coachClienteId = location.state?.clienteId;
    
    const targetUserId = coachClienteId || routeClienteId || userId;

    // --- ESTADOS ---
    const [rutina, setRutina] = useState(null);
    const [loading, setLoading] = useState(true);

    const [datosSesion, setDatosSesion] = useState({});
    const [notasSesion, setNotasSesion] = useState({});
    const [historialPrevio, setHistorialPrevio] = useState({});

    const [editandoNotaId, setEditandoNotaId] = useState(null);
    const [infoExercise, setInfoExercise] = useState(null);
    const [showFinishModal, setShowFinishModal] = useState(false);

    const [tiempo, setTiempo] = useState(0);
    const [timerActivo, setTimerActivo] = useState(!isReadOnly); // 🛑 Timer apagado en lectura
    const timerRef = useRef(null);

    // --- CARGA DE DATOS ---
    useEffect(() => {
        const cargar = async () => {
            if (!targetUserId) return navigate("/auth/login");

            try {
                // 1. Buscamos la Rutina en el cliente
                let todas = await obtenerRutinasCliente(targetUserId);
                let actual = todas.find(r => r.id === rutinaId);

                // 2. Si no está, la buscamos en las rutinas asignadas
                if (!actual) {
                    try {
                        const asignadas = await obtenerRutinasAsignadasPorEntrenador(targetUserId, userId);
                        actual = asignadas.find(r => r.id === rutinaId);
                    } catch { /* Fall back to the routines already loaded. */ }
                }

                if (actual) {
                    setRutina(actual);

                    // 3. Obtener Historial de la última sesión (o de ESE día)
                    let mapaHistorial = {};
                    try {
                        const lastSession = await obtenerUltimaSesionRutina(targetUserId, rutinaId);
                        if (lastSession) {
                            if (isReadOnly && lastSession.duracionSegundos) {
                                setTiempo(lastSession.duracionSegundos);
                            }
                            if (lastSession.series) {
                                mapaHistorial = generarMapaHistorial(lastSession.series);
                                setHistorialPrevio(mapaHistorial);
                            }
                        }
                    } catch (err) {
                        console.log("Primera vez haciendo esta rutina o error:", err);
                    }

                    inicializarSesion(actual.detalles || [], mapaHistorial, isReadOnly);

                } else {
                    toast.error("Rutina no encontrada.");
                    navigate(-1);
                }
            } catch (e) {
                console.error(e);
                toast.error("Error al cargar la rutina");
                navigate(-1);
            } finally {
                setLoading(false);
            }
        };
        cargar();
    }, [rutinaId, navigate, targetUserId, isReadOnly, userId, toast]);

    const generarMapaHistorial = (seriesPasadas) => {
        const mapa = {};
        seriesPasadas.forEach(serie => {
            const ejId = serie.ejercicioId || serie.ejercicio?.id;
            if (!ejId) return;

            if (!mapa[ejId]) mapa[ejId] = [];
            const idx = serie.setIndex;

            mapa[ejId][idx] = {
                peso: serie.peso,
                reps: serie.reps,
                rpe: serie.rpe
            };
        });
        return mapa;
    };

    const inicializarSesion = (ejercicios, historial = {}, readOnly = false) => {
        const estructura = {};

        ejercicios.forEach(ej => {
            const exerciseId = obtenerIdEjercicio(ej);
            if (!exerciseId) return;
            const datosPreviosEjercicio = historial[exerciseId] || [];
            
            // En modo lectura mostramos el número de series exactas que hizo
            const numSeries = readOnly && datosPreviosEjercicio.length > 0 ? datosPreviosEjercicio.length : (ej.series || ej.seriesObjetivo || 3);

            estructura[exerciseId] = Array(numSeries).fill(0).map((_, index) => {
                const setPrevio = datosPreviosEjercicio[index];
                return {
                    peso: setPrevio ? setPrevio.peso : (ej.peso || 0),
                    reps: setPrevio ? setPrevio.reps : (ej.repeticiones || 0),
                    rpe: setPrevio ? setPrevio.rpe : (ej.rpe || 8),
                    hecho: readOnly ? true : false // 🛑 Si es modo lectura forzamos que esté "hecho" para que salga el tick
                };
            });
        });
        setDatosSesion(estructura);
    };

    // --- CRONÓMETRO ---
    useEffect(() => {
        if (timerActivo && !isReadOnly) {
            timerRef.current = setInterval(() => setTiempo(t => t + 1), 1000);
        } else {
            clearInterval(timerRef.current);
        }
        return () => clearInterval(timerRef.current);
    }, [timerActivo, isReadOnly]);

    const formatoTiempo = (segundos) => {
        const m = Math.floor(segundos / 60);
        const s = segundos % 60;
        return `${m}min ${s < 10 ? '0' : ''}${s}s`;
    };

    // --- LÓGICA DE SETS (BLOQUEADA SI ES LECTURA) ---
    const updateSet = (idEjercicio, index, campo, valor) => {
        if (isReadOnly) return;
        const newSets = [...datosSesion[idEjercicio]];
        newSets[index][campo] = valor;
        setDatosSesion({ ...datosSesion, [idEjercicio]: newSets });
    };

    const toggleCheck = (idEjercicio, index) => {
        if (isReadOnly) return;
        const newSets = [...datosSesion[idEjercicio]];
        newSets[index].hecho = !newSets[index].hecho;
        setDatosSesion({ ...datosSesion, [idEjercicio]: newSets });
        if (navigator.vibrate && newSets[index].hecho) navigator.vibrate(50);
    };

    const addSet = (idEjercicio) => {
        if (isReadOnly) return;
        const newSets = [...datosSesion[idEjercicio]];
        const ultimo = newSets[newSets.length - 1] || { peso: 0, reps: 0, rpe: 8 };
        newSets.push({ ...ultimo, hecho: false });
        setDatosSesion({ ...datosSesion, [idEjercicio]: newSets });
    };

    const removeSet = (idEjercicio, index) => {
        if (isReadOnly) return;
        const newSets = datosSesion[idEjercicio].filter((_, i) => i !== index);
        setDatosSesion({ ...datosSesion, [idEjercicio]: newSets });
    };

    const guardarNotaEnEstado = (idEjercicio, texto) => {
        if (isReadOnly) return;
        setNotasSesion({ ...notasSesion, [idEjercicio]: texto });
    };

    const finalizarEdicionNota = () => setEditandoNotaId(null);

    // --- LÓGICA DE FINALIZAR ---
    const calcularVolumenTotal = () => {
        let volumen = 0;
        Object.values(datosSesion).forEach(sets => {
            sets.forEach(s => { 
                if (isReadOnly || s.hecho) volumen += (parseFloat(s.peso) || 0) * (parseFloat(s.reps) || 0); 
            });
        });
        return volumen;
    };

    const handleTerminarClick = () => {
        if (isReadOnly) return;
        setTimerActivo(false);
        setShowFinishModal(true);
    };

   const confirmFinish = async () => {
        if (!targetUserId) {
            toast.error("Error: Sesión caducada.");
            return;
        }

        try {
            const notasUnificadas = Object.entries(notasSesion)
                .map(([, texto]) => texto ? `Nota: ${texto}` : '')
                .filter(t => t !== '')
                .join(" | ");

            const seriesLimpias = [];
            Object.entries(datosSesion).forEach(([ejercicioId, sets]) => {
                sets.forEach((set, index) => {
                    if (set.hecho || parseFloat(set.peso) > 0 || parseInt(set.reps) > 0) {
                        seriesLimpias.push({
                            ejercicioId: ejercicioId,
                            setIndex: index,
                            peso: parseFloat(set.peso) || 0.0,
                            reps: parseInt(set.reps, 10) || 0,
                            rpe: parseInt(set.rpe, 10) || 0,
                            hecho: set.hecho === true
                        });
                    }
                });
            });

            const payload = {
                clienteId: targetUserId,
                rutinaId: rutinaId,
                duracionSegundos: tiempo,
                notasGenerales: notasUnificadas || "Sesión finalizada.",
                eventoCalendarioId: eventoIdCalendario, 
                series: seriesLimpias
            };

            await guardarSesionRealizada(payload); 

            toast.success("¡Entrenamiento guardado! 🔥");

            if (eventoIdCalendario) {
                navigate("/cliente/calendario");
            } else {
                navigate("/cliente/dashboard");
            }

        } catch (error) {
            console.error("Error al guardar sesión:", error);
            const detalleError = error?.response?.data || error?.message;
            toast.error(detalleError ? `Error al guardar: ${detalleError}` : "Hubo un error al guardar la sesión.");
            setTimerActivo(true);
        }
    };

    const cancelFinish = () => {
        setShowFinishModal(false);
        setTimerActivo(true);
    };

    // --- ESTILOS (100% IGUALES A TU VERSIÓN LIMPIA) ---
    const styles = {
        page: { 
            background: '#09090b', 
            minHeight: '100vh', 
            color: 'white', 
            fontFamily: 'sans-serif', 
            paddingBottom: '100px'},
        topBar: { 
            position: 'sticky', 
            top: 0, 
            background: '#09090b', 
            zIndex: 50, 
            borderBottom: '1px solid #222', 
            padding: '15px 20px', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center'},
        headerTitle: { 
            fontSize: '1.1rem', 
            fontWeight: '900', 
            textTransform: 'uppercase', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '10px'},
        statsBar: { 
            display: 'flex', 
            justifyContent: 'space-around', 
            padding: '20px 0', 
            background: '#0c0c0e', 
            borderBottom: '1px solid #1f1f22'},
        statItem: { 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center'},
        statLabel: { 
            fontSize: '0.65rem', 
            color: '#71717a', 
            fontWeight: 'bold', 
            marginBottom: '4px', 
            textTransform: 'uppercase', 
            letterSpacing: '1px' 
        },
        statValueYellow: { 
            fontSize: '1.2rem', 
            fontWeight: 'bold', 
            color: '#FACC15', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '5px' 
        },
        statValue: { 
            fontSize: '1.2rem', 
            fontWeight: 'bold', 
            color: '#fff' 
        },

        card: { 
            background: '#121214', 
            borderRadius: '12px', 
            border: '1px solid #27272a', 
            margin: '20px', 
            overflow: 'hidden'},
        cardHeader: { 
            padding: '20px', 
            borderBottom: '1px solid #222', 
            display: 'flex', 
            gap: '15px'},
        noteWrapper: { marginTop: '8px' },
        notePlaceholder: { color: '#71717a', fontSize: '0.85rem', cursor: isReadOnly ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontStyle: 'italic' },
        noteDisplay: { color: '#ccc', fontSize: '0.85rem', cursor: isReadOnly ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.05)', padding: '6px 10px', borderRadius: '6px', width: 'fit-content' },
        noteInput: { width: '100%', background: '#09090b', border: '1px solid #333', color: 'white', padding: '8px', borderRadius: '6px', outline: 'none', fontSize: '0.9rem', resize: 'none', minHeight: '60px' },
        btnSaveNote: { background: '#FACC15', color: 'black', border: 'none', padding: '4px 10px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.7rem', marginTop: '5px' },

        exTitle: { 
            fontSize: '1.1rem', 
            fontWeight: '900', 
            textTransform: 'uppercase', 
            color: '#FACC15', 
            marginBottom: '2px'},
        imgBox: { 
            width: '60px', 
            height: '60px', 
            background: '#222', 
            borderRadius: '8px', 
            overflow: 'hidden', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            border: '1px solid #333'},

        tableHeader: { 
            display: 'grid', 
            gridTemplateColumns: '0.6fr 1.2fr 1fr 1fr 0.8fr 0.8fr', 
            padding: '10px 15px', 
            background: '#18181b', 
            color: '#52525b', 
            fontSize: '0.65rem', 
            fontWeight: '900', 
            letterSpacing: '0.5px', 
            textAlign: 'center', 
            textTransform: 'uppercase'},
        tableRow: (hecho) => ({ 
            display: 'grid', 
            gridTemplateColumns: '0.6fr 1.2fr 1fr 1fr 0.8fr 0.8fr', 
            padding: '12px 15px', 
            borderBottom: '1px solid #1f1f22', 
            alignItems: 'center', 
            background: hecho ? 'rgba(34, 197, 94, 0.05)' : 'transparent', 
            transition: 'background 0.2s'}),

        input: { 
            width: '100%', 
            background: '#09090b', 
            border: '1px solid #333', 
            color: 'white', 
            padding: '8px 4px', 
            borderRadius: '6px', 
            textAlign: 'center', 
            fontWeight: 'bold', 
            outline: 'none', 
            fontSize: '0.95rem'},
        checkBtn: (hecho) => ({ 
            width: '32px', 
            height: '32px', 
            borderRadius: '50%', 
            background: hecho ? '#FACC15' : 'transparent', 
            border: hecho ? 'none' : '2px solid #3f3f46', 
            color: hecho ? 'black' : '#3f3f46', 
            cursor: isReadOnly ? 'default' : 'pointer', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            transition: 'all 0.2s'}),

        addSetBtn: { 
            width: '100%', 
            padding: '15px', 
            background: 'transparent', 
            border: 'none', 
            color: '#71717a', 
            fontWeight: 'bold', 
            cursor: 'pointer', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '6px', 
            fontSize: '0.75rem', 
            borderTop: '1px solid #222', 
            textTransform: 'uppercase', 
            letterSpacing: '1px'},

        finishBtn: { 
            background: '#FACC15', 
            color: 'black', 
            border: 'none', 
            padding: '8px 16px', 
            borderRadius: '20px', 
            fontWeight: '800', 
            cursor: 'pointer', 
            textTransform: 'uppercase', 
            fontSize: '0.75rem', 
            letterSpacing: '0.5px'},
        iconBtn: { background: 'transparent', border: 'none', color: '#71717a', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },

        modalOverlay: { 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            width: '100%', 
            height: '100%', 
            background: 'rgba(0,0,0,0.9)', 
            backdropFilter: 'blur(5px)', 
            zIndex: 100, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            padding: 'var(--spacing-md)'},
        finishModalCard: { 
            background: '#121212', 
            borderRadius: '20px', 
            width: '90%', 
            maxWidth: '400px', 
            padding: '30px', 
            textAlign: 'center', 
            border: '1px solid #333', 
            boxShadow: '0 20px 50px rgba(0,0,0,0.8)', 
            position: 'relative'},
        finishTitle: { fontSize: '1.6rem', fontWeight: '900', color: 'white', margin: '15px 0 5px 0', textTransform: 'uppercase' },
        finishSub: { color: '#a1a1aa', fontSize: '0.9rem', marginBottom: '25px' },
        statsGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '30px', background: '#18181b', padding: '15px', borderRadius: '12px', border: '1px solid #27272a' },
        statItemLabel: { fontSize: '0.65rem', color: '#71717a', fontWeight: '700', textTransform: 'uppercase' },
        statItemValue: { fontSize: '1.1rem', color: '#FACC15', fontWeight: '900', marginTop: '4px' },

        infoModalCard: { 
            background: '#121212', 
            borderRadius: '20px', 
            width: '90%', 
            maxWidth: '500px', 
            padding: '30px', 
            position: 'relative', 
            border: '1px solid #333', 
            maxHeight: '80vh', 
            overflowY: 'auto'},
        modalTag: { display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(250, 204, 21, 0.1)', color: '#FACC15', padding: '4px 10px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: '800', textTransform: 'uppercase', marginBottom: '15px' },
        infoTitle: { fontSize: '1.6rem', fontWeight: '900', color: 'white', marginBottom: '15px', lineHeight: 1, textTransform: 'uppercase' },
        infoText: { color: '#a1a1aa', fontSize: '0.95rem', lineHeight: 1.42, marginBottom: 0 },
        closeBtn: { position: 'absolute', top: '20px', right: '20px', background: '#1f1f22', border: 'none', borderRadius: '50%', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer' },
        ytBtn: { display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", background: "#FACC15", color: "black", textDecoration: "none", padding: "12px", borderRadius: "8px", fontWeight: "900", fontSize: "0.9rem", width: "100%", textTransform: "uppercase", marginTop: '10px' },
        modalActions: { display: 'flex', gap: '10px' },
        btnCancel: { flex: 1, background: 'transparent', border: '1px solid #3f3f46', color: 'white', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.8rem' },
        btnConfirm: { flex: 1, background: '#FACC15', border: 'none', color: 'black', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', textTransform: 'uppercase', fontSize: '0.8rem' },
    };

    if (loading) return <div style={{ ...styles.page, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>Cargando...</div>;

    return (
        <div style={styles.page}>
            <style>{`input[type=number]::-webkit-inner-spin-button {-webkit-appearance: none; margin:0;}`}</style>

            {/* HEADER */}
            <div style={styles.topBar}>
                <div style={styles.headerTitle}>
                    <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', marginRight: '5px' }}><ChevronLeft /></button>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ 
                            maxWidth: '200px', 
                            overflow: 'hidden', 
                            textOverflow: 'ellipsis', 
                            whiteSpace: 'nowrap'}}>{rutina?.nombre}</span>
                        {isReadOnly && (
                            <div style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '5px', 
                                marginTop: '2px', 
                                color: '#FACC15', 
                                fontSize: '0.65rem', 
                                letterSpacing: '1px'}}>
                                <Eye size={12} /> MODO OBSERVADOR
                            </div>
                        )}
                    </div>
                </div>
                <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '15px'}}>
                    <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '6px', 
                        background: '#18181b', 
                        padding: '6px 12px', 
                        borderRadius: '20px', 
                        border: '1px solid #27272a', 
                        fontSize: '0.9rem', 
                        fontWeight: 'bold', 
                        color: '#FACC15'}}>
                        <Clock size={16} /> {formatoTiempo(tiempo)}
                    </div>
                    {!isReadOnly && <button style={styles.finishBtn} onClick={handleTerminarClick}>TERMINAR</button>}
                </div>
            </div>

            {/* BARRA SUPERIOR (Stats en vivo) */}
            <div style={styles.statsBar}>
                <div style={styles.statItem}>
                    <span style={styles.statLabel}>SERIES</span>
                    <span style={styles.statValue}>
                        {isReadOnly ? Object.values(datosSesion).flat().length : Object.values(datosSesion).flat().filter(s => s.hecho).length}
                    </span>
                </div>
                <div style={styles.statItem}>
                    <span style={styles.statLabel}>VOLUMEN</span>
                    <span style={styles.statValue}>{calcularVolumenTotal()} <span style={{ fontSize: '0.8rem', color: '#555' }}>kg</span></span>
                </div>
                <div style={styles.statItem}>
                    <span style={styles.statLabel}>INTENSIDAD</span>
                    <span style={styles.statValueYellow}><Activity size={16} /></span>
                </div>
            </div>

            {/* LISTA DE EJERCICIOS */}
            {rutina?.detalles?.map((ej) => {
                const exerciseId = obtenerIdEjercicio(ej);
                if (!exerciseId) return null;
                const sets = datosSesion[exerciseId] || [];
                const notaActual = notasSesion[exerciseId] || "";
                const editando = editandoNotaId === exerciseId;

                return (
                    <div key={ej.id} style={styles.card}>
                        <div style={styles.cardHeader}>
                            <div style={styles.imgBox}>
                                {ej.ejercicio.imagenUrl || obtenerYoutubeThumbnail(ej.ejercicio.videoUrl) ?
                                    <img src={ej.ejercicio.imagenUrl || obtenerYoutubeThumbnail(ej.ejercicio.videoUrl)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="ejercicio" /> :
                                    esVideoDirecto(ej.ejercicio.videoUrl) ?
                                    <video src={ej.ejercicio.videoUrl} muted playsInline preload="metadata" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> :
                                    <Activity color="#555" />
                                }
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={styles.exTitle}>{ej.ejercicio.nombreTraducido || ej.ejercicio.nombre}</div>
                                <div style={styles.noteWrapper}>
                                    {editando && !isReadOnly ? (
                                        <div>
                                            <textarea autoFocus placeholder="Notas..." style={styles.noteInput} value={notaActual} onChange={(e) => guardarNotaEnEstado(exerciseId, e.target.value)} onBlur={finalizarEdicionNota} />
                                            <button style={styles.btnSaveNote} onMouseDown={finalizarEdicionNota}>OK</button>
                                        </div>
                                    ) : (
                                        <div onClick={() => !isReadOnly && setEditandoNotaId(exerciseId)}>
                                            {notaActual ? (
                                                <div style={styles.noteDisplay}><MessageSquare size={12} color="#FACC15" />{notaActual}</div>
                                            ) : (
                                                <div style={styles.notePlaceholder}><Plus size={12} /> {isReadOnly ? "Sin notas" : "Nota"}</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                <button style={styles.iconBtn} onClick={() => setInfoExercise(ej.ejercicio)}><Info size={18} /></button>
                            </div>
                        </div>

                        {/* TABLA DE SERIES */}
                        <div>
                            <div style={styles.tableHeader}>
                                <div>#</div>
                                <div>PREV</div>
                                <div>KG</div>
                                <div>REPS</div>
                                <div>RPE</div>
                                <div>OK</div>
                            </div>

                            {sets.map((set, i) => {
                                const datoAnterior = historialPrevio[exerciseId]?.[i];

                                return (
                                    // 🛑 Forzamos el color de fondo como querías (rgba(34, 197, 94, 0.05) si está completado o en lectura)
                                    <div key={i} style={styles.tableRow(set.hecho || isReadOnly)}>
                                        <div style={{ fontWeight: 'bold', color: (set.hecho || isReadOnly) ? '#FACC15' : '#555', textAlign: 'center', fontSize: '0.9rem' }}>{i + 1}</div>

                                        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', lineHeight: '1.2', fontStyle: 'italic' }}>
                                            {datoAnterior ? (
                                                <>
                                                    <span style={{ fontWeight: '900', color: '#6b829e', fontSize: '0.9rem' }}>{datoAnterior.peso}kg</span>
                                                    <span style={{ color: '#666', fontSize: '0.85rem' }}>x{datoAnterior.reps}</span>
                                                </>
                                            ) : (<span style={{ color: '#444' }}>-</span>)}
                                        </div>

                                        <div style={{ padding: '0 4px' }}>
                                            <input
                                                type="number"
                                                style={styles.input}
                                                value={set.peso}
                                                onChange={(e) => updateSet(exerciseId, i, 'peso', e.target.value)}
                                                disabled={isReadOnly}
                                            />
                                        </div>
                                        <div style={{ padding: '0 4px' }}>
                                            <input 
                                                type="number" 
                                                style={styles.input} 
                                                value={set.reps} 
                                                onChange={(e) => updateSet(exerciseId, i, 'reps', e.target.value)} 
                                                disabled={isReadOnly} 
                                            />
                                        </div>
                                        <div style={{ padding: '0 4px' }}>
                                            <input 
                                                type="number" 
                                                style={{ ...styles.input, color: '#71717a' }} 
                                                value={set.rpe} 
                                                onChange={(e) => updateSet(exerciseId, i, 'rpe', e.target.value)} 
                                                disabled={isReadOnly} 
                                            />
                                        </div>

                                        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                                            <button style={styles.checkBtn(set.hecho || isReadOnly)} onClick={() => toggleCheck(exerciseId, i)} disabled={isReadOnly}>
                                                {(set.hecho || isReadOnly) && <Check size={18} strokeWidth={4} />}
                                            </button>
                                            
                                            {!set.hecho && !isReadOnly && (
                                                <button onClick={() => removeSet(exerciseId, i)} style={{ background: 'none', border: 'none', color: '#333', cursor: 'pointer', padding: 0 }}>
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {!isReadOnly && (
                            <button style={styles.addSetBtn} onClick={() => addSet(exerciseId)}>
                                <Plus size={14} /> AÑADIR SERIE
                            </button>
                        )}
                    </div>
                );
            })}

            {/* MODALES RESTANTES */}
            {infoExercise && (
                <div style={styles.modalOverlay} onClick={() => setInfoExercise(null)}>
                    <div style={styles.infoModalCard} onClick={e => e.stopPropagation()}>
                        <button style={styles.closeBtn} onClick={() => setInfoExercise(null)}><X size={18} /></button>
                        <div style={styles.modalTag}><Activity size={12} /> TÉCNICA</div>
                        <h2 style={styles.infoTitle}>{infoExercise.nombre}</h2>
                        {infoExercise.videoUrl && (
                            <div style={{ width: '100%', height: 'clamp(380px, calc(80vh - 210px), 460px)', background: '#050505', borderRadius: '12px', overflow: 'hidden', border: '1px solid #27272a', marginBottom: '14px', position: 'relative' }}>
                                <VideoEjercicio
                                    src={infoExercise.videoUrl}
                                    title={`Video de ${infoExercise.nombre}`}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', background: '#000' }}
                                />
                            </div>
                        )}
                        <div style={styles.infoText}>{infoExercise.instrucciones || "No hay instrucciones detalladas para este ejercicio."}</div>
                    </div>
                </div>
            )}

            {showFinishModal && (
                <div style={styles.modalOverlay}>
                    <div style={styles.finishModalCard}>
                        <div style={{ display: 'inline-block', background: 'rgba(250, 204, 21, 0.1)', padding: '15px', borderRadius: '50%', marginBottom: '10px' }}>
                            <Trophy size={40} color="#FACC15" />
                        </div>
                        <h2 style={styles.finishTitle}>¡Sesión Completada!</h2>
                        <p style={styles.finishSub}>Gran trabajo hoy. Aquí tienes tu resumen:</p>
                        <div style={styles.statsGrid}>
                            <div style={styles.statItem}><span style={styles.statItemLabel}>Tiempo</span><span style={styles.statItemValue}>{formatoTiempo(tiempo)}</span></div>
                            <div style={styles.statItem}><span style={styles.statItemLabel}>Volumen</span><span style={styles.statItemValue}>{calcularVolumenTotal()}kg</span></div>
                            <div style={styles.statItem}><span style={styles.statItemLabel}>Series</span><span style={styles.statItemValue}>{Object.values(datosSesion).flat().filter(s => s.hecho).length}</span></div>
                        </div>
                        <div style={styles.modalActions}>
                            <button style={styles.btnCancel} onClick={cancelFinish}>SEGUIR</button>
                            <button style={styles.btnConfirm} onClick={confirmFinish}>
                                <Save size={16} style={{ marginRight: 6 }} /> GUARDAR
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
