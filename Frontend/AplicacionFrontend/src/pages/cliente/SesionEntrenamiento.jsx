import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { obtenerRutinasCliente, guardarSesionRealizada, obtenerUltimaSesionRutina } from '../../api/endpoints';
import { useToast } from '../../context/ToastContext'; 
import { 
    ChevronLeft, Check, Clock, Save, MoreHorizontal, 
    Plus, Info, Trash2, X, MessageSquare, Activity,
    Trophy, Youtube 
} from 'lucide-react';

export default function SesionEntrenamiento() {
    const { rutinaId } = useParams();
    const navigate = useNavigate();
    const toast = useToast();
    
    // --- ESTADOS ---
    const [rutina, setRutina] = useState(null);
    const [loading, setLoading] = useState(true);
    
    // Datos de la sesión actual (Inputs editables)
    const [datosSesion, setDatosSesion] = useState({});
    const [notasSesion, setNotasSesion] = useState({});
    
    // Datos visuales (Columna "Anterior" - Solo lectura)
    const [historialPrevio, setHistorialPrevio] = useState({}); 

    const [editandoNotaId, setEditandoNotaId] = useState(null);

    // Modales
    const [infoExercise, setInfoExercise] = useState(null);
    const [showFinishModal, setShowFinishModal] = useState(false);

    // Cronómetro
    const [tiempo, setTiempo] = useState(0);
    const [timerActivo, setTimerActivo] = useState(true);
    const timerRef = useRef(null);

    // --- CARGA DE DATOS ---
    useEffect(() => {
        const cargar = async () => {
            const clienteId = localStorage.getItem("clienteId");
            if (!clienteId) return navigate("/auth/login");

            try {
                // 1. Obtener Rutina
                const todas = await obtenerRutinasCliente(clienteId);
                const actual = todas.find(r => r.id === rutinaId);
                
                if (actual) {
                    setRutina(actual);

                    // 2. Obtener Historial (Última vez que se hizo)
                    const lastSession = await obtenerUltimaSesionRutina(clienteId, rutinaId);
                    
                    let mapaHistorial = {};
                    if (lastSession && lastSession.series) {
                        // Generamos el mapa de datos previos
                        mapaHistorial = generarMapaHistorial(lastSession.series);
                        setHistorialPrevio(mapaHistorial); // Para la columna gris "ANTERIOR"
                    }

                    // 3. Inicializar la sesión (Inputs) combinando Rutina + Historial
                    // Aquí pasamos el mapaHistorial para pre-rellenar los inputs
                    inicializarSesion(actual.detalles, mapaHistorial);

                } else {
                    navigate("/cliente/dashboard");
                }
            } catch (e) { 
                console.error(e); 
                toast.error("Error al cargar la rutina");
            } finally { 
                setLoading(false); 
            }
        };
        cargar();
    }, [rutinaId, navigate]);

    // Función auxiliar: Convierte la lista plana del backend a un objeto fácil de usar
    const generarMapaHistorial = (seriesPasadas) => {
        const mapa = {};
        seriesPasadas.forEach(serie => {
            const ejId = serie.ejercicioId || serie.ejercicio?.id;
            if (!ejId) return;

            if (!mapa[ejId]) mapa[ejId] = [];
            
            if (serie.setIndex > 0) {
                mapa[ejId][serie.setIndex - 1] = { 
                    peso: serie.peso, 
                    reps: serie.reps,
                    rpe: serie.rpe 
                };
            }
        });
        return mapa;
    };

    // 👇 AQUÍ ESTÁ LA MAGIA DEL PRE-LLENADO
    const inicializarSesion = (ejercicios, historial = {}) => {
        const estructura = {};
        
        ejercicios.forEach(ej => {
            const exerciseId = ej.ejercicio.id;
            
            // Buscamos si hay datos previos para este ejercicio
            const datosPreviosEjercicio = historial[exerciseId] || [];

            estructura[exerciseId] = Array(ej.series).fill(0).map((_, index) => {
                // Miramos si existe un set anterior para este índice (ej: set 1)
                const setPrevio = datosPreviosEjercicio[index];

                return {
                    // Si existe dato previo, lo ponemos. Si no, ponemos 0.
                    peso: setPrevio ? setPrevio.peso : 0,
                    reps: setPrevio ? setPrevio.reps : 0,
                    rpe:  setPrevio ? setPrevio.rpe  : 8,
                    hecho: false // El check siempre empieza vacío
                };
            });
        });
        setDatosSesion(estructura);
    };

    // --- CRONÓMETRO ---
    useEffect(() => {
        if (timerActivo) {
            timerRef.current = setInterval(() => setTiempo(t => t + 1), 1000);
        } else {
            clearInterval(timerRef.current);
        }
        return () => clearInterval(timerRef.current);
    }, [timerActivo]);

    const formatoTiempo = (segundos) => {
        const m = Math.floor(segundos / 60);
        const s = segundos % 60;
        return `${m}min ${s < 10 ? '0' : ''}${s}s`;
    };

    // --- LÓGICA DE SETS ---
    const updateSet = (idEjercicio, index, campo, valor) => {
        const newSets = [...datosSesion[idEjercicio]];
        newSets[index][campo] = valor;
        setDatosSesion({ ...datosSesion, [idEjercicio]: newSets });
    };

    const toggleCheck = (idEjercicio, index) => {
        const newSets = [...datosSesion[idEjercicio]];
        newSets[index].hecho = !newSets[index].hecho;
        setDatosSesion({ ...datosSesion, [idEjercicio]: newSets });
    };

    const addSet = (idEjercicio) => {
        const newSets = [...datosSesion[idEjercicio]];
        // Al añadir nuevo set, copiamos los datos del anterior para agilizar
        const ultimo = newSets[newSets.length - 1] || { peso: 0, reps: 0, rpe: 8 };
        newSets.push({ ...ultimo, hecho: false });
        setDatosSesion({ ...datosSesion, [idEjercicio]: newSets });
    };

    const removeSet = (idEjercicio, index) => {
        const newSets = datosSesion[idEjercicio].filter((_, i) => i !== index);
        setDatosSesion({ ...datosSesion, [idEjercicio]: newSets });
    };

    // --- LÓGICA DE NOTAS ---
    const guardarNotaEnEstado = (idEjercicio, texto) => {
        setNotasSesion({ ...notasSesion, [idEjercicio]: texto });
    };

    const finalizarEdicionNota = () => setEditandoNotaId(null);

    // --- LÓGICA DE FINALIZAR ---
    const calcularVolumenTotal = () => {
        let volumen = 0;
        Object.values(datosSesion).forEach(sets => {
            sets.forEach(s => { if(s.hecho) volumen += (parseFloat(s.peso)||0) * (parseFloat(s.reps)||0); });
        });
        return volumen;
    };

    const handleTerminarClick = () => {
        setTimerActivo(false); 
        setShowFinishModal(true);
    };

    const confirmFinish = async () => {
        const clienteId = localStorage.getItem("clienteId") || localStorage.getItem("userId");
        
        if (!clienteId) {
            toast.error("Error: No se identificó al usuario.");
            return;
        }

        try {
            const notasUnificadas = Object.entries(notasSesion)
                .map(([id, texto]) => texto ? `Nota: ${texto}` : '')
                .filter(t => t !== '')
                .join(" | ");

            const seriesLimpias = [];
            
            Object.entries(datosSesion).forEach(([ejercicioId, sets]) => {
                sets.forEach((set, index) => {
                    seriesLimpias.push({
                        ejercicioId: ejercicioId, 
                        setIndex: index + 1,
                        peso: parseFloat(set.peso) || 0.0,
                        reps: parseInt(set.reps, 10) || 0,
                        rpe: parseInt(set.rpe, 10) || 0,
                        hecho: set.hecho === true
                    });
                });
            });

            const payload = {
                clienteId: clienteId,
                rutinaId: rutinaId, 
                duracionSegundos: tiempo,
                notasGenerales: notasUnificadas || "Sesión finalizada.",
                series: seriesLimpias
            };

            await guardarSesionRealizada(payload);

            toast.success("¡Entrenamiento guardado correctamente! 🔥");
            navigate("/cliente/dashboard"); 

        } catch (error) {
            console.error("Error al guardar sesión:", error);
            toast.error("Hubo un error al guardar la sesión.");
        }
    };

    const cancelFinish = () => {
        setShowFinishModal(false);
        setTimerActivo(true); 
    };

    // --- ESTILOS ---
    const styles = {
        page: { background: '#09090b', minHeight: '100vh', color: 'white', fontFamily: 'sans-serif', paddingBottom: '100px' },
        topBar: { position: 'sticky', top: 0, background: '#09090b', zIndex: 50, borderBottom: '1px solid #222', padding: '15px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
        headerTitle: { fontSize: '1.2rem', fontWeight: '900', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '15px' },
        statsBar: { display: 'flex', justifyContent:'space-between', padding: '20px 40px', background:'#0c0c0e' },
        statItem: { display: 'flex', flexDirection: 'column' },
        statLabel: { fontSize: '0.65rem', color: '#71717a', fontWeight: 'bold', marginBottom: '4px', textTransform:'uppercase', letterSpacing:'1px' },
        statValueYellow: { fontSize: '1.4rem', fontWeight: 'bold', color: '#FACC15', display:'flex', alignItems:'center', gap:'5px' },
        statValue: { fontSize: '1.4rem', fontWeight: 'bold', color: '#fff' },
        timerUnderline: { height:'2px', width:'100%', background:'#FACC15', marginTop:'10px' },
        card: { background: '#121214', borderRadius: '12px', border: '1px solid #27272a', margin: '30px 40px', overflow: 'hidden' },
        cardHeader: { padding: '25px', borderBottom: '1px solid #222', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
        noteWrapper: { marginTop: '8px' },
        notePlaceholder: { color: '#71717a', fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontStyle: 'italic', transition: 'color 0.2s' },
        noteDisplay: { color: '#ccc', fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', background:'rgba(255,255,255,0.05)', padding:'8px 12px', borderRadius:'6px', width:'fit-content' },
        noteInput: { width: '100%', background: '#09090b', border: '1px solid #333', color: 'white', padding: '10px', borderRadius: '6px', outline: 'none', fontSize: '0.9rem', resize: 'none', minHeight:'60px', fontFamily:'sans-serif' },
        noteActions: { display: 'flex', gap: '10px', marginTop: '8px' },
        btnSaveNote: { background: '#FACC15', color: 'black', border: 'none', padding: '6px 14px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontSize:'0.75rem' },
        exTitle: { fontSize: '1.4rem', fontWeight: '900', textTransform: 'uppercase', color: '#FACC15', marginBottom: '5px' },
        imgBox: { width:'50px', height:'50px', background:'#fff', borderRadius:'8px', overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center', border:'1px solid #333' },
        tableHeader: { display: 'grid', gridTemplateColumns: '0.5fr 1fr 1fr 1fr 1fr 0.5fr 0.5fr', padding: '12px 20px', background: '#18181b', color: '#52525b', fontSize: '0.65rem', fontWeight: '900', letterSpacing:'1px', textAlign: 'center', textTransform:'uppercase' },
        tableRow: (hecho) => ({ display: 'grid', gridTemplateColumns: '0.5fr 1fr 1fr 1fr 1fr 0.5fr 0.5fr', padding: '15px 20px', borderBottom: '1px solid #1f1f22', alignItems: 'center', background: hecho ? 'rgba(250, 204, 21, 0.05)' : 'transparent', transition:'background 0.2s' }),
        input: { width: '100%', background: '#09090b', border: '1px solid #27272a', color: 'white', padding: '10px', borderRadius: '6px', textAlign: 'center', fontWeight: 'bold', outline: 'none', fontSize:'1rem' },
        checkBtn: (hecho) => ({ width: '40px', height: '40px', borderRadius: '8px', background: hecho ? '#FACC15' : '#27272a', border: 'none', color: hecho ? 'black' : '#555', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition:'all 0.2s' }),
        addSetBtn: { width: '100%', padding: '18px', background: 'transparent', border: 'none', color: '#aaa', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.8rem', borderTop: '1px solid #222', textTransform:'uppercase', letterSpacing:'1px' },
        finishBtn: { background: '#FACC15', color: 'black', border: 'none', padding: '10px 24px', borderRadius: '6px', fontWeight: '900', cursor: 'pointer', textTransform: 'uppercase', fontSize: '0.85rem', letterSpacing:'0.5px' },
        iconBtn: { background:'rgba(255,255,255,0.1)', border:'none', color:'#aaa', width:'32px', height:'32px', borderRadius:'6px', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' },
        modalOverlay: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(10px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' },
        finishModalCard: { background: '#121212', borderRadius: '30px', width: '90%', maxWidth: '450px', padding: '40px', textAlign: 'center', border: '1px solid #27272a', boxShadow: '0 25px 80px rgba(0,0,0,0.9)' },
        finishTitle: { fontSize: '2rem', fontWeight: '900', color: 'white', margin: '20px 0 10px 0', textTransform: 'uppercase' },
        finishSub: { color: '#a1a1aa', fontSize: '1rem', marginBottom: '30px' },
        statsGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '35px', background: '#18181b', padding: '20px', borderRadius: '16px', border: '1px solid #27272a' },
        statItemLabel: { fontSize: '0.7rem', color: '#71717a', fontWeight: '700', textTransform: 'uppercase' },
        statItemValue: { fontSize: '1.2rem', color: '#FACC15', fontWeight: '900', marginTop: '5px' },
        infoModalCard: { background: '#121212', borderRadius: '24px', width: '90%', maxWidth: '550px', padding: '40px', position: 'relative', border: '1px solid #333', boxShadow: '0 25px 60px rgba(0,0,0,0.8)' },
        modalTag: { display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(250, 204, 21, 0.1)', color: '#FACC15', padding: '6px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', marginBottom: '15px', letterSpacing: '1px' },
        infoTitle: { fontSize: '2rem', fontWeight: '900', color: 'white', marginBottom: '20px', lineHeight: 1, textTransform: 'uppercase' },
        infoText: { color: '#a1a1aa', fontSize: '1rem', lineHeight: 1.7, marginBottom: '30px' },
        closeBtn: { position: 'absolute', top: '25px', right: '25px', background: '#1f1f22', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer' },
        ytBtn: { display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", background: "#FACC15", color: "black", textDecoration: "none", padding: "16px", borderRadius: "12px", fontWeight: "900", fontSize: "1rem", width: "100%", textTransform: "uppercase", letterSpacing: "0.5px", boxShadow: "0 6px 18px rgba(250, 204, 21, 0.18)", border: "1px solid rgba(250, 204, 21, 0.35)", transition: "transform 0.15s ease, box-shadow 0.15s ease, filter 0.15s ease" },
        modalActions: { display: 'flex', gap: '15px' },
        btnCancel: { flex: 1, background: 'transparent', border: '1px solid #3f3f46', color: 'white', padding: '15px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' },
        btnConfirm: { flex: 1, background: '#FACC15', border: 'none', color: 'black', padding: '15px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', textTransform: 'uppercase', boxShadow: '0 0 20px rgba(250, 204, 21, 0.2)' },
    };

    if (loading) return <div style={{...styles.page, display:'flex', justifyContent:'center', alignItems:'center'}}>Cargando...</div>;

    return (
        <div style={styles.page}>
            <style>{`input[type=number]::-webkit-inner-spin-button {-webkit-appearance: none; margin:0;}`}</style>

            {/* HEADER */}
            <div style={styles.topBar}>
                <div style={styles.headerTitle}>
                    <button onClick={() => navigate(-1)} style={{background:'none', border:'none', color:'white', cursor:'pointer'}}><ChevronLeft/></button>
                    {rutina?.nombre}
                </div>
                <div style={{display:'flex', alignItems:'center', gap:'20px'}}>
                    <Clock size={20} color="#71717a"/>
                    <button style={styles.finishBtn} onClick={handleTerminarClick}>TERMINAR</button>
                </div>
            </div>

            {/* BARRA SUPERIOR */}
            <div style={styles.statsBar}>
                <div style={styles.statItem}>
                    <span style={styles.statLabel}>DURACIÓN</span>
                    <span style={styles.statValueYellow}>{formatoTiempo(tiempo)} <Activity size={16}/></span>
                    <div style={styles.timerUnderline}></div>
                </div>
                <div style={styles.statItem}>
                    <span style={styles.statLabel}>VOLUMEN</span>
                    <span style={styles.statValue}>{calcularVolumenTotal()} <span style={{fontSize:'0.8rem', color:'#555', marginTop:'4px'}}>kg</span></span>
                </div>
                <div style={styles.statItem}>
                    <span style={styles.statLabel}>SERIES</span>
                    <span style={styles.statValue}>{Object.values(datosSesion).flat().filter(s => s.hecho).length}</span>
                </div>
            </div>

            {/* LISTA DE EJERCICIOS */}
            {rutina?.detalles?.map((ej) => {
                const exerciseId = ej.ejercicio.id;
                const sets = datosSesion[exerciseId] || [];
                const notaActual = notasSesion[exerciseId] || "";
                const editando = editandoNotaId === exerciseId;

                return (
                    <div key={ej.id} style={styles.card}>
                        <div style={styles.cardHeader}>
                            <div style={{display:'flex', gap:'20px', flex: 1}}>
                                <div style={styles.imgBox}>
                                    {ej.ejercicio.imagenUrl ? 
                                        <img src={ej.ejercicio.imagenUrl} style={{width:'100%', height:'100%', objectFit:'cover'}} alt="ejercicio" /> :
                                        <Activity color="#333"/>
                                    }
                                </div>
                                <div style={{flex:1}}>
                                    <div style={styles.exTitle}>{ej.ejercicio.nombre}</div>
                                    <div style={styles.noteWrapper}>
                                        {editando ? (
                                            <div>
                                                <textarea autoFocus placeholder="Escribe tus notas..." style={styles.noteInput} value={notaActual} onChange={(e) => guardarNotaEnEstado(exerciseId, e.target.value)} onBlur={finalizarEdicionNota} />
                                                <div style={styles.noteActions}><button style={styles.btnSaveNote} onMouseDown={finalizarEdicionNota}>GUARDAR</button></div>
                                            </div>
                                        ) : (
                                            <div onClick={() => setEditandoNotaId(exerciseId)}>
                                                {notaActual ? (<div style={styles.noteDisplay}><MessageSquare size={14} color="#FACC15"/>{notaActual}</div>) : (<div style={styles.notePlaceholder}><Plus size={14}/> Añadir nota...</div>)}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div style={{display:'flex', gap:'10px'}}>
                                <button style={styles.iconBtn} onClick={() => setInfoExercise(ej.ejercicio)}><Info size={18}/></button>
                                <button style={styles.iconBtn}><MoreHorizontal size={18}/></button>
                            </div>
                        </div>

                        {/* TABLA DE SERIES */}
                        <div>
                            <div style={styles.tableHeader}>
                                <div>SET</div>
                                <div>ANTERIOR</div>
                                <div>KG</div>
                                <div>REPS</div>
                                <div>RPE</div>
                                <div>LISTO</div>
                                <div></div>
                            </div>
                            
                            {sets.map((set, i) => {
                                // Recuperamos dato histórico para la columna gris
                                const datoAnterior = historialPrevio[exerciseId]?.[i]; 

                                return (
                                    <div key={i} style={styles.tableRow(set.hecho)}>
                                        <div style={{fontWeight:'bold', color: set.hecho ? '#FACC15' : 'white', textAlign:'center', fontSize:'1.1rem'}}>{i + 1}</div>
                                        
                                        {/* COLUMNA ANTERIOR */}
                                        <div style={{textAlign:'center', color:'#555', fontSize:'0.85rem', fontStyle:'italic'}}>
                                            {datoAnterior ? (
                                                <span>{datoAnterior.peso}kg x {datoAnterior.reps}</span>
                                            ) : ("--")}
                                        </div>
                                        
                                        {/* INPUTS PRE-LLENADOS (EDITABLES) */}
                                        <div style={{padding:'0 8px'}}>
                                            <input
                                                type="number"
                                                style={{...styles.input, color: set.hecho ? '#FACC15' : 'white', borderColor: set.hecho ? '#FACC15' : '#27272a'}}
                                                value={set.peso}
                                                onChange={(e) => updateSet(exerciseId, i, 'peso', e.target.value)}
                                            />
                                        </div>
                                        <div style={{padding:'0 8px'}}>
                                            <input type="number" style={styles.input} value={set.reps} onChange={(e) => updateSet(exerciseId, i, 'reps', e.target.value)} />
                                        </div>
                                        <div style={{padding:'0 8px'}}>
                                            <input type="number" style={{...styles.input, color: '#71717a'}} value={set.rpe} onChange={(e) => updateSet(exerciseId, i, 'rpe', e.target.value)} />
                                        </div>

                                        <div style={{display:'flex', justifyContent:'center'}}>
                                            <button style={styles.checkBtn(set.hecho)} onClick={() => toggleCheck(exerciseId, i)}>
                                                <Check size={20} strokeWidth={4}/>
                                            </button>
                                        </div>

                                        <div style={{display:'flex', justifyContent:'center'}}>
                                            {!set.hecho && (
                                                <button onClick={() => removeSet(exerciseId, i)} style={{background:'none', border:'none', color:'#333', cursor:'pointer'}}>
                                                    <Trash2 size={18}/>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <button style={styles.addSetBtn} onClick={() => addSet(exerciseId)}>
                            <Plus size={16}/> AÑADIR SERIE
                        </button>
                    </div>
                );
            })}

            {/* MODALES */}
            {infoExercise && (
                <div style={styles.modalOverlay} onClick={() => setInfoExercise(null)}>
                    <div style={styles.infoModalCard} onClick={e => e.stopPropagation()}>
                        <button style={styles.closeBtn} onClick={() => setInfoExercise(null)}><X size={20}/></button>
                        <div style={styles.modalTag}><Activity size={14}/> TÉCNICA</div>
                        <h2 style={styles.infoTitle}>{infoExercise.nombre}</h2>
                        <div style={styles.infoText}>{infoExercise.instrucciones || "No hay instrucciones detalladas."}</div>
                        {infoExercise.videoUrl && (
                            <a href={infoExercise.videoUrl} target="_blank" rel="noreferrer" style={styles.ytBtn}>
                                <Youtube size={24} color="black" /> VER VIDEO TUTORIAL
                            </a>
                        )}
                    </div>
                </div>
            )}

            {showFinishModal && (
                <div style={styles.modalOverlay}>
                    <div style={styles.finishModalCard}>
                        <div style={{display:'inline-block', background:'rgba(250, 204, 21, 0.1)', padding:'20px', borderRadius:'50%', marginBottom:'10px'}}>
                            <Trophy size={48} color="#FACC15" />
                        </div>
                        <h2 style={styles.finishTitle}>¡Sesión Completada!</h2>
                        <p style={styles.finishSub}>Gran trabajo hoy. Aquí tienes tu resumen:</p>
                        <div style={styles.statsGrid}>
                            <div style={styles.statItem}><span style={styles.statItemLabel}>Tiempo</span><span style={styles.statItemValue}>{formatoTiempo(tiempo)}</span></div>
                            <div style={styles.statItem}><span style={styles.statItemLabel}>Volumen</span><span style={styles.statItemValue}>{calcularVolumenTotal()}kg</span></div>
                            <div style={styles.statItem}><span style={styles.statItemLabel}>Series</span><span style={styles.statItemValue}>{Object.values(datosSesion).flat().filter(s => s.hecho).length}</span></div>
                        </div>
                        <div style={styles.modalActions}>
                            <button style={styles.btnCancel} onClick={cancelFinish}>SEGUIR ENTRENANDO</button>
                            <button style={styles.btnConfirm} onClick={confirmFinish}>
                                <Save size={18} style={{marginRight:8}}/> GUARDAR DATOS
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}