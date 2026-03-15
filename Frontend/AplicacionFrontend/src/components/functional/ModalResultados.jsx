import React, { useEffect, useState } from 'react';
import { X, Clock, Activity, FileText, Dumbbell, Calendar } from 'lucide-react';
import { obtenerEventosCalendario, obtenerUltimaSesionRutina } from '../../api/endpoints';
import { useAuth } from '../../context/AuthContext';
import { useParams } from 'react-router-dom';

export default function VisorSesion({ eventoId, onClose }) {
    const [sesion, setSesion] = useState(null);
    const [loading, setLoading] = useState(true);
    const { userId } = useAuth();
    const params = useParams();
    
    const idDeLaUrl = params.id || params.clienteId; 
    const targetUserId = idDeLaUrl || userId;

    useEffect(() => {
        const cargarData = async () => {
            if (!eventoId || !targetUserId) return;
            setLoading(true);
            try {
                // 1. Buscamos TODOS los eventos de este mes para el usuario, para pescar el nuestro
                const fechaHoy = new Date();
                const start = `${fechaHoy.getFullYear()}-01-01`; // Rango amplio
                const end = `${fechaHoy.getFullYear()}-12-31`;
                
                const todosLosEventos = await obtenerEventosCalendario(targetUserId, start, end, userId);
                const miEvento = todosLosEventos.find(e => e.id === eventoId);

                if (!miEvento) {
                    throw new Error("Evento no encontrado en el calendario");
                }

                // 2. Ahora que tenemos el evento y sabemos qué rutina es, pedimos el historial
                // Nota: Tu backend debe tener un endpoint que devuelva la sesión exacta por su ID. 
                // Por ahora usamos la última sesión como hicimos en la otra pantalla, asumiendo que es esa.
                const lastSession = await obtenerUltimaSesionRutina(targetUserId, miEvento.rutinaId);
                
                if (!lastSession) {
                     throw new Error("No hay registros de series para esta sesión");
                }

                // 3. Transformamos la respuesta "cruda" del backend al formato que espera este diseño
                const sessionReformateada = {
                    fecha: miEvento.fecha,
                    duracion: lastSession.duracionSegundos || 0,
                    volumenTotal: 0,
                    notas: lastSession.notasGenerales || "",
                    ejercicios: []
                };

                let volumenGlobal = 0;
                const mapaEjercicios = {};

                // Agrupamos las series sueltas por Ejercicio
                if (lastSession.series && Array.isArray(lastSession.series)) {
                     lastSession.series.forEach(s => {
                         const ejName = s.ejercicioNombre || (s.ejercicio && s.ejercicio.nombre) || "Ejercicio Desconocido";
                         
                         if (!mapaEjercicios[ejName]) {
                             mapaEjercicios[ejName] = [];
                         }
                         
                         mapaEjercicios[ejName].push({
                             kilos: parseFloat(s.peso) || 0,
                             repes: parseInt(s.reps) || 0,
                             rpe: parseInt(s.rpe) || 0
                         });

                         volumenGlobal += (parseFloat(s.peso) || 0) * (parseInt(s.reps) || 0);
                     });
                }

                // Convertimos el mapa en un Array para que lo lea el .map del diseño
                for (const [nombre, seriesArray] of Object.entries(mapaEjercicios)) {
                     sessionReformateada.ejercicios.push({
                         nombre: nombre,
                         series: seriesArray
                     });
                }

                sessionReformateada.volumenTotal = volumenGlobal;

                setSesion(sessionReformateada);

            } catch (error) {
                console.error("Error reconstruyendo la sesión:", error);
            } finally {
                setLoading(false);
            }
        };

        cargarData();
        
        // Bloquear scroll del body cuando está abierto
        document.body.style.overflow = 'hidden';
        return () => document.body.style.overflow = 'unset';
    }, [eventoId, targetUserId, userId]);

    const formatTiempo = (seg) => {
        if (!seg) return "0 min";
        const min = Math.floor(seg / 60);
        return `${min} min`;
    };

    const formatFecha = (fechaStr) => {
        if (!fechaStr) return "";
        return new Date(fechaStr).toLocaleDateString('es-ES', { 
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
        });
    };

    if (!eventoId) return null;

    const styles = {
        overlay: {
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', 
            backdropFilter: 'blur(4px)', zIndex: 999, display: 'flex', justifyContent: 'flex-end',
            transition: 'opacity 0.3s'
        },
        drawer: {
            width: '100%', maxWidth: '600px', 
            height: '100%', 
            background: '#09090b', 
            borderLeft: '1px solid #27272a',
            boxShadow: '-10px 0 30px rgba(0,0,0,0.5)',
            display: 'flex', flexDirection: 'column',
            animation: 'slideIn 0.3s ease-out'
        },
        header: {
            padding: '30px', borderBottom: '1px solid #27272a',
            background: '#121214',
            display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'
        },
        content: {
            flex: 1, overflowY: 'auto', padding: '30px',
        },
        statsGrid: {
            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginTop: '20px'
        },
        statBox: {
            background: '#18181b', padding: '15px', borderRadius: '12px', border: '1px solid #27272a',
            display: 'flex', flexDirection: 'column', alignItems: 'center'
        },
        statLabel: { fontSize: '0.7rem', color: '#71717a', fontWeight: '800', textTransform: 'uppercase', marginBottom: '5px' },
        statValue: { fontSize: '1.2rem', color: 'white', fontWeight: '900' },

        ejercicioCard: {
            background: '#121214', borderRadius: '16px', border: '1px solid #27272a', marginBottom: '25px', overflow: 'hidden'
        },
        ejHeader: {
            padding: '15px 20px', background: '#18181b', borderBottom: '1px solid #27272a',
            display: 'flex', alignItems: 'center', gap: '10px'
        },
        ejTitle: { fontSize: '1rem', fontWeight: 'bold', color: 'white', textTransform: 'uppercase' },
        
        table: { width: '100%', borderCollapse: 'collapse' },
        th: { textAlign: 'center', color: '#52525b', fontSize: '0.7rem', padding: '10px 20px', fontWeight: '800', textTransform: 'uppercase' },
        td: { padding: '12px 20px', borderBottom: '1px solid #1f1f22', color: '#d4d4d8', fontSize: '0.9rem', textAlign: 'center' },
        
        notesBox: {
            marginTop: '10px', padding: '20px', background: 'rgba(250, 204, 21, 0.05)', 
            border: '1px solid rgba(250, 204, 21, 0.2)', borderRadius: '12px', color: '#e4e4e7'
        },
        closeBtn: {
            background: '#27272a', border: 'none', color: 'white', width: '36px', height: '36px', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            transition: 'background 0.2s'
        }
    };

    return (
        <div style={styles.overlay} onClick={onClose}>
            <style>{`
                @keyframes slideIn {
                    from { transform: translateX(100%); }
                    to { transform: translateX(0); }
                }
            `}</style>

            <div style={styles.drawer} onClick={e => e.stopPropagation()}>
                
                {/* 1. HEADER FIJO */}
                <div style={styles.header}>
                    <div>
                        <div style={{display:'flex', alignItems:'center', gap:'8px', color:'#FACC15', fontSize:'0.8rem', fontWeight:'bold', marginBottom:'5px', textTransform:'uppercase'}}>
                            <Calendar size={14}/> {sesion ? formatFecha(sesion.fecha) : "Cargando..."}
                        </div>
                        <h2 style={{margin:0, fontSize:'1.8rem', fontWeight:'900', color:'white', textTransform:'uppercase'}}>
                            Resumen Sesión
                        </h2>
                    </div>
                    <button style={styles.closeBtn} onClick={onClose}><X size={20}/></button>
                </div>

                {loading ? (
                    <div style={{height:'100%', display:'flex', alignItems:'center', justifyContent:'center', color:'#555'}}>
                        Cargando datos del atleta...
                    </div>
                ) : sesion ? (
                    <div style={styles.content}>
                        
                        {/* 2. STATS */}
                        <div style={styles.statsGrid}>
                            <div style={styles.statBox}>
                                <span style={styles.statLabel}>Duración</span>
                                <div style={{display:'flex', alignItems:'center', gap:'5px'}}>
                                    <Clock size={16} color="#FACC15"/>
                                    <span style={styles.statValue}>{formatTiempo(sesion.duracion)}</span>
                                </div>
                            </div>
                            <div style={styles.statBox}>
                                <span style={styles.statLabel}>Volumen</span>
                                <div style={{display:'flex', alignItems:'center', gap:'5px'}}>
                                    <Activity size={16} color="#FACC15"/>
                                    <span style={styles.statValue}>{sesion.volumenTotal?.toLocaleString()} kg</span>
                                </div>
                            </div>
                            <div style={styles.statBox}>
                                <span style={styles.statLabel}>Ejercicios</span>
                                <div style={{display:'flex', alignItems:'center', gap:'5px'}}>
                                    <Dumbbell size={16} color="#FACC15"/>
                                    <span style={styles.statValue}>{sesion.ejercicios?.length || 0}</span>
                                </div>
                            </div>
                        </div>

                        <div style={{height:'30px'}}></div>

                        {/* 3. NOTAS GENERALES */}
                        {sesion.notas && (
                            <div style={styles.notesBox}>
                                <div style={{display:'flex', alignItems:'center', gap:'8px', fontWeight:'bold', color:'#FACC15', marginBottom:'8px', fontSize:'0.8rem', textTransform:'uppercase'}}>
                                    <FileText size={16}/> Notas del Atleta
                                </div>
                                <p style={{margin:0, lineHeight:'1.5', fontStyle:'italic'}}>"{sesion.notas}"</p>
                            </div>
                        )}

                        <div style={{height:'30px'}}></div>

                        {/* 4. LISTA DE EJERCICIOS */}
                        <h3 style={{color:'#52525b', fontSize:'0.85rem', fontWeight:'800', textTransform:'uppercase', letterSpacing:'1px', marginBottom:'15px'}}>Detalle del entrenamiento</h3>
                        
                        {sesion.ejercicios && sesion.ejercicios.map((ej, idx) => (
                            <div key={idx} style={styles.ejercicioCard}>
                                <div style={styles.ejHeader}>
                                    <div style={{background:'#27272a', padding:'8px', borderRadius:'8px'}}>
                                        <Dumbbell size={18} color="#FACC15"/>
                                    </div>
                                    <div style={styles.ejTitle}>{ej.nombre}</div>
                                </div>
                                <table style={styles.table}>
                                    <thead>
                                        <tr>
                                            <th style={{...styles.th, textAlign: 'left'}}>Serie</th>
                                            <th style={styles.th}>Kilos</th>
                                            <th style={styles.th}>Reps</th>
                                            <th style={styles.th}>RPE</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {ej.series.map((serie, sIdx) => (
                                            <tr key={sIdx}>
                                                <td style={{...styles.td, fontWeight:'bold', color:'#555', textAlign: 'left'}}>#{sIdx + 1}</td>
                                                <td style={{...styles.td, fontWeight:'bold', color:'#FACC15'}}>{serie.kilos} kg</td>
                                                <td style={{...styles.td, color: 'white', fontWeight: 'bold'}}>{serie.repes}</td>
                                                <td style={styles.td}>
                                                    {serie.rpe > 0 ? <span style={{background:'#27272a', padding:'4px 8px', borderRadius:'4px', fontSize:'0.75rem', fontWeight: 'bold', color: 'white'}}>RPE {serie.rpe}</span> : <span style={{color: '#444'}}>-</span>}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div style={{padding:'40px', textAlign:'center', color:'#555'}}>
                        No se encontraron datos para este entrenamiento.
                    </div>
                )}
            </div>
        </div>
    );
}