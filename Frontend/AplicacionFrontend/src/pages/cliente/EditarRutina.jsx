import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { obtenerRutinasCliente, obtenerEjercicios, actualizarRutina } from '../../api/endpoints';
import { 
    ChevronLeft, Save, Trash2, Plus, Search, Dumbbell, X, GripVertical, 
    CheckCircle2, AlertCircle, Loader2 
} from 'lucide-react';

// Categorías de músculos
const MUSCLE_FILTERS = ["TODOS", "PECHO", "ESPALDA", "PIERNA", "HOMBRO", "BÍCEPS", "TRÍCEPS", "ABDOMINALES", "CARDIO"];

const EditarRutina = () => {
    const { rutinaId } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    
    // Estado de la Rutina
    const [rutinaData, setRutinaData] = useState({ nombre: "", objetivo: "", nivel: "" });
    const [detalles, setDetalles] = useState([]);

    // Estado del Buscador
    const [allExercises, setAllExercises] = useState([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedMuscle, setSelectedMuscle] = useState("TODOS");

    // --- NUEVO: ESTADOS DE GUARDADO ---
    // 'idle' | 'saving' | 'success' | 'error'
    const [saveStatus, setSaveStatus] = useState('idle');
    const [errorMessage, setErrorMessage] = useState("");

    useEffect(() => {
        const loadData = async () => {
            const clienteId = localStorage.getItem("clienteId");
            const rutinas = await obtenerRutinasCliente(clienteId);
            const rutina = rutinas.find(r => r.id === rutinaId);
            
            if (rutina) {
                setRutinaData({
                    nombre: rutina.nombre,
                    objetivo: rutina.objetivo,
                    nivel: rutina.nivel
                });
                setDetalles(rutina.detalles || []);
            }

            const ejercicios = await obtenerEjercicios();
            setAllExercises(ejercicios);
            setLoading(false);
        };
        loadData();
    }, [rutinaId]);

    // --- ACCIONES ---
    const handleDetailChange = (index, field, value) => {
        const updated = [...detalles];
        updated[index] = { ...updated[index], [field]: value };
        setDetalles(updated);
    };

    const removeExercise = (index) => {
        const updated = detalles.filter((_, i) => i !== index);
        setDetalles(updated);
    };

    const addExerciseToRoutine = (ejercicio) => {
        const nuevoDetalle = {
            ejercicio: ejercicio,
            series: 3,
            repeticiones: 10,
            peso: 0,
            notas: ""
        };
        setDetalles([...detalles, nuevoDetalle]);
        setShowAddModal(false);
        setSearchTerm("");
        setSelectedMuscle("TODOS");
    };

    // --- FUNCIÓN DE GUARDADO MEJORADA ---
    const saveChanges = async () => {
        setSaveStatus('saving'); // Mostramos spinner
        setErrorMessage("");

        try {
            // Preparamos el payload limpio
            const payload = {
                ...rutinaData,
                detalles: detalles.map(d => ({
                    // Aseguramos que enviamos lo que el backend espera
                    ejercicio: d.ejercicio, 
                    series: parseInt(d.series) || 0,
                    repeticiones: parseInt(d.repeticiones) || 0,
                    peso: parseFloat(d.peso) || 0,
                    notas: d.notas || ""
                }))
            };

            console.log("Enviando actualización:", payload); // Para depurar
            await actualizarRutina(rutinaId, payload);
            
            // ÉXITO: Esperamos un poco para que el usuario vea el check y redirigimos
            setSaveStatus('success');
            
        } catch (error) {
            console.error("Error al guardar:", error);
            setSaveStatus('error');
            setErrorMessage("No se pudo conectar con el servidor o los datos son inválidos.");
        }
    };

    // Filtros
    const filteredExercises = allExercises.filter(ex => {
        const matchesText = ex.nombre.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesMuscle = selectedMuscle === "TODOS" || (ex.grupoMuscular && ex.grupoMuscular.toUpperCase() === selectedMuscle);
        return matchesText && matchesMuscle;
    });

    if (loading) return <div style={{background:'#09090b', height:'100vh', display:'flex', justifyContent:'center', alignItems:'center', color:'white'}}>Cargando...</div>;

    // --- ESTILOS ---
    const styles = {
        container: { minHeight: '100vh', background: '#09090b', color: 'white', fontFamily: 'sans-serif', paddingBottom:'100px' },
        
        header: { 
            position: 'sticky', top: 0, zIndex: 10, background: 'rgba(12, 12, 14, 0.95)', backdropFilter: 'blur(10px)',
            borderBottom: '1px solid #27272a', padding: '15px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        },
        backBtn: { background: 'transparent', border: '1px solid #3f3f46', color: '#a1a1aa', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize:'0.9rem', fontWeight:'600', padding:'8px 16px', borderRadius:'8px' },
        saveBtn: { background: '#FACC15', color: 'black', border: 'none', padding: '10px 24px', borderRadius: '8px', fontWeight: '800', cursor: 'pointer', display:'flex', alignItems:'center', gap:'8px', textTransform:'uppercase' },

        content: { maxWidth: '900px', margin: '40px auto', padding: '0 20px' },
        
        titleInput: { 
            background: 'transparent', border: 'none', borderBottom: '2px solid #27272a', color: 'white', 
            fontSize: '2.5rem', fontWeight: '900', textTransform: 'uppercase', width: '100%', marginBottom: '40px',
            outline: 'none', paddingBottom: '10px'
        },

        editCard: { 
            background: '#121214', border: '1px solid #27272a', borderRadius: '16px', padding: '25px', 
            marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '20px'
        },
        imgBox: { width: '70px', height: '70px', background: '#18181b', borderRadius: '8px', display:'flex', justifyContent:'center', alignItems:'center', border: '1px solid #27272a', overflow:'hidden', flexShrink: 0 },
        
        inputsGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' },
        miniLabel: { fontSize: '0.7rem', color: '#71717a', textTransform: 'uppercase', fontWeight: '700', marginBottom: '5px', display:'block' },
        miniInput: { background: '#09090b', border: '1px solid #3f3f46', color: 'white', padding: '10px', borderRadius: '6px', width: '100%', fontSize: '0.9rem', fontWeight: 'bold', outline:'none', textAlign:'center' },

        addBtn: { width: '100%', padding: '20px', background: 'transparent', border: '2px dashed #27272a', borderRadius: '16px', color: '#a1a1aa', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', fontSize: '1rem', fontWeight: '600', marginTop: '30px' },

        // --- MODAL GENERAl (Buscador y Status) ---
        modalOverlay: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)', zIndex: 100, display: 'flex', justifyContent: 'center', alignItems: 'center' },
        
        // Modal Buscador
        modalBox: { background: '#121214', width: '90%', maxWidth: '700px', height: '85vh', borderRadius: '20px', border: '1px solid #27272a', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 60px rgba(0,0,0,0.9)' },
        
        // Modal Status (Pequeño)
        statusModal: { background: '#121214', padding: '40px', borderRadius: '24px', border: '1px solid #27272a', textAlign: 'center', maxWidth: '400px', width: '90%', boxShadow: '0 25px 80px rgba(0,0,0,0.9)' },
        statusTitle: { fontSize: '1.5rem', fontWeight: '800', color: 'white', margin: '20px 0 10px 0' },
        statusText: { color: '#a1a1aa', marginBottom: '25px' },
        statusBtn: { background: '#FACC15', color: 'black', border: 'none', padding: '12px 30px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', width: '100%' },

        searchHeader: { padding: '20px', borderBottom: '1px solid #27272a', display:'flex', flexDirection:'column', gap:'15px' },
        searchRow: { display:'flex', gap:'10px', alignItems:'center' },
        searchInput: { flex: 1, background: '#09090b', border: '1px solid #3f3f46', padding: '12px 15px', borderRadius: '8px', color: 'white', fontSize:'1rem', outline:'none' },
        
        filterRow: { display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '5px', scrollbarWidth: 'none' },
        filterChip: (active) => ({
            padding: '6px 14px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer',
            background: active ? '#FACC15' : '#27272a',
            color: active ? 'black' : '#a1a1aa',
            border: active ? '1px solid #FACC15' : '1px solid #3f3f46',
            whiteSpace: 'nowrap', transition: 'all 0.2s'
        }),

        list: { flex: 1, overflowY: 'auto', padding: '10px' },
        listItem: { 
            padding: '12px', borderBottom: '1px solid #27272a', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer',
            transition: 'background 0.2s', borderRadius: '8px', margin: '5px 0'
        },
        itemImg: { width: '60px', height: '60px', borderRadius: '8px', objectFit: 'cover', background: '#27272a', border:'1px solid #3f3f46' },
        itemInfo: { flex: 1, marginLeft: '15px' },
        itemName: { fontWeight: '700', color: 'white', fontSize: '1rem', textTransform: 'uppercase' },
        itemMuscle: { fontSize: '0.75rem', color: '#FACC15', marginTop: '4px', background:'rgba(250,204,21,0.1)', width:'fit-content', padding:'2px 6px', borderRadius:'4px' }
    };

    return (
        <div style={styles.container}>
            <style>{`
                input[type=number]::-webkit-outer-spin-button,
                input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
                input[type=number] { -moz-appearance: textfield; }
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>

            <div style={styles.header}>
                <button style={styles.backBtn} onClick={() => navigate('/cliente/dashboard')}>
                    <ChevronLeft size={20}/> CANCELAR
                </button>
                <div style={{fontWeight:'bold', textTransform:'uppercase', color:'#71717a', letterSpacing:'1px'}}>Editor de Rutina</div>
                <button style={styles.saveBtn} onClick={saveChanges}>
                    <Save size={18}/> GUARDAR
                </button>
            </div>

            <div style={styles.content}>
                <input 
                    style={styles.titleInput} 
                    value={rutinaData.nombre} 
                    onChange={(e) => setRutinaData({...rutinaData, nombre: e.target.value})}
                    placeholder="NOMBRE DE LA RUTINA"
                />

                {detalles.map((detalle, index) => (
                    <div key={index} style={styles.editCard}>
                        <div style={{color:'#3f3f46'}}><GripVertical size={24}/></div>
                        
                        <div style={styles.imgBox}>
                            <img 
                                src={detalle.ejercicio?.imagenUrl || ""} 
                                alt="ex" 
                                style={{width:'100%', height:'100%', objectFit:'cover'}} 
                                onError={(e) => {e.target.style.display='none'}}
                            />
                            {!detalle.ejercicio?.imagenUrl && <Dumbbell color="#333"/>}
                        </div>

                        <div style={{flex: 1}}>
                            <div style={{fontSize:'1.1rem', fontWeight:'bold', color:'white', marginBottom:'15px', textTransform:'uppercase'}}>
                                {detalle.ejercicio?.nombre}
                            </div>
                            
                            <div style={styles.inputsGrid}>
                                <div>
                                    <label style={styles.miniLabel}>Series</label>
                                    <input type="number" style={styles.miniInput} value={detalle.series} onChange={(e) => handleDetailChange(index, 'series', e.target.value)} />
                                </div>
                                <div>
                                    <label style={styles.miniLabel}>Reps</label>
                                    <input type="number" style={styles.miniInput} value={detalle.repeticiones} onChange={(e) => handleDetailChange(index, 'repeticiones', e.target.value)} />
                                </div>
                                <div>
                                    <label style={styles.miniLabel}>Peso (kg)</label>
                                    <input type="number" style={{...styles.miniInput, color:'#FACC15', borderColor:'#FACC1530'}} value={detalle.peso} onChange={(e) => handleDetailChange(index, 'peso', e.target.value)} />
                                </div>
                            </div>
                        </div>

                        <button 
                            onClick={() => removeExercise(index)}
                            style={{background:'transparent', border:'none', color:'#3f3f46', cursor:'pointer', padding:'10px'}}
                            onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                            onMouseLeave={e => e.currentTarget.style.color = '#3f3f46'}
                        >
                            <Trash2 size={20}/>
                        </button>
                    </div>
                ))}

                <button 
                    style={styles.addBtn} 
                    onClick={() => setShowAddModal(true)}
                    onMouseEnter={e => {e.currentTarget.style.borderColor = '#FACC15'; e.currentTarget.style.color = '#FACC15'}}
                    onMouseLeave={e => {e.currentTarget.style.borderColor = '#27272a'; e.currentTarget.style.color = '#a1a1aa'}}
                >
                    <Plus size={20}/> AÑADIR EJERCICIO
                </button>
            </div>

            {/* --- MODAL DE STATUS (Guardando / Éxito / Error) --- */}
            {saveStatus !== 'idle' && (
                <div style={styles.modalOverlay}>
                    <div style={styles.statusModal}>
                        {saveStatus === 'saving' && (
                            <>
                                <Loader2 size={48} className="animate-spin" color="#FACC15" style={{margin:'0 auto'}}/>
                                <h3 style={styles.statusTitle}>Guardando cambios...</h3>
                                <p style={styles.statusText}>Actualizando tu rutina en la nube.</p>
                            </>
                        )}

                        {saveStatus === 'success' && (
                            <>
                                <div style={{background:'rgba(250,204,21,0.1)', padding:'15px', borderRadius:'50%', display:'inline-block'}}>
                                    <CheckCircle2 size={48} color="#FACC15"/>
                                </div>
                                <h3 style={styles.statusTitle}>¡Rutina Actualizada!</h3>
                                <p style={styles.statusText}>Los cambios se han guardado correctamente.</p>
                                <button style={styles.statusBtn} onClick={() => navigate('/cliente/dashboard')}>
                                    VOLVER AL DASHBOARD
                                </button>
                            </>
                        )}

                        {saveStatus === 'error' && (
                            <>
                                <div style={{background:'rgba(239,68,68,0.1)', padding:'15px', borderRadius:'50%', display:'inline-block'}}>
                                    <AlertCircle size={48} color="#ef4444"/>
                                </div>
                                <h3 style={styles.statusTitle}>Error al Guardar</h3>
                                <p style={{...styles.statusText, color:'#ef4444'}}>{errorMessage || "Hubo un problema de conexión."}</p>
                                <div style={{display:'flex', gap:'10px'}}>
                                    <button style={{...styles.statusBtn, background:'#333', color:'white'}} onClick={() => setSaveStatus('idle')}>
                                        CANCELAR
                                    </button>
                                    <button style={styles.statusBtn} onClick={saveChanges}>
                                        REINTENTAR
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* --- MODAL BUSCADOR --- */}
            {showAddModal && (
                <div style={styles.modalOverlay} onClick={() => setShowAddModal(false)}>
                    <div style={styles.modalBox} onClick={e => e.stopPropagation()}>
                        
                        <div style={styles.searchHeader}>
                            <div style={styles.searchRow}>
                                <div style={{position:'relative', flex:1, display:'flex', alignItems:'center'}}>
                                    <Search color="#71717a" size={18} style={{position:'absolute', left:12}}/>
                                    <input 
                                        style={{...styles.searchInput, paddingLeft:'40px'}} 
                                        placeholder="Buscar por nombre..." 
                                        autoFocus
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                                <button onClick={() => setShowAddModal(false)} style={{background:'#27272a', border:'none', borderRadius:'8px', padding:'10px', color:'white', cursor:'pointer'}}><X size={20}/></button>
                            </div>

                            <div className="no-scrollbar" style={styles.filterRow}>
                                {MUSCLE_FILTERS.map(muscle => (
                                    <div 
                                        key={muscle}
                                        style={styles.filterChip(selectedMuscle === muscle)}
                                        onClick={() => setSelectedMuscle(muscle)}
                                    >
                                        {muscle}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div style={styles.list}>
                            {filteredExercises.map(ex => (
                                <div 
                                    key={ex.id} 
                                    style={styles.listItem}
                                    onClick={() => addExerciseToRoutine(ex)}
                                    onMouseEnter={e => e.currentTarget.style.background = '#18181b'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                >
                                    <div style={{display:'flex', alignItems:'center'}}>
                                        <img 
                                            src={ex.imagenUrl || "https://via.placeholder.com/60"} 
                                            alt={ex.nombre}
                                            style={styles.itemImg}
                                            onError={(e) => {e.target.src = "https://via.placeholder.com/60?text=IMG"}} 
                                        />
                                        
                                        <div style={styles.itemInfo}>
                                            <div style={styles.itemName}>{ex.nombre}</div>
                                            <div style={{display:'flex', gap:'10px', marginTop:'4px'}}>
                                                <span style={styles.itemMuscle}>{ex.grupoMuscular || "General"}</span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div style={{background:'#FACC15', borderRadius:'50%', padding:'5px'}}>
                                        <Plus size={16} color="black" strokeWidth={3}/>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default EditarRutina;