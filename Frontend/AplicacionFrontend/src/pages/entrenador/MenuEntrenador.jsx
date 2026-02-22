import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
// 👇 Usamos tus endpoints estándar
import { obtenerClientesEntrenador, ficharCliente, obtenerDashboardResumen } from "../../api/endpoints";
import { useAuth } from "../../context/AuthContext";

import {
  User, Plus, X, Mail,
  Activity, ChevronRight, CheckCircle2, AlertTriangle, Zap, Check, MessageCircle, Users, TrendingUp
} from "lucide-react";

import GymButton from "../../components/ui/GymButton";
import GymInput from "../../components/ui/GymInput";
// 👇 IMPORTANTE: Importamos el componente de Chat
import ChatComponent from "../../components/functional/ChatComponent";

export default function MenuEntrenador() {
  const navigate = useNavigate();
  const { userId: entrenadorId } = useAuth();
  
  const [listaClientes, setListaClientes] = useState([]); // [{cliente: {...}, semanaCompletada: true}, ...]
  const [feed, setFeed] = useState([]); 
  const [stats, setStats] = useState({ hoy: 0, riesgo: 0, records: 0 });
  const [loading, setLoading] = useState(true);

  // UI
  const [showAddModal, setShowAddModal] = useState(false);
  const [newClientEmail, setNewClientEmail] = useState("");
  
  // 👇 ESTADO PARA EL CHAT
  const [chatOpen, setChatOpen] = useState(null);

  useEffect(() => {
    if (entrenadorId) {
        cargarDatos();
    } else {
        navigate("/auth/login");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entrenadorId, navigate]);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      
      // 1. Clientes
      const dataClientes = await obtenerClientesEntrenador(entrenadorId);
      setListaClientes(dataClientes || []);

      // 2. Dashboard Stats + Feed
      if (typeof obtenerDashboardResumen === 'function') {
          const dataDash = await obtenerDashboardResumen(entrenadorId);
          if (dataDash) {
              setFeed(dataDash.feedActividad || []);
              setStats(dataDash.stats || { hoy: 0, riesgo: 0, records: 0 });
          }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleFichar = async () => {
    try {
      await ficharCliente(entrenadorId, newClientEmail.trim());
      setShowAddModal(false);
      setNewClientEmail("");
      cargarDatos(); 
    } catch (error) {
      alert("Error al vincular cliente");
    }
  };

  const handleGestionar = (idCliente) => {
    localStorage.setItem("clienteObjetivoId", idCliente);
    navigate(`/entrenador/cliente/${idCliente}/rutinas`);
  };

  const styles = {
    // HEADER
    header: { marginBottom: "30px", display: "flex", justifyContent: "space-between", alignItems: "center" },
    title: { fontSize: "2rem", fontWeight: "900", margin: 0, textTransform: "uppercase", color: "white" },
    
    // KPI CARDS (DISEÑO ÁGUILA 🦅)
    eagleGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px", marginBottom: "40px" },
    eagleCard: { background: "#121214", border: "1px solid #27272a", borderRadius: "16px", padding: "20px", display: "flex", alignItems: "center", gap: "20px" },
    cardDanger: { borderLeft: "4px solid #ef4444" },
    cardSuccess: { borderLeft: "4px solid #22c55e" },
    cardGold: { borderLeft: "4px solid #FACC15" },
    
    // LAYOUT PRINCIPAL
    mainLayout: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))", gap: "40px", alignItems: "start", paddingBottom: "60px" },
    leftCol: { flex: 2, minWidth:0 },
    rightCol: { background: '#121214', borderRadius: '24px', padding: '25px', border: '1px solid #27272a', position: 'sticky', top: '20px' },

    // TARJETAS CLIENTE
    clientGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "15px" },
    clientCard: (completado) => ({
        background: "#121214", 
        border: completado ? "2px solid #22c55e" : "1px solid #27272a", // 🟢 BORDE VERDE
        borderRadius: "16px", padding: "20px", 
        position: "relative", cursor: "pointer", transition: "transform 0.2s"
    }),
    badge: { position: "absolute", top: 15, right: 15, background: "rgba(34, 197, 94, 0.2)", color: "#22c55e", padding: "4px 8px", borderRadius: "6px", fontSize: "0.7rem", fontWeight: "bold", display: "flex", gap: "4px" },

    // FEED
    feedTitle: { fontSize: "1rem", fontWeight: "800", color: "#71717a", marginBottom: "20px", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "10px" },
    feedItem: { padding: "15px 0", borderBottom: "1px solid #27272a", display: "flex", gap: "15px", cursor: 'pointer' },
    feedIcon: { width: "36px", height: "36px", borderRadius: "50%", background: "#1c1c1f", display: "flex", alignItems: "center", justifyContent: "center", color: "#FACC15", flexShrink: 0 },
    
    // MODALES
    modalOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 100 },
    modalCard: { background: "#09090b", padding: "30px", borderRadius: "24px", border: "1px solid #333", width: "450px", position:"relative" },
    
    // BOTONES ACCIÓN
    actionRow: { display: 'flex', gap: '10px', marginTop: '15px' },
    chatBtn: { padding: "10px", borderRadius: "8px", background: "#27272a", border: "1px solid #3f3f46", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
    manageBtn: { flex: 1, padding: "10px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "white", cursor: "pointer", fontWeight: "bold", display: "flex", justifyContent: "center", alignItems: "center", gap: "8px" },
  };

  return (
    <div>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Panel de Control</h1>
        </div>
        <GymButton onClick={() => setShowAddModal(true)}>
            <Plus size={20} /> Nuevo Atleta
        </GymButton>
      </header>

      {/* 1. KPIs (Tarjetas de Colores) */}
      <div style={styles.eagleGrid}>
        <div style={{...styles.eagleCard, ...styles.cardDanger}}>
            <div style={{color: "#ef4444"}}><AlertTriangle size={24}/></div>
            <div><div style={{color:'#777'}}>Riesgo</div><div style={{color:'white', fontSize:'2rem', fontWeight:'900'}}>{stats.riesgo}</div></div>
        </div>
        <div style={{...styles.eagleCard, ...styles.cardSuccess}}>
            <div style={{color: "#22c55e"}}><CheckCircle2 size={24}/></div>
            <div><div style={{color:'#777'}}>Hoy</div><div style={{color:'white', fontSize:'2rem', fontWeight:'900'}}>{stats.hoy}</div></div>
        </div>
        <div style={{...styles.eagleCard, ...styles.cardGold}}>
            <div style={{color: "#FACC15"}}><Zap size={24}/></div>
            <div><div style={{color:'#777'}}>Récords</div><div style={{color:'white', fontSize:'2rem', fontWeight:'900'}}>{stats.records}</div></div>
        </div>
      </div>

      <div style={styles.mainLayout}>
          
          {/* 2. COLUMNA IZQUIERDA: GESTIÓN DE ATLETAS */}
          <div style={styles.leftCol}>
              <h3 style={{color:'white', margin:'0 0 20px 0'}}>MIS ATLETAS</h3>
              
              {loading ? <div style={{color:'#555'}}>Cargando equipo...</div> : (
                <div style={styles.clientGrid}>
                  {listaClientes.map((item, idx) => {
                    
                    // 👇 CORRECCIÓN CRÍTICA: Extraemos el cliente del envoltorio
                    const datosCliente = item.cliente ? item.cliente : item;
                    const semanaCompletada = item.semanaCompletada || false;

                    // Si datosCliente es nulo (por seguridad), no renderizamos nada
                    if(!datosCliente) return null;

                    return (
                        <div 
                            key={datosCliente.id || idx} 
                            style={styles.clientCard(semanaCompletada)}
                            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#FACC15"; e.currentTarget.style.transform = "translateY(-4px)"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.borderColor = semanaCompletada ? "#22c55e" : "#27272a"; e.currentTarget.style.transform = "translateY(0)"; }}
                        >
                            {semanaCompletada && <div style={styles.badge}><Check size={12}/> CUMPLIDO</div>}
                          
                            <div style={{display:'flex', gap:'15px', alignItems:'center'}}>
                                <div style={{width:"45px", height:"45px", borderRadius:"12px", background:"#18181b", display:"flex", alignItems:"center", justifyContent:"center", overflow:'hidden'}}>
                                    {datosCliente.fotoPerfil ? (
                                        <img src={datosCliente.fotoPerfil} alt="perfil" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                    ) : (
                                        <User size={20} color="#71717a" />
                                    )}
                                </div>
                                <div>
                                    <h4 style={{ margin: 0, color: "white", fontWeight: "800", fontSize: "1rem", textTransform: "uppercase" }}>
                                        {datosCliente.nombre} {datosCliente.apellido}
                                    </h4>
                                    <div style={{ color: "#71717a", fontSize: "0.85rem", marginTop: "4px" }}>
                                        {datosCliente.objetivo || "Sin objetivo"}
                                    </div>
                                </div>
                            </div>
                          
                            {/* BOTONERA: CHAT Y GESTIONAR */}
                            <div style={styles.actionRow}>
                                <button 
                                    style={styles.chatBtn}
                                    onClick={(e) => { e.stopPropagation(); setChatOpen(datosCliente); }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = "#3f3f46"}
                                    onMouseLeave={(e) => e.currentTarget.style.background = "#27272a"}
                                >
                                    <MessageCircle size={18} />
                                </button>

                                <button 
                                    style={styles.manageBtn} 
                                    onClick={() => handleGestionar(datosCliente.id)}
                                    onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
                                    onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
                                >
                                    Gestionar <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    );
                  })}
                  
                  {listaClientes.length === 0 && (
                      <div style={{gridColumn:'1/-1', padding:'40px', border:'2px dashed #27272a', borderRadius:'20px', textAlign:'center', color:'#52525b'}}>
                          No tienes atletas vinculados. ¡Añade el primero!
                      </div>
                  )}
                </div>
              )}
          </div>

          {/* 3. COLUMNA DERECHA: SIDEBAR DE ACTIVIDAD */}
          <div style={styles.sideSection}>
              <div style={styles.feedTitle}><Activity size={16} color="#FACC15"/> Última Actividad</div>
              
              {feed.length > 0 ? (
                  feed.map((item, idx) => (
                      <div 
                        key={item.id || idx} 
                        style={styles.feedItem} 
                        onClick={() => navigate(`/entrenador/cliente/${item.clienteId}/calendario`)}
                      >
                          <div style={styles.feedIcon}>
                              {item.foto ? <img src={item.foto} style={{width:'100%', height:'100%', borderRadius:'50%', objectFit:'cover'}}/> : item.clienteNombre.charAt(0)}
                          </div>
                          <div>
                              <div style={{fontSize: "0.9rem", color: "#e4e4e7", lineHeight: "1.4"}}>
                                  <span style={{color:'white', fontWeight:'bold'}}>{item.clienteNombre}</span>
                                  <span style={{color:'#a1a1aa'}}> completó </span>
                                  <span style={{color:'#FACC15'}}>{item.rutina}</span>
                              </div>
                              <div style={{fontSize: "0.75rem", color: "#52525b", marginTop: "4px", fontWeight: "600"}}>
                                  {new Date(item.fecha).toLocaleDateString([], {day:'2-digit', month:'2-digit'})} • {new Date(item.fecha).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                              </div>
                          </div>
                      </div>
                  ))
              ) : (
                  <div style={{color:'#52525b', fontSize:'0.9rem', fontStyle:'italic', padding:'20px 0'}}>
                      No hay actividad reciente hoy.
                  </div>
              )}
          </div>

      </div>

      {/* MODAL VINCULAR */}
      {showAddModal && (
        <div style={styles.modalOverlay} onClick={() => setShowAddModal(false)}>
          <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <button style={{position:'absolute', top:20, right:20, background:'none', border:'none', color:'#777', cursor:'pointer'}} onClick={() => setShowAddModal(false)}><X size={22} /></button>
            <h3 style={{color:'white', fontSize:'1.5rem', marginBottom:'10px', marginTop:0}}>Vincular Atleta</h3>
            <p style={{color:'#a1a1aa', marginBottom:'25px'}}>Introduce el email del usuario para añadirlo a tu equipo.</p>
            <GymInput icon={Mail} placeholder="Email del atleta" value={newClientEmail} onChange={(e) => setNewClientEmail(e.target.value)} />
            <div style={{marginTop:'25px'}}>
                <GymButton fullWidth onClick={handleFichar}>Vincular</GymButton>
            </div>
          </div>
        </div>
      )}

      {/* 👇 MODAL FLOTANTE DEL CHAT */}
      {chatOpen && (
        <div style={{
            position: 'fixed', bottom: '20px', right: '20px', width: '380px', height: '500px', 
            zIndex: 9999, boxShadow: '0 20px 50px rgba(0,0,0,0.5)', borderRadius: '16px',
            background: '#09090b', border: '1px solid #333'
        }}>
            <button 
                onClick={() => setChatOpen(null)}
                style={{
                    position: 'absolute', top: '-10px', right: '-10px', 
                    background: '#ef4444', border: 'none', borderRadius: '50%', 
                    width: '30px', height: '30px', color: 'white', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10
                }}
            >
                <X size={16}/>
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