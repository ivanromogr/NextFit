import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
    obtenerClientesEntrenador, 
    obtenerEventosCalendario,
    getEntrenador 
} from '../../api/endpoints';
import { 
    Calendar as CalendarIcon, ChevronLeft, ChevronRight, 
    Clock, User, Dumbbell, Activity, CheckCircle2, Bell, ChevronRight as ArrowRightIcon
} from 'lucide-react';

export default function AgendaEntrenador() {
    const navigate = useNavigate();
    const { userId: entrenadorId } = useAuth();
    
    const [perfil, setPerfil] = useState({ nombre: 'Coach', fotoPerfil: '' });
    const [eventos, setEventos] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Control del calendario
    const [fechaActual, setFechaActual] = useState(new Date());
    const [fechaSeleccionada, setFechaSeleccionada] = useState(new Date());

    useEffect(() => {
        if (!entrenadorId) return navigate('/auth/login');
        cargarAgenda();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fechaActual, entrenadorId]);

    const cargarAgenda = async () => {
        setLoading(true);
        try {
            // 1. Cargar perfil del entrenador
            const dataPerfil = await getEntrenador(entrenadorId).catch(() => null);
            if (dataPerfil) {
                const info = dataPerfil.entrenador || dataPerfil;
                setPerfil({ nombre: info.nombre || 'Coach', fotoPerfil: info.fotoPerfil || '' });
            }

            // 2. Obtener la lista de clientes
            const clientes = await obtenerClientesEntrenador(entrenadorId).catch(() => []);
            
            const primerDia = new Date(fechaActual.getFullYear(), fechaActual.getMonth(), 1).toISOString().split('T')[0];
            const ultimoDia = new Date(fechaActual.getFullYear(), fechaActual.getMonth() + 1, 0).toISOString().split('T')[0];

            // 3. Obtener los eventos
            let todosLosEventos = [];
            const promesas = clientes.map(async (item) => {
                const clienteInfo = item.cliente || item;
                if (!clienteInfo.id) return;
                
                try {
                    const eventosCliente = await obtenerEventosCalendario(clienteInfo.id, primerDia, ultimoDia, entrenadorId);
                    const eventosMapeados = eventosCliente.map(ev => ({
                        ...ev,
                        clienteNombre: `${clienteInfo.nombre} ${clienteInfo.apellido}`,
                        clienteFoto: clienteInfo.fotoPerfil,
                        clienteId: clienteInfo.id // Guardamos el ID para poder navegar a su perfil
                    }));
                    todosLosEventos = [...todosLosEventos, ...eventosMapeados];
                } catch {
                    console.warn(`No se pudieron cargar eventos de ${clienteInfo.nombre}`);
                }
            });

            await Promise.all(promesas);
            setEventos(todosLosEventos);

        } catch (error) {
            console.error("Error cargando la agenda:", error);
        } finally {
            setLoading(false);
        }
    };

    // Funciones del Calendario
    const getDiasDelMes = () => {
        const year = fechaActual.getFullYear();
        const month = fechaActual.getMonth();
        const primerDiaStr = new Date(year, month, 1).getDay();
        const diasEnMes = new Date(year, month + 1, 0).getDate();
        const primerDia = primerDiaStr === 0 ? 6 : primerDiaStr - 1; 

        let dias = [];
        for (let i = 0; i < primerDia; i++) dias.push(null); 
        for (let i = 1; i <= diasEnMes; i++) dias.push(new Date(year, month, i));
        return dias;
    };

    const prevMonth = () => setFechaActual(new Date(fechaActual.getFullYear(), fechaActual.getMonth() - 1, 1));
    const nextMonth = () => setFechaActual(new Date(fechaActual.getFullYear(), fechaActual.getMonth() + 1, 1));

    const seleccionarFecha = (dia) => {
        if (dia) setFechaSeleccionada(dia);
    };

    // Filtrar eventos para el día seleccionado
    const eventosDelDia = eventos.filter(ev => {
        const evDate = new Date(ev.fecha);
        return evDate.getDate() === fechaSeleccionada.getDate() &&
               evDate.getMonth() === fechaSeleccionada.getMonth() &&
               evDate.getFullYear() === fechaSeleccionada.getFullYear();
    });

    const styles = {
        page: { padding: '40px 50px', background: '#050505', minHeight: '100vh', color: 'white', fontFamily: "'Inter', sans-serif" },
        headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' },
        title: { fontSize: '2rem', fontWeight: 900, letterSpacing: '-0.5px', margin: 0, textTransform: 'uppercase' },
        subtitle: { color: 'rgba(255,255,255,0.5)', fontSize: '0.95rem', fontWeight: 500 },
        avatarImg: { width: '55px', height: '55px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #FACC15', padding: '2px', boxShadow: '0 0 15px rgba(250, 204, 21, 0.15)' },
        
        mainGrid: { display: 'grid', gridTemplateColumns: 'minmax(380px, 1.2fr) 1fr', gap: '40px', alignItems: 'start' },
        
        // Panel Calendario
        calCard: { background: 'linear-gradient(145deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.01) 100%)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '24px', padding: '35px', backdropFilter: 'blur(10px)', boxShadow: '0 25px 50px rgba(0,0,0,0.2)' },
        calHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' },
        btnMonth: { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: 'white', padding: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'all 0.2s' },
        weekDays: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', fontWeight: 800, marginBottom: '20px', letterSpacing: '1px' },
        daysGrid: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '12px' },
        dayBtn: (isToday, isSelected) => ({
            aspectRatio: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            background: isSelected ? '#FACC15' : 'rgba(255,255,255,0.02)',
            color: isSelected ? 'black' : 'white',
            border: isToday && !isSelected ? '1px solid rgba(250, 204, 21, 0.5)' : '1px solid rgba(255,255,255,0.05)',
            borderRadius: '14px', cursor: 'pointer', fontWeight: isSelected ? 900 : 600, fontSize: '1.05rem',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)', position: 'relative'
        }),
        dot: { width: '6px', height: '6px', borderRadius: '50%', background: '#EF4444', marginTop: '6px', transition: 'all 0.2s' },

        // Panel Timeline
        timelineCard: { background: 'transparent', borderRadius: '24px', padding: '10px' },
        dateHeader: { fontSize: '1.4rem', fontWeight: 900, marginBottom: '30px', display: 'flex', alignItems: 'center', gap: '12px', color: '#FACC15', textTransform: 'uppercase', letterSpacing: '-0.5px' },
        eventCard: { background: 'linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)', borderRadius: '20px', padding: '24px', marginBottom: '20px', border: '1px solid rgba(255,255,255,0.05)', borderLeft: '4px solid #FACC15', display: 'flex', flexDirection: 'column', gap: '20px', transition: 'all 0.3s', cursor: 'default', backdropFilter: 'blur(10px)' },
        eventTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
        eventClient: { display: 'flex', alignItems: 'center', gap: '15px' },
        eventAvatar: { width: '45px', height: '45px', borderRadius: '12px', objectFit: 'cover' },
        manageBtn: { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '8px 16px', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', transition: 'all 0.2s' }
    };

    const diasNombres = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];
    const mesesNombres = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

    if (loading) return <div style={{height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#050505', color: '#FACC15'}}><Activity size={40} className="animate-pulse" /></div>;

    return (
        <div style={styles.page}>
            {/* HEADER */}
            <div style={styles.headerRow}>
                <div>
                    <h1 style={styles.title}>Tu Agenda Global</h1>
                    <span style={styles.subtitle}>Supervisa los entrenamientos de todo tu equipo.</span>
                </div>
                <div style={{display: 'flex', alignItems: 'center', gap: '20px'}}>
                    <div style={{width: '45px', height: '45px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.03)', cursor: 'pointer'}} onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.1)'} onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,0.03)'}>
                        <Bell size={20} color="white" />
                    </div>
                    {perfil.fotoPerfil ? <img src={perfil.fotoPerfil} alt="Perfil" style={styles.avatarImg} /> : <div style={{...styles.avatarImg, background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center'}}><User size={24} color="#FACC15"/></div>}
                </div>
            </div>

            <div style={styles.mainGrid}>
                <div style={styles.calCard}>
                    <div style={styles.calHeader}>
                        <h2 style={{margin: 0, fontSize: '1.5rem', fontWeight: 900, textTransform: 'uppercase'}}>{mesesNombres[fechaActual.getMonth()]} {fechaActual.getFullYear()}</h2>
                        <div style={{display: 'flex', gap: '10px'}}>
                            <button style={styles.btnMonth} onClick={prevMonth} onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.1)'} onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,0.05)'}><ChevronLeft size={20}/></button>
                            <button style={styles.btnMonth} onClick={nextMonth} onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.1)'} onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,0.05)'}><ChevronRight size={20}/></button>
                        </div>
                    </div>

                    <div style={styles.weekDays}>
                        {diasNombres.map(d => <div key={d}>{d}</div>)}
                    </div>

                    <div style={styles.daysGrid}>
                        {getDiasDelMes().map((dia, idx) => {
                            if (!dia) return <div key={idx} />;
                            
                            const isSelected = dia.toDateString() === fechaSeleccionada.toDateString();
                            const isToday = dia.toDateString() === new Date().toDateString();
                            const dayEvents = eventos.filter(ev => new Date(ev.fecha).toDateString() === dia.toDateString());

                            return (
                                <button 
                                    key={idx} 
                                    style={styles.dayBtn(isToday, isSelected, dayEvents.length > 0)}
                                    onClick={() => seleccionarFecha(dia)}
                                    onMouseEnter={e => !isSelected && (e.currentTarget.style.borderColor = '#FACC15')}
                                    onMouseLeave={e => !isSelected && (e.currentTarget.style.borderColor = isToday ? 'rgba(250, 204, 21, 0.5)' : 'rgba(255,255,255,0.05)')}
                                >
                                    {dia.getDate()}
                                    {dayEvents.length > 0 && <div style={{...styles.dot, background: isSelected ? 'black' : '#FACC15', transform: isSelected ? 'scale(1.2)' : 'scale(1)'}} />}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* COLUMNA DERECHA: TIMELINE INTERACTIVO */}
                <div style={styles.timelineCard}>
                    <div style={styles.dateHeader}>
                        <CalendarIcon size={28} />
                        {fechaSeleccionada.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </div>

                    {eventosDelDia.length > 0 ? (
                        <div style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>
                            {eventosDelDia.map(ev => (
                                <div 
                                    key={ev.id} 
                                    style={styles.eventCard}
                                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 15px 30px rgba(0,0,0,0.4)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'; }}
                                >
                                    <div style={styles.eventTop}>
                                        <div style={styles.eventClient}>
                                            {ev.clienteFoto ? <img src={ev.clienteFoto} style={styles.eventAvatar}/> : <div style={{...styles.eventAvatar, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}><User size={20} color="#71717a"/></div>}
                                            <div>
                                                <div style={{fontWeight: 900, fontSize: '1.1rem', color: 'white'}}>{ev.clienteNombre}</div>
                                                <div style={{color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px'}}>
                                                    <Clock size={12}/> Programado para hoy
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
                                            {ev.estado === 'COMPLETADO' && <span style={{background: 'rgba(74, 222, 128, 0.15)', color: '#4ade80', padding: '6px 12px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px'}}><CheckCircle2 size={14}/> COMPLETADO</span>}
                                            
                                            {/* 👇 BOTÓN PARA VIAJAR AL PERFIL DEL CLIENTE */}
                                            <button 
                                                style={styles.manageBtn}
                                                onClick={() => navigate(`/entrenador/cliente/${ev.clienteId}/calendario`)}
                                                onMouseEnter={e => {e.currentTarget.style.background = '#FACC15'; e.currentTarget.style.color = 'black';}}
                                                onMouseLeave={e => {e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'white';}}
                                            >
                                                Gestionar <ArrowRightIcon size={14}/>
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <div style={{background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '14px', display: 'flex', alignItems: 'center', gap: '12px', border: '1px solid rgba(255,255,255,0.05)'}}>
                                        <div style={{background: 'rgba(250, 204, 21, 0.1)', padding: '8px', borderRadius: '10px'}}>
                                            <Dumbbell size={18} color="#FACC15"/>
                                        </div>
                                        <span style={{fontWeight: 700, color: 'rgba(255,255,255,0.9)', fontSize: '1rem'}}>{ev.rutinaNombre || ev.rutina?.nombre || 'Rutina Programada'}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{textAlign: 'center', padding: '60px 0', background: 'rgba(255,255,255,0.01)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '24px'}}>
                            <CalendarIcon size={48} color="rgba(255,255,255,0.2)" style={{marginBottom: '20px'}}/>
                            <h3 style={{margin: '0 0 10px 0', fontSize: '1.4rem', color: 'rgba(255,255,255,0.7)', fontWeight: 800}}>Día despejado</h3>
                            <p style={{margin: 0, fontSize: '1rem', color: 'rgba(255,255,255,0.4)'}}>Ningún atleta tiene entrenamientos asignados hoy.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
