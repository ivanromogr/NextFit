import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { obtenerRutinasCliente, eliminarRutina } from "../../api/endpoints"; 

// Iconos
import { 
  Dumbbell, Sparkles, PenTool, LogOut, LayoutGrid, 
  Calendar, Settings, Play, Activity, MoreHorizontal, ArrowRight,
  BarChart2, Edit, Trash2, AlertTriangle
} from "lucide-react";

export default function MenuCliente() {
  const navigate = useNavigate();
  const [rutinas, setRutinas] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Estado para el menú de 3 puntos
  const [activeMenu, setActiveMenu] = useState(null);

  // --- ESTADOS PARA EL MODAL DE ELIMINAR ---
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [rutinaToDelete, setRutinaToDelete] = useState(null);

  useEffect(() => {
    const storedId = localStorage.getItem("clienteId");
    if (storedId) {
      cargarRutinas(storedId);
    } else {
      navigate("/auth/login");
    }
  }, [navigate]);

  // Cerrar menú al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = () => setActiveMenu(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const cargarRutinas = async (id) => {
    try {
      setLoading(true);
      const data = await obtenerRutinasCliente(id);
      setRutinas(data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const toggleMenu = (e, id) => {
      e.stopPropagation();
      setActiveMenu(activeMenu === id ? null : id);
  };

  // --- LÓGICA DE ELIMINACIÓN ---
  const handleDeleteClick = (e, rutina) => {
      e.stopPropagation();
      setRutinaToDelete(rutina);
      setShowDeleteModal(true);
      setActiveMenu(null); // Cerrar el menú desplegable
  };

  const confirmDelete = async () => {
      if (!rutinaToDelete) return;

      try {
          await eliminarRutina(rutinaToDelete.id);
          // Actualizamos la lista visualmente quitando la borrada
          setRutinas(rutinas.filter(r => r.id !== rutinaToDelete.id));
          setShowDeleteModal(false);
          setRutinaToDelete(null);
      } catch (error) {
          console.error("Error al eliminar:", error);
          alert("No se pudo eliminar la rutina.");
      }
  };

  // --- ESTILOS PREMIUM DASHBOARD ---
  const styles = {
    wrapper: { display: 'flex', minHeight: '100vh', background: '#09090b', fontFamily: 'sans-serif', color: 'white' },
    
    sidebar: { width: '280px', background: '#0c0c0e', borderRight: '1px solid #1f1f22', padding: '35px 25px', display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh' },
    logo: { fontSize: '1.8rem', fontWeight: '900', color: 'white', marginBottom: '50px', display:'flex', alignItems:'center', gap:'12px', fontFamily: 'sans-serif', letterSpacing: '1px' },
    logoIcon: { background:'#FACC15', color:'black', padding:'6px', borderRadius:'8px', display:'flex', alignItems:'center', justifyContent:'center' },
    navItem: (active) => ({ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 18px', borderRadius: '12px', color: active ? '#FACC15' : '#a1a1aa', background: active ? 'rgba(250, 204, 21, 0.08)' : 'transparent', cursor: 'pointer', fontSize: '0.95rem', fontWeight: active ? '600' : '500', transition: 'all 0.2s ease', textDecoration: 'none' }),

    main: { flex: 1, padding: '50px 60px', overflowY: 'auto' },
    header: { marginBottom: '50px' },
    title: { fontSize: '2.5rem', fontWeight: '900', margin: 0, textTransform: 'uppercase', letterSpacing: '-0.5px', color: 'white' },
    subtitle: { color: '#71717a', marginTop:'10px', fontSize:'1.05rem', fontWeight:'400' },

    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '30px', paddingBottom: '50px' },

    rutinaCard: { background: '#121214', border: '1px solid #27272a', borderRadius: '20px', padding: '30px', display: 'flex', flexDirection: 'column', gap: '20px', transition: 'transform 0.2s, border-color 0.2s, box-shadow 0.2s', cursor: 'pointer', position: 'relative', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' },
    pill: { background: '#FACC15', color: 'black', padding: '4px 12px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing:'0.5px' },
    
    // MENÚ FLOTANTE
    menuContainer: { position: 'relative' },
    menuBtn: { color: '#71717a', cursor: 'pointer', padding: '5px', borderRadius: '50%', transition: 'background 0.2s' },
    dropdown: { 
        position: 'absolute', top: '30px', right: '0', 
        background: '#18181b', border: '1px solid #27272a', borderRadius: '12px', 
        padding: '6px', zIndex: 50, width: '160px', 
        boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
    },
    dropdownItem: { 
        display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', 
        color: '#e4e4e7', fontSize: '0.9rem', cursor: 'pointer', borderRadius: '8px', 
        transition: 'background 0.1s', fontWeight: '500' 
    },

    rutinaTitle: { fontSize:'1.6rem', fontWeight:'800', margin:0, textTransform:'uppercase', lineHeight: 1 },
    rutinaSub: { color: '#a1a1aa', fontSize: '0.85rem', fontWeight: '500', textTransform: 'uppercase', letterSpacing:'0.5px' },
    rutinaPreview: { color:'#71717a', fontSize:'0.9rem', lineHeight:'1.5', height:'40px', overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' },

    btnPlay: { marginTop: 'auto', background: '#007AFF', color: 'white', border: 'none', padding: '14px', borderRadius: '12px', fontWeight: '700', cursor: 'pointer', width: '100%', textAlign: 'center', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.5px', transition: 'background 0.2s, transform 0.1s' },

    iaCard: { background: 'linear-gradient(135deg, rgba(250, 204, 21, 0.03) 0%, rgba(0,0,0,0) 100%)', border: '1px solid #FACC15', borderRadius: '20px', padding: '30px', cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', gap: '15px', position: 'relative', height: '100%', minHeight: '260px', transition: 'all 0.2s' },
    iaIconBox: { background: 'rgba(250, 204, 21, 0.1)', padding:'18px', borderRadius:'50%', color:'#FACC15', marginBottom:'5px' },
    iaText: { color: 'white', fontSize: '1.2rem', fontWeight: '800', textTransform: 'uppercase' },
    iaSub: { color: '#a1a1aa', fontSize: '0.9rem' },

    manualCard: { background: 'transparent', border: '2px dashed #27272a', borderRadius: '20px', padding: '30px', cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', gap: '15px', height: '100%', minHeight: '260px', transition: 'border-color 0.2s, background 0.2s' },

    // --- ESTILOS DEL MODAL DE ELIMINAR ---
    modalOverlay: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)', zIndex: 100, display: 'flex', justifyContent: 'center', alignItems: 'center' },
    modalCard: { background: '#121212', padding: '40px', borderRadius: '24px', border: '1px solid #27272a', textAlign: 'center', maxWidth: '400px', width: '90%', boxShadow: '0 25px 80px rgba(0,0,0,0.9)' },
    modalTitle: { fontSize: '1.5rem', fontWeight: '800', color: 'white', margin: '20px 0 10px 0', textTransform:'uppercase' },
    modalText: { color: '#a1a1aa', marginBottom: '30px', lineHeight: 1.5 },
    modalActions: { display: 'flex', gap: '15px' },
    btnCancel: { flex: 1, background: 'transparent', border: '1px solid #3f3f46', color: 'white', padding: '15px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' },
    btnDelete: { flex: 1, background: '#ef4444', border: 'none', color: 'white', padding: '15px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', textTransform: 'uppercase', boxShadow: '0 0 20px rgba(239, 68, 68, 0.2)' }
  };

  return (
    <div style={styles.wrapper}>
      <aside style={styles.sidebar}>
        <div style={styles.logo}><div style={styles.logoIcon}><Dumbbell size={22} strokeWidth={3}/></div><span>NETXFIT</span></div>
        <nav style={styles.navGroup}>
            <div style={styles.navItem(true)}><LayoutGrid size={20}/> Dashboard</div>
            <div style={styles.navItem(false)}><Calendar size={20}/> Calendario</div>
            <div style={styles.navItem(false)}><BarChart2 size={20}/> Progreso</div>
            <div style={styles.navItem(false)}><Settings size={20}/> Ajustes</div>
        </nav>
        <div style={{...styles.navItem(false), color: '#ef4444', marginTop: 'auto'}} onClick={() => {localStorage.clear(); navigate("/auth/login");}}><LogOut size={20}/> Cerrar Sesión</div>
      </aside>

      <main style={styles.main}>
        <header style={styles.header}>
            <h1 style={styles.title}>Mis Entrenamientos</h1>
            <p style={styles.subtitle}>Gestiona tus rutinas o crea nuevos planes de alto rendimiento.</p>
        </header>

        <div style={styles.grid}>
            {rutinas.map((rutina) => (
                <div key={rutina.id} style={styles.rutinaCard}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = '#3f3f46'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = '#27272a'; }}
                >
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                        <span style={styles.pill}>{rutina.objetivo}</span>
                        
                        {/* Menú de 3 Puntos */}
                        <div style={styles.menuContainer}>
                            <div style={styles.menuBtn} onClick={(e) => toggleMenu(e, rutina.id)}>
                                <MoreHorizontal size={20}/>
                            </div>
                            
                            {activeMenu === rutina.id && (
                                <div style={styles.dropdown}>
                                    <div 
                                        style={styles.dropdownItem} 
                                        onClick={(e) => { e.stopPropagation(); navigate(`/cliente/editar-rutina/${rutina.id}`); }}
                                        onMouseEnter={e => e.currentTarget.style.background = '#27272a'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <Edit size={16}/> Editar
                                    </div>
                                    <div 
                                        style={{...styles.dropdownItem, color:'#ef4444'}}
                                        onClick={(e) => handleDeleteClick(e, rutina)}
                                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <Trash2 size={16}/> Eliminar
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    <div>
                        <h3 style={styles.rutinaTitle}>{rutina.nombre}</h3>
                        <p style={styles.rutinaSub}>{rutina.nivel} • {rutina.detalles?.length || 0} Ejercicios</p>
                    </div>
                    <div style={styles.rutinaPreview}>
                        {rutina.detalles?.map(d => d.ejercicio.nombre).join(", ")}
                    </div>
                    <button style={styles.btnPlay} onClick={() => navigate(`/cliente/sesion/${rutina.id}`)}>
                        <Play size={16} fill="white"/> EMPEZAR SESIÓN
                    </button>
                </div>
            ))}

            <div style={styles.iaCard} onClick={() => navigate("/cliente/generar-ia")}>
                <div style={{position:'absolute', top:25, right:25, color:'#FACC15'}}><ArrowRight size={20}/></div>
                <div style={styles.iaIconBox}><Sparkles size={28}/></div>
                <div><div style={styles.iaText}>Generar con IA</div><div style={styles.iaSub}>Plan personalizado automático</div></div>
            </div>

            <div style={styles.manualCard} onClick={() => navigate("/cliente/crear-rutina")}>
                <div style={{background:'#18181b', padding:'18px', borderRadius:'50%', color:'#71717a'}}><PenTool size={24}/></div>
                <div><div style={{color:'#e4e4e7', fontWeight:'700', fontSize:'1.1rem', textTransform:'uppercase'}}>Diseñar Manual</div><div style={{color:'#52525b', fontSize:'0.9rem', marginTop:'5px'}}>Elige ejercicios de la biblioteca</div></div>
            </div>
        </div>
      </main>

      {/* --- MODAL DE CONFIRMACIÓN DE ELIMINAR --- */}
      {showDeleteModal && (
        <div style={styles.modalOverlay}>
            <div style={styles.modalCard}>
                <div style={{background:'rgba(239, 68, 68, 0.1)', padding:'15px', borderRadius:'50%', display:'inline-block'}}>
                    <AlertTriangle size={48} color="#ef4444"/>
                </div>
                <h3 style={styles.modalTitle}>¿Eliminar Rutina?</h3>
                <p style={styles.modalText}>
                    Estás a punto de borrar <strong>"{rutinaToDelete?.nombre}"</strong>. <br/>
                    Esta acción no se puede deshacer.
                </p>
                <div style={styles.modalActions}>
                    <button style={styles.btnCancel} onClick={() => setShowDeleteModal(false)}>
                        CANCELAR
                    </button>
                    <button style={styles.btnDelete} onClick={confirmDelete}>
                        ELIMINAR
                    </button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
}