import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { obtenerEjercicios, guardarRutinaManual } from '../../api/endpoints';

// --- ICONOS SVG ---
const IconSearch = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>;
const IconTrash = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>;
const IconPlus = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
const IconDumbbell = () => <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M6.5 6.5h11"></path><path d="M6.5 17.5h11"></path><path d="M6 20v-3.5a2.5 2.5 0 0 1 5 0V20"></path><path d="M18 20v-3.5a2.5 2.5 0 0 0-5 0V20"></path><path d="M6 4v3.5a2.5 2.5 0 0 0 5 0V4"></path><path d="M18 4v3.5a2.5 2.5 0 0 1-5 0V4"></path></svg>;
const IconInfo = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>;
const IconClose = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>;
const IconVideo = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>;
const IconSave = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>;
const IconImageOff = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>;
const IconChevronLeft = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>;

const CrearEntrenamiento = ({ 
    clienteIdProp = null, 
    rutinaInicial = null, 
    onGuardarSuccess = null 
}) => {
    const navigate = useNavigate();
    
    // --- ESTADOS ---
    const [busqueda, setBusqueda] = useState("");
    const [filtroMusculo, setFiltroMusculo] = useState("");
    const [listaEjercicios, setListaEjercicios] = useState([]);
    
    // Datos de la rutina
    const [nombreRutina, setNombreRutina] = useState("");
    const [descripcionRutina, setDescripcionRutina] = useState("");
    const [ejerciciosSeleccionados, setEjerciciosSeleccionados] = useState([]);
    const [infoEjercicio, setInfoEjercicio] = useState(null);

    // --- 1. MODO EDICIÓN ---
    useEffect(() => {
        if (rutinaInicial) {
            setNombreRutina(rutinaInicial.nombre || "");
            setDescripcionRutina(rutinaInicial.descripcion || "");
            
            if (rutinaInicial.detalles) {
                const mapeados = rutinaInicial.detalles.map(d => ({
                    idEjercicio: d.ejercicio.id,
                    nombre: d.ejercicio.nombre,
                    musculo: d.ejercicio.grupoMuscular,
                    imagen: d.ejercicio.imagenUrl,
                    videoLink: d.ejercicio.videoUrl,
                    descripcion: d.ejercicio.instrucciones,
                    dificultad: d.ejercicio.dificultad,
                    series: d.series,
                    reps: d.repeticiones,
                    peso: d.peso || 0,
                    rpe: d.rpe || 0,
                    notas: d.notas || "",
                    tempId: crypto.randomUUID()
                }));
                setEjerciciosSeleccionados(mapeados);
            }
        }
    }, [rutinaInicial]);

    // --- 2. CARGAR BIBLIOTECA ---
    useEffect(() => {
        const fetchEjercicios = async () => {
            try {
                const params = new URLSearchParams();
                if(busqueda) params.append("nombre", busqueda);
                if(filtroMusculo) params.append("musculo", filtroMusculo);
                
                const res = await fetch(`http://localhost:8080/api/ejercicios/buscar?${params.toString()}`);
                if (res.ok) setListaEjercicios(await res.json());
            } catch (err) { console.error(err); }
        };
        const timeout = setTimeout(fetchEjercicios, 300);
        return () => clearTimeout(timeout);
    }, [busqueda, filtroMusculo]);

    // --- LÓGICA UI ---
    const agregarEjercicio = (ej) => {
        setEjerciciosSeleccionados([...ejerciciosSeleccionados, {
            idEjercicio: ej.id, nombre: ej.nombre, musculo: ej.grupoMuscular, 
            imagen: ej.imagenUrl, videoLink: ej.videoUrl, descripcion: ej.instrucciones, difficulty: ej.dificultad,
            series: 3, reps: 10, peso: 0, rpe: 8, notas: "", tempId: Date.now() + Math.random()
        }]);
    };

    const eliminar = (id) => setEjerciciosSeleccionados(prev => prev.filter(e => e.tempId !== id));
    const actualizar = (id, campo, valor) => setEjerciciosSeleccionados(prev => prev.map(e => e.tempId === id ? { ...e, [campo]: valor } : e));

    const abrirInfo = (e, ej, origen) => {
        e.stopPropagation();
        let datosNormalizados = {};
        if (origen === 'biblioteca') {
            datosNormalizados = {
                nombre: ej.nombre,
                musculo: ej.grupoMuscular,
                imagen: ej.imagenUrl,
                videoLink: ej.videoUrl,
                descripcion: ej.instrucciones,
                dificultad: ej.dificultad
            };
        } else {
            datosNormalizados = ej;
        }
        setInfoEjercicio(datosNormalizados);
    };

    // --- 🚨 LÓGICA DE CANCELAR / VOLVER (CORREGIDA) ---
    const handleVolver = () => {
        // 1. CAPTURAMOS EL MODO ANTES DE LIMPIAR
        // Si 'clienteObjetivoId' existe, significa que venimos de un flujo de Entrenador (el entrenador "apuntó" a un cliente).
        // Si NO existe, es que el cliente entró directamente.
        const modoEntrenador = localStorage.getItem("clienteObjetivoId");

        // 2. Limpiamos la variable
        localStorage.removeItem("clienteObjetivoId");

        // 3. Redirigimos según el modo detectado
        if (modoEntrenador) {
            navigate("/entrenador/dashboard");
        } else {
            navigate("/cliente/dashboard");
        }
    };

    // --- LÓGICA DE GUARDAR ---
    const guardar = async () => {
        if (!nombreRutina.trim()) return alert("Por favor, asigna un nombre a la rutina.");
        if (ejerciciosSeleccionados.length === 0) return alert("La rutina debe tener al menos un ejercicio.");
        
        // Capturamos esto ANTES de usarlo o borrarlo para saber quién lo creó
        const esModoEntrenador = localStorage.getItem("clienteObjetivoId");

        const idCliente = clienteIdProp || esModoEntrenador || localStorage.getItem("clienteId");
        
        if (!idCliente) return alert("Error de sesión: No se identificó al usuario destino.");

        // Detectar etiqueta correcta para el backend
        const entrenadorId = localStorage.getItem("entrenadorId");
        const etiquetaCreador = (entrenadorId && entrenadorId !== "null" && entrenadorId !== "undefined") ? "ENTRENADOR" : "CLIENTE"; 

        const payload = {
            idCliente,
            creador: etiquetaCreador,
            nombre: nombreRutina,
            descripcion: descripcionRutina,
            objetivo: "Personalizado",
            ejercicios: ejerciciosSeleccionados.map(e => ({
                idEjercicio: e.idEjercicio,
                series: parseInt(e.series),
                repeticiones: parseInt(e.reps),
                peso: parseFloat(e.peso),
                rpe: parseInt(e.rpe),
                notas: e.notas
            }))
        };

        try {
            const res = await fetch("http://localhost:8080/api/rutinas/manual", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                alert(rutinaInicial ? "✅ Rutina actualizada correctamente" : "✅ Nueva rutina creada");
                
                // Limpieza
                localStorage.removeItem("clienteObjetivoId");

                if (onGuardarSuccess) {
                    onGuardarSuccess(); 
                } else {
                    // Usamos la misma lógica que el botón volver:
                    // Si estábamos en modo entrenador (había un cliente objetivo), volvemos al entrenador.
                    // Si no, al cliente.
                    if (esModoEntrenador) {
                        navigate("/entrenador/dashboard");
                    } else {
                        navigate("/cliente/dashboard");
                    }
                }
            } else {
                const txt = await res.text();
                alert("Error al guardar: " + txt);
            }
        } catch (e) { alert("Error de conexión con el servidor."); }
    };

    // --- COMPONENTE AUXILIAR PARA IMAGEN ---
    const ImageWithFallback = ({ src, alt, style }) => {
        const [error, setError] = useState(false);
        useEffect(() => { setError(false); }, [src]);

        if (error || !src) {
            return (
                <div style={{...style, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'#111', border:'1px solid #333'}}>
                    <IconImageOff />
                    <span style={{fontSize:'0.6rem', color:'#555', marginTop:'4px', fontWeight:'bold', letterSpacing:'1px'}}>FOTO PENDIENTE</span>
                </div>
            );
        }
        return <img src={src} alt={alt} style={style} onError={() => setError(true)} />;
    };

    // --- ESTILOS "CYBERPUNK / HIGH-TECH" ---
    const styles = {
        container: { display: 'flex', height: '100vh', width: '100%', background: 'radial-gradient(circle at 10% 20%, #1a1a1a 0%, #000 90%)', color: 'white', fontFamily: 'sans-serif', overflow: 'hidden' },
        
        // --- SIDEBAR ---
        sidebar: { width: '380px', display: 'flex', flexDirection: 'column', borderRight: '1px solid rgba(255,255,255,0.05)', background: 'rgba(20,20,20,0.6)', backdropFilter: 'blur(10px)' },
        sidebarHeader: { padding: '25px', borderBottom: '1px solid rgba(255,255,255,0.05)' },
        
        searchWrapper: { position: 'relative', marginBottom: '12px' },
        searchInput: { width: '100%', padding: '14px 45px 14px 14px', borderRadius: '12px', background: '#0a0a0a', border: '1px solid #333', color: 'white', outline: 'none', transition: 'border 0.2s', boxSizing: 'border-box' },
        searchIconPos: { position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', color: '#666', pointerEvents: 'none' },
        selectInput: { width: '100%', padding: '12px', borderRadius: '12px', background: '#0a0a0a', color: '#888', border: '1px solid #333', outline: 'none', cursor: 'pointer' },
        
        // --- MAIN ---
        main: { flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' },
        header: { padding: '30px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid rgba(255,255,255,0.05)' },
        titleInput: { background: 'transparent', fontSize: '2.5rem', fontFamily: 'Teko, sans-serif', textTransform: 'uppercase', color: 'white', border: 'none', borderBottom: '2px solid transparent', width: '100%', outline: 'none', transition: 'border 0.3s' },
        
        cardArea: { flex: 1, overflowY: 'auto', padding: '40px', scrollBehavior: 'smooth' },
        card: { background: 'linear-gradient(145deg, #141414, #0f0f0f)', borderRadius: '16px', border: '1px solid #222', display: 'flex', overflow: 'hidden', marginBottom: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.4)', transition: 'transform 0.2s', position: 'relative', minHeight: '220px' },
        
        // --- SECCIÓN IMAGEN ---
        imageSection: { width: '220px', height: '220px', position: 'relative', borderRight: '1px solid #222', background: '#000', flexShrink: 0 },
        infoBtn: { position: 'absolute', top: '10px', left: '10px', background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white', transition: 'all 0.2s', zIndex: 20 },
        indexBadge: { position: 'absolute', bottom: '10px', right: '10px', background: '#FACC15', color: 'black', fontWeight: 'bold', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem', boxShadow: '0 2px 10px rgba(250,204,21,0.3)' },

        dataSection: { flex: 1, padding: '20px 25px', display: 'flex', flexDirection: 'column' },
        cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' },
        cardTitle: { margin: 0, fontSize: '1.4rem', fontFamily: 'Teko, sans-serif', textTransform: 'uppercase', letterSpacing: '1px', lineHeight: '1.1' },
        cardSubtitle: { color: '#FACC15', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '5px' },
        
        controlPanel: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1px', background: '#2a2a2a', borderRadius: '12px', overflow: 'hidden', border: '1px solid #333', marginTop: 'auto' }, 
        controlItem: { background: '#181818', padding: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
        controlLabel: { fontSize: '0.65rem', color: '#666', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '1px' },
        controlInput: { width: '100%', background: 'transparent', border: 'none', color: 'white', textAlign: 'center', fontSize: '1.2rem', fontWeight: 'bold', outline: 'none', fontFamily: 'monospace' },

        // --- BOTONES ---
        backBtn: { background: 'transparent', border: '1px solid #333', color: '#888', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', marginRight:'20px', transition:'all 0.2s' },
        saveBtn: { background: '#FACC15', color: 'black', border: 'none', padding: '12px 30px', borderRadius: '50px', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 0 15px rgba(250, 204, 21, 0.4)', transition: 'all 0.3s' },

        modalOverlay: { position:'fixed', top:0, left:0, width:'100%', height:'100%', background:'rgba(0,0,0,0.9)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(5px)' },
        modalContent: { background: '#111', width: '90%', maxWidth: '700px', borderRadius: '20px', border: '1px solid #333', boxShadow: '0 50px 100px rgba(0,0,0,0.8)', overflow: 'hidden' }
    };

    return (
        <div style={styles.container}>
            
            {/* TRUCO CSS: QUITAR FLECHAS INPUT NUMBER */}
            <style>{`
                input[type=number]::-webkit-outer-spin-button,
                input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
                input[type=number] { -moz-appearance: textfield; }
            `}</style>

            {/* SIDEBAR */}
            <div style={styles.sidebar}>
                <div style={styles.sidebarHeader}>
                    <h2 style={{ color: 'white', margin: '0 0 20px 0', fontFamily: 'Teko, sans-serif', fontSize: '2rem' }}>
                        BIBLIOTECA <span style={{color: '#FACC15'}}>FIT</span>
                    </h2>
                    <div style={styles.searchWrapper}>
                        <input style={styles.searchInput} placeholder="Buscar ejercicio..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
                        <div style={styles.searchIconPos}><IconSearch /></div>
                    </div>
                    <select style={styles.selectInput} value={filtroMusculo} onChange={e => setFiltroMusculo(e.target.value)}>
                        <option value="">Filtrar por músculo...</option><option value="Pecho">Pecho</option><option value="Espalda">Espalda</option><option value="Piernas">Piernas</option><option value="Hombros">Hombros</option><option value="Brazos">Brazos</option><option value="Abdominales">Abdominales</option>
                    </select>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {listaEjercicios.map(ej => (
                        <div key={ej.id} 
                             onClick={() => agregarEjercicio(ej)} 
                             style={{ display: 'flex', alignItems: 'center', padding: '12px', background: '#1a1a1a', borderRadius: '12px', cursor: 'pointer', gap:'15px', border: '1px solid transparent', transition: 'all 0.2s', position:'relative' }}
                             onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#FACC15'; e.currentTarget.style.background = '#222'; }}
                             onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = '#1a1a1a'; }}
                        >
                            <ImageWithFallback src={ej.imagenUrl} style={{width:'45px', height:'45px', borderRadius:'8px', objectFit:'cover', background:'#000'}} />
                            <div style={{flex:1}}>
                                <div style={{fontWeight:'bold', fontSize:'0.95rem', color: 'white'}}>{ej.nombre}</div>
                                <div style={{fontSize:'0.7rem', color:'#666', textTransform:'uppercase', letterSpacing:'1px'}}>{ej.grupoMuscular}</div>
                            </div>
                            
                            {/* BOTÓN INFO EN LA BIBLIOTECA */}
                            <button 
                                onClick={(e) => abrirInfo(e, ej, 'biblioteca')}
                                style={{background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#aaa', marginRight: '5px'}}
                                title="Ver detalles"
                                onMouseEnter={(e) => {e.currentTarget.style.background = '#FACC15'; e.currentTarget.style.color = 'black'}}
                                onMouseLeave={(e) => {e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#aaa'}}
                            >
                                <IconInfo />
                            </button>

                            <div style={{background: '#FACC15', borderRadius:'50%', padding:'4px', display:'flex', color:'black'}}><IconPlus /></div>
                        </div>
                    ))}
                </div>
            </div>

            {/* MAIN PANEL */}
            <div style={styles.main}>
                <div style={styles.header}>
                    <button 
                        style={styles.backBtn} 
                        onClick={handleVolver}
                        onMouseEnter={e => e.currentTarget.style.color = 'white'}
                        onMouseLeave={e => e.currentTarget.style.color = '#888'}
                    >
                        <IconChevronLeft /> CANCELAR
                    </button>

                    <div style={{flex: 1, marginRight: '40px'}}>
                        <input 
                            style={styles.titleInput} 
                            placeholder="NOMBRE DE TU RUTINA" 
                            value={nombreRutina} 
                            onChange={e => setNombreRutina(e.target.value)} 
                            onFocus={e => e.target.style.borderBottom = '2px solid #FACC15'}
                            onBlur={e => e.target.style.borderBottom = '2px solid transparent'}
                        />
                        <input 
                            style={{ background: 'transparent', border: 'none', width: '100%', marginTop: '10px', color: '#888', outline: 'none', fontSize: '1rem' }} 
                            placeholder="Añade una descripción breve o notas iniciales..." 
                            value={descripcionRutina} 
                            onChange={e => setDescripcionRutina(e.target.value)} 
                        />
                    </div>
                    <button 
                        style={styles.saveBtn} 
                        onClick={guardar}
                        onMouseEnter={e => {e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.boxShadow = '0 0 25px rgba(250, 204, 21, 0.6)';}}
                        onMouseLeave={e => {e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 0 15px rgba(250, 204, 21, 0.4)';}}
                    >
                        <IconSave /> {rutinaInicial ? "ACTUALIZAR" : "GUARDAR"}
                    </button>
                </div>

                <div style={styles.cardArea}>
                    {ejerciciosSeleccionados.length === 0 ? (
                        <div style={{textAlign:'center', color:'#333', marginTop:'100px', display:'flex', flexDirection:'column', alignItems:'center'}}>
                            <IconDumbbell />
                            <h2 style={{fontFamily: 'Teko, sans-serif', fontSize: '2rem', color:'#444', margin: '20px 0 5px 0'}}>ESPACIO DE TRABAJO VACÍO</h2>
                            <p style={{color:'#666'}}>Selecciona ejercicios de la biblioteca para comenzar a diseñar.</p>
                        </div>
                    ) : (
                        ejerciciosSeleccionados.map((ej, index) => (
                            <div key={ej.tempId} style={styles.card}>
                                {/* SECCIÓN VISUAL (IZQUIERDA) - TAMAÑO FIJO */}
                                <div style={styles.imageSection}>
                                    {/* BOTÓN INFO SOBRE LA IMAGEN */}
                                    <button 
                                        style={styles.infoBtn} 
                                        onClick={(e) => abrirInfo(e, ej, 'local')} 
                                        title="Información técnica"
                                        onMouseEnter={e => {e.currentTarget.style.background = '#FACC15'; e.currentTarget.style.color='black'}}
                                        onMouseLeave={e => {e.currentTarget.style.background = 'rgba(0,0,0,0.7)'; e.currentTarget.style.color='white'}}
                                    >
                                        <IconInfo />
                                    </button>
                                    
                                    <ImageWithFallback src={ej.imagen} style={{width:'100%', height:'100%', objectFit:'cover'}} />
                                    <div style={styles.indexBadge}>#{index + 1}</div>
                                </div>

                                {/* SECCIÓN DATOS (DERECHA) */}
                                <div style={styles.dataSection}>
                                    <div style={styles.cardHeader}>
                                        <div>
                                            <div style={styles.cardSubtitle}>{ej.musculo}</div>
                                            <h3 style={styles.cardTitle}>{ej.nombre}</h3>
                                        </div>
                                        <button onClick={() => eliminar(ej.tempId)} style={{background:'transparent', border:'none', color:'#444', cursor:'pointer', padding:'8px'}} title="Eliminar"><IconTrash /></button>
                                    </div>

                                    {/* PANEL DE CONTROL DE INPUTS */}
                                    <div style={styles.controlPanel}>
                                        <div style={styles.controlItem}>
                                            <label style={styles.controlLabel}>Series</label>
                                            <input type="number" style={styles.controlInput} value={ej.series} onChange={e => actualizar(ej.tempId, 'series', e.target.value)} />
                                        </div>
                                        <div style={{...styles.controlItem, borderLeft: '1px solid #222'}}>
                                            <label style={styles.controlLabel}>Reps</label>
                                            <input type="number" style={styles.controlInput} value={ej.reps} onChange={e => actualizar(ej.tempId, 'reps', e.target.value)} />
                                        </div>
                                        <div style={{...styles.controlItem, borderLeft: '1px solid #222'}}>
                                            <label style={{...styles.controlLabel, color: '#FACC15'}}>Peso (Kg)</label>
                                            <input type="number" style={{...styles.controlInput, color: '#FACC15'}} value={ej.peso} onChange={e => actualizar(ej.tempId, 'peso', e.target.value)} />
                                        </div>
                                        <div style={{...styles.controlItem, borderLeft: '1px solid #222'}}>
                                            <label style={{...styles.controlLabel, color: '#60A5FA'}}>RPE</label>
                                            <input type="number" style={{...styles.controlInput, color: '#60A5FA'}} value={ej.rpe} onChange={e => actualizar(ej.tempId, 'rpe', e.target.value)} />
                                        </div>
                                    </div>

                                    <input 
                                        type="text" 
                                        style={{width:'100%', marginTop:'15px', background:'transparent', borderBottom:'1px solid #333', borderTop:'none', borderLeft:'none', borderRight:'none', color:'#aaa', outline:'none', padding:'8px 0', fontSize:'0.9rem'}} 
                                        placeholder="📝 Notas técnicas (ej: Descanso 90s, tempo lento...)" 
                                        value={ej.notas} 
                                        onChange={e => actualizar(ej.tempId, 'notas', e.target.value)} 
                                    />
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* MODAL CON ESTILO PRO */}
            {infoEjercicio && (
                <div style={styles.modalOverlay} onClick={() => setInfoEjercicio(null)}>
                    <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
                        <div style={{padding:'20px 30px', borderBottom:'1px solid #222', display:'flex', justifyContent:'space-between', alignItems:'center', background:'#151515'}}>
                            <h3 style={{margin:0, fontFamily: 'Teko, sans-serif', fontSize: '1.8rem', textTransform: 'uppercase'}}>{infoEjercicio.nombre}</h3>
                            <button onClick={() => setInfoEjercicio(null)} style={{background:'none', border:'none', color:'#666', cursor:'pointer'}}><IconClose /></button>
                        </div>
                        {/* AQUÍ ESTÁ EL CAMBIO CLAVE: objectFit: 'cover' para llenar el cuadro */}
                        <div style={{position: 'relative', width:'100%', height:'300px', background:'black'}}>
                            <ImageWithFallback 
                                src={infoEjercicio.imagen} 
                                style={{width:'100%', height:'100%', objectFit:'cover', objectPosition: 'center'}} 
                            />
                            <div style={{position:'absolute', bottom:0, left:0, width:'100%', height:'60px', background:'linear-gradient(to top, #111, transparent)'}}></div>
                        </div>
                        <div style={{padding:'30px'}}>
                            <div style={{display:'flex', gap:'10px', marginBottom:'20px'}}>
                                <span style={{background:'#FACC15', color:'black', padding:'4px 12px', borderRadius:'4px', fontSize:'0.75rem', fontWeight:'bold', textTransform:'uppercase'}}>{infoEjercicio.musculo}</span>
                                {infoEjercicio.dificultad && <span style={{border:'1px solid #333', color:'#888', padding:'4px 12px', borderRadius:'4px', fontSize:'0.75rem', textTransform:'uppercase'}}>{infoEjercicio.dificultad}</span>}
                            </div>
                            <p style={{color:'#ccc', lineHeight:'1.6', fontSize:'1rem', whiteSpace: 'pre-line'}}>
                                {infoEjercicio.descripcion || "No hay instrucciones detalladas disponibles."}
                            </p>
                            {infoEjercicio.videoLink && (
                                <a href={infoEjercicio.videoLink} target="_blank" rel="noreferrer" 
                                   style={{display:'inline-flex', alignItems:'center', gap:'10px', color:'black', background: '#FACC15', textDecoration:'none', marginTop:'25px', fontWeight:'bold', padding: '12px 20px', borderRadius: '8px', transition: 'filter 0.2s'}}
                                   onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.1)'}
                                   onMouseLeave={e => e.currentTarget.style.filter = 'brightness(1)'}
                                >
                                    <IconVideo /> VER TUTORIAL EN YOUTUBE
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CrearEntrenamiento;