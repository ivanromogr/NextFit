import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
    obtenerClientesEntrenador, 
    ficharCliente, 
    desvincularAtleta 
} from "../../api/endpoints";
import { useAuth } from "../../context/AuthContext";


import { 
    User, Plus, Search, Mail, ChevronRight, Check, 
    MessageCircle, X, UserMinus, AlertTriangle 
} from "lucide-react";

import GymButton from "../../components/ui/GymButton";
import GymInput from "../../components/ui/GymInput";
import ChatComponent from "../../components/functional/ChatComponent"; 

export default function GestionAtletas() {
  const navigate = useNavigate();
  const { userId: entrenadorId } = useAuth();
  const [listaClientes, setListaClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal Vincular y Búsqueda
  const [showAddModal, setShowAddModal] = useState(false);
  const [newClientEmail, setNewClientEmail] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [chatOpen, setChatOpen] = useState(null);


  const [showUnlinkModal, setShowUnlinkModal] = useState(false);
  const [atletaToUnlink, setAtletaToUnlink] = useState(null);

  useEffect(() => {
    if (entrenadorId) cargarClientes();
  }, [entrenadorId]);

  const cargarClientes = async () => {
    try {
      setLoading(true);
      const data = await obtenerClientesEntrenador(entrenadorId);
      setListaClientes(data || []);
    } catch (error) { 
        console.error("Error al cargar clientes:", error); 
    } finally { 
        setLoading(false); 
    }
  };

  const triggerDesvincular = (e, clientInfo) => {
    e.stopPropagation();
    setAtletaToUnlink(clientInfo);
    setShowUnlinkModal(true);
  };

  const confirmDesvincular = async () => {
    if (!atletaToUnlink) return;
    try {
      await desvincularAtleta(entrenadorId, atletaToUnlink.id);
      setListaClientes(prev => prev.filter(item => item.cliente.id !== atletaToUnlink.id));
      setShowUnlinkModal(false);
      setAtletaToUnlink(null);
    } catch (error) {
      alert("Error al desvincular: " + error.message);
    }
  };

  const handleFichar = async () => {
    try {
      await ficharCliente(entrenadorId, newClientEmail.trim());
      setShowAddModal(false);
      setNewClientEmail("");
      cargarClientes();
    } catch (e) {
        const backendMessage =
          e?.response?.data?.message ||
          e?.response?.data?.error ||
          e?.message ||
          "Error al vincular el atleta";
        alert(backendMessage);
    }
  };

  const clientesFiltrados = listaClientes.filter(item => 
      item.cliente.nombre.toLowerCase().includes(busqueda.toLowerCase()) || 
      item.cliente.apellido.toLowerCase().includes(busqueda.toLowerCase())
  );

  const styles = {
    page: { minHeight: "100vh" },
    header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px" },
    title: { fontSize: "2rem", fontWeight: "900", color: "white", margin: 0, textTransform: "uppercase" },
    grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "20px", paddingBottom: "80px" },
    card: (completado) => ({
        background: "#121214",
        borderRadius: "16px",
        padding: "20px",
        border: completado ? "2px solid #22c55e" : "1px solid #27272a",
        boxShadow: completado ? "0 0 15px rgba(34, 197, 94, 0.15)" : "none",
        transition: "transform 0.2s",
        cursor: "pointer",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between"
    }),
    badge: {
        position: "absolute", top: 15, right: 15, background: "rgba(34, 197, 94, 0.2)", 
        color: "#22c55e", padding: "4px 8px", borderRadius: "6px", fontSize: "0.7rem", 
        fontWeight: "bold", display: "flex", alignItems: "center", gap: "4px"
    },
    searchBar: { marginBottom: "30px", maxWidth: "400px" },
    modalOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 100 },
    modalCard: { background: "#09090b", padding: "30px", borderRadius: "24px", border: "1px solid #333", width: "420px", position: "relative" },

    
    emptyState: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "100px 20px",
        textAlign: "center",
        background: "rgba(255,255,255,0.02)",
        borderRadius: "24px",
        border: "1px dashed rgba(255,255,255,0.1)",
        marginTop: "20px"
    },
    emptyIconBox: {
        width: "80px",
        height: "80px",
        borderRadius: "50%",
        background: "rgba(255,255,255,0.05)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: "20px"
    },
    emptyTitle: {
        fontSize: "1.5rem",
        fontWeight: "900",
        color: "white",
        margin: "0 0 10px 0",
        textTransform: "uppercase",
        letterSpacing: "1px"
    },
    emptySubtitle: {
        color: "#71717a",
        fontSize: "1rem",
        maxWidth: "400px",
        lineHeight: "1.5",
        marginBottom: "30px"
    }
  };

  return (
    <div style={styles.page}>
      {/* CABECERA */}
      <div style={styles.header}>
        <h1 style={styles.title}>Mis Atletas</h1>
        <GymButton onClick={() => setShowAddModal(true)}><Plus size={20}/> Nuevo</GymButton>
      </div>

      {/* BUSCADOR */}
      <div style={styles.searchBar}>
          <GymInput icon={Search} placeholder="Buscar por nombre..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
      </div>

      {/* GRID DE ATLETAS O ESTADO VACÍO */}
      {loading ? (
        <p style={{color: "#666", textAlign: 'center', marginTop: '50px'}}>Cargando equipo...</p>
      ) : clientesFiltrados.length === 0 ? (
        
        <div style={styles.emptyState}>
            <div style={styles.emptyIconBox}>
                <User size={40} color="rgba(255,255,255,0.2)" />
            </div>
            <h2 style={styles.emptyTitle}>Tu equipo está vacío</h2>
            <p style={styles.emptySubtitle}>
                Aún no tienes atletas vinculados. <br/>
                ¡Añade a tu primer cliente para empezar a programar sus entrenamientos!
            </p>
            <GymButton onClick={() => setShowAddModal(true)}>
                <Plus size={20} style={{marginRight: '8px'}}/> VINCULAR PRIMER ATLETA
            </GymButton>
        </div>

      ) : (
        <div style={styles.grid}>
            {clientesFiltrados.map(({ cliente, semanaCompletada }) => (
                <div 
                    key={cliente.id} 
                    style={styles.card(semanaCompletada)}
                    onClick={() => {
                        localStorage.setItem("clienteObjetivoId", cliente.id);
                        navigate(`/entrenador/cliente/${cliente.id}/rutinas`);
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-5px)"}
                    onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
                >
                    {semanaCompletada && <div style={styles.badge}><Check size={12}/> CUMPLIDO</div>}
                    
                    <div style={{display: "flex", gap: "15px", alignItems: "center", marginBottom: "20px"}}>
                        <div style={{width:"50px", height:"50px", borderRadius:"12px", background:"#18181b", display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden"}}>
                            {cliente.fotoPerfil ? <img src={cliente.fotoPerfil} style={{width:"100%", height:"100%", objectFit:"cover"}} alt="perfil"/> : <User size={24} color="#555"/>}
                        </div>
                        <div>
                            <div style={{color: "white", fontWeight: "bold", fontSize: "1.1rem"}}>{cliente.nombre} {cliente.apellido}</div>
                            <div style={{color: "#71717a", fontSize: "0.85rem"}}>{cliente.objetivo || "Sin objetivo"}</div>
                        </div>
                    </div>
                    
                    <div style={{display: "flex", gap: "10px", marginTop: "auto"}}>
                        <button
                            style={{
                                padding: "10px", borderRadius: "8px", background: "rgba(239, 68, 68, 0.1)", 
                                border: "1px solid rgba(239, 68, 68, 0.2)", color: "#ef4444", cursor: "pointer", 
                                display: "flex", alignItems: "center", justifyContent: "center",
                                transition: "all 0.2s"
                            }}
                            onClick={(e) => triggerDesvincular(e, cliente)}
                            onMouseEnter={(e) => e.currentTarget.style.background = "rgba(239, 68, 68, 0.2)"}
                            onMouseLeave={(e) => e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)"}
                            title="Desvincular Atleta"
                        >
                            <UserMinus size={20} />
                        </button>

                        <button
                            style={{
                                padding: "10px", borderRadius: "8px", background: "#27272a", 
                                border: "1px solid #3f3f46", color: "#fff", cursor: "pointer", 
                                display: "flex", alignItems: "center", justifyContent: "center",
                                transition: "background 0.2s"
                            }}
                            onClick={(e) => {
                                e.stopPropagation();
                                setChatOpen(cliente);
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = "#3f3f46"}
                            onMouseLeave={(e) => e.currentTarget.style.background = "#27272a"}
                        >
                            <MessageCircle size={20} />
                        </button>

                        <button 
                            style={{
                                flex: 1,
                                padding: "10px", borderRadius: "8px", background: "#18181b", 
                                color: "white", border: "1px solid #27272a", cursor: "pointer", 
                                display: "flex", justifyContent: "center", alignItems: "center", 
                                gap: "5px", fontSize: "0.9rem", fontWeight: "bold"
                            }}
                            onClick={(e) => {
                                e.stopPropagation();
                                localStorage.setItem("clienteObjetivoId", cliente.id);
                                navigate(`/entrenador/cliente/${cliente.id}/rutinas`);
                            }}
                        >
                            Gestionar <ChevronRight size={16}/>
                        </button>
                    </div>
                </div>
            ))}
        </div>
      )}

      {/* MODAL VINCULAR (Original) */}
      {showAddModal && (
        <div style={styles.modalOverlay} onClick={() => setShowAddModal(false)}>
            <div style={styles.modalCard} onClick={e => e.stopPropagation()}>
                <h3 style={{color:"white", marginTop:0, fontWeight: 900}}>VINCULAR ATLETA</h3>
                <p style={{color: '#71717a', fontSize: '0.9rem', marginBottom: '20px'}}>Introduce su email para añadirlo a tu equipo.</p>
                <div style={{marginBottom:"20px"}}><GymInput icon={Mail} placeholder="Email del atleta" value={newClientEmail} onChange={e => setNewClientEmail(e.target.value)}/></div>
                <GymButton fullWidth onClick={handleFichar}>Vincular</GymButton>
            </div>
        </div>
      )}

      {/* MODAL PERSONALIZADO DE DESVINCULAR */}
      {showUnlinkModal && atletaToUnlink && (
        <div style={styles.modalOverlay} onClick={() => setShowUnlinkModal(false)}>
          <div style={{ ...styles.modalCard, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <div style={{ 
                background: "rgba(239, 68, 68, 0.1)", 
                padding: "20px", 
                borderRadius: "50%", 
                display: "inline-block", 
                marginBottom: "20px" 
            }}>
              <AlertTriangle size={40} color="#ef4444" />
            </div>
            
            <h3 style={{ color: "white", margin: "0 0 10px 0", fontSize: "1.5rem", fontWeight: 900 }}>
                ¿DESVINCULAR ATLETA?
            </h3>
            
            <p style={{ color: "#a1a1aa", fontSize: "0.95rem", lineHeight: "1.5", marginBottom: "30px" }}>
              Estás a punto de dejar de entrenar a <strong style={{color: 'white'}}>{atletaToUnlink.nombre} {atletaToUnlink.apellido}</strong>.<br/>
              Ya no aparecerá en tu lista y no podrás gestionar sus rutinas.
            </p>

            <div style={{ display: "flex", gap: "15px" }}>
              <button 
                style={{ flex: 1, background: "transparent", border: "1px solid #27272a", color: "#a1a1aa", padding: "14px", borderRadius: "12px", fontWeight: "bold", cursor: "pointer" }}
                onClick={() => setShowUnlinkModal(false)}
              >
                CANCELAR
              </button>
              <button 
                style={{ flex: 1, background: "#ef4444", color: "white", border: "none", padding: "14px", borderRadius: "12px", fontWeight: "bold", cursor: "pointer" }}
                onClick={confirmDesvincular}
              >
                SÍ, DESVINCULAR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CHAT FLOTANTE */}
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
            />
        </div>
      )}
    </div>
  );
}
