import React, { useState, useEffect } from 'react';
import { 
    format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, 
    eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths 
} from 'date-fns';
import { es } from 'date-fns/locale';
import { 
    ChevronLeft, ChevronRight, Trash2, Dumbbell, Check, X, 
    Clock, Activity, ArrowLeft, AlertCircle, AlertTriangle, Plus, PlusCircle
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom'; 
import { 
    obtenerEventosCalendario, programarRutina, eliminarEventoCalendario, 
    obtenerRutinasCliente, obtenerRutinasAsignadasPorEntrenador, 
    toggleCompletadoEvento, moverEventoCalendario 
} from '../../api/endpoints';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';


import ModalResultados from '../../components/functional/ModalResultados';

export default function CalendarioCliente({ clienteIdProp, isCoachMode = false }) {
    const navigate = useNavigate();
    const params = useParams(); 
    const toast = useToast();
    const { userId } = useAuth();
    
    // ✅ LÓGICA INTELIGENTE DE MODO ENTRENADOR
    const idDeLaUrl = params.id || params.clienteId; 
    const clienteId = clienteIdProp || idDeLaUrl || userId;
    const modoEntrenador = isCoachMode || !!idDeLaUrl;

    const [currentDate, setCurrentDate] = useState(new Date());
    const [eventos, setEventos] = useState([]);
    const [rutinas, setRutinas] = useState([]);
    const [hoveredDate, setHoveredDate] = useState(null); 
    
    // Modales y selección
    const [showModal, setShowModal] = useState(false);
    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedRutina, setSelectedRutina] = useState("");
    
    // 🔥 ESTADOS DEL PANEL LATERAL RESTAURADOS
    const [showResultadosModal, setShowResultadosModal] = useState(false);
    const [selectedEventoId, setSelectedEventoId] = useState(null);
    
    // Drag & Drop
    const [draggedEventId, setDraggedEventId] = useState(null);

    // Modal Borrado
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [eventToDelete, setEventToDelete] = useState(null);

    useEffect(() => {
        if (!clienteId) return;
        cargarEventos();
        
        if (modoEntrenador) {
            obtenerRutinasAsignadasPorEntrenador(clienteId, userId).then(data => setRutinas(data || []));
        } else {
            obtenerRutinasCliente(clienteId).then(data => setRutinas(data || []));
        }
    }, [currentDate, clienteId, modoEntrenador, userId]);

    const cargarEventos = async () => {
        const start = format(startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 }), 'yyyy-MM-dd');
        const end = format(endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 }), 'yyyy-MM-dd');
        
        const idFiltroEntrenador = modoEntrenador ? userId : null;
        const data = await obtenerEventosCalendario(clienteId, start, end, idFiltroEntrenador);
        
        setEventos(data);
    };

    const rutinasDisponibles = rutinas; 

    // --- DRAG & DROP ---
    const handleDragStart = (e, eventoId) => {
        setDraggedEventId(eventoId);
        e.dataTransfer.effectAllowed = "move";
        e.target.style.opacity = '0.5';
    };
    const handleDragEnd = (e) => {
        e.target.style.opacity = '1';
        setDraggedEventId(null);
    };
    const handleDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; };
    const handleDrop = async (e, fechaDestino) => {
        e.preventDefault();
        const fechaStr = format(fechaDestino, 'yyyy-MM-dd');
        if (!draggedEventId) return;

        const eventosTemp = eventos.map(ev => ev.id === draggedEventId ? { ...ev, fecha: fechaStr } : ev);
        setEventos(eventosTemp);

        try {
            await moverEventoCalendario(draggedEventId, fechaStr);
            toast.success("Evento reagendado");
            cargarEventos(); 
        } catch (error) {
            toast.error("Error al mover");
            cargarEventos(); 
        }
    };

    // --- ACCIONES PRINCIPALES ---
    const handleDayClick = (day) => {
        setSelectedDate(day);
        setSelectedRutina(""); 
        setShowModal(true);
    };

    const handleGuardarEvento = async () => {
        if (!selectedRutina) return toast.error("Selecciona una rutina");
        try {
            const fechaStr = format(selectedDate, 'yyyy-MM-dd');
            const idEntrenador = modoEntrenador ? userId : undefined;
            
            await programarRutina(clienteId, selectedRutina, fechaStr, idEntrenador);
            
            toast.success(modoEntrenador ? "Rutina asignada" : "Rutina programada");
            setShowModal(false);
            cargarEventos(); 
        } catch (error) {
            toast.error("Error al programar");
        }
    };

    const handleRutinaRapida = async (rutinaId) => {
        setSelectedRutina(rutinaId);
        try {
            const fechaStr = format(selectedDate, 'yyyy-MM-dd');
            const idEntrenador = modoEntrenador ? userId : undefined;
            
            await programarRutina(clienteId, rutinaId, fechaStr, idEntrenador);
            
            toast.success("¡Añadido al calendario!");
            setShowModal(false);
            cargarEventos(); 
        } catch (error) {
            toast.error("Error al programar");
        }
    };

    const handleBorrarClick = (eventoId, e) => {
        e.stopPropagation(); 
        setEventToDelete(eventoId);
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (!eventToDelete) return;
        try {
            await eliminarEventoCalendario(eventToDelete);
            toast.success("Evento eliminado");
            cargarEventos();
        } catch (error) {
            toast.error("Error al eliminar");
        } finally {
            setShowDeleteModal(false);
            setEventToDelete(null);
        }
    };

    const handleToggleCompletado = async (eventoId, e) => {
        e.stopPropagation(); 
        try {
            await toggleCompletadoEvento(eventoId);
            cargarEventos(); 
        } catch (error) {
            console.error(error);
        }
    };

    // 🔥 LA MAGIA RESTAURADA: ABRE EL PANEL LATERAL 🔥
    const irAEntrenar = (rutinaId, eventoId) => {
        if (modoEntrenador) {
            const ev = eventos.find(e => e.id === eventoId);
            if (ev && ev.estado === 'COMPLETADO') {
                setSelectedEventoId(eventoId);
                setShowResultadosModal(true); // Abre el panel derecho
            } else {
                navigate(`/entrenador/cliente/${clienteId}/editar-rutina/${rutinaId}`);
            }
            return;
        }
       
        navigate(`/cliente/sesion/${rutinaId}`, { state: { eventoId: eventoId } });
    };

    const formatDuracion = (seg) => {
        if(!seg) return '';
        const min = Math.floor(seg / 60);
        return `${min} min`;
    };

    // --- ESTILOS PREMIUM ---
    const styles = {
        page: { padding: '30px 40px', color: 'white', minHeight: '100vh', background: modoEntrenador ? '#000000' : '#050505', fontFamily: "'Inter', sans-serif" },
        header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' },
        title: { fontSize: '2rem', fontWeight: 900, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '15px', letterSpacing: '-0.5px' },
        navBtn: { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: 'white', cursor: 'pointer', padding: '10px', display: 'flex', alignItems: 'center', transition: 'all 0.2s' },
        grid: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '12px' },
        dayHeader: { textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', fontWeight: 800, padding: '10px 0', letterSpacing: '1px' },
        
        // Celda del día interactiva
        dayCell: (isSameMonth, isToday, isHovered) => ({
            background: isSameMonth ? (isHovered ? 'rgba(250, 204, 21, 0.03)' : 'linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)') : 'transparent', 
            border: isToday ? '2px solid rgba(250, 204, 21, 0.5)' : (isHovered ? '1px solid rgba(250, 204, 21, 0.3)' : '1px solid rgba(255,255,255,0.05)'), 
            borderRadius: '16px', minHeight: '140px', padding: '12px', cursor: 'pointer', opacity: isSameMonth ? 1 : 0.2,
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)', position: 'relative', overflow: 'hidden'
        }),
        dateNum: (isToday, isHovered) => ({
            fontSize: '1rem', fontWeight: 900, color: isToday ? '#FACC15' : (isHovered ? 'white' : 'rgba(255,255,255,0.5)'), marginBottom: '10px', pointerEvents: 'none', transition: 'color 0.2s'
        }),
        
        // Botón flotante al hacer hover
        addHoverBtn: {
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            background: 'rgba(250, 204, 21, 0.9)', color: 'black', padding: '8px 16px', borderRadius: '20px',
            fontSize: '0.8rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px',
            boxShadow: '0 4px 15px rgba(250, 204, 21, 0.3)', pointerEvents: 'none', animation: 'fadeIn 0.2s ease-out'
        },

        eventBadge: (estado) => {
            let bg, color, border;
            switch(estado) {
                case 'COMPLETADO': bg = 'rgba(34, 197, 94, 0.1)'; color = '#4ade80'; border = '1px solid rgba(34, 197, 94, 0.3)'; break;
                case 'SALTADO': bg = 'rgba(239, 68, 68, 0.1)'; color = '#ef4444'; border = '1px solid rgba(239, 68, 68, 0.3)'; break;
                default: bg = 'rgba(255,255,255,0.05)'; color = 'white'; border = '1px solid rgba(255,255,255,0.1)'; 
            }
            return {
                background: bg, color: color, border: border, fontSize: '0.8rem', fontWeight: 700, padding: '10px', borderRadius: '10px', marginBottom: '8px', cursor: 'grab', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', userSelect: 'none', zIndex: 2, position: 'relative'
            };
        },
        
        // Estilos Modal Inteligente
        modalOverlay: { position: 'fixed', inset:0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
        modalCard: { background: '#09090b', padding: '40px', borderRadius: '24px', width: '90%', maxWidth: '450px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 25px 50px rgba(0,0,0,0.5)', position: 'relative' },
        closeBtn: { position: 'absolute', top: '20px', right: '20px', background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
        rutinaItemBtn: { width: '100%', display: 'flex', alignItems: 'center', gap: '15px', padding: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', color: 'white', cursor: 'pointer', marginBottom: '10px', transition: 'all 0.2s', textAlign: 'left' }
    };

    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    const weekDays = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];

    return (
        <div style={styles.page}>
            {modoEntrenador && (
                <button onClick={() => navigate(-1)} style={{display:'flex', alignItems:'center', gap:'8px', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:'white', cursor:'pointer', marginBottom:'20px', padding:'8px 16px', borderRadius:'12px', fontWeight:700}}>
                    <ArrowLeft size={16}/> VOLVER AL PERFIL
                </button>
            )}

            <div style={styles.header}>
                <button style={styles.navBtn} onClick={() => setCurrentDate(subMonths(currentDate, 1))} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}><ChevronLeft/></button>
                <h2 style={styles.title}>
                    <Dumbbell size={28} color="#FACC15"/> 
                    {format(currentDate, 'MMMM yyyy', { locale: es })}
                    {modoEntrenador && <span style={{fontSize:'0.7rem', background:'rgba(255,255,255,0.1)', padding:'6px 12px', borderRadius:'20px', color:'white', marginLeft:'15px', letterSpacing:'1px'}}>MODO ENTRENADOR</span>}
                </h2>
                <button style={styles.navBtn} onClick={() => setCurrentDate(addMonths(currentDate, 1))} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}><ChevronRight/></button>
            </div>

            <div style={styles.grid}>
                {weekDays.map(d => <div key={d} style={styles.dayHeader}>{d}</div>)}

                {days.map((day) => {
                    const dateKey = format(day, 'yyyy-MM-dd');
                    const eventosDia = eventos.filter(e => e.fecha === dateKey);
                    const esMismoMes = isSameMonth(day, currentDate);
                    const esHoy = isToday(day);
                    const isHovered = hoveredDate === dateKey && esMismoMes;

                    return (
                        <div 
                            key={dateKey} 
                            style={styles.dayCell(esMismoMes, esHoy, isHovered)}
                            onMouseEnter={() => setHoveredDate(dateKey)}
                            onMouseLeave={() => setHoveredDate(null)}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, day)}
                            onClick={() => esMismoMes && handleDayClick(day)} 
                        >
                            <div style={styles.dateNum(esHoy, isHovered)}>{format(day, 'd')}</div>
                            
                            {isHovered && eventosDia.length === 0 && (
                                <div style={styles.addHoverBtn}><Plus size={16} strokeWidth={3}/> AÑADIR</div>
                            )}
                            
                            {eventosDia.map(ev => (
                                <div 
                                    key={ev.id} 
                                    style={{...styles.eventBadge(ev.estado), borderColor: isHovered ? '#FACC15' : styles.eventBadge(ev.estado).border}}
                                    draggable={true} 
                                    onDragStart={(e) => handleDragStart(e, ev.id)}
                                    onDragEnd={handleDragEnd}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (modoEntrenador || ev.estado !== 'COMPLETADO') irAEntrenar(ev.rutinaId, ev.id);
                                    }}
                                >
                                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
                                        <span style={{overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis', maxWidth:'75%'}}>{ev.rutinaNombre}</span>
                                        <div style={{display:'flex', gap:'5px'}}>
                                            <button style={{background:'rgba(255,255,255,0.1)', border:'none', color:'inherit', cursor:'pointer', borderRadius:'50%', padding:'4px', display:'flex'}} onClick={(e)=>handleToggleCompletado(ev.id, e)}>
                                                {ev.estado === 'COMPLETADO' ? <X size={12}/> : <Check size={12}/>}
                                            </button>
                                            <button style={{background:'rgba(239, 68, 68, 0.1)', border:'none', color:'#ef4444', cursor:'pointer', borderRadius:'50%', padding:'4px', display:'flex'}} onClick={(e)=>handleBorrarClick(ev.id, e)}>
                                                <Trash2 size={12}/>
                                            </button>
                                        </div>
                                    </div>
                                    {ev.estado === 'COMPLETADO' && (ev.duracion || ev.volumen) && (
                                        <div style={{ display: 'flex', gap: '10px', marginTop: '8px', fontSize: '0.75rem', opacity: 0.8, alignItems:'center' }}>
                                            {ev.duracion && <span><Clock size={10} style={{marginRight:'3px'}}/>{formatDuracion(ev.duracion)}</span>}
                                            {ev.volumen && <span><Activity size={10} style={{marginRight:'3px'}}/>{ev.volumen}kg</span>}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    );
                })}
            </div>

            {/* MODAL SELECCIONAR RUTINA */}
            {showModal && (
                <div style={styles.modalOverlay} onClick={() => setShowModal(false)}>
                    <div style={styles.modalCard} onClick={e => e.stopPropagation()}>
                        <button style={styles.closeBtn} onClick={() => setShowModal(false)}><X size={18}/></button>
                        
                        <div style={{textAlign: 'center', marginBottom: '30px'}}>
                            <div style={{background: 'rgba(250, 204, 21, 0.1)', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 15px auto'}}>
                                <CalendarIcon size={28} color="#FACC15" />
                            </div>
                            <h3 style={{color:'white', fontSize: '1.5rem', fontWeight: 900, margin: '0 0 5px 0'}}>
                                ¿Qué toca el {selectedDate && format(selectedDate, 'EEEE d', { locale: es })}?
                            </h3>
                            <p style={{color:'rgba(255,255,255,0.5)', margin: 0, fontSize: '0.95rem'}}>
                                Selecciona una rutina para añadirla al calendario.
                            </p>
                        </div>
                        
                        <div style={{maxHeight: '300px', overflowY: 'auto', paddingRight: '5px'}}>
                            {rutinasDisponibles.length > 0 ? (
                                rutinasDisponibles.map(r => (
                                    <button 
                                        key={r.id} 
                                        style={styles.rutinaItemBtn}
                                        onClick={() => handleRutinaRapida(r.id)}
                                        onMouseEnter={e => e.currentTarget.style.borderColor = '#FACC15'}
                                        onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'}
                                    >
                                        <div style={{background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '12px'}}><Dumbbell size={20} color="#FACC15"/></div>
                                        <div style={{flex: 1}}>
                                            <div style={{fontWeight: 800, fontSize: '1.05rem', color: 'white'}}>{r.nombre}</div>
                                            <div style={{color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', marginTop: '4px'}}>Haz clic para programar</div>
                                        </div>
                                        <PlusCircle size={24} color="rgba(255,255,255,0.2)"/>
                                    </button>
                                ))
                            ) : (
                                <div style={{textAlign:'center', padding:'30px 20px', background: 'rgba(255,255,255,0.02)', border:'1px dashed rgba(255,255,255,0.1)', borderRadius:'16px'}}>
                                    <AlertCircle size={32} color="rgba(255,255,255,0.2)" style={{marginBottom:'15px'}}/>
                                    <p style={{fontWeight: 800, color:'white', margin: '0 0 10px 0'}}>Biblioteca vacía</p>
                                    <p style={{fontSize:'0.9rem', color: 'rgba(255,255,255,0.5)', margin: '0 0 20px 0'}}>
                                        {modoEntrenador ? "No has creado ninguna rutina para este cliente." : "No tienes rutinas creadas."}
                                    </p>
                                    <button 
                                        style={{background: '#FACC15', color: 'black', border: 'none', padding: '12px 24px', borderRadius: '12px', fontWeight: 900, cursor: 'pointer', width: '100%'}}
                                        onClick={() => navigate(modoEntrenador ? `/entrenador/cliente/${clienteId}/crear-rutina` : '/cliente/crear-rutina')}
                                    >
                                        ⚡ CREAR RUTINA AHORA
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL 2: BORRAR EVENTO */}
            {showDeleteModal && (
                <div style={styles.modalOverlay} onClick={() => setShowDeleteModal(false)}>
                    <div style={{...styles.modalCard, width: '400px', padding: '30px'}} onClick={e => e.stopPropagation()}>
                        <div style={{display:'flex', alignItems:'center', gap:'15px', marginBottom:'15px'}}>
                            <div style={{background:'rgba(239, 68, 68, 0.1)', padding:'12px', borderRadius:'50%', color:'#ef4444'}}>
                                <AlertTriangle size={28}/>
                            </div>
                            <h3 style={{margin:0, textTransform:'uppercase', fontSize:'1.4rem', color:'white', fontWeight: 900}}>
                                ¿Eliminar Evento?
                            </h3>
                        </div>
                        <p style={{color:'rgba(255,255,255,0.6)', fontSize:'0.95rem', lineHeight:'1.6', marginBottom:'30px'}}>
                            {modoEntrenador 
                                ? "Vas a quitar este entrenamiento del calendario de tu cliente. Esta acción no se puede deshacer."
                                : "¿Estás seguro de que quieres eliminar este entrenamiento de tu agenda?"}
                        </p>
                        <div style={{display: 'flex', gap: '15px'}}>
                            <button style={{flex: 1, padding: '14px', background: 'transparent', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '12px', cursor: 'pointer', fontWeight: 800, transition:'all 0.2s'}} onClick={() => setShowDeleteModal(false)}>CANCELAR</button>
                            <button style={{flex: 1, padding: '14px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 900, transition:'all 0.2s', boxShadow: '0 10px 20px rgba(239, 68, 68, 0.3)'}} onClick={confirmDelete}>ELIMINAR</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 🔥 MODAL 3: TU VISOR LATERAL RESTAURADO 🔥 */}
            {showResultadosModal && (
                <ModalResultados eventoId={selectedEventoId} onClose={() => setShowResultadosModal(false)} />
            )}
        </div>
    );
}

// Icono extra para el Modal
const CalendarIcon = ({ size, color }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
        <line x1="16" y1="2" x2="16" y2="6"></line>
        <line x1="8" y1="2" x2="8" y2="6"></line>
        <line x1="3" y1="10" x2="21" y2="10"></line>
    </svg>
);