import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
    obtenerClientesEntrenador, 
    ficharCliente, 
    obtenerDashboardResumen,
    getEntrenador
    
} from "../../api/endpoints";
import { useAuth } from "../../context/AuthContext";

import {
  User, Plus, X, Mail, Activity, ChevronRight, CheckCircle2, 
  AlertTriangle, Zap, Check, MessageCircle, TrendingUp, Bell
} from "lucide-react";

import GymButton from "../../components/ui/GymButton";
import GymInput from "../../components/ui/GymInput";
import ChatComponent from "../../components/functional/ChatComponent";

export default function MenuEntrenador() {
  const navigate = useNavigate();
  const { userId: entrenadorId } = useAuth();
  
  const [perfil, setPerfil] = useState({ nombre: 'Coach', fotoPerfil: '' });
  const [listaClientes, setListaClientes] = useState([]); 
  const [feed, setFeed] = useState([]); 
  const [stats, setStats] = useState({ hoy: 0, riesgo: 0, records: 0 });
  const [loading, setLoading] = useState(true);

  // UI
  const [showAddModal, setShowAddModal] = useState(false);
  const [newClientEmail, setNewClientEmail] = useState("");
  const [chatOpen, setChatOpen] = useState(null);

  useEffect(() => {
    if (!entrenadorId) {
        navigate("/auth/login");
        return;
    }
    cargarDatos();
  }, [entrenadorId, navigate]);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      
      // Cargamos todo en paralelo para que sea súper rápido
      const [dataClientes, dataDash, dataPerfil] = await Promise.all([
          obtenerClientesEntrenador(entrenadorId).catch(() => []),
          typeof obtenerDashboardResumen === 'function' ? obtenerDashboardResumen(entrenadorId).catch(() => null) : null,
          getEntrenador(entrenadorId).catch(() => null)
      ]);

      // Perfil Entrenador
      if (dataPerfil) {
          const info = dataPerfil.entrenador || dataPerfil;
          setPerfil({ nombre: info.nombre || 'Coach', fotoPerfil: info.fotoPerfil || '' });
      }

      // Clientes
      setListaClientes(dataClientes || []);

      // Stats Dashboard
      if (dataDash) {
          setFeed(dataDash.feedActividad || []);
          setStats(dataDash.stats || { hoy: 0, riesgo: 0, records: 0 });
      }

    } catch (error) {
      console.error("Error cargando dashboard del entrenador:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFichar = async () => {
  try {
    // Intentamos vincular
    await ficharCliente(entrenadorId, newClientEmail.trim());
    
    // Si sale bien, cerramos y recargamos
    setShowAddModal(false);
    setNewClientEmail("");
    cargarDatos(); 
  } catch (error) {
    // Si sale mal, extraemos el error real del backend
    console.error("Error completo:", error);
    const mensajeBackend = error.response?.data?.message 
                        || error.response?.data 
                        || error.message 
                        || "Error desconocido";
    
    alert(`Fallo al vincular: ${typeof mensajeBackend === 'string' ? mensajeBackend : JSON.stringify(mensajeBackend)}`);
  }
};

  const handleGestionar = (idCliente) => {
    localStorage.setItem("clienteObjetivoId", idCliente);
    navigate(`/entrenador/cliente/${idCliente}/rutinas`);
  };

  if (loading) {
    return (
        <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#050505', color: '#FACC15' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
                <Activity size={40} className="animate-pulse" />
                <span style={{ fontWeight: 800, letterSpacing: '2px', fontSize: '0.8rem' }}>CARGANDO TU CUARTEL GENERAL...</span>
            </div>
        </div>
    );
  }

  // --- ESTILOS PREMIUM ---
  const styles = {
    page: { padding: '40px 50px', background: '#050505', minHeight: '100vh', color: 'white', fontFamily: "'Inter', system-ui, sans-serif" },
    
    // Header e Identidad
    headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' },
    greetingBox: { display: 'flex', flexDirection: 'column', gap: '4px' },
    title: { fontSize: '2rem', fontWeight: 900, letterSpacing: '-0.5px', margin: 0 },
    subtitle: { color: 'rgba(255,255,255,0.5)', fontSize: '0.95rem', fontWeight: 500 },
    
    profileSection: { display: 'flex', alignItems: 'center', gap: '20px' },
    bellBox: { width: '45px', height: '45px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'rgba(255,255,255,0.03)', transition: 'all 0.3s' },
    avatarImg: { width: '55px', height: '55px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #FACC15', padding: '2px', boxShadow: '0 0 15px rgba(250, 204, 21, 0.15)' },

    // Botones Acción Rápida
    actionRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' },
    btnPrimary: { background: 'linear-gradient(135deg, #FACC15 0%, #EAB308 100%)', color: 'black', border: 'none', padding: '12px 28px', borderRadius: '14px', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 10px 25px rgba(250, 204, 21, 0.25)', transition: 'all 0.2s transform' },

    // Grid de KPIs
    statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '40px' },
    statCard: { background: 'linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '24px', padding: '24px', display: 'flex', alignItems: 'center', gap: '20px', backdropFilter: 'blur(10px)' },
    iconWrap: { width: '48px', height: '48px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    statValue: { fontSize: '2rem', fontWeight: 900, color: 'white', lineHeight: 1.2 },
    statLabel: { color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' },

    // Main Layout (Atletas vs Feed)
    mainLayout: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))", gap: "40px", alignItems: "start", paddingBottom: "60px" },
    leftCol: { flex: 2, minWidth:0 },
    rightCol: { background: 'linear-gradient(145deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.01) 100%)', borderRadius: '24px', padding: '30px', border: '1px solid rgba(255,255,255,0.05)', position: 'sticky', top: '20px', backdropFilter: 'blur(10px)' },

    // Tarjetas Atletas
    clientGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "15px" },
    clientCard: (completado) => ({
        background: "rgba(255,255,255,0.02)", 
        border: completado ? "1px solid rgba(74, 222, 128, 0.5)" : "1px solid rgba(255,255,255,0.08)",
        borderRadius: "20px", padding: "24px", position: "relative", cursor: "pointer", transition: "all 0.3s"
    }),
    badge: { position: "absolute", top: 15, right: 15, background: "rgba(74, 222, 128, 0.15)", color: "#4ade80", padding: "4px 10px", borderRadius: "8px", fontSize: "0.7rem", fontWeight: 800, display: "flex", gap: "4px", alignItems: 'center' },
    
    // Botonera de Atletas
    cardActions: { display: 'flex', gap: '10px', marginTop: '20px' },
    chatBtn: { padding: "12px", borderRadius: "12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: '0.2s' },
    manageBtn: { flex: 1, padding: "12px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", color: "white", cursor: "pointer", fontWeight: 700, display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", transition: '0.2s' },

    // Feed
    feedTitle: { fontSize: "1rem", fontWeight: 800, color: "white", marginBottom: "25px", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "10px", letterSpacing: '1px' },
    feedItem: { padding: "15px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", gap: "15px", cursor: 'pointer', transition: '0.2s', '&:hover': { background: 'rgba(255,255,255,0.02)'} },
    feedIcon: { width: "40px", height: "40px", borderRadius: "50%", background: "rgba(250, 204, 21, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#FACC15", flexShrink: 0 },

    // Modales
    modalOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", backdropFilter: 'blur(5px)', display: "flex", justifyContent: "center", alignItems: "center", zIndex: 100 },
    modalCard: { background: "#09090b", padding: "40px", borderRadius: "24px", border: "1px solid rgba(255,255,255,0.1)", width: "450px", position:"relative", boxShadow: '0 25px 50px rgba(0,0,0,0.5)' },
  };

  return (
    <div style={styles.page}>
      
      {/* 1. HEADER CON PERFIL (Identidad visual) */}
      <div style={styles.headerRow}>
        <div style={styles.greetingBox}>
          <h1 style={styles.title}>Hola, {perfil.nombre.split(' ')[0]} 👋</h1>
          <span style={styles.subtitle}>Aquí tienes el resumen de tu equipo.</span>
        </div>
        
        <div style={styles.profileSection}>
          <div style={styles.bellBox} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}>
            <Bell size={20} color="white" />
          </div>
          <div onClick={() => navigate('/entrenador/perfil')} style={{cursor: 'pointer'}}>
            {perfil.fotoPerfil ? (
              <img src={perfil.fotoPerfil} alt="Perfil" style={styles.avatarImg} />
            ) : (
              <div style={{...styles.avatarImg, background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                <User size={24} color="#FACC15" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. BARRA DE ACCIÓN */}
      <div style={styles.actionRow}>
        <div style={{ fontWeight: 800, fontSize: '1.2rem', letterSpacing: '-0.5px', textTransform: 'uppercase' }}>PANEL DE CONTROL</div>
        <button 
          style={styles.btnPrimary} 
          onClick={() => setShowAddModal(true)}
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.03)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          <Plus size={20} /> Nuevo Atleta
        </button>
      </div>

      {/* 3. KPIs (Tarjetas Premium) */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
            <div style={{...styles.iconWrap, background: 'rgba(239, 68, 68, 0.1)'}}>
                <AlertTriangle size={24} color="#EF4444"/>
            </div>
            <div>
                <div style={styles.statLabel}>En Riesgo</div>
                <div style={styles.statValue}>{stats.riesgo}</div>
            </div>
        </div>
        <div style={styles.statCard}>
            <div style={{...styles.iconWrap, background: 'rgba(74, 222, 128, 0.1)'}}>
                <CheckCircle2 size={24} color="#4ade80"/>
            </div>
            <div>
                <div style={styles.statLabel}>Entrenan Hoy</div>
                <div style={styles.statValue}>{stats.hoy}</div>
            </div>
        </div>
        <div style={styles.statCard}>
            <div style={{...styles.iconWrap, background: 'rgba(250, 204, 21, 0.1)'}}>
                <Zap size={24} color="#FACC15"/>
            </div>
            <div>
                <div style={styles.statLabel}>Récords Semanales</div>
                <div style={styles.statValue}>{stats.records}</div>
            </div>
        </div>
      </div>

      <div style={styles.mainLayout}>
          
          {/* 4. COLUMNA IZQUIERDA: EQUIPO */}
          <div style={styles.leftCol}>
              <h3 style={{color:'white', margin:'0 0 20px 0', fontSize: '1rem', letterSpacing: '1px'}}>MIS ATLETAS</h3>
              
                {listaClientes.length === 0 ? (
                  <div style={{padding:'60px 40px', border:'1px dashed rgba(255,255,255,0.1)', borderRadius:'24px', textAlign:'center', background: 'rgba(255,255,255,0.01)'}}>
                    <User size={40} color="rgba(255,255,255,0.2)" style={{marginBottom: '15px'}}/>
                    <div style={{color:'rgba(255,255,255,0.7)', fontWeight: 600, fontSize: '1.1rem'}}>No tienes atletas vinculados.</div>
                    <div style={{color:'rgba(255,255,255,0.4)', fontSize: '0.9rem', marginTop: '5px'}}>Añade a tu primer cliente para empezar a programar.</div>
                  </div>
                ) : (
                <div style={styles.clientGrid}>
                  {listaClientes.map((item, idx) => {
                    const datosCliente = item.cliente ? item.cliente : item;
                    const semanaCompletada = item.semanaCompletada || false;

                    if(!datosCliente) return null;

                    return (
                        <div 
                            key={datosCliente.id || idx} 
                            style={styles.clientCard(semanaCompletada)}
                            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#FACC15"; e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 10px 30px rgba(0,0,0,0.5)"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.borderColor = semanaCompletada ? "rgba(74, 222, 128, 0.5)" : "rgba(255,255,255,0.08)"; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
                        >
                            {semanaCompletada && <div style={styles.badge}><Check size={14}/> CUMPLIDO</div>}
                          
                            <div style={{display:'flex', gap:'15px', alignItems:'center'}}>
                                <div style={{width:"50px", height:"50px", borderRadius:"14px", background:"rgba(255,255,255,0.05)", display:"flex", alignItems:"center", justifyContent:"center", overflow:'hidden'}}>
                                    {datosCliente.fotoPerfil ? (
                                        <img src={datosCliente.fotoPerfil} alt="perfil" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                    ) : (
                                        <User size={22} color="#71717a" />
                                    )}
                                </div>
                                <div>
                                    <h4 style={{ margin: 0, color: "white", fontWeight: 800, fontSize: "1.05rem", textTransform: "uppercase" }}>
                                        {datosCliente.nombre} {datosCliente.apellido}
                                    </h4>
                                    <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.85rem", marginTop: "4px", fontWeight: 500 }}>
                                        {datosCliente.objetivo || "Sin objetivo definido"}
                                    </div>
                                </div>
                            </div>
                          
                            <div style={styles.cardActions}>
                                <button 
                                    style={styles.chatBtn}
                                    onClick={(e) => { e.stopPropagation(); setChatOpen(datosCliente); }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
                                    onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
                                >
                                    <MessageCircle size={18} />
                                </button>
                                <button 
                                    style={styles.manageBtn} 
                                    onClick={() => handleGestionar(datosCliente.id)}
                                    onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}
                                    onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.03)"}
                                >
                                    Gestionar <ChevronRight size={18} />
                                </button>
                            </div>
                        </div>
                    );
                  })}
                </div>
              )}
          </div>

          {/* 5. COLUMNA DERECHA: SIDEBAR DE ACTIVIDAD */}
          <div style={styles.rightCol}>
              <div style={styles.feedTitle}><Activity size={18} color="#FACC15"/> Última Actividad</div>
              
              {feed.length > 0 ? (
                  feed.map((item, idx) => (
                      <div 
                        key={item.id || idx} 
                        style={styles.feedItem} 
                        onClick={() => navigate(`/entrenador/cliente/${item.clienteId}/calendario`)}
                      >
                          <div style={styles.feedIcon}>
                              {item.foto ? <img src={item.foto} style={{width:'100%', height:'100%', borderRadius:'50%', objectFit:'cover'}}/> : <User size={18} />}
                          </div>
                          <div>
                              <div style={{fontSize: "0.95rem", color: "rgba(255,255,255,0.8)", lineHeight: "1.4"}}>
                                  <span style={{color:'white', fontWeight: 700}}>{item.clienteNombre}</span>
                                  <span style={{color:'rgba(255,255,255,0.5)'}}> completó </span>
                                  <span style={{color:'#FACC15', fontWeight: 600}}>{item.rutina}</span>
                              </div>
                              <div style={{fontSize: "0.8rem", color: "rgba(255,255,255,0.4)", marginTop: "6px", fontWeight: 600}}>
                                  {new Date(item.fecha).toLocaleDateString([], {day:'2-digit', month:'2-digit'})} • {new Date(item.fecha).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                              </div>
                          </div>
                      </div>
                  ))
              ) : (
                  <div style={{color:'rgba(255,255,255,0.4)', fontSize:'0.95rem', padding:'30px 0', textAlign: 'center'}}>
                      <TrendingUp size={30} color="rgba(255,255,255,0.1)" style={{marginBottom: '10px'}}/>
                      <div>No hay actividad reciente en tu equipo.</div>
                  </div>
              )}
          </div>

      </div>

      {/* MODAL VINCULAR ATLETA */}
      {showAddModal && (
        <div style={styles.modalOverlay} onClick={() => setShowAddModal(false)}>
          <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <button style={{position:'absolute', top:25, right:25, background:'rgba(255,255,255,0.05)', border:'none', color:'white', width:'35px', height:'35px', borderRadius:'50%', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center'}} onClick={() => setShowAddModal(false)}><X size={18} /></button>
            <h3 style={{color:'white', fontSize:'1.6rem', marginBottom:'10px', marginTop:0, fontWeight: 900}}>Vincular Atleta</h3>
            <p style={{color:'rgba(255,255,255,0.5)', marginBottom:'30px', fontSize: '0.95rem', lineHeight: 1.5}}>Introduce el correo electrónico del usuario para añadirlo a tu lista de gestión y empezar a planificar sus rutinas.</p>
            <GymInput icon={Mail} placeholder="usuario@email.com" value={newClientEmail} onChange={(e) => setNewClientEmail(e.target.value)} />
            <div style={{marginTop:'30px'}}>
                <GymButton fullWidth onClick={handleFichar}>Añadir al Equipo</GymButton>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FLOTANTE DEL CHAT */}
      {chatOpen && (
        <div style={{
            position: 'fixed', bottom: '20px', right: '30px', width: '380px', height: '550px', 
            zIndex: 9999, boxShadow: '0 25px 50px rgba(0,0,0,0.6)', borderRadius: '24px',
            background: '#09090b', border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden'
        }}>
            <button 
                onClick={() => setChatOpen(null)}
                style={{
                    position: 'absolute', top: '15px', right: '15px', 
                    background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', 
                    width: '32px', height: '32px', color: 'white', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10,
                    backdropFilter: 'blur(5px)'
                }}
            >
                <X size={18}/>
            </button>
            
            <ChatComponent 
                usuarioId={entrenadorId} 
                destinatarioId={chatOpen.id} 
                nombreDestinatario={chatOpen.nombre + " " + chatOpen.apellido} 
                fotoDestinatario={chatOpen.fotoPerfil}
            />
        </div>
      )}
    </div>
  );
}