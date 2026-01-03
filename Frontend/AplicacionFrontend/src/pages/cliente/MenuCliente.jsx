import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
// Logo
import logoNextFit from '../../assets/logo-nextfit.png';
import { obtenerRutinasCliente, eliminarRutina } from "../../api/endpoints"; 

// Iconos
import { 
  Dumbbell, Sparkles, PenTool, LogOut, LayoutGrid, 
  Calendar, Settings, Play, MoreHorizontal, ArrowRight,
  BarChart2, Edit, Trash2, AlertTriangle, Crown
} from "lucide-react";

export default function MenuCliente() {
  const navigate = useNavigate();
  const location = useLocation();
  const [rutinas, setRutinas] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [activeMenu, setActiveMenu] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [rutinaToDelete, setRutinaToDelete] = useState(null);

  useEffect(() => {
    const storedId = localStorage.getItem("clienteId");
    if (storedId) cargarRutinas(storedId);
    else navigate("/auth/login");
  }, [navigate]);

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
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const toggleMenu = (e, id) => { e.stopPropagation(); setActiveMenu(activeMenu === id ? null : id); };

  const handleDeleteClick = (e, rutina) => { e.stopPropagation(); setRutinaToDelete(rutina); setShowDeleteModal(true); setActiveMenu(null); };

  const confirmDelete = async () => {
      if (!rutinaToDelete) return;
      try {
          await eliminarRutina(rutinaToDelete.id);
          setRutinas(rutinas.filter(r => r.id !== rutinaToDelete.id));
          setShowDeleteModal(false);
          setRutinaToDelete(null);
      } catch (error) { alert("No se pudo eliminar."); }
  };

  // ✅ FILTRADO
  const rutinasEntrenador = rutinas.filter(r => r.creador === "ENTRENADOR");
  const rutinasPropias = rutinas.filter(r => r.creador !== "ENTRENADOR");

  // --- ESTILOS PREMIUM ---
  const styles = {
    wrapper: { display: 'flex', minHeight: '100vh', background: '#09090b', fontFamily: "'Inter', sans-serif", color: 'white' },
    
    // Sidebar
    sidebar: { width: '250px', background: '#0c0c0e', borderRight: '1px solid #1f1f22', padding: '28px 18px', display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh' },
    logo: { fontSize: '1.6rem', fontWeight: '900', color: 'white', marginBottom: '36px', display:'flex', alignItems:'center', gap:'12px', letterSpacing: '2px', fontFamily: 'sans-serif', textTransform: 'uppercase' },
    // Imagen logo
    logoContainer: { marginBottom: '36px', paddingLeft: '6px' },
    logoImage: { width: '200px', height: 'auto', display: 'block', filter: 'drop-shadow(0 0 10px rgba(250, 204, 21, 0.2))' },
    logoIcon: { background:'#FACC15', color:'black', padding:'8px', borderRadius:'10px', display:'flex', alignItems:'center', justifyContent:'center' },
    navItem: (active) => ({ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', borderRadius: '14px', color: active ? '#FACC15' : '#a1a1aa', background: active ? 'rgba(250, 204, 21, 0.12)' : 'transparent', cursor: 'pointer', fontSize: '0.95rem', fontWeight: active ? '700' : '500', transition: 'all 0.15s ease', textDecoration: 'none', border: active ? '1px solid rgba(250,204,21,0.14)' : 'none' }),

    // Main
    main: { flex: 1, padding: '50px 80px', overflowY: 'auto' },
    header: { marginBottom: '50px' },
    title: { fontSize: '2.5rem', fontWeight: '900', margin: 0, textTransform: 'uppercase', letterSpacing: '-1px', color: 'white', lineHeight: '1' },
    subtitle: { color: '#71717a', marginTop:'10px', fontSize:'1.1rem' },

    // --- SECCIONES ---
    sectionLabel: { fontSize: '0.85rem', fontWeight: '700', color: '#71717a', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' },
    divider: { flex: 1, height: '1px', background: '#27272a' },

    // --- GRID LAYOUTS ---
    gridCoach: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '30px', marginBottom: '50px' },
    gridActions: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '50px' },
    gridPersonal: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '25px', paddingBottom: '50px' },

    // --- CARD ENTRENADOR (PREMIUM) ---
    coachCard: { 
        background: 'linear-gradient(145deg, #121214 0%, #0c0c0e 100%)', 
        border: '1px solid rgba(250, 204, 21, 0.3)', 
        borderRadius: '24px', 
        padding: '35px', 
        position: 'relative', 
        overflow: 'hidden',
        boxShadow: '0 10px 40px -10px rgba(250, 204, 21, 0.1)',
        transition: 'transform 0.3s ease, box-shadow 0.3s ease',
        cursor: 'pointer'
    },
    coachBadge: { position: 'absolute', top: '25px', right: '25px', background: 'rgba(250, 204, 21, 0.15)', color: '#FACC15', padding: '6px 12px', borderRadius: '50px', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' },
    coachTitle: { fontSize: '1.8rem', fontWeight: '800', color: 'white', margin: '10px 0 5px 0', textTransform: 'uppercase', letterSpacing: '-0.5px' },
    coachSub: { color: '#a1a1aa', fontSize: '0.95rem' },
    
    // --- BOTONES DE ACCIÓN (CREAR) ---
    actionBtnCard: { 
        background: '#121214', border: '1px solid #27272a', borderRadius: '16px', padding: '20px', 
        display: 'flex', alignItems: 'center', gap: '20px', cursor: 'pointer', transition: 'all 0.2s',
        minHeight: '100px'
    },
    actionIcon: { width: '50px', height: '50px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' },

    // --- CARD PERSONAL (ESTÁNDAR) ---
    personalCard: { 
        background: '#121214', border: '1px solid #27272a', borderRadius: '20px', padding: '25px', 
        display: 'flex', flexDirection: 'column', gap: '20px', transition: 'all 0.2s', cursor: 'pointer', position: 'relative' 
    },
    
    // ELEMENTOS COMUNES
    pill: { background: '#27272a', color: '#e4e4e7', padding: '4px 10px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase' },
    previewText: { color: '#52525b', fontSize: '0.85rem', lineHeight: '1.5', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', minHeight: '2.5em' },

    // BOTONES "EMPEZAR"
    btnStartCoach: { marginTop: '25px', width: '100%', padding: '16px', borderRadius: '14px', background: '#FACC15', color: 'black', fontWeight: '800', border: 'none', cursor: 'pointer', fontSize: '0.95rem', textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', boxShadow: '0 4px 15px rgba(250, 204, 21, 0.2)' },
    btnStartPersonal: { marginTop: 'auto', width: '100%', padding: '12px', borderRadius: '10px', background: '#18181b', color: 'white', fontWeight: '700', border: '1px solid #27272a', cursor: 'pointer', fontSize: '0.85rem', textTransform: 'uppercase', transition: 'background 0.2s' },

    // MENÚS
    menuBtn: { color: '#52525b', padding: '8px', borderRadius: '50%', cursor: 'pointer', transition: 'color 0.2s' },
    dropdown: { position: 'absolute', top: '40px', right: '10px', background: '#18181b', border: '1px solid #27272a', borderRadius: '12px', padding: '6px', zIndex: 10, width: '150px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' },
    dropdownItem: { display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', fontSize: '0.85rem', color: '#e4e4e7', borderRadius: '8px', cursor: 'pointer', transition: 'background 0.2s' },

    // MODAL
    modalOverlay: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 100, display: 'flex', justifyContent: 'center', alignItems: 'center' },
    modalCard: { background: '#09090b', padding: '40px', borderRadius: '24px', border: '1px solid #27272a', width: '90%', maxWidth: '400px', textAlign: 'center' },
    modalBtnDelete: { flex: 1, background: '#ef4444', color: 'white', padding: '14px', borderRadius: '12px', fontWeight: 'bold', border: 'none', cursor: 'pointer' },
    modalBtnCancel: { flex: 1, background: 'transparent', color: '#a1a1aa', padding: '14px', borderRadius: '12px', fontWeight: 'bold', border: '1px solid #27272a', cursor: 'pointer' }
  };

  return (
    <div style={styles.wrapper}>
      <aside style={styles.sidebar}>
        <div style={styles.logoContainer}><img src={logoNextFit} alt="NEXTFIT" style={styles.logoImage} /></div>
        <nav style={{display: 'flex', flexDirection: 'column', gap: '8px', flex: 1}}>
            {
              (() => {
                const isDashboard = location.pathname === '/cliente/dashboard';
                const isCalendario = location.pathname === '/cliente/explorar' || location.pathname === '/cliente/ejercicios';
                const isProgreso = location.pathname.startsWith('/cliente/progreso');
                const isAjustes = location.pathname.startsWith('/cliente/perfil');
                return (
                  <>
                    <button style={{...styles.navItem(isDashboard), border:'none', background:'transparent', textAlign:'left'}} onClick={() => navigate('/cliente/dashboard')}><LayoutGrid size={20}/> Dashboard</button>
                    <button style={{...styles.navItem(isCalendario), border:'none', background:'transparent', textAlign:'left'}} onClick={() => {}}><Calendar size={20}/> Calendario</button>
                    <button style={{...styles.navItem(isProgreso), border:'none', background:'transparent', textAlign:'left'}} onClick={() => {}}><BarChart2 size={20}/> Progreso</button>
                    <button style={{...styles.navItem(isAjustes), border:'none', background:'transparent', textAlign:'left'}} onClick={() => navigate('/cliente/perfil')}><Settings size={20}/> Ajustes</button>
                  </>
                )
              })()
            }
        </nav>
        <div style={{...styles.navItem(false), color: '#ef4444', marginTop: 'auto'}} onClick={() => {localStorage.clear(); navigate("/auth/login");}}>
            <LogOut size={20}/> Cerrar Sesión
        </div>
      </aside>

      <main style={styles.main}>
        <header style={styles.header}>
            <h1 style={styles.title}>Mis Entrenamientos</h1>
            <p style={styles.subtitle}>Tu plan de acción para hoy.</p>
        </header>

        {/* --- 1. ZONA COACH (HERO SECTION) --- */}
        {rutinasEntrenador.length > 0 && (
            <div style={{marginBottom: '60px'}}>
                <div style={styles.sectionLabel}>
                    <Crown size={16} color="#FACC15"/> Asignado por tu Coach <div style={styles.divider}></div>
                </div>
                
                <div style={styles.gridCoach}>
                    {rutinasEntrenador.map((rutina) => (
                        <div 
                            key={rutina.id} 
                            style={styles.coachCard}
                            onMouseEnter={e => {
                                e.currentTarget.style.transform = 'translateY(-5px)';
                                e.currentTarget.style.boxShadow = '0 20px 50px -10px rgba(250, 204, 21, 0.15)';
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 10px 40px -10px rgba(250, 204, 21, 0.1)';
                            }}
                        >
                            <div style={styles.coachBadge}>
                                <Sparkles size={12}/> PLAN OFICIAL
                            </div>
                            
                            <div style={{marginTop: '10px'}}>
                                <span style={{color: '#FACC15', fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase'}}>{rutina.objetivo}</span>
                                <h3 style={styles.coachTitle}>{rutina.nombre}</h3>
                                <p style={styles.coachSub}>{rutina.detalles?.length || 0} Ejercicios • {rutina.nivel}</p>
                            </div>

                            <button style={styles.btnStartCoach} onClick={() => navigate(`/cliente/sesion/${rutina.id}`)}>
                                <Play size={20} fill="black"/> EMPEZAR SESIÓN
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* --- 2. ACCIONES RÁPIDAS (CREAR) --- */}
        <div style={styles.sectionLabel}>
            <PenTool size={16}/> Crear Nuevo <div style={styles.divider}></div>
        </div>

        <div style={styles.gridActions}>
            <div style={styles.actionBtnCard} onClick={() => navigate("/cliente/generar-ia")}
                 onMouseEnter={e => {e.currentTarget.style.borderColor = '#FACC15'; e.currentTarget.style.background = 'rgba(250, 204, 21, 0.05)'}}
                 onMouseLeave={e => {e.currentTarget.style.borderColor = '#27272a'; e.currentTarget.style.background = '#121214'}}>
                <div style={{...styles.actionIcon, background: 'rgba(250, 204, 21, 0.1)', color:'#FACC15'}}><Sparkles size={24}/></div>
                <div>
                    <div style={{color:'white', fontWeight:'800', fontSize:'1.1rem'}}>Generar con IA</div>
                    <div style={{color:'#71717a', fontSize:'0.85rem'}}>Automático</div>
                </div>
                <ArrowRight style={{marginLeft:'auto', color:'#333'}}/>
            </div>

            <div style={styles.actionBtnCard} onClick={() => navigate("/cliente/crear-rutina")}
                 onMouseEnter={e => {e.currentTarget.style.borderColor = 'white';}}
                 onMouseLeave={e => {e.currentTarget.style.borderColor = '#27272a';}}>
                <div style={{...styles.actionIcon, background: '#27272a', color:'white'}}><Edit size={24}/></div>
                <div>
                    <div style={{color:'white', fontWeight:'800', fontSize:'1.1rem'}}>Diseñar Manual</div>
                    <div style={{color:'#71717a', fontSize:'0.85rem'}}>A tu medida</div>
                </div>
                <ArrowRight style={{marginLeft:'auto', color:'#333'}}/>
            </div>
        </div>

        {/* --- 3. ZONA PERSONAL --- */}
        <div style={styles.sectionLabel}>
            <Dumbbell size={16}/> Mis Rutinas Personales <div style={styles.divider}></div>
        </div>

        <div style={styles.gridPersonal}>
            {rutinasPropias.map((rutina) => (
                <div key={rutina.id} style={styles.personalCard}
                     onMouseEnter={e => e.currentTarget.style.borderColor = '#52525b'}
                     onMouseLeave={e => e.currentTarget.style.borderColor = '#27272a'}
                >
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
                        <span style={styles.pill}>{rutina.objetivo}</span>
                        <div style={{position:'relative'}}>
                            <div style={styles.menuBtn} onClick={(e) => toggleMenu(e, rutina.id)}><MoreHorizontal size={20}/></div>
                            {activeMenu === rutina.id && (
                                <div style={styles.dropdown}>
                                    <div style={styles.dropdownItem} onClick={(e) => {e.stopPropagation(); navigate(`/cliente/editar-rutina/${rutina.id}`)}}>
                                        <Edit size={16}/> Editar
                                    </div>
                                    <div style={{...styles.dropdownItem, color:'#ef4444'}} onClick={(e) => handleDeleteClick(e, rutina)}>
                                        <Trash2 size={16}/> Eliminar
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div>
                        <h3 style={{fontSize:'1.3rem', fontWeight:'800', color:'white', margin:'0 0 5px 0', textTransform:'uppercase'}}>{rutina.nombre}</h3>
                        <div style={styles.previewText}>
                            {rutina.detalles?.map(d => d.ejercicio.nombre).join(", ")}
                        </div>
                    </div>

                    <button style={styles.btnStartPersonal} onClick={() => navigate(`/cliente/sesion/${rutina.id}`)}
                            onMouseEnter={e => {e.currentTarget.style.background = 'white'; e.currentTarget.style.color='black'}}
                            onMouseLeave={e => {e.currentTarget.style.background = '#18181b'; e.currentTarget.style.color='white'}}>
                        EMPEZAR
                    </button>
                </div>
            ))}
            
            {rutinasPropias.length === 0 && (
                <div style={{gridColumn:'1/-1', textAlign:'center', padding:'40px', color:'#52525b', border:'1px dashed #27272a', borderRadius:'20px'}}>
                    <p>No tienes rutinas personales creadas.</p>
                </div>
            )}
        </div>

      </main>

      {/* Modal Eliminar */}
      {showDeleteModal && (
        <div style={styles.modalOverlay}>
            <div style={styles.modalCard}>
                <div style={{background:'rgba(239, 68, 68, 0.1)', padding:'20px', borderRadius:'50%', display:'inline-block', marginBottom:'20px'}}>
                    <AlertTriangle size={40} color="#ef4444"/>
                </div>
                <h3 style={{color:'white', margin:0, fontSize:'1.5rem'}}>¿ELIMINAR RUTINA?</h3>
                <p style={{color:'#a1a1aa', margin:'15px 0 30px 0'}}>Esta acción es irreversible.</p>
                <div style={{display:'flex', gap:'15px'}}>
                    <button style={styles.modalBtnCancel} onClick={() => setShowDeleteModal(false)}>CANCELAR</button>
                    <button style={styles.modalBtnDelete} onClick={confirmDelete}>ELIMINAR</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}