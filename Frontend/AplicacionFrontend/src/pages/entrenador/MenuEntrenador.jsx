import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { obtenerClientesEntrenador, ficharCliente } from "../../api/endpoints"; 

// Iconos
import { 
  Dumbbell, Users, LogOut, LayoutGrid, Calendar, 
  MessageSquare, Settings, User, Activity, ChevronRight, Plus, X
} from "lucide-react";

export default function MenuEntrenador() {
  const navigate = useNavigate();
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Estado para el Modal de Añadir Cliente
  const [showAddModal, setShowAddModal] = useState(false);
  const [newClientEmail, setNewClientEmail] = useState("");

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

  const handleFichar = async () => {
      if(!newClientEmail) return;
      try {
          await ficharCliente(entrenadorId, newClientEmail);
          alert("¡Cliente vinculado con éxito!");
          setShowAddModal(false);
          setNewClientEmail("");
          cargarClientes(); // Recargar la lista para ver al nuevo
      } catch (error) {
          alert("Error: " + (error.response?.data || "No se encontró el usuario o ya está vinculado"));
      }
  };

  // ✅ FUNCIÓN ACTUALIZADA: 
  // Ahora lleva a la pantalla de "Ver Rutinas del Cliente" en lugar de crear una directamente.
  const handleGestionar = (idCliente) => {
      navigate(`/entrenador/cliente/${idCliente}/rutinas`); 
  };

  // --- ESTILOS ---
  const styles = {
    wrapper: { display: 'flex', minHeight: '100vh', background: '#09090b', fontFamily: 'sans-serif', color: 'white' },
    
    // SIDEBAR
    sidebar: { width: '280px', background: '#0c0c0e', borderRight: '1px solid #1f1f22', padding: '35px 25px', display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh' },
    logo: { fontSize: '1.8rem', fontWeight: '900', color: 'white', marginBottom: '50px', display:'flex', alignItems:'center', gap:'12px', letterSpacing: '1px' },
    logoIcon: { background:'#FACC15', color:'black', padding:'6px', borderRadius:'8px', display:'flex', alignItems:'center', justifyContent:'center' },
    navItem: (active) => ({ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 18px', borderRadius: '12px', color: active ? '#FACC15' : '#a1a1aa', background: active ? 'rgba(250, 204, 21, 0.08)' : 'transparent', cursor: 'pointer', fontSize: '0.95rem', fontWeight: active ? '600' : '500', transition: 'all 0.2s ease' }),

    // MAIN CONTENT
    main: { flex: 1, padding: '50px 60px', overflowY: 'auto' },
    header: { marginBottom: '50px', display:'flex', justifyContent:'space-between', alignItems:'center' },
    title: { fontSize: '2.5rem', fontWeight: '900', margin: 0, textTransform: 'uppercase', letterSpacing: '-0.5px', color: 'white' },
    subtitle: { color: '#71717a', marginTop:'10px', fontSize:'1.05rem' },

    // STATS GRID
    statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '40px' },
    statCard: { background: '#121214', border: '1px solid #27272a', borderRadius: '16px', padding: '20px' },
    statNumber: { fontSize: '2rem', fontWeight: '900', color: 'white' },
    statLabel: { color: '#71717a', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase' },

    // CLIENTS GRID
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '30px', paddingBottom: '50px' },

    // CLIENT CARD
    clientCard: { background: '#121214', border: '1px solid #27272a', borderRadius: '20px', padding: '25px', display: 'flex', flexDirection: 'column', gap: '20px', transition: 'transform 0.2s', cursor: 'pointer', position: 'relative' },
    clientHeader: { display: 'flex', alignItems: 'center', gap: '15px' },
    avatar: { width: '60px', height: '60px', borderRadius: '50%', background: '#27272a', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #3f3f46', overflow:'hidden' },
    clientName: { fontSize: '1.2rem', fontWeight: '800', color: 'white', margin: 0 },
    clientObj: { color: '#FACC15', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase', marginTop:'4px' },
    
    divider: { height: '1px', background: '#27272a', width: '100%' },
    
    infoRow: { display: 'flex', justifyContent: 'space-between', color: '#a1a1aa', fontSize: '0.9rem' },
    
    actionBtn: { marginTop: 'auto', background: 'transparent', border: '1px solid #3f3f46', color: 'white', padding: '12px', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', width: '100%', textAlign: 'center', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', transition: 'all 0.2s' },
    
    addClientBtn: { background: '#FACC15', color: 'black', border: 'none', padding: '12px 24px', borderRadius: '10px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', textTransform:'uppercase' },

    // MODAL STYLES
    modalOverlay: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)', zIndex: 100, display: 'flex', justifyContent: 'center', alignItems: 'center' },
    modalCard: { background: '#121212', borderRadius: '24px', width: '90%', maxWidth: '450px', padding: '40px', position: 'relative', border: '1px solid #333', boxShadow: '0 25px 60px rgba(0,0,0,0.8)' },
    input: { background: '#09090b', border: '1px solid #3f3f46', color: 'white', padding: '15px', borderRadius: '10px', width: '100%', fontSize: '1rem', marginTop:'15px', outline:'none' }
  };

  return (
    <div style={styles.wrapper}>
      {/* SIDEBAR */}
      <aside style={styles.sidebar}>
        <div style={styles.logo}>
            <div style={styles.logoIcon}><Dumbbell size={22} strokeWidth={3}/></div>
            <span>NETXFIT PRO</span>
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
            <button style={styles.addClientBtn} onClick={() => setShowAddModal(true)}>
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

        <h3 style={{color:'white', fontSize:'1.5rem', marginBottom:'25px', fontWeight:'800', textTransform:'uppercase'}}>Mis Atletas</h3>

        {/* GRID DE CLIENTES */}
        <div style={styles.grid}>
            {clientes.map((cliente) => (
                <div 
                    key={cliente.id} 
                    style={styles.clientCard}
                    onMouseEnter={e => {e.currentTarget.style.transform='translateY(-5px)'; e.currentTarget.style.borderColor='#555'}}
                    onMouseLeave={e => {e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.borderColor='#27272a'}}
                >
                    <div style={styles.clientHeader}>
                        <div style={styles.avatar}>
                            {cliente.fotoPerfil ? <img src={cliente.fotoPerfil} alt="p" style={{width:'100%'}}/> : <User size={30} color="#71717a"/>}
                        </div>
                        <div>
                            <h4 style={styles.clientName}>{cliente.nombre} {cliente.apellido}</h4>
                            <div style={styles.clientObj}>{cliente.objetivo || "Sin objetivo"}</div>
                        </div>
                    </div>

                    <div style={styles.divider}></div>

                    <div style={{display:'flex', flexDirection:'column', gap:'10px'}}>
                        <div style={styles.infoRow}>
                            <span><Activity size={14} style={{marginRight:6, verticalAlign:'middle'}}/> Nivel</span>
                            <span style={{color:'white', fontWeight:'600'}}>{cliente.nivel || "Principiante"}</span>
                        </div>
                        <div style={styles.infoRow}>
                            <span><Calendar size={14} style={{marginRight:6, verticalAlign:'middle'}}/> Email</span>
                            <span style={{color:'white', fontWeight:'600', fontSize:'0.8rem'}}>{cliente.email}</span>
                        </div>
                    </div>

                    {/* BOTÓN DE ACCIÓN */}
                    <button 
                        style={styles.actionBtn}
                        onClick={() => handleGestionar(cliente.id)}
                        onMouseEnter={e => {e.currentTarget.style.background='#FACC15'; e.currentTarget.style.color='black'; e.currentTarget.style.border='1px solid #FACC15'}}
                        onMouseLeave={e => {e.currentTarget.style.background='transparent'; e.currentTarget.style.color='white'; e.currentTarget.style.border='1px solid #3f3f46'}}
                    >
                        GESTIONAR ATLETA <ChevronRight size={16}/>
                    </button>
                </div>
            ))}

            {clientes.length === 0 && !loading && (
                <div style={{gridColumn:'1/-1', textAlign:'center', color:'#555', padding:'50px'}}>
                    <Users size={48} style={{marginBottom:15, opacity:0.5}}/>
                    <p>No tienes atletas asignados todavía.</p>
                </div>
            )}
        </div>

      </main>

      {/* MODAL PARA FICHAR CLIENTE */}
      {showAddModal && (
          <div style={styles.modalOverlay}>
              <div style={styles.modalCard}>
                  <button onClick={() => setShowAddModal(false)} style={{position:'absolute', top:20, right:20, background:'transparent', border:'none', color:'white', cursor:'pointer'}}><X size={20}/></button>
                  <h2 style={{color:'white', fontSize:'1.5rem', fontWeight:'800', margin:0}}>Vincular Atleta</h2>
                  <p style={{color:'#a1a1aa', marginTop:10}}>Introduce el email del usuario registrado en la app.</p>
                  
                  <input 
                    style={styles.input} 
                    placeholder="ejemplo@email.com" 
                    value={newClientEmail}
                    onChange={(e) => setNewClientEmail(e.target.value)}
                  />
                  
                  <button 
                    onClick={handleFichar}
                    style={{...styles.addClientBtn, width:'100%', marginTop:'25px', justifyContent:'center'}}
                  >
                      VINCULAR AHORA
                  </button>
              </div>
          </div>
      )}
    </div>
  );
}