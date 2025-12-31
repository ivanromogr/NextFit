import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { obtenerClientesEntrenador, ficharCliente } from "../../api/endpoints"; 

// Iconos
import { 
  Dumbbell, Users, LogOut, LayoutGrid, Calendar, 
  MessageSquare, Settings, User, Activity, ChevronRight, Plus, X,
  CheckCircle, AlertCircle 
} from "lucide-react";

export default function MenuEntrenador() {
  const navigate = useNavigate();
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Estado para el Modal de Añadir Cliente
  const [showAddModal, setShowAddModal] = useState(false);
  const [newClientEmail, setNewClientEmail] = useState("");

  // ✅ NUEVO: Estado para Notificación Toast
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const entrenadorId = localStorage.getItem("entrenadorId");

  useEffect(() => {
    if (entrenadorId) {
      cargarClientes();
    } else {
      navigate("/auth/login");
    }
  }, [navigate]);

  const cargarClientes = async () => {
    try {
      setLoading(true);
      const data = await obtenerClientesEntrenador(entrenadorId);
      setClientes(data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // --- HELPER PARA TOAST ---
  const showToast = (message, type = 'success') => {
      setToast({ show: true, message, type });
      setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
  };

  const handleFichar = async () => {
      if(!newClientEmail) {
          showToast("Introduce un email válido", "error");
          return;
      }
      try {
          await ficharCliente(entrenadorId, newClientEmail);
          
          // ✅ UX MEJORADA: Notificación visual
          showToast("¡Cliente vinculado con éxito!", "success");
          
          setShowAddModal(false);
          setNewClientEmail("");
          cargarClientes(); // Recargar la lista
      } catch (error) {
          const msg = error.response?.data || "No se encontró el usuario o ya está vinculado";
          showToast(msg, "error");
      }
  };

  const handleGestionar = (idCliente) => {
      navigate(`/entrenador/cliente/${idCliente}/rutinas`); 
  };

  // --- ESTILOS PREMIUM ---
  const styles = {
    wrapper: { display: 'flex', minHeight: '100vh', background: '#09090b', fontFamily: "'Inter', sans-serif", color: 'white' },
    
    // SIDEBAR
    sidebar: { width: '280px', background: '#0c0c0e', borderRight: '1px solid #1f1f22', padding: '35px 25px', display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh' },
    logo: { fontSize: '1.8rem', fontWeight: '900', color: 'white', marginBottom: '50px', display:'flex', alignItems:'center', gap:'12px', letterSpacing: '1px', fontFamily: 'sans-serif' },
    logoIcon: { background:'#FACC15', color:'black', padding:'6px', borderRadius:'8px', display:'flex', alignItems:'center', justifyContent:'center' },
    navItem: (active) => ({ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 18px', borderRadius: '12px', color: active ? '#FACC15' : '#a1a1aa', background: active ? 'rgba(250, 204, 21, 0.08)' : 'transparent', cursor: 'pointer', fontSize: '0.95rem', fontWeight: active ? '600' : '500', transition: 'all 0.2s ease', textDecoration: 'none' }),

    // MAIN CONTENT
    main: { flex: 1, padding: '50px 60px', overflowY: 'auto' },
    header: { marginBottom: '50px', display:'flex', justifyContent:'space-between', alignItems:'center' },
    title: { fontSize: '2.5rem', fontWeight: '900', margin: 0, textTransform: 'uppercase', letterSpacing: '-0.5px', color: 'white', lineHeight: '1' },
    subtitle: { color: '#71717a', marginTop:'10px', fontSize:'1.1rem' },

    // STATS GRID
    statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '50px' },
    statCard: { background: '#121214', border: '1px solid #27272a', borderRadius: '16px', padding: '25px', display:'flex', flexDirection:'column', gap:'5px' },
    statNumber: { fontSize: '2.2rem', fontWeight: '900', color: 'white', lineHeight: '1' },
    statLabel: { color: '#71717a', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' },

    // CLIENTS GRID
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '30px', paddingBottom: '50px' },

    // CLIENT CARD
    clientCard: { 
        background: '#121214', border: '1px solid #27272a', borderRadius: '20px', padding: '25px', 
        display: 'flex', flexDirection: 'column', gap: '20px', transition: 'all 0.3s ease', 
        cursor: 'pointer', position: 'relative', overflow: 'hidden' 
    },
    clientHeader: { display: 'flex', alignItems: 'center', gap: '15px' },
    avatar: { width: '60px', height: '60px', borderRadius: '12px', background: '#1f1f22', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #333', overflow:'hidden' },
    clientName: { fontSize: '1.1rem', fontWeight: '800', color: 'white', margin: 0, textTransform: 'uppercase' },
    clientObj: { color: '#FACC15', fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase', marginTop:'4px', background:'rgba(250, 204, 21, 0.1)', padding:'2px 8px', borderRadius:'4px', width:'fit-content' },
    
    divider: { height: '1px', background: '#27272a', width: '100%' },
    
    infoRow: { display: 'flex', justifyContent: 'space-between', color: '#a1a1aa', fontSize: '0.85rem', alignItems:'center' },
    
    actionBtn: { marginTop: 'auto', background: 'transparent', border: '1px solid #3f3f46', color: 'white', padding: '12px', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', width: '100%', textAlign: 'center', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', transition: 'all 0.2s', fontSize:'0.85rem', textTransform:'uppercase' },
    
    addClientBtn: { background: '#FACC15', color: 'black', border: 'none', padding: '14px 28px', borderRadius: '12px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', textTransform:'uppercase', fontSize:'0.9rem', boxShadow:'0 4px 20px rgba(250, 204, 21, 0.2)', transition:'transform 0.2s' },

    // ✅ MODAL REDISEÑADO
    modalOverlay: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(10px)', zIndex: 100, display: 'flex', justifyContent: 'center', alignItems: 'center' },
    modalCard: { background: '#0a0a0a', borderRadius: '24px', width: '90%', maxWidth: '450px', padding: '40px', position: 'relative', border: '1px solid #27272a', boxShadow: '0 25px 80px rgba(0,0,0,1)' },
    modalTitle: { color:'white', fontSize:'1.8rem', fontWeight:'900', margin:'0 0 10px 0', textTransform:'uppercase', lineHeight:'1' },
    input: { background: '#121212', border: '1px solid #333', color: 'white', padding: '16px', borderRadius: '12px', width: '100%', fontSize: '1rem', marginTop:'20px', outline:'none', transition:'border 0.2s' },
    modalBtnConfirm: { width:'100%', marginTop:'25px', padding:'16px', background:'#FACC15', color:'black', border:'none', borderRadius:'12px', fontWeight:'800', fontSize:'0.95rem', cursor:'pointer', textTransform:'uppercase' },

    // ✅ ESTILO TOAST
    toast: {
        position: 'fixed', top: '30px', left: '50%', transform: toast.show ? 'translate(-50%, 0)' : 'translate(-50%, -20px)',
        opacity: toast.show ? 1 : 0, pointerEvents: toast.show ? 'auto' : 'none', zIndex: 9999,
        background: '#18181b', border: `1px solid ${toast.type === 'success' ? '#10B981' : '#EF4444'}`,
        color: 'white', padding: '12px 24px', borderRadius: '50px',
        display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
        fontWeight: '600', fontSize: '0.95rem', transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
    }
  };

  return (
    <div style={styles.wrapper}>
      {/* ✅ NOTIFICACIÓN TOAST */}
      <div style={styles.toast}>
          {toast.type === 'success' ? <CheckCircle size={20} color="#10B981"/> : <AlertCircle size={20} color="#EF4444"/>}
          {toast.message}
      </div>

      {/* SIDEBAR */}
      <aside style={styles.sidebar}>
        <div style={styles.logo}>
            <div style={styles.logoIcon}><Dumbbell size={22} strokeWidth={3}/></div>
            <span>NEXTFIT </span>
        </div>
        <nav style={{display: 'flex', flexDirection: 'column', gap: '8px', flex: 1}}>
            <div style={styles.navItem(true)}><LayoutGrid size={20}/> Dashboard</div>
            <div style={styles.navItem(false)}><Users size={20}/> Atletas</div>
            <div style={styles.navItem(false)}><Calendar size={20}/> Agenda</div>
            <div style={styles.navItem(false)}><MessageSquare size={20}/> Chat</div>
            <div style={styles.navItem(false)}><Settings size={20}/> Configuración</div>
        </nav>
        <div style={{...styles.navItem(false), color: '#ef4444', marginTop: 'auto'}} onClick={() => {localStorage.clear(); navigate("/auth/login");}}>
            <LogOut size={20}/> Cerrar Sesión
        </div>
      </aside>

      {/* MAIN */}
      <main style={styles.main}>
        
        <header style={styles.header}>
            <div>
                <h1 style={styles.title}>Panel de Entrenador</h1>
                <p style={styles.subtitle}>Gestiona el progreso y planes de tus atletas.</p>
            </div>
            <button 
                style={styles.addClientBtn} 
                onClick={() => setShowAddModal(true)}
                onMouseEnter={e => {e.currentTarget.style.transform='scale(1.05)'; e.currentTarget.style.boxShadow='0 0 25px rgba(250, 204, 21, 0.4)'}}
                onMouseLeave={e => {e.currentTarget.style.transform='scale(1)'; e.currentTarget.style.boxShadow='0 4px 20px rgba(250, 204, 21, 0.2)'}}
            >
                <Plus size={20}/> Nuevo Atleta
            </button>
        </header>

        {/* RESUMEN RÁPIDO */}
        <div style={styles.statsGrid}>
            <div style={styles.statCard}>
                <div style={styles.statLabel}>Total Atletas</div>
                <div style={styles.statNumber}>{clientes.length}</div>
            </div>
            <div style={styles.statCard}>
                <div style={styles.statLabel}>Planes Activos</div>
                <div style={{...styles.statNumber, color:'#FACC15'}}>12</div>
            </div>
            <div style={styles.statCard}>
                <div style={styles.statLabel}>Sesiones Hoy</div>
                <div style={styles.statNumber}>5</div>
            </div>
        </div>

        <h3 style={{color:'#52525b', fontSize:'0.85rem', marginBottom:'25px', fontWeight:'800', textTransform:'uppercase', letterSpacing:'1px'}}>MIS ATLETAS ACTIVOS</h3>

        {/* GRID DE CLIENTES */}
        <div style={styles.grid}>
            {clientes.map((cliente) => (
                <div 
                    key={cliente.id} 
                    style={styles.clientCard}
                    onMouseEnter={e => {e.currentTarget.style.borderColor = '#FACC15'; e.currentTarget.style.transform='translateY(-5px)'}}
                    onMouseLeave={e => {e.currentTarget.style.borderColor = '#27272a'; e.currentTarget.style.transform='translateY(0)'}}
                >
                    <div style={styles.clientHeader}>
                        <div style={styles.avatar}>
                            {cliente.fotoPerfil ? <img src={cliente.fotoPerfil} alt="p" style={{width:'100%', height:'100%', objectFit:'cover'}}/> : <User size={28} color="#71717a"/>}
                        </div>
                        <div>
                            <h4 style={styles.clientName}>{cliente.nombre} {cliente.apellido}</h4>
                            <div style={styles.clientObj}>{cliente.objetivo || "Sin objetivo"}</div>
                        </div>
                    </div>

                    <div style={styles.divider}></div>

                    <div style={{display:'flex', flexDirection:'column', gap:'12px'}}>
                        <div style={styles.infoRow}>
                            <span><Activity size={16} style={{marginRight:8, verticalAlign:'middle', color:'#52525b'}}/> Nivel</span>
                            <span style={{color:'white', fontWeight:'600'}}>{cliente.nivel || "Principiante"}</span>
                        </div>
                        <div style={styles.infoRow}>
                            <span><Calendar size={16} style={{marginRight:8, verticalAlign:'middle', color:'#52525b'}}/> Contacto</span>
                            <span style={{color:'white', fontWeight:'600', fontSize:'0.8rem'}}>{cliente.email}</span>
                        </div>
                    </div>

                    {/* BOTÓN DE ACCIÓN */}
                    <button 
                        style={styles.actionBtn}
                        onClick={() => handleGestionar(cliente.id)}
                        onMouseEnter={e => {e.currentTarget.style.background='#FACC15'; e.currentTarget.style.color='black'; e.currentTarget.style.borderColor='#FACC15'}}
                        onMouseLeave={e => {e.currentTarget.style.background='transparent'; e.currentTarget.style.color='white'; e.currentTarget.style.borderColor='#3f3f46'}}
                    >
                        GESTIONAR ATLETA <ChevronRight size={16}/>
                    </button>
                </div>
            ))}

            {clientes.length === 0 && !loading && (
                <div style={{gridColumn:'1/-1', textAlign:'center', color:'#333', padding:'60px', border:'2px dashed #222', borderRadius:'20px'}}>
                    <Users size={48} style={{marginBottom:15, opacity:0.5}}/>
                    <p style={{fontSize:'1.1rem', fontWeight:'600', color:'#555'}}>No tienes atletas asignados todavía.</p>
                    <button style={{marginTop:'15px', background:'transparent', border:'none', color:'#FACC15', fontWeight:'bold', cursor:'pointer'}} onClick={() => setShowAddModal(true)}>+ Vincular tu primer atleta</button>
                </div>
            )}
        </div>

      </main>

      {/* ✅ MODAL REDISEÑADO */}
      {showAddModal && (
          <div style={styles.modalOverlay}>
              <div style={styles.modalCard}>
                  <button onClick={() => setShowAddModal(false)} style={{position:'absolute', top:25, right:25, background:'transparent', border:'none', color:'#555', cursor:'pointer'}}><X size={24}/></button>
                  
                  <h2 style={styles.modalTitle}>VINCULAR ATLETA</h2>
                  <p style={{color:'#71717a', fontSize:'0.95rem', lineHeight:'1.5'}}>Introduce el correo electrónico del usuario registrado para añadirlo a tu equipo.</p>
                  
                  <input 
                    style={styles.input} 
                    placeholder="ejemplo@email.com" 
                    value={newClientEmail}
                    onChange={(e) => setNewClientEmail(e.target.value)}
                    onFocus={e => e.target.style.borderColor = '#FACC15'}
                    onBlur={e => e.target.style.borderColor = '#333'}
                    autoFocus
                  />
                  
                  <button 
                    onClick={handleFichar}
                    style={styles.modalBtnConfirm}
                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                  >
                      VINCULAR AHORA
                  </button>
              </div>
          </div>
      )}
    </div>
  );
}