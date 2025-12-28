import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { obtenerRutinasCliente } from '../../api/endpoints';

// Iconos
import { 
    ChevronDown, Check, Plus, MoreHorizontal, Clock, Trash2, Info, X, Youtube, 
    Activity, Dumbbell, Play, Pause, Trophy, Save 
} from 'lucide-react';

const SesionEntrenamiento = () => {
    const { rutinaId } = useParams();
    const navigate = useNavigate();
    
    const [rutina, setRutina] = useState(null);
    const [loading, setLoading] = useState(true);
    
    // --- ESTADOS DEL CRONÓMETRO ---
    const [seconds, setSeconds] = useState(0);
    const [isTimerRunning, setIsTimerRunning] = useState(true);

    const [progress, setProgress] = useState({});
    
    // Estados para Modales
    const [infoExercise, setInfoExercise] = useState(null);
    const [showFinishModal, setShowFinishModal] = useState(false); // <--- NUEVO ESTADO PARA EL MODAL DE FINALIZAR

    // --- CARGA DE DATOS ---
    useEffect(() => {
        const fetchRutina = async () => {
            const clienteId = localStorage.getItem("clienteId");
            const todas = await obtenerRutinasCliente(clienteId);
            const encontrada = todas.find(r => r.id === rutinaId);
            setRutina(encontrada);
            
            const initialProgress = {};
            if(encontrada && encontrada.detalles) {
                encontrada.detalles.forEach((detalle, dIndex) => {
                    initialProgress[dIndex] = [];
                    for(let i=0; i < detalle.series; i++) {
                        initialProgress[dIndex].push({ 
                            kg: detalle.peso || 0, 
                            reps: detalle.repeticiones || 0,
                            rpe: 8, 
                            done: false 
                        });
                    }
                });
            }
            setProgress(initialProgress);
            setLoading(false);
        };
        fetchRutina();
    }, [rutinaId]);

    // --- TIMER LOGIC ---
    useEffect(() => {
        let interval = null;
        if (isTimerRunning) {
            interval = setInterval(() => setSeconds(s => s + 1), 1000);
        } else {
            clearInterval(interval);
        }
        return () => clearInterval(interval);
    }, [isTimerRunning]);

    const toggleTimer = () => setIsTimerRunning(!isTimerRunning);

    const formatTime = (secs) => {
        const h = Math.floor(secs / 3600);
        const m = Math.floor((secs % 3600) / 60);
        const s = secs % 60;
        if (h > 0) return `${h}h ${m}min`;
        return `${m}min ${s}s`; 
    };

    // --- STATS ---
    const getStats = () => {
        let totalSets = 0;
        let totalVolume = 0;
        Object.values(progress).forEach(exerciseSets => {
            exerciseSets.forEach(set => {
                if(set.done) {
                    totalSets++;
                    totalVolume += (parseFloat(set.kg) || 0) * (parseFloat(set.reps) || 0);
                }
            });
        });
        return { totalSets, totalVolume };
    };
    const { totalSets, totalVolume } = getStats();

    // --- HANDLERS ---
    const handleInputChange = (exIndex, setIndex, field, value) => {
        const newProgress = {...progress};
        newProgress[exIndex][setIndex][field] = value;
        setProgress(newProgress);
    };

    const toggleSet = (exIndex, setIndex) => {
        const newProgress = {...progress};
        newProgress[exIndex][setIndex].done = !newProgress[exIndex][setIndex].done;
        setProgress(newProgress);
    };

    const addSet = (exIndex) => {
        const newProgress = {...progress};
        const previousSet = newProgress[exIndex][newProgress[exIndex].length - 1];
        newProgress[exIndex].push({
            kg: previousSet ? previousSet.kg : 0,
            reps: previousSet ? previousSet.reps : 0,
            rpe: previousSet ? previousSet.rpe : 8,
            done: false
        });
        setProgress(newProgress);
    };

    const removeSet = (exIndex, setIndex) => {
        const newProgress = {...progress};
        if (newProgress[exIndex].length <= 1) {
            // Confirmación suave si es la única (opcional)
            // if(!window.confirm("...")) return; 
        }
        newProgress[exIndex].splice(setIndex, 1);
        setProgress(newProgress);
    };

    // --- NUEVOS HANDLERS PARA EL FINAL ---
    const handleTerminarClick = () => {
        setIsTimerRunning(false); // Pausamos el tiempo al abrir el modal
        setShowFinishModal(true);
    };

    const confirmFinish = () => {
        // Aquí iría la lógica para guardar en Base de Datos
        console.log("Guardando entreno:", { duration: seconds, volume: totalVolume, sets: totalSets });
        navigate("/cliente/dashboard");
    };

    const cancelFinish = () => {
        setShowFinishModal(false);
        setIsTimerRunning(true); // Reanudamos el tiempo
    };

    if (loading) return <div style={{background:'#09090b', height:'100vh', display:'flex', justifyContent:'center', alignItems:'center', color:'white'}}>CARGANDO...</div>;

    // --- ESTILOS ---
    const styles = {
        container: { 
            minHeight: '100vh', 
            background: 'radial-gradient(circle at 50% 0%, #1c1c1e 0%, #000000 100%)', 
            color: 'white', fontFamily: 'sans-serif', paddingBottom:'100px',
            position: 'relative'
        },
        
        // Header
        stickyHeader: {
            position: 'sticky', top: 0, zIndex: 50,
            background: 'rgba(9, 9, 11, 0.85)', backdropFilter: 'blur(20px)',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            boxShadow: '0 4px 30px rgba(0,0,0,0.5)'
        },
        topRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 25px' },
        headerTitle: { fontSize: '1.1rem', fontWeight: '800', display:'flex', alignItems:'center', gap:'10px', color: 'white', textTransform: 'uppercase', letterSpacing: '1px', cursor: 'default' },
        finishBtn: { background: 'linear-gradient(135deg, #FACC15 0%, #d4ac0d 100%)', color: 'black', border: 'none', padding: '10px 24px', borderRadius: '8px', fontWeight: '800', fontSize: '0.85rem', cursor: 'pointer', boxShadow: '0 0 15px rgba(250, 204, 21, 0.15)', textTransform: 'uppercase', letterSpacing: '0.5px', transition: 'all 0.2s' },

        // Stats
        statsRow: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 0.5fr', padding: '5px 25px 20px 25px', gap: '20px', alignItems: 'start' },
        statBox: { display:'flex', flexDirection:'column', gap:'2px' },
        statLabel: { color: '#71717a', fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing:'0.5px' },
        statValue: { fontSize: '1.5rem', fontWeight: '900', color: 'white', fontFamily: 'monospace', letterSpacing:'-1px' },
        statValueTime: { fontSize: '1.5rem', fontWeight: '900', color: '#FACC15', fontFamily: 'monospace', letterSpacing:'-1px', cursor: 'pointer', display:'flex', alignItems:'center', gap:'8px', textShadow: '0 0 20px rgba(250, 204, 21, 0.3)' }, 
        bodyIcon: { opacity: 0.2, display:'flex', justifyContent:'center', alignItems:'center', height:'100%' },

        progressBarContainer: { height: '3px', width: '100%', background: '#27272a', position: 'absolute', bottom: 0 },
        progressBarFill: { height: '100%', background: '#FACC15', width: `${(totalSets / (rutina.detalles.length * 3)) * 100}%`, transition: 'width 0.5s ease', boxShadow: '0 0 10px #FACC15' },

        content: { maxWidth: '1000px', margin: '40px auto', padding: '0 20px' },

        // Cards
        card: { background: '#121214', border: '1px solid #27272a', borderRadius: '16px', marginBottom: '40px', overflow: 'hidden', boxShadow: '0 10px 40px -10px rgba(0,0,0,0.5)' },
        cardHeader: { padding: '25px', background: 'linear-gradient(to bottom, #18181b, #121214)', borderBottom: '1px solid #27272a', display: 'flex', alignItems: 'center', gap: '20px' },
        exImg: { width: '60px', height: '60px', borderRadius: '10px', background: '#27272a', objectFit: 'cover', padding:'4px', border: '1px solid #3f3f46' },
        exName: { fontSize: '1.3rem', fontWeight: '800', color: '#FACC15', margin:0, textTransform:'uppercase' },
        exSub: { color: '#a1a1aa', fontSize: '0.9rem', marginTop:'4px' },
        iconBtn: { background:'rgba(255,255,255,0.05)', border:'none', width:'36px', height:'36px', borderRadius:'8px', cursor:'pointer', color:'#a1a1aa', display:'flex', alignItems:'center', justifyContent:'center', transition: 'all 0.2s' },

        // Table
        tableHeader: { display: 'grid', gridTemplateColumns: '0.5fr 1.5fr 1fr 1fr 1fr 0.5fr 0.3fr', padding: '15px 0', color: '#52525b', fontSize: '0.7rem', fontWeight: '800', textTransform: 'uppercase', textAlign: 'center', letterSpacing: '1px', marginBottom: '5px' },
        row: (done) => ({ display: 'grid', gridTemplateColumns: '0.5fr 1.5fr 1fr 1fr 1fr 0.5fr 0.3fr', padding: '12px 0', alignItems: 'center', textAlign: 'center', background: done ? 'rgba(250, 204, 21, 0.04)' : 'transparent', marginBottom: '4px', borderRadius: '8px', border: done ? '1px solid rgba(250, 204, 21, 0.15)' : '1px solid transparent', transition: 'all 0.3s ease' }),

        input: { background: '#09090b', border: '1px solid #27272a', color: 'white', textAlign: 'center', padding: '12px', borderRadius: '8px', width: '100%', fontSize: '1.1rem', fontWeight: '700', outline: 'none', fontFamily: 'monospace', transition: 'border-color 0.2s, box-shadow 0.2s' },
        checkBtn: (done) => ({ width: '40px', height: '40px', borderRadius: '10px', border: 'none', background: done ? '#FACC15' : '#27272a', color: done ? 'black' : '#52525b', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)', margin: '0 auto', transform: done ? 'scale(1.05)' : 'scale(1)', boxShadow: done ? '0 0 15px rgba(250, 204, 21, 0.4)' : 'none' }),
        trashBtn: { background: 'transparent', border: 'none', color: '#3f3f46', cursor: 'pointer', display: 'flex', justifyContent: 'center', transition: 'color 0.2s' },
        addBtn: { width: '100%', padding: '18px', background: 'transparent', border: 'none', borderTop:'1px solid #27272a', color: '#a1a1aa', fontWeight: '700', marginTop: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.85rem', textTransform:'uppercase', letterSpacing:'1px', transition: 'all 0.2s' },

        // --- ESTILOS DEL MODAL GENERAL ---
        modalOverlay: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' },
        
        // --- ESTILOS ESPECÍFICOS MODAL FINALIZAR ---
        finishModalCard: { background: '#121212', borderRadius: '30px', width: '90%', maxWidth: '450px', padding: '40px', textAlign: 'center', border: '1px solid #27272a', boxShadow: '0 25px 80px rgba(0,0,0,0.9)' },
        finishTitle: { fontSize: '2rem', fontWeight: '900', color: 'white', margin: '20px 0 10px 0', textTransform: 'uppercase' },
        finishSub: { color: '#a1a1aa', fontSize: '1rem', marginBottom: '30px' },
        
        statsGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '35px', background: '#18181b', padding: '20px', borderRadius: '16px', border: '1px solid #27272a' },
        statItem: { display: 'flex', flexDirection: 'column' },
        statItemLabel: { fontSize: '0.7rem', color: '#71717a', fontWeight: '700', textTransform: 'uppercase' },
        statItemValue: { fontSize: '1.2rem', color: '#FACC15', fontWeight: '900', marginTop: '5px' },

        modalActions: { display: 'flex', gap: '15px' },
        btnCancel: { flex: 1, background: 'transparent', border: '1px solid #3f3f46', color: 'white', padding: '15px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' },
        btnConfirm: { flex: 1, background: '#FACC15', border: 'none', color: 'black', padding: '15px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', textTransform: 'uppercase', boxShadow: '0 0 20px rgba(250, 204, 21, 0.2)' },

        // --- ESTILOS MODAL INFO ---
        infoModalCard: { background: '#121212', borderRadius: '24px', width: '90%', maxWidth: '550px', padding: '40px', position: 'relative', border: '1px solid #333', boxShadow: '0 25px 60px rgba(0,0,0,0.8)' },
        modalTag: { display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(250, 204, 21, 0.1)', color: '#FACC15', padding: '6px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', marginBottom: '15px', letterSpacing: '1px' },
        infoTitle: { fontSize: '2rem', fontWeight: '900', color: 'white', marginBottom: '20px', lineHeight: 1, textTransform: 'uppercase' },
        infoText: { color: '#a1a1aa', fontSize: '1rem', lineHeight: 1.7, marginBottom: '30px' },
        closeBtn: { position: 'absolute', top: '25px', right: '25px', background: '#1f1f22', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer', transition: 'background 0.2s' },
        ytBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', background: '#CC0000', color: 'white', textDecoration: 'none', padding: '16px', borderRadius: '12px', fontWeight: '800', fontSize: '1rem', width: '100%', textTransform: 'uppercase', letterSpacing: '0.5px', boxShadow: '0 4px 15px rgba(204, 0, 0, 0.3)', transition: 'transform 0.2s' }
    };

    return (
        <div style={styles.container}>
            <style>{`
                input[type=number]::-webkit-outer-spin-button,
                input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
                input[type=number] { -moz-appearance: textfield; }
                ::selection { background: rgba(250, 204, 21, 0.3); color: white; }
            `}</style>

            {/* HEADER */}
            <div style={styles.stickyHeader}>
                <div style={styles.topRow}>
                    <div style={styles.headerTitle}>
                        <ChevronDown size={20} color="#71717a"/> {rutina?.nombre || "ENTRENO"}
                    </div>
                    <div style={{display:'flex', alignItems:'center', gap:'20px'}}>
                        <Clock size={20} color="#52525b" />
                        <button 
                            style={styles.finishBtn} 
                            onClick={handleTerminarClick} // Cambiado a nueva función
                            onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.1)'}
                            onMouseLeave={e => e.currentTarget.style.filter = 'brightness(1)'}
                        >
                            Terminar
                        </button>
                    </div>
                </div>
                
                <div style={styles.statsRow}>
                    <div style={styles.statBox}>
                        <span style={styles.statLabel}>Duración</span>
                        <div style={styles.statValueTime} onClick={toggleTimer} title={isTimerRunning ? "Pausar" : "Reanudar"}>
                            {formatTime(seconds)} 
                            {isTimerRunning ? <Activity size={18} className="animate-pulse"/> : <Play size={18} fill="#FACC15"/>}
                        </div>
                    </div>
                    <div style={styles.statBox}>
                        <span style={styles.statLabel}>Volumen</span>
                        <span style={styles.statValue}>{totalVolume} <span style={{fontSize:'0.9rem', color:'#52525b'}}>kg</span></span>
                    </div>
                    <div style={styles.statBox}>
                        <span style={styles.statLabel}>Series</span>
                        <span style={styles.statValue}>{totalSets}</span>
                    </div>
                    <div style={styles.bodyIcon}><Activity size={32} color="#27272a" /></div>
                </div>
                
                <div style={styles.progressBarContainer}>
                    <div style={styles.progressBarFill}></div>
                </div>
            </div>

            {/* CONTENIDO */}
            <div style={styles.content}>
                {rutina?.detalles?.map((detalle, exIndex) => (
                    <div key={exIndex} style={styles.card}>
                        <div style={styles.cardHeader}>
                            <img src={detalle.ejercicio?.imagenUrl || "https://via.placeholder.com/64"} alt="icono" style={styles.exImg} />
                            <div style={{flex: 1}}>
                                <div style={styles.exName}>{detalle.ejercicio?.nombre}</div>
                                <div style={styles.exSub}>Añadir nota...</div>
                            </div>
                            <div style={{display:'flex', gap:'10px'}}>
                                <button style={styles.iconBtn} onClick={() => setInfoExercise(detalle.ejercicio)} title="Técnica"><Info size={20}/></button>
                                <button style={styles.iconBtn}><MoreHorizontal size={20}/></button>
                            </div>
                        </div>

                        <div>
                            <div style={styles.tableHeader}>
                                <span>SET</span><span>ANTERIOR</span><span>KG</span><span>REPS</span><span>RPE</span><span>LISTO</span><span></span>
                            </div>
                            {progress[exIndex] && progress[exIndex].map((serie, sIndex) => (
                                <div key={sIndex} style={styles.row(serie.done)}>
                                    <div style={{fontWeight:'900', color: serie.done ? '#FACC15' : '#3f3f46', fontSize:'1.1rem'}}>{sIndex + 1}</div>
                                    <div style={{color:'#3f3f46', fontSize:'0.9rem', fontFamily:'monospace'}}>--</div>
                                    <div style={{padding:'0 8px'}}><input type="number" style={styles.input} value={serie.kg} onChange={(e) => handleInputChange(exIndex, sIndex, 'kg', e.target.value)} onFocus={(e) => e.target.select()} onBlur={(e) => e.target.style.borderColor='#27272a'} /></div>
                                    <div style={{padding:'0 8px'}}><input type="number" style={styles.input} value={serie.reps} onChange={(e) => handleInputChange(exIndex, sIndex, 'reps', e.target.value)} onFocus={(e) => e.target.select()} onBlur={(e) => e.target.style.borderColor='#27272a'} /></div>
                                    <div style={{padding:'0 8px'}}><input type="number" style={{...styles.input, color: '#FACC15', borderColor: '#27272a'}} value={serie.rpe} onChange={(e) => handleInputChange(exIndex, sIndex, 'rpe', e.target.value)} onFocus={(e) => e.target.select()} placeholder="-" /></div>
                                    <div><button style={styles.checkBtn(serie.done)} onClick={() => toggleSet(exIndex, sIndex)}><Check size={22} strokeWidth={4}/></button></div>
                                    <div><button style={styles.trashBtn} onClick={() => removeSet(exIndex, sIndex)}><Trash2 size={18}/></button></div>
                                </div>
                            ))}
                        </div>
                        <button style={styles.addBtn} onClick={() => addSet(exIndex)}><Plus size={16}/> AÑADIR SERIE</button>
                    </div>
                ))}
            </div>

            {/* --- MODAL 1: INFORMACIÓN TÉCNICA --- */}
            {infoExercise && (
                <div style={styles.modalOverlay} onClick={() => setInfoExercise(null)}>
                    <div style={styles.infoModalCard} onClick={e => e.stopPropagation()}>
                        <button style={styles.closeBtn} onClick={() => setInfoExercise(null)}><X size={20}/></button>
                        <div style={styles.modalTag}><Dumbbell size={14}/> TÉCNICA</div>
                        <h2 style={styles.infoTitle}>{infoExercise.nombre}</h2>
                        <div style={styles.infoText}>{infoExercise.instrucciones || "No hay instrucciones detalladas."}</div>
                        {infoExercise.videoUrl && (
                            <a href={infoExercise.videoUrl} target="_blank" rel="noreferrer" style={styles.ytBtn}>
                                <Youtube size={24} fill="white"/> VER VIDEO TUTORIAL
                            </a>
                        )}
                    </div>
                </div>
            )}

            {/* --- MODAL 2: FINALIZAR ENTRENAMIENTO (REEMPLAZA AL ALERT) --- */}
            {showFinishModal && (
                <div style={styles.modalOverlay}>
                    <div style={styles.finishModalCard}>
                        <div style={{display:'inline-block', background:'rgba(250, 204, 21, 0.1)', padding:'20px', borderRadius:'50%', marginBottom:'10px'}}>
                            <Trophy size={48} color="#FACC15" />
                        </div>
                        
                        <h2 style={styles.finishTitle}>¡Sesión Completada!</h2>
                        <p style={styles.finishSub}>Gran trabajo hoy. Aquí tienes tu resumen:</p>

                        <div style={styles.statsGrid}>
                            <div style={styles.statItem}>
                                <span style={styles.statItemLabel}>Tiempo</span>
                                <span style={styles.statItemValue}>{formatTime(seconds)}</span>
                            </div>
                            <div style={styles.statItem}>
                                <span style={styles.statItemLabel}>Volumen</span>
                                <span style={styles.statItemValue}>{totalVolume}kg</span>
                            </div>
                            <div style={styles.statItem}>
                                <span style={styles.statItemLabel}>Series</span>
                                <span style={styles.statItemValue}>{totalSets}</span>
                            </div>
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
};

export default SesionEntrenamiento; 