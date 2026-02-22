import React, { useState, useEffect } from 'react';
import { 
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, 
  eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths 
} from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Trash2, Dumbbell, Check, X, Clock, Activity, ArrowLeft, AlertCircle, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { 
    obtenerEventosCalendario, programarRutina, eliminarEventoCalendario, 
    obtenerRutinasCliente, toggleCompletadoEvento, moverEventoCalendario 
} from '../../api/endpoints';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import ModalResultados from '../../components/functional/ModalResultados';

export default function CalendarioCliente({ clienteIdProp, isCoachMode = false }) {
    const navigate = useNavigate();
    const toast = useToast();
    const { userId } = useAuth();
    
    const [currentDate, setCurrentDate] = useState(new Date());
    const [eventos, setEventos] = useState([]);
    const [rutinas, setRutinas] = useState([]);
    
    // Modales y selección
    const [showModal, setShowModal] = useState(false);
    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedRutina, setSelectedRutina] = useState("");
    
    // Resultados sesión
    const [showResultadosModal, setShowResultadosModal] = useState(false);
    const [selectedEventoId, setSelectedEventoId] = useState(null);
    
    // Drag & Drop
    const [draggedEventId, setDraggedEventId] = useState(null);

    // Estado para el modal de borrado personalizado
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [eventToDelete, setEventToDelete] = useState(null);

    const clienteId = clienteIdProp || userId;

    useEffect(() => {
        if (!clienteId) return;
        cargarEventos();
        obtenerRutinasCliente(clienteId).then(data => setRutinas(data || []));
    }, [currentDate, clienteId]);

    const cargarEventos = async () => {
        const start = format(startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 }), 'yyyy-MM-dd');
        const end = format(endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 }), 'yyyy-MM-dd');
        const data = await obtenerEventosCalendario(clienteId, start, end);
        setEventos(data);
    };

    // Filtro de rutinas para el entrenador
    const rutinasDisponibles = isCoachMode 
        ? rutinas.filter(r => r.creador === 'ENTRENADOR') 
        : rutinas;

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

        const eventosTemp = eventos.map(ev => 
            ev.id === draggedEventId ? { ...ev, fecha: fechaStr } : ev
        );
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

    // --- ACCIONES ---
    const handleDayClick = (day) => {
        setSelectedDate(day);
        setSelectedRutina(""); 
        setShowModal(true);
    };

    const handleGuardarEvento = async () => {
        if (!selectedRutina) return toast.error("Selecciona una rutina");
        try {
            const fechaStr = format(selectedDate, 'yyyy-MM-dd');
            await programarRutina(clienteId, selectedRutina, fechaStr);
            toast.success(isCoachMode ? "Rutina asignada" : "Rutina programada");
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

    const irAEntrenar = (rutinaId, eventoId) => {
        // Lógica para Entrenador
        if (isCoachMode) {
            const ev = eventos.find(e => e.id === eventoId);
            
            // Si está completado -> Ver Resultados
            if (ev && ev.estado === 'COMPLETADO') {
                setSelectedEventoId(eventoId);
                setShowResultadosModal(true);
            } else {
                // Si no está completado, solo avisamos (o podríamos dejar editar)
                toast.info("Este entrenamiento aún está pendiente.");
            }
            return;
        }

        // Lógica para Cliente (Solo ir si no está completado, o modo lectura si lo quisieras)
        navigate(`/cliente/sesion/${rutinaId}`);
    };

    const formatDuracion = (seg) => {
        if(!seg) return '';
        const min = Math.floor(seg / 60);
        return `${min} min`;
    };

    // --- ESTILOS ---
    const styles = {
        page: { padding: '20px', color: 'white', minHeight: '100vh', background: isCoachMode ? '#000000' : '#09090b', fontFamily: 'sans-serif' },
        header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
        title: { fontSize: '1.5rem', fontWeight: '900', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '10px' },
        navBtn: { background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', padding: '8px' },
        grid: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' },
        dayHeader: { textAlign: 'center', color: '#71717a', fontSize: '0.75rem', fontWeight: 'bold', padding: '10px 0' },
        dayCell: (isSameMonth, isToday) => ({
            background: isSameMonth ? '#121214' : '#09090b', 
            border: isToday ? '2px solid #FACC15' : '1px solid #27272a', 
            borderRadius: '8px', minHeight: '120px', padding: '6px', cursor: 'default', opacity: isSameMonth ? 1 : 0.3,
            transition: 'background 0.2s'
        }),
        dateNum: (isToday) => ({
            fontSize: '0.9rem', fontWeight: 'bold', color: isToday ? '#FACC15' : '#71717a', marginBottom: '8px', pointerEvents: 'none'
        }),
        eventBadge: (estado) => {
            let bg, color, border;
            switch(estado) {
                case 'COMPLETADO': bg = '#22c55e'; color = '#000'; border = 'none'; break;
                case 'SALTADO': bg = 'rgba(239, 68, 68, 0.2)'; color = '#ef4444'; border = '1px solid #ef4444'; break;
                default: bg = '#27272a'; color = '#fff'; border = '1px solid #FACC15'; 
            }
            return {
                background: bg, color: color, border: border,
                fontSize: '0.75rem', fontWeight: 'bold', padding: '8px', borderRadius: '6px', marginBottom: '6px',
                cursor: 'grab', boxShadow: '0 2px 4px rgba(0,0,0,0.3)', userSelect: 'none'
            };
        },
        statsRow: { display: 'flex', gap: '8px', marginTop: '4px', fontSize: '0.7rem', opacity: 0.9, alignItems:'center' },
        
        // Estilos Modales
        modalOverlay: { position: 'fixed', top:0, left:0, width:'100%', height:'100%', background:'rgba(0,0,0,0.85)', display:'flex', alignItems:'center', justifyContent:'center', zIndex: 100, backdropFilter: 'blur(5px)' },
        modalCard: { background: '#18181b', padding: '30px', borderRadius: '20px', width: '90%', maxWidth: '400px', border: '1px solid #333', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' },
        select: { width: '100%', padding: '12px', background: '#09090b', color: 'white', border: '1px solid #333', borderRadius: '8px', marginTop: '15px', marginBottom: '20px', outline:'none' },
        btnPrimary: { width: '100%', padding: '12px', background: '#FACC15', color: 'black', fontWeight: 'bold', border: 'none', borderRadius: '8px', cursor: 'pointer' },
        
        // Estilos Modal Borrado
        btnCancel: { flex: 1, padding: '12px', background: 'transparent', color: '#a1a1aa', border: '1px solid #333', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', transition:'all 0.2s' },
        btnDanger: { flex: 1, padding: '12px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', transition:'all 0.2s' },
        actionsModal: { display: 'flex', gap: '10px', marginTop: '25px' }
    };

    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    const weekDays = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];

    return (
        <div style={styles.page}>
            {isCoachMode && (
                <button onClick={() => navigate(-1)} style={{display:'flex', alignItems:'center', gap:'5px', background:'none', border:'none', color:'#71717a', cursor:'pointer', marginBottom:'10px', fontWeight:'bold'}}>
                    <ArrowLeft size={18}/> VOLVER AL PERFIL
                </button>
            )}

            <div style={styles.header}>
                <button style={styles.navBtn} onClick={() => setCurrentDate(subMonths(currentDate, 1))}><ChevronLeft/></button>
                <h2 style={styles.title}>
                    <Dumbbell size={24} color="#FACC15"/> 
                    {format(currentDate, 'MMMM yyyy', { locale: es })}
                    {isCoachMode && <span style={{fontSize:'0.8rem', background:'#222', padding:'4px 8px', borderRadius:'4px', color:'#777', marginLeft:'10px'}}>MODO ENTRENADOR</span>}
                </h2>
                <button style={styles.navBtn} onClick={() => setCurrentDate(addMonths(currentDate, 1))}><ChevronRight/></button>
            </div>

            <div style={styles.grid}>
                {weekDays.map(d => <div key={d} style={styles.dayHeader}>{d}</div>)}

                {days.map((day) => {
                    const dateKey = format(day, 'yyyy-MM-dd');
                    const eventosDia = eventos.filter(e => e.fecha === dateKey);
                    const esMismoMes = isSameMonth(day, currentDate);
                    const esHoy = isToday(day);

                    return (
                        <div 
                            key={dateKey} 
                            style={styles.dayCell(esMismoMes, esHoy)}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, day)}
                            onDoubleClick={() => handleDayClick(day)}
                        >
                            <div style={styles.dateNum(esHoy)}>{format(day, 'd')}</div>
                            
                            {eventosDia.map(ev => (
                                <div 
                                    key={ev.id} 
                                    style={styles.eventBadge(ev.estado)}
                                    draggable={true} 
                                    onDragStart={(e) => handleDragStart(e, ev.id)}
                                    onDragEnd={handleDragEnd}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        // 👇 CORRECCIÓN: Si eres coach, SIEMPRE entras. Si no, solo si NO está completado.
                                        if (isCoachMode || ev.estado !== 'COMPLETADO') {
                                            irAEntrenar(ev.rutinaId, ev.id);
                                        }
                                    }}
                                >
                                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
                                        <span style={{overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis', maxWidth:'80%'}}>{ev.rutinaNombre}</span>
                                        <div style={{display:'flex', gap:'2px'}}>
                                            <button style={{background:'none', border:'none', color:'inherit', cursor:'pointer'}} onClick={(e)=>handleToggleCompletado(ev.id, e)}>
                                                {ev.estado === 'COMPLETADO' ? <X size={14}/> : <Check size={14}/>}
                                            </button>
                                            <button style={{background:'none', border:'none', color:'inherit', cursor:'pointer'}} onClick={(e)=>handleBorrarClick(ev.id, e)}>
                                                <Trash2 size={12}/>
                                            </button>
                                        </div>
                                    </div>
                                    {ev.estado === 'COMPLETADO' && (ev.duracion || ev.volumen) && (
                                        <div style={styles.statsRow}>
                                            {ev.duracion && <span><Clock size={10}/>{formatDuracion(ev.duracion)}</span>}
                                            {ev.volumen && <span><Activity size={10}/>{ev.volumen}kg</span>}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    );
                })}
            </div>

            {/* MODAL 1: ASIGNAR RUTINA */}
            {showModal && (
                <div style={styles.modalOverlay} onClick={() => setShowModal(false)}>
                    <div style={styles.modalCard} onClick={e => e.stopPropagation()}>
                        <h3 style={{color:'white', textTransform:'uppercase'}}>
                            {isCoachMode ? 'Asignar Rutina' : 'Programar Rutina'}
                        </h3>
                        <p style={{color:'#71717a', fontSize:'0.9rem', marginBottom:'20px'}}>
                            Para el día: {selectedDate && format(selectedDate, 'dd/MM/yyyy')}
                        </p>
                        
                        {rutinasDisponibles.length > 0 ? (
                            <>
                                <select style={styles.select} value={selectedRutina} onChange={(e) => setSelectedRutina(e.target.value)}>
                                    <option value="">-- Seleccionar Rutina --</option>
                                    {rutinasDisponibles.map(r => (
                                        <option key={r.id} value={r.id}>{r.nombre}</option>
                                    ))}
                                </select>
                                <button style={styles.btnPrimary} onClick={handleGuardarEvento}>
                                    GUARDAR EN CALENDARIO
                                </button>
                            </>
                        ) : (
                            <div style={{textAlign:'center', padding:'20px', border:'1px dashed #333', borderRadius:'10px', color:'#aaa'}}>
                                <AlertCircle size={30} color="#FACC15" style={{marginBottom:'10px'}}/>
                                <p style={{fontWeight:'bold', color:'white'}}>No hay rutinas disponibles</p>
                                <p style={{fontSize:'0.85rem'}}>
                                    {isCoachMode 
                                        ? "No has creado ninguna rutina para este cliente todavía." 
                                        : "No tienes rutinas creadas."}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* MODAL 2: BORRAR EVENTO */}
            {showDeleteModal && (
                <div style={styles.modalOverlay} onClick={() => setShowDeleteModal(false)}>
                    <div style={styles.modalCard} onClick={e => e.stopPropagation()}>
                        <div style={{display:'flex', alignItems:'center', gap:'15px', marginBottom:'15px'}}>
                            <div style={{background:'rgba(239, 68, 68, 0.1)', padding:'10px', borderRadius:'50%', color:'#ef4444'}}>
                                <AlertTriangle size={24}/>
                            </div>
                            <h3 style={{margin:0, textTransform:'uppercase', fontSize:'1.4rem', color:'white'}}>
                                ¿Eliminar Evento?
                            </h3>
                        </div>
                        
                        <p style={{color:'#a1a1aa', fontSize:'0.95rem', lineHeight:'1.6', marginBottom:'0'}}>
                            {isCoachMode 
                                ? "Vas a quitar este entrenamiento del calendario de tu cliente. Esta acción no se puede deshacer."
                                : "¿Estás seguro de que quieres eliminar este entrenamiento de tu agenda?"}
                        </p>
                        
                        <div style={styles.actionsModal}>
                            <button 
                                style={styles.btnCancel} 
                                onClick={() => setShowDeleteModal(false)}
                                onMouseEnter={(e) => e.target.style.borderColor = '#555'}
                                onMouseLeave={(e) => e.target.style.borderColor = '#333'}
                            >
                                CANCELAR
                            </button>
                            <button 
                                style={styles.btnDanger} 
                                onClick={confirmDelete}
                                onMouseEnter={(e) => e.target.style.background = 'rgba(239, 68, 68, 0.2)'}
                                onMouseLeave={(e) => e.target.style.background = 'rgba(239, 68, 68, 0.1)'}
                            >
                                ELIMINAR
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL 3: VISOR DE RESULTADOS (SOLO COACH) */}
            {showResultadosModal && (
                <ModalResultados 
                    eventoId={selectedEventoId} 
                    onClose={() => setShowResultadosModal(false)} 
                />
            )}
        </div>
    );
}