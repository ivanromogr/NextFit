import React, { useState, useEffect } from 'react';
import { 
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, 
  eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths 
} from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Trash2, Dumbbell, Check, X, Clock, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { 
    obtenerEventosCalendario, programarRutina, eliminarEventoCalendario, 
    obtenerRutinasCliente, toggleCompletadoEvento, moverEventoCalendario 
} from '../../api/endpoints';
import { useToast } from '../../context/ToastContext';

export default function CalendarioCliente() {
    const navigate = useNavigate();
    const toast = useToast();
    
    const [currentDate, setCurrentDate] = useState(new Date());
    const [eventos, setEventos] = useState([]);
    const [rutinas, setRutinas] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedRutina, setSelectedRutina] = useState("");
    const clienteId = localStorage.getItem("clienteId");

    // Estado para Drag & Drop
    const [draggedEventId, setDraggedEventId] = useState(null);

    useEffect(() => {
        if (!clienteId) return;
        cargarEventos();
        obtenerRutinasCliente(clienteId).then(setRutinas);
    }, [currentDate]);

    const cargarEventos = async () => {
        const start = format(startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 }), 'yyyy-MM-dd');
        const end = format(endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 }), 'yyyy-MM-dd');
        const data = await obtenerEventosCalendario(clienteId, start, end);
        setEventos(data);
    };

    // --- LÓGICA DRAG & DROP ---
    const handleDragStart = (e, eventoId) => {
        setDraggedEventId(eventoId);
        e.dataTransfer.effectAllowed = "move";
        // Un poco de transparencia visual al arrastrar
        e.target.style.opacity = '0.5';
    };

    const handleDragEnd = (e) => {
        e.target.style.opacity = '1';
        setDraggedEventId(null);
    };

    const handleDragOver = (e) => {
        e.preventDefault(); // Necesario para permitir el "Drop"
        e.dataTransfer.dropEffect = "move";
    };

    const handleDrop = async (e, fechaDestino) => {
        e.preventDefault();
        const fechaStr = format(fechaDestino, 'yyyy-MM-dd');
        
        if (!draggedEventId) return;

        // Optimismo UI: Movemos visualmente antes de esperar al backend
        const eventosTemp = eventos.map(ev => 
            ev.id === draggedEventId ? { ...ev, fecha: fechaStr } : ev
        );
        setEventos(eventosTemp);

        try {
            await moverEventoCalendario(draggedEventId, fechaStr);
            toast.success("Evento movido");
            cargarEventos(); // Recarga oficial para asegurar
        } catch (error) {
            toast.error("Error al mover");
            cargarEventos(); // Revertir si falla
        }
    };

    // --- RESTO DE FUNCIONES ---
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
            toast.success("Rutina programada");
            setShowModal(false);
            cargarEventos(); 
        } catch (error) {
            toast.error("Error al programar");
        }
    };

    const handleBorrarEvento = async (eventoId, e) => {
        e.stopPropagation(); 
        if (window.confirm("¿Eliminar del calendario?")) {
            await eliminarEventoCalendario(eventoId);
            cargarEventos();
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

    const irAEntrenar = (rutinaId) => {
        navigate(`/cliente/sesion/${rutinaId}`);
    };

    const formatDuracion = (seg) => {
        if(!seg) return '';
        const min = Math.floor(seg / 60);
        return `${min} min`;
    };

    const styles = {
        page: { padding: '20px', color: 'white', minHeight: '100vh', background: '#09090b', fontFamily: 'sans-serif' },
        header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
        title: { fontSize: '1.5rem', fontWeight: '900', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '10px' },
        navBtn: { background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', padding: '8px' },
        
        grid: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' },
        dayHeader: { textAlign: 'center', color: '#71717a', fontSize: '0.75rem', fontWeight: 'bold', padding: '10px 0' },
        
        dayCell: (isSameMonth, isToday) => ({
            background: isSameMonth ? '#121214' : '#09090b', 
            border: isToday ? '2px solid #FACC15' : '1px solid #27272a', 
            borderRadius: '8px',
            minHeight: '120px', 
            padding: '6px',
            cursor: 'default', // El click lo manejamos con cuidado
            opacity: isSameMonth ? 1 : 0.3,
            transition: 'background 0.2s'
        }),
        dateNum: (isToday) => ({
            fontSize: '0.9rem', fontWeight: 'bold', color: isToday ? '#FACC15' : '#71717a', marginBottom: '8px', pointerEvents: 'none'
        }),
        
        eventBadge: (estado) => {
            let bg, color, border;
            switch(estado) {
                case 'COMPLETADO': 
                    bg = '#22c55e'; color = '#000'; border = 'none'; break;
                case 'SALTADO': 
                    bg = 'rgba(239, 68, 68, 0.2)'; color = '#ef4444'; border = '1px solid #ef4444'; break;
                default: 
                    bg = '#27272a'; color = '#fff'; border = '1px solid #FACC15'; 
            }
            return {
                background: bg, color: color, border: border,
                fontSize: '0.75rem', fontWeight: 'bold',
                padding: '8px', borderRadius: '6px', marginBottom: '6px',
                cursor: 'grab', // Manita para arrastrar
                boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                userSelect: 'none'
            };
        },
        
        statsRow: { display: 'flex', gap: '8px', marginTop: '4px', fontSize: '0.7rem', opacity: 0.9, alignItems:'center' },
        
        modalOverlay: { position: 'fixed', top:0, left:0, width:'100%', height:'100%', background:'rgba(0,0,0,0.8)', display:'flex', alignItems:'center', justifyContent:'center', zIndex: 100 },
        modalCard: { background: '#18181b', padding: '30px', borderRadius: '16px', width: '90%', maxWidth: '400px', border: '1px solid #333' },
        select: { width: '100%', padding: '12px', background: '#09090b', color: 'white', border: '1px solid #333', borderRadius: '8px', marginTop: '15px', marginBottom: '20px' },
        btnPrimary: { width: '100%', padding: '12px', background: '#FACC15', color: 'black', fontWeight: 'bold', border: 'none', borderRadius: '8px', cursor: 'pointer' },
        btnCancel: { width: '100%', padding: '12px', background: 'transparent', color: '#71717a', border: 'none', cursor: 'pointer', marginTop: '10px' }
    };

    // Generar días
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    const weekDays = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];

    return (
        <div style={styles.page}>
            <div style={styles.header}>
                <button style={styles.navBtn} onClick={() => setCurrentDate(subMonths(currentDate, 1))}><ChevronLeft/></button>
                <h2 style={styles.title}><Dumbbell size={24} color="#FACC15"/> {format(currentDate, 'MMMM yyyy', { locale: es })}</h2>
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
                            // 👇 EVENTOS DE ZONA DE SOLTAR (DROP)
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, day)}
                            // Doble click para crear, para no interferir con el drag
                            onDoubleClick={() => handleDayClick(day)}
                        >
                            <div style={styles.dateNum(esHoy)}>{format(day, 'd')}</div>
                            
                            {eventosDia.map(ev => (
                                <div 
                                    key={ev.id} 
                                    style={styles.eventBadge(ev.estado)}
                                    // 👇 EVENTOS DE ARRASTRAR (DRAG)
                                    draggable={true}
                                    onDragStart={(e) => handleDragStart(e, ev.id)}
                                    onDragEnd={handleDragEnd}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        // Si está completado, no obligamos a repetir, solo ver.
                                        if (ev.estado !== 'COMPLETADO') irAEntrenar(ev.rutinaId);
                                    }}
                                >
                                    {/* Cabecera Tarjeta */}
                                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
                                        <span style={{overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis', maxWidth:'80%'}}>
                                            {ev.rutinaNombre}
                                        </span>
                                        {ev.estado !== 'COMPLETADO' && (
                                            <div style={{display:'flex', gap:'2px'}}>
                                                <button style={{background:'none', border:'none', color:'inherit', cursor:'pointer'}} onClick={(e)=>handleToggleCompletado(ev.id, e)}>
                                                    {ev.estado === 'COMPLETADO' ? <X size={14}/> : <Check size={14}/>}
                                                </button>
                                                <button style={{background:'none', border:'none', color:'inherit', cursor:'pointer'}} onClick={(e)=>handleBorrarEvento(ev.id, e)}>
                                                    <Trash2 size={12}/>
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* 👇 INFORMACIÓN AL VISTAZO (SOLO SI ESTÁ HECHO) */}
                                    {ev.estado === 'COMPLETADO' && (ev.duracion || ev.volumen) && (
                                        <div style={styles.statsRow}>
                                            {ev.duracion && <span style={{display:'flex', alignItems:'center', gap:'2px'}}><Clock size={10}/>{formatDuracion(ev.duracion)}</span>}
                                            {ev.volumen && <span style={{display:'flex', alignItems:'center', gap:'2px'}}><Activity size={10}/>{ev.volumen}kg</span>}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    );
                })}
            </div>

            {/* Modal de Programar (Igual que antes) */}
            {showModal && (
                <div style={styles.modalOverlay} onClick={() => setShowModal(false)}>
                    <div style={styles.modalCard} onClick={e => e.stopPropagation()}>
                        <h3 style={{color:'white', textTransform:'uppercase'}}>Programar {selectedDate && format(selectedDate, 'dd/MM')}</h3>
                        <select style={styles.select} value={selectedRutina} onChange={(e) => setSelectedRutina(e.target.value)}>
                            <option value="">-- Seleccionar Rutina --</option>
                            {rutinas.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                        </select>
                        <button style={styles.btnPrimary} onClick={handleGuardarEvento}>GUARDAR</button>
                    </div>
                </div>
            )}
        </div>
    );
}