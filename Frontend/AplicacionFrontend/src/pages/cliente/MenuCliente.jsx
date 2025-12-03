import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { RutinaService } from "../../api/rutinaService";

// Iconos y UI
import { 
  Dumbbell, Clock, User, LogOut, 
  Sparkles, PenTool, TrendingUp, Home, Building, ChevronLeft, Flame, Activity,
  LayoutDashboard, CalendarCheck, Plus, Trash2, Save
} from "lucide-react";

// Componentes UI
import GymButton from "../../components/ui/GymButton"; 
import GymSelectionCard from "../../components/ui/GymSelectionCard"; 
import ActionCard from "../../components/ui/ActionCard"; 
import RoutineSummaryCard from "../../components/ui/RoutineSummaryCard";

export default function MenuCliente() {
  const navigate = useNavigate();
  const [rutinas, setRutinas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);

  // --- ESTADOS DE VISTAS ---
  const [view, setView] = useState("DASHBOARD"); // "DASHBOARD", "AI_FORM", "MANUAL_FORM"

  // --- ESTADOS FORMULARIO IA ---
  const [creatingRoutine, setCreatingRoutine] = useState(false);
  const [aiData, setAiData] = useState({
    nivel: "PRINCIPIANTE",
    diasPorSemana: 3,
    lugar: "GIMNASIO",
    objetivo: "FUERZA"
  });

  // --- ESTADOS FORMULARIO MANUAL ---
  const [catalogoEjercicios, setCatalogoEjercicios] = useState([]); // Todos los de la BD
  const [manualData, setManualData] = useState({
    nombre: "",
    objetivo: "FUERZA",
    descripcion: "",
    ejercicios: [] // { idEjercicio, series, repeticiones, notas, nombre }
  });

  // --- CARGA INICIAL ---
  useEffect(() => {
    const storedId = localStorage.getItem("registration_userId");
    if (storedId) {
      setUserId(storedId);
      cargarRutinas(storedId);
    } else {
      setLoading(false);
    }
  }, []);

  const cargarRutinas = async (id) => {
    try {
      const data = await RutinaService.obtenerRutinasUsuario(id);
      setRutinas(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // --- LÓGICA IA ---
  const handleGenerateAI = async () => {
    try {
      setCreatingRoutine(true);
      const payload = {
        idCliente: userId,
        ...aiData,
        diasPorSemana: parseInt(aiData.diasPorSemana)
      };
      await RutinaService.generarRutinaAuto(payload);
      setView("DASHBOARD");
      await cargarRutinas(userId);
    } catch (error) {
      alert("Error: " + error.message);
    } finally {
      setCreatingRoutine(false);
    }
  };

  // --- LÓGICA MANUAL ---
  const abrirManual = async () => {
    setView("MANUAL_FORM");
    // Cargar ejercicios de la BD si no están cargados
    if (catalogoEjercicios.length === 0) {
      const data = await RutinaService.obtenerEjercicios();
      setCatalogoEjercicios(data);
    }
  };

  const agregarEjercicioManual = (ejercicio) => {
    // Añadir ejercicio a la lista con valores por defecto
    const nuevoDetalle = {
      idEjercicio: ejercicio.id,
      nombre: ejercicio.nombre, // Para mostrarlo en la lista
      series: 4,
      repeticiones: 12,
      notas: ""
    };
    setManualData({
      ...manualData,
      ejercicios: [...manualData.ejercicios, nuevoDetalle]
    });
  };

  const quitarEjercicioManual = (index) => {
    const nuevos = [...manualData.ejercicios];
    nuevos.splice(index, 1);
    setManualData({ ...manualData, ejercicios: nuevos });
  };

  const actualizarDetalleManual = (index, campo, valor) => {
    const nuevos = [...manualData.ejercicios];
    nuevos[index][campo] = valor;
    setManualData({ ...manualData, ejercicios: nuevos });
  };

  const guardarRutinaManual = async () => {
    if (!manualData.nombre) return alert("Ponle un nombre a tu rutina.");
    if (manualData.ejercicios.length === 0) return alert("Añade al menos un ejercicio.");

    try {
      setCreatingRoutine(true);
      const payload = {
        idCliente: userId,
        nombre: manualData.nombre,
        objetivo: manualData.objetivo,
        descripcion: manualData.descripcion || "Rutina creada manualmente.",
        ejercicios: manualData.ejercicios
      };
      
      await RutinaService.crearRutinaManual(payload);
      setView("DASHBOARD");
      await cargarRutinas(userId);
      // Resetear form
      setManualData({ nombre: "", objetivo: "FUERZA", descripcion: "", ejercicios: [] });

    } catch (error) {
      alert("Error: " + error.message);
    } finally {
      setCreatingRoutine(false);
    }
  };

  const handleLogout = () => {
      localStorage.removeItem("registration_userId");
      navigate("/auth/login");
  };

  if (loading) return <div style={{background:'#111', minHeight:'100vh', color:'#FACC15', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'sans-serif'}}>CARGANDO PANEL...</div>;

  // ======================================================
  // VISTA 1: FORMULARIO IA
  // ======================================================
  if (view === "AI_FORM") {
    return (
      <div style={{ maxWidth: '800px', margin: '40px auto', padding: '40px', minHeight: '100vh', color: 'white' }}>
        <button onClick={() => setView("DASHBOARD")} style={{background:'none', border:'none', color:'#aaa', marginBottom: 30, display:'flex', alignItems:'center', cursor:'pointer', fontSize:'1rem'}}>
            <ChevronLeft size={24} /> VOLVER
        </button>
        
        <h1 style={{fontSize: '3rem', fontFamily: 'Teko, sans-serif', marginBottom: 10, color:'#FACC15', lineHeight:'1'}}>CONFIGURA TU IA</h1>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
            {/* Columna 1 */}
            <div style={{display:'flex', flexDirection:'column', gap:'25px'}}>
                <div>
                    <label style={{fontWeight:'bold', display:'block', marginBottom:15, color:'#ddd'}}>OBJETIVO</label>
                    <div style={{display:'flex', flexDirection:'column', gap:10}}>
                       <GymSelectionCard title="Fuerza" icon={Activity} selected={aiData.objetivo === "FUERZA"} onClick={() => setAiData({...aiData, objetivo:"FUERZA"})} />
                       <GymSelectionCard title="Hipertrofia" icon={Dumbbell} selected={aiData.objetivo === "GANAR_MASA"} onClick={() => setAiData({...aiData, objetivo:"GANAR_MASA"})} />
                       <GymSelectionCard title="Definición" icon={Flame} selected={aiData.objetivo === "PERDER_GRASA"} onClick={() => setAiData({...aiData, objetivo:"PERDER_GRASA"})} />
                    </div>
                </div>
            </div>
            {/* Columna 2 */}
            <div style={{display:'flex', flexDirection:'column', gap:'25px'}}>
                <div>
                    <label style={{fontWeight:'bold', display:'block', marginBottom:15, color:'#ddd'}}>EXPERIENCIA</label>
                    <div style={{display:'flex', gap:10}}>
                        <GymSelectionCard title="Principiante" icon={TrendingUp} selected={aiData.nivel === "PRINCIPIANTE"} onClick={() => setAiData({...aiData, nivel:"PRINCIPIANTE"})} />
                        <GymSelectionCard title="Intermedio" icon={TrendingUp} selected={aiData.nivel === "INTERMEDIO"} onClick={() => setAiData({...aiData, nivel:"INTERMEDIO"})} />
                    </div>
                </div>
                <div>
                    <label style={{fontWeight:'bold', display:'block', marginBottom:15, color:'#ddd'}}>DÍAS</label>
                    <div style={{display:'flex', gap:10}}>
                        {[3,4,5].map(d => (
                            <GymSelectionCard key={d} title={`${d}`} icon={CalendarCheck} selected={aiData.diasPorSemana === d} onClick={() => setAiData({...aiData, diasPorSemana: d})} />
                        ))}
                    </div>
                </div>
                <div>
                    <label style={{fontWeight:'bold', display:'block', marginBottom:15, color:'#ddd'}}>LUGAR</label>
                    <div style={{display:'flex', gap:10}}>
                        <GymSelectionCard title="Gimnasio" icon={Building} selected={aiData.lugar === "GIMNASIO"} onClick={() => setAiData({...aiData, lugar:"GIMNASIO"})} />
                        <GymSelectionCard title="Casa" icon={Home} selected={aiData.lugar === "CASA"} onClick={() => setAiData({...aiData, lugar:"CASA"})} />
                    </div>
                </div>
            </div>
        </div>
        <div style={{marginTop: 40}}>
            <GymButton fullWidth disabled={creatingRoutine} onClick={handleGenerateAI}>
                {creatingRoutine ? "GENERANDO..." : "CREAR MI PLAN AHORA"}
            </GymButton>
        </div>
      </div>
    );
  }

  // ======================================================
  // VISTA 2: FORMULARIO MANUAL (EDITOR)
  // ======================================================
  if (view === "MANUAL_FORM") {
    return (
      <div style={{ maxWidth: '1000px', margin: '30px auto', padding: '30px', minHeight: '100vh', color: 'white' }}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 30}}>
            <button onClick={() => setView("DASHBOARD")} style={{background:'none', border:'none', color:'#aaa', display:'flex', alignItems:'center', cursor:'pointer', fontSize:'1rem'}}>
                <ChevronLeft size={24} /> CANCELAR
            </button>
            <h1 style={{fontSize: '2.5rem', fontFamily: 'Teko, sans-serif', color:'#FACC15', margin:0}}>DISEÑADOR MANUAL</h1>
            <button onClick={guardarRutinaManual} disabled={creatingRoutine} style={{background:'#FACC15', color:'black', border:'none', padding:'10px 20px', borderRadius:'8px', fontWeight:'bold', cursor:'pointer', display:'flex', alignItems:'center', gap:'8px'}}>
                <Save size={18} /> {creatingRoutine ? "GUARDANDO..." : "GUARDAR RUTINA"}
            </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '30px' }}>
            
            {/* COLUMNA IZQUIERDA: CATÁLOGO */}
            <div style={{background:'#1a1a1a', padding:'20px', borderRadius:'15px', border:'1px solid #333', maxHeight:'80vh', overflowY:'auto'}}>
                <h3 style={{marginTop:0, marginBottom:15, display:'flex', alignItems:'center', gap:'10px'}}><Dumbbell size={18}/> Catálogo de Ejercicios</h3>
                <div style={{display:'flex', flexDirection:'column', gap:'10px'}}>
                    {catalogoEjercicios.map(ej => (
                        <div key={ej.id} 
                             onClick={() => agregarEjercicioManual(ej)}
                             style={{padding:'12px', background:'#2a2a2a', borderRadius:'8px', cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center', border:'1px solid #333'}}
                             onMouseEnter={(e) => e.currentTarget.style.borderColor = '#FACC15'}
                             onMouseLeave={(e) => e.currentTarget.style.borderColor = '#333'}
                        >
                            <div>
                                <div style={{fontWeight:'bold', fontSize:'0.9rem'}}>{ej.nombre}</div>
                                <div style={{fontSize:'0.75rem', color:'#888'}}>{ej.grupoMuscular} • {ej.equipamiento}</div>
                            </div>
                            <Plus size={18} color="#FACC15" />
                        </div>
                    ))}
                </div>
            </div>

            {/* COLUMNA DERECHA: TU RUTINA */}
            <div>
                {/* Datos Básicos */}
                <div style={{background:'#1a1a1a', padding:'20px', borderRadius:'15px', border:'1px solid #333', marginBottom:'20px'}}>
                    <div style={{display:'flex', gap:'20px', marginBottom:'15px'}}>
                        <div style={{flex:1}}>
                            <label style={{display:'block', marginBottom:5, fontSize:'0.8rem', color:'#aaa'}}>NOMBRE DE LA RUTINA</label>
                            <input 
                                type="text" 
                                placeholder="Ej: Pecho y Tríceps"
                                style={{width:'100%', padding:'10px', background:'#111', border:'1px solid #444', color:'white', borderRadius:'6px'}}
                                value={manualData.nombre}
                                onChange={(e) => setManualData({...manualData, nombre: e.target.value})}
                            />
                        </div>
                        <div style={{width:'150px'}}>
                            <label style={{display:'block', marginBottom:5, fontSize:'0.8rem', color:'#aaa'}}>OBJETIVO</label>
                            <select 
                                style={{width:'100%', padding:'10px', background:'#111', border:'1px solid #444', color:'white', borderRadius:'6px'}}
                                value={manualData.objetivo}
                                onChange={(e) => setManualData({...manualData, objetivo: e.target.value})}
                            >
                                <option value="FUERZA">Fuerza</option>
                                <option value="GANAR_MASA">Músculo</option>
                                <option value="PERDER_GRASA">Definición</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label style={{display:'block', marginBottom:5, fontSize:'0.8rem', color:'#aaa'}}>DESCRIPCIÓN (Opcional)</label>
                        <input 
                            type="text" 
                            placeholder="Notas generales..."
                            style={{width:'100%', padding:'10px', background:'#111', border:'1px solid #444', color:'white', borderRadius:'6px'}}
                            value={manualData.descripcion}
                            onChange={(e) => setManualData({...manualData, descripcion: e.target.value})}
                        />
                    </div>
                </div>

                {/* Lista de Ejercicios Seleccionados */}
                <div style={{background:'#1a1a1a', padding:'20px', borderRadius:'15px', border:'1px solid #333', minHeight:'300px'}}>
                    <h3 style={{marginTop:0, marginBottom:15}}>Ejercicios Seleccionados ({manualData.ejercicios.length})</h3>
                    
                    {manualData.ejercicios.length === 0 ? (
                        <div style={{textAlign:'center', color:'#666', padding:'40px'}}>
                            Selecciona ejercicios del catálogo de la izquierda para empezar.
                        </div>
                    ) : (
                        <div style={{display:'flex', flexDirection:'column', gap:'15px'}}>
                            {manualData.ejercicios.map((item, idx) => (
                                <div key={idx} style={{background:'#222', padding:'15px', borderRadius:'10px', border:'1px solid #444', display:'flex', alignItems:'center', gap:'15px'}}>
                                    <div style={{flex:1}}>
                                        <div style={{fontWeight:'bold', color:'#FACC15', marginBottom:'5px'}}>{item.nombre}</div>
                                        <div style={{display:'flex', gap:'10px'}}>
                                            <div style={{display:'flex', alignItems:'center', gap:'5px'}}>
                                                <span style={{fontSize:'0.8rem', color:'#aaa'}}>Series:</span>
                                                <input type="number" value={item.series} onChange={(e) => actualizarDetalleManual(idx, 'series', parseInt(e.target.value))} style={{width:'50px', background:'#111', border:'1px solid #555', color:'white', borderRadius:'4px', padding:'3px'}} />
                                            </div>
                                            <div style={{display:'flex', alignItems:'center', gap:'5px'}}>
                                                <span style={{fontSize:'0.8rem', color:'#aaa'}}>Repes:</span>
                                                <input type="number" value={item.repeticiones} onChange={(e) => actualizarDetalleManual(idx, 'repeticiones', parseInt(e.target.value))} style={{width:'50px', background:'#111', border:'1px solid #555', color:'white', borderRadius:'4px', padding:'3px'}} />
                                            </div>
                                        </div>
                                    </div>
                                    <button onClick={() => quitarEjercicioManual(idx)} style={{background:'rgba(255,0,0,0.1)', border:'none', padding:'8px', borderRadius:'6px', cursor:'pointer'}}>
                                        <Trash2 size={18} color="#ff4444" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
      </div>
    );
  }

  // ======================================================
  // VISTA 3: DASHBOARD PRINCIPAL
  // ======================================================
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0a0a0a', display: 'flex' }}>
      
      {/* SIDEBAR */}
      <aside style={{ width: '260px', background: '#111', borderRight: '1px solid #222', padding: '30px 20px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ marginBottom: '50px', display:'flex', alignItems:'center', gap:'10px' }}>
            <div style={{background:'#FACC15', padding:'8px', borderRadius:'8px'}}><Dumbbell size={24} color="black" /></div>
            <span style={{ fontFamily: 'Teko, sans-serif', fontSize: '1.8rem', color: 'white', letterSpacing:'1px' }}>NEXT FIT</span>
        </div>
        <nav style={{ flex: 1, display:'flex', flexDirection:'column', gap:'10px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'15px', color:'#FACC15', padding:'12px', background:'rgba(250, 204, 21, 0.1)', borderRadius:'10px', cursor:'pointer' }}>
                <LayoutDashboard size={20} /> <span style={{ fontWeight:'bold' }}>Panel Principal</span>
            </div>
            <div onClick={() => navigate("/cliente/explorar")} style={{ display:'flex', alignItems:'center', gap:'15px', color:'#888', padding:'12px', borderRadius:'10px', cursor:'pointer' }}>
                <Dumbbell size={20} /> <span>Ejercicios</span>
            </div>
        </nav>
        <button onClick={handleLogout} style={{width:'100%', background:'#222', border:'none', color:'#ccc', padding:'10px', borderRadius:'8px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', fontSize:'0.9rem', marginTop:'auto'}}>
            <LogOut size={16} /> Cerrar Sesión
        </button>
      </aside>

      {/* CONTENIDO */}
      <main style={{ flex: 1, padding: '40px 60px', overflowY:'auto' }}>
          <header style={{ marginBottom: '40px' }}>
            <h1 style={{ fontFamily: 'Teko, sans-serif', fontSize: '3.5rem', lineHeight: '1', color: 'white', textTransform: 'uppercase', margin: 0 }}>HOLA, ATLETA</h1>
            <p style={{ color: '#666', fontSize:'1.1rem', marginTop:'5px' }}>Tu centro de control.</p>
          </header>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '40px' }}>
              
              {/* IZQUIERDA: Rutinas */}
              <div style={{ display:'flex', flexDirection:'column', gap:'30px' }}>
                  <section>
                    <div style={{display:'flex', alignItems:'center', gap:'10px', marginBottom:'20px'}}>
                        <CalendarCheck color="#FACC15" size={24} />
                        <h2 style={{ color: 'white', fontSize: '1.5rem', fontWeight:'bold', margin:0 }}>MIS ENTRENAMIENTOS</h2>
                    </div>
                    {rutinas.length > 0 ? (
                        rutinas.map((rutina) => <RoutineSummaryCard key={rutina.id} rutina={rutina} onStart={(id) => console.log("Start", id)} />)
                    ) : (
                        <div style={{ padding: '40px', border: '2px dashed #333', borderRadius: '15px', textAlign: 'center', color: '#666' }}>
                            <p style={{fontSize:'1.1rem'}}>No tienes ninguna rutina activa.</p>
                        </div>
                    )}
                  </section>
              </div>

              {/* DERECHA: Acciones */}
              <div>
                  <h2 style={{ color: '#ccc', fontSize: '1rem', fontWeight:'bold', marginBottom:'20px', textTransform:'uppercase', letterSpacing:'1px' }}>ACCIONES RÁPIDAS</h2>
                  <div style={{display:'flex', flexDirection:'column', gap:'15px'}}>
                    <ActionCard 
                        title="Generar Plan con IA"
                        description="Plan automático y personalizado."
                        icon={Sparkles}
                        variant="highlight" 
                        onClick={() => setView("AI_FORM")}
                    />
                    <ActionCard 
                        title="Diseñar Manualmente"
                        description="Elige ejercicios de la biblioteca."
                        icon={PenTool}
                        onClick={abrirManual}
                    />
                  </div>
              </div>
          </div>
      </main>
    </div>
  );
}