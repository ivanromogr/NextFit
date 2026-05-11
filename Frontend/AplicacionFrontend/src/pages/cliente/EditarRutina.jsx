import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { obtenerRutinasCliente, obtenerEjercicios, actualizarRutina } from '../../api/endpoints';
import { useAuth } from '../../context/AuthContext';
import { getExerciseImageCandidates } from '../../utils/media';
import { 
    ChevronLeft, Save, Trash2, Plus, Search, Dumbbell, X, 
    GripVertical, Copy, CheckCircle, AlertCircle, Info
} from 'lucide-react';

// Categorías para el filtro
const MUSCLE_FILTERS = ["TODOS", "PECHO", "ESPALDA", "PIERNA", "HOMBRO", "BÍCEPS", "TRÍCEPS", "ABDOMINALES", "CARDIO"];

const normalizarTexto = (value) =>
    (value || "")
        .toString()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();

const buscarEjercicioCompleto = (ejercicio, biblioteca) => {
    if (!ejercicio) return ejercicio;
    return biblioteca.find((item) => {
        if (item.id && ejercicio.id && item.id === ejercicio.id) return true;
        if (item.apiId && ejercicio.apiId && item.apiId === ejercicio.apiId) return true;
        const nombreItem = normalizarTexto(item.nombreTraducido || item.nombre);
        const nombreEjercicio = normalizarTexto(ejercicio.nombreTraducido || ejercicio.nombre);
        return nombreItem && nombreItem === nombreEjercicio;
    });
};

const obtenerYoutubeId = (url = "") => {
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([^?&/]+)/);
    return match?.[1] || null;
};

const obtenerYoutubeThumbnail = (url = "") => {
    const videoId = obtenerYoutubeId(url);
    return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null;
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

const esVideoDirecto = (url = "") => /\.(mp4|webm|ogg)(\?.*)?$/i.test(url);

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

const ExerciseImage = ({ exercise, style, fallbackIconSize = 28 }) => {
    const videoThumbnail = obtenerYoutubeThumbnail(exercise?.videoUrl);
    const candidates = [
        videoThumbnail,
        ...getExerciseImageCandidates(exercise)
    ].filter(Boolean);
    const [index, setIndex] = useState(0);
    const src = candidates[index];

    useEffect(() => {
        setIndex(0);
    }, [exercise?.id, exercise?.apiId, exercise?.imagenUrl, exercise?.imagenOriginalUrl]);

    if (!src) {
        return <Dumbbell size={fallbackIconSize} color="#333" />;
    }

    return (
        <img
            src={src}
            alt={exercise?.nombreTraducido || exercise?.nombre || "ejercicio"}
            style={style}
            onError={() => {
                if (index < candidates.length - 1) setIndex(index + 1);
                else setIndex(candidates.length);
            }}
        />
    );
};

const EditarRutina = () => {
    const { rutinaId, clienteId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { userId } = useAuth();
    const [loading, setLoading] = useState(true);
    
    // --- ESTADOS ---
    const [rutinaData, setRutinaData] = useState({ nombre: "", objetivo: "", nivel: "", descripcion: "" });
    const [detalles, setDetalles] = useState([]); // Aquí guardaremos los ejercicios con sus "sets" expandidos

    // Buscador
    const [allExercises, setAllExercises] = useState([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [infoExercise, setInfoExercise] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedMuscle, setSelectedMuscle] = useState("TODOS");

    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

    useEffect(() => {
        const loadData = async () => {
            const idOwner = clienteId
                || localStorage.getItem("clienteObjetivoId")
                || userId
                || localStorage.getItem("clienteId");
            if (!idOwner) {
                navigate("/auth/login");
                return;
            }
            try {
                const [rutinas, ejercicios] = await Promise.all([
                    obtenerRutinasCliente(idOwner),
                    obtenerEjercicios()
                ]);

                const rutinaEncontrada = rutinas.find(r => r.id === rutinaId);
                
                if (rutinaEncontrada) {
                    setRutinaData({
                        nombre: rutinaEncontrada.nombre,
                        objetivo: rutinaEncontrada.objetivo,
                        nivel: rutinaEncontrada.nivel,
                        descripcion: rutinaEncontrada.descripcion
                    });
                    
                    // --- TRANSFORMACIÓN INTELIGENTE ---
                    // Convertimos el resumen "3 series" del backend en 3 filas reales para la UI
                    const detallesExpandidos = (rutinaEncontrada.detalles || []).map(d => {
                        const ejercicioCompleto = buscarEjercicioCompleto(d.ejercicio, ejercicios || []);
                        const ejercicio = ejercicioCompleto
                            ? { ...d.ejercicio, ...ejercicioCompleto }
                            : d.ejercicio;
                        const numSeries = d.series || 3;
                        // Creamos un array real de series
                        const setsArray = Array.from({ length: numSeries }, () => ({
                            reps: d.repeticiones || 10,
                            peso: d.peso || 0,
                            rpe: d.rpe || 8
                        }));

                        return {
                            ...d,
                            ejercicio,
                            sets: setsArray, // Guardamos las series individuales aquí para pintarlas
                            notas: d.notas || ""
                        };
                    });
                    setDetalles(detallesExpandidos);
                }
                
                setAllExercises(ejercicios || []);
            } catch (error) {
                console.error("Error cargando datos:", error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [rutinaId, clienteId, userId, navigate]);

    // --- FUNCIÓN PARA MOSTRAR NOTIFICACIÓN ---
    const showNotification = (message, type = 'success') => {
        setToast({ show: true, message, type });
        // Se oculta sola a los 3 segundos
        setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
    };

    
    const handleVolver = () => {
  // Si estamos en modo entrenador (ruta entrenador), volvemos a las rutinas del cliente
  if (location.pathname.startsWith("/entrenador")) {
    navigate(`/entrenador/cliente/${clienteId}/rutinas`);
    return;
  }

  // Si no, es modo cliente normal
  navigate("/cliente/dashboard");
};


    // --- MANEJADORES DE SERIES INDIVIDUALES ---
    
    // Cambiar valor de un set específico (Set 1, Set 2...)
    const handleSetChange = (exerciseIndex, setIndex, field, value) => {
        const newDetalles = [...detalles];
        newDetalles[exerciseIndex].sets[setIndex][field] = value;
        setDetalles(newDetalles);
    };

    // Añadir una nueva serie al ejercicio
    const addSetToExercise = (exerciseIndex) => {
        const newDetalles = [...detalles];
        const currentSets = newDetalles[exerciseIndex].sets;
        const lastSet = currentSets[currentSets.length - 1] || { reps: 10, peso: 0, rpe: 8 };
        newDetalles[exerciseIndex].sets.push({ ...lastSet });
        setDetalles(newDetalles);
    };

    // Eliminar una serie específica
    const removeSetFromExercise = (exerciseIndex, setIndex) => {
        const newDetalles = [...detalles];
        if (newDetalles[exerciseIndex].sets.length > 1) {
            newDetalles[exerciseIndex].sets.splice(setIndex, 1);
            setDetalles(newDetalles);
        }
    };

    // Cambiar nota general
    const handleNoteChange = (index, value) => {
        const updated = [...detalles];
        updated[index].notas = value;
        setDetalles(updated);
    };

    const removeExercise = (index) => {
        if(window.confirm("¿Eliminar ejercicio completo?")) {
            const updated = detalles.filter((_, i) => i !== index);
            setDetalles(updated);
        }
    };

    const addExerciseToRoutine = (ejercicio) => {
        const nuevoDetalle = {
            ejercicio: ejercicio,
            notas: "",
            // Inicializamos con 3 series por defecto
            sets: [
                { reps: 10, peso: 0, rpe: 8 },
                { reps: 10, peso: 0, rpe: 8 },
                { reps: 10, peso: 0, rpe: 8 }
            ]
        };
        setDetalles([...detalles, nuevoDetalle]);
        setShowAddModal(false);
        setSearchTerm("");
    };

    // --- 🚨 FUNCIÓN DE GUARDADO CON TOAST ---
    const saveChanges = async () => {
        if (!rutinaData.nombre.trim()) {
            showNotification("El nombre es obligatorio", "error");
            return;
        }
        if (detalles.length === 0) {
            showNotification("Añade al menos un ejercicio", "error");
            return;
        }

        try {
            // Calculamos los totales a partir de las series individuales
            const listaProcesada = detalles.map(d => {
                const totalSets = d.sets.length;
                const firstSet = d.sets[0] || { reps: 0, peso: 0, rpe: 0 };

                return {
                    ejercicio: { id: d.ejercicio.id }, 
                    idEjercicio: d.ejercicio.id, 
                    series: totalSets,
                    repeticiones: parseInt(firstSet.reps),
                    peso: parseFloat(firstSet.peso),
                    rpe: parseInt(firstSet.rpe),
                    notas: d.notas
                };
            });

            const payload = { 
                ...rutinaData, 
                detalles: listaProcesada, 
                ejercicios: listaProcesada
            };
            
            await actualizarRutina(rutinaId, payload);
            
            // ✅ MOSTRAMOS NOTIFICACIÓN ELEGANTE
            showNotification("Rutina guardada correctamente", "success");
            
            // Esperamos un segundo antes de volver para que se vea el mensaje
            setTimeout(() => {
                handleVolver(); 
            }, 1000);

        } catch (error) {
            console.error("Error al guardar:", error);
            showNotification("Error al guardar cambios", "error");
        }
    };

    const filteredExercises = allExercises.filter(ex => {
        const matchesText = ex.nombre.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesMuscle = selectedMuscle === "TODOS" || (ex.grupoMuscular && ex.grupoMuscular.toUpperCase() === selectedMuscle);
        return matchesText && matchesMuscle;
    });

    if (loading) return <div style={{background:'#09090b', height:'100vh', display:'flex', justifyContent:'center', alignItems:'center', color:'white'}}>Cargando editor...</div>;

    // --- ESTILOS "TITÁN" + TOAST ---
    const styles = {
        container: { minHeight: '100vh', background: '#050505', color: 'white', fontFamily: "'Inter', sans-serif", paddingBottom:'150px' },
        
        header: { position: 'sticky', top: 0, zIndex: 50, background: 'rgba(5, 5, 5, 0.95)', backdropFilter: 'blur(10px)', borderBottom: '1px solid #1a1a1a', padding: '20px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
        backBtn: { background: 'transparent', border: '1px solid #333', color: '#ccc', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontSize:'0.85rem', fontWeight:'700', padding:'10px 20px', borderRadius:'10px', transition:'all 0.2s' },
        saveBtn: { background: '#FACC15', color: 'black', border: 'none', padding: '12px 30px', borderRadius: '10px', fontWeight: '900', cursor: 'pointer', display:'flex', alignItems:'center', gap:'10px', textTransform:'uppercase', letterSpacing:'1px', boxShadow:'0 0 25px rgba(250, 204, 21, 0.2)' },

        content: { maxWidth: '1200px', margin: '50px auto', padding: '0 40px' },
        
        titleGroup: { marginBottom: '60px', paddingBottom: '30px', borderBottom: '1px solid #1a1a1a' },
        labelTitle: { fontSize: '0.75rem', fontWeight: '800', color: '#FACC15', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '15px', display:'block' },
        titleInput: { background: 'transparent', border: 'none', color: 'white', fontSize: '3.5rem', fontWeight: '900', textTransform: 'uppercase', width: '100%', outline: 'none', fontFamily: "'Teko', sans-serif", letterSpacing: '-1px', lineHeight: '1', textShadow: '0 0 50px rgba(255,255,255,0.05)' },
        descInput: { background: 'transparent', border: 'none', color: '#888', fontSize: '1.2rem', width: '100%', outline: 'none', marginTop: '10px', fontFamily: 'sans-serif', fontWeight: '400' },

        editCard: { background: '#0a0a0a', border: '1px solid #222', borderRadius: '20px', padding: '0', marginBottom: '30px', display: 'grid', gridTemplateColumns: '220px 1fr', gap: '0', transition: 'all 0.3s ease', position: 'relative', alignItems: 'stretch', overflow: 'hidden', minHeight: '250px' },
        imgBox: { width: '220px', height: '100%', minHeight: '250px', background: '#050505', display:'flex', justifyContent:'center', alignItems:'center', borderRight: '1px solid #222', overflow:'hidden', position: 'relative' },
        mediaInfoBtn: { position: 'absolute', top: '14px', left: '14px', width: '34px', height: '34px', borderRadius: '50%', background: 'rgba(0,0,0,0.72)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 5 },
        mediaBadge: { position: 'absolute', bottom: '14px', right: '14px', background: '#FACC15', color: '#000', borderRadius: '6px', padding: '4px 8px', fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase' },
        mainInfo: { width: '100%' },
        exName: { fontSize: '1.8rem', fontWeight: '900', color: 'white', textTransform: 'uppercase', fontFamily:"'Teko', sans-serif", letterSpacing:'0.5px', lineHeight:'1' },
        exMuscle: { fontSize: '0.8rem', color: '#FACC15', fontWeight: 'bold', marginTop: '5px', textTransform:'uppercase', letterSpacing:'1px', opacity: 0.8 },

        tableContainer: { background: '#111', borderRadius: '12px', border: '1px solid #1a1a1a', overflow: 'hidden', marginTop:'25px' },
        tableHeader: { display: 'grid', gridTemplateColumns: '0.5fr 1fr 1fr 1fr 0.5fr', padding: '10px 20px', background: '#161616', borderBottom: '1px solid #222' },
        headerLabel: { fontSize: '0.65rem', color: '#666', fontWeight: '800', textTransform: 'uppercase', textAlign: 'center', letterSpacing:'1px' },
        tableRow: { display: 'grid', gridTemplateColumns: '0.5fr 1fr 1fr 1fr 0.5fr', padding: '8px 20px', borderBottom: '1px solid #1a1a1a', alignItems: 'center' },
        tableInput: { background: 'transparent', border: '1px solid transparent', color: 'white', width: '100%', textAlign: 'center', fontSize: '1rem', fontWeight: '700', padding: '8px', borderRadius: '6px', outline: 'none', transition: 'all 0.2s' },
        
        rowActionBtn: { background: 'transparent', border: 'none', color: '#333', cursor: 'pointer', display: 'flex', justifyContent: 'center', transition: 'color 0.2s' },
        addSetBtn: { width: '100%', padding: '12px', background: 'transparent', border: 'none', color: '#666', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', textTransform:'uppercase', letterSpacing:'1px', transition: 'all 0.2s' },

        noteInput: { width: '100%', background: 'transparent', border: 'none', borderTop: '1px solid #1a1a1a', color: '#777', fontSize: '0.9rem', padding: '15px 0', marginTop: '15px', outline:'none', fontStyle:'italic' },
        deleteExerciseBtn: { position: 'absolute', top: '25px', right: '25px', background:'transparent', border:'none', color:'#333', cursor:'pointer' },
        cardBody: { padding: '35px 70px 35px 35px' },

        addBtnContainer: { marginTop: '50px', display:'flex', justifyContent:'center' },
        addBtn: { width: '100%', padding: '30px', background: 'linear-gradient(180deg, rgba(250, 204, 21, 0.05) 0%, rgba(0,0,0,0) 100%)', border: '2px dashed #333', borderRadius: '20px', color: '#777', cursor: 'pointer', display: 'flex', flexDirection:'column', justifyContent: 'center', alignItems: 'center', gap: '15px', fontSize: '1.1rem', fontWeight: '700', transition: 'all 0.2s', textTransform:'uppercase', letterSpacing:'2px' },

        // ✅ ESTILO DE NOTIFICACIÓN FLOTANTE (TOAST)
        toast: {
            position: 'fixed', top: '100px', right: '40px', zIndex: 9999,
            background: toast.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            border: `1px solid ${toast.type === 'success' ? '#10B981' : '#EF4444'}`,
            padding: '16px 24px', borderRadius: '12px',
            display: 'flex', alignItems: 'center', gap: '12px',
            color: 'white', fontWeight: '600', fontSize: '0.9rem',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            backdropFilter: 'blur(10px)',
            transform: toast.show ? 'translateX(0)' : 'translateX(100px)',
            opacity: toast.show ? 1 : 0,
            transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)', // Efecto rebote suave
            pointerEvents: 'none'
        },

        modalOverlay: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.95)', backdropFilter: 'blur(10px)', zIndex: 100, display: 'flex', justifyContent: 'center', alignItems: 'center' },
        modalBox: { background: '#0a0a0a', width: '90%', maxWidth: '800px', height: '85vh', borderRadius: '30px', border: '1px solid #333', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
        searchBar: { padding: '25px 40px', borderBottom: '1px solid #222', display:'flex', alignItems:'center', gap:'20px' },
        searchInput: { width: '100%', background: 'transparent', border: 'none', color: 'white', fontSize: '1.8rem', outline: 'none', fontWeight: '900', fontFamily:"'Teko', sans-serif", textTransform:'uppercase', placeholderColor:'#333' },
        filterRow: { display: 'flex', gap: '10px', overflowX: 'auto', padding: '20px 40px', borderBottom: '1px solid #222', background: '#0f0f0f' },
        filterChip: (active) => ({ padding: '10px 20px', borderRadius: '50px', fontSize: '0.8rem', fontWeight: '800', cursor: 'pointer', background: active ? '#FACC15' : '#1a1a1a', color: active ? 'black' : '#777', border: 'none', whiteSpace: 'nowrap', textTransform: 'uppercase' }),
        list: { flex: 1, overflowY: 'auto', padding: '0' },
        listItem: { padding: '20px 40px', borderBottom: '1px solid #1a1a1a', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', transition: 'background 0.2s' },
        infoModalCard: { background: '#111', width: '90%', maxWidth: '760px', borderRadius: '20px', border: '1px solid #333', overflow: 'hidden', boxShadow: '0 40px 90px rgba(0,0,0,0.75)' },
        infoModalHeader: { padding: '20px 28px', borderBottom: '1px solid #222', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#151515' },
        infoModalMedia: { width: '100%', height: 'clamp(380px, calc(88vh - 230px), 500px)', background: '#000', position: 'relative' },
    };

    return (
        <div style={styles.container}>
            <style>{`
                input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
                .no-scrollbar::-webkit-scrollbar { display: none; }
                ::selection { background: #FACC15; color: black; }
                input::placeholder { color: #333; opacity: 1; }
            `}</style>

            {/* ✅ COMPONENTE TOAST */}
            <div style={styles.toast}>
                {toast.type === 'success' ? <CheckCircle size={20} color="#10B981"/> : <AlertCircle size={20} color="#EF4444"/>}
                {toast.message}
            </div>

            <div style={styles.header}>
                <button style={styles.backBtn} onClick={handleVolver} onMouseEnter={e => e.currentTarget.style.color = 'white'} onMouseLeave={e => e.currentTarget.style.color = '#ccc'}>
                    <ChevronLeft size={18}/> SALIR
                </button>
                <div style={{color:'#666', fontWeight:'800', fontSize:'0.8rem', letterSpacing:'2px', textTransform:'uppercase'}}>MODO EDICIÓN</div>
                <button style={styles.saveBtn} onClick={saveChanges}><Save size={20}/> GUARDAR</button>
            </div>

            <div style={styles.content}>
                <div style={styles.titleGroup}>
                    <label style={styles.labelTitle}>PROGRAMA DE ENTRENAMIENTO</label>
                    <input style={styles.titleInput} value={rutinaData.nombre} onChange={(e) => setRutinaData({...rutinaData, nombre: e.target.value})} placeholder="SIN TÍTULO" onFocus={e => e.target.style.color = '#FACC15'} onBlur={e => e.target.style.color = 'white'}/>
                    <input style={styles.descInput} value={rutinaData.descripcion || ""} onChange={(e) => setRutinaData({...rutinaData, descripcion: e.target.value})} placeholder="Escribe aquí el objetivo del plan..." />
                </div>

                {detalles.map((detalle, exIndex) => (
                    <div key={exIndex} style={styles.editCard} onMouseEnter={e => {e.currentTarget.style.borderColor = '#444'; e.currentTarget.style.backgroundColor = '#0f0f0f'}} onMouseLeave={e => {e.currentTarget.style.borderColor = '#222'; e.currentTarget.style.backgroundColor = '#0a0a0a'}}>
                        
                        <div style={styles.imgBox}>
                            <button
                                style={styles.mediaInfoBtn}
                                onClick={() => setInfoExercise(detalle.ejercicio)}
                                title="Ver técnica y video"
                            >
                                <Info size={18} />
                            </button>
                            <ExerciseImage
                                exercise={detalle.ejercicio}
                                style={{width:'100%', height:'100%', objectFit:'cover'}}
                            />
                            {detalle.ejercicio?.videoUrl && <div style={styles.mediaBadge}>VIDEO</div>}
                        </div>
                        <div style={styles.cardBody}>
                        <div style={styles.mainInfo}>
                            <div style={styles.exName}>{detalle.ejercicio?.nombreTraducido || detalle.ejercicio?.nombre}</div>
                            <div style={styles.exMuscle}>{detalle.ejercicio?.grupoMuscularTraducido || detalle.ejercicio?.grupoMuscular || "General"}</div>
                            
                            {/* TABLA DE SERIES */}
                            <div style={styles.tableContainer}>
                                <div style={styles.tableHeader}>
                                    <div style={styles.headerLabel}>SET</div>
                                    <div style={styles.headerLabel}>KG</div>
                                    <div style={styles.headerLabel}>REPS</div>
                                    <div style={styles.headerLabel}>RPE</div>
                                    <div></div>
                                </div>
                                
                                {detalle.sets.map((set, setIndex) => (
                                    <div key={setIndex} style={styles.tableRow}>
                                        <div style={{textAlign:'center', fontWeight:'bold', color:'#333'}}>{setIndex + 1}</div>
                                        <input type="number" style={{...styles.tableInput, color: '#FACC15'}} value={set.peso} onChange={(e) => handleSetChange(exIndex, setIndex, 'peso', e.target.value)} onFocus={(e) => {e.target.select(); e.target.style.background='#1a1a1a'}} onBlur={(e) => e.target.style.background='transparent'}/>
                                        <input type="number" style={styles.tableInput} value={set.reps} onChange={(e) => handleSetChange(exIndex, setIndex, 'reps', e.target.value)} onFocus={(e) => {e.target.select(); e.target.style.background='#1a1a1a'}} onBlur={(e) => e.target.style.background='transparent'}/>
                                        <input type="number" style={{...styles.tableInput, color: '#777'}} value={set.rpe} onChange={(e) => handleSetChange(exIndex, setIndex, 'rpe', e.target.value)} onFocus={(e) => {e.target.select(); e.target.style.background='#1a1a1a'}} onBlur={(e) => e.target.style.background='transparent'}/>
                                        <button style={styles.rowActionBtn} onClick={() => removeSetFromExercise(exIndex, setIndex)} onMouseEnter={e => e.currentTarget.style.color = '#ef4444'} onMouseLeave={e => e.currentTarget.style.color = '#333'}><Trash2 size={16}/></button>
                                    </div>
                                ))}
                                <button style={styles.addSetBtn} onClick={() => addSetToExercise(exIndex)} onMouseEnter={e => {e.currentTarget.style.background = '#1a1a1a'; e.currentTarget.style.color = '#FACC15'}} onMouseLeave={e => {e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#666'}}><Plus size={14}/> AÑADIR SERIE</button>
                            </div>

                            <input style={styles.noteInput} placeholder="Escribe notas técnicas..." value={detalle.notas} onChange={(e) => handleNoteChange(exIndex, e.target.value)} />
                        </div>
                        </div>

                        <button style={styles.deleteExerciseBtn} onClick={() => removeExercise(exIndex)}><Trash2 size={20}/></button>
                    </div>
                ))}

                <div style={styles.addBtnContainer}>
                    <button style={styles.addBtn} onClick={() => setShowAddModal(true)} onMouseEnter={e => {e.currentTarget.style.borderColor = '#FACC15'; e.currentTarget.style.color = '#FACC15';}} onMouseLeave={e => {e.currentTarget.style.borderColor = '#333'; e.currentTarget.style.color = '#777';}}><Plus size={40}/> AÑADIR EJERCICIO AL PLAN</button>
                </div>
            </div>

            {/* MODAL BUSCADOR */}
            {showAddModal && (
                <div style={styles.modalOverlay} onClick={() => setShowAddModal(false)}>
                    <div style={styles.modalBox} onClick={e => e.stopPropagation()}>
                        <div style={styles.searchBar}>
                            <Search color="#555" size={28} />
                            <input style={styles.searchInput} placeholder="BUSCAR EJERCICIO..." autoFocus value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                            <button onClick={() => setShowAddModal(false)} style={{background:'none', border:'none', color:'#71717a', cursor:'pointer'}}><X size={32}/></button>
                        </div>
                        <div className="no-scrollbar" style={styles.filterRow}>
                            {MUSCLE_FILTERS.map(muscle => (
                                <div key={muscle} style={styles.filterChip(selectedMuscle === muscle)} onClick={() => setSelectedMuscle(muscle)}>{muscle}</div>
                            ))}
                        </div>
                        <div style={styles.list}>
                            {filteredExercises.map(ex => (
                                <div key={ex.id} style={styles.listItem} onClick={() => addExerciseToRoutine(ex)} onMouseEnter={e => e.currentTarget.style.background = '#121212'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                    <div style={{display:'flex', alignItems:'center', gap:'20px'}}>
                                        <div style={{width:'60px', height:'60px', borderRadius:'10px', background:'#222', border:'1px solid #333', overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center', flexShrink: 0}}>
                                            <ExerciseImage
                                                exercise={ex}
                                                style={{width:'100%', height:'100%', objectFit:'cover'}}
                                                fallbackIconSize={22}
                                            />
                                        </div>
                                        <div>
                                            <div style={{fontWeight:'900', color:'white', fontSize:'1.2rem', textTransform:'uppercase', fontFamily:"'Teko', sans-serif", letterSpacing:'0.5px'}}>{ex.nombre}</div>
                                            <div style={{fontSize:'0.75rem', color:'#FACC15', fontWeight:'bold', textTransform:'uppercase', letterSpacing:'1px'}}>{ex.grupoMuscular || "General"}</div>
                                        </div>
                                    </div>
                                    <div style={{background:'rgba(250, 204, 21, 0.1)', borderRadius:'10px', padding:'10px', color:'#FACC15'}}><Plus size={24}/></div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {infoExercise && (
                <div style={styles.modalOverlay} onClick={() => setInfoExercise(null)}>
                    <div style={styles.infoModalCard} onClick={e => e.stopPropagation()}>
                        <div style={styles.infoModalHeader}>
                            <div>
                                <h3 style={{margin: 0, fontFamily: "'Teko', sans-serif", fontSize: '1.9rem', textTransform: 'uppercase', color: '#fff'}}>
                                    {infoExercise.nombreTraducido || infoExercise.nombre}
                                </h3>
                                <div style={{color: '#FACC15', fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px'}}>
                                    {infoExercise.grupoMuscularTraducido || infoExercise.grupoMuscular || 'General'}
                                </div>
                            </div>
                            <button onClick={() => setInfoExercise(null)} style={{background: 'none', border: 'none', color: '#71717a', cursor: 'pointer'}}>
                                <X size={28} />
                            </button>
                        </div>

                        <div style={styles.infoModalMedia}>
                            {infoExercise.videoUrl ? (
                                <VideoEjercicio
                                    src={infoExercise.videoUrl}
                                    title={`Video de ${infoExercise.nombreTraducido || infoExercise.nombre}`}
                                    style={{width: '100%', height: '100%', objectFit: 'cover', background: '#000'}}
                                />
                            ) : (
                                <ExerciseImage
                                    exercise={infoExercise}
                                    style={{width: '100%', height: '100%', objectFit: 'cover'}}
                                    fallbackIconSize={54}
                                />
                            )}
                        </div>

                        <div style={{padding: '18px 28px 24px'}}>
                            <p style={{margin: 0, color: '#c7c7c7', lineHeight: 1.45, whiteSpace: 'pre-line'}}>
                                {infoExercise.instrucciones || infoExercise.descripcionCorta || "No hay instrucciones detalladas disponibles."}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EditarRutina;
