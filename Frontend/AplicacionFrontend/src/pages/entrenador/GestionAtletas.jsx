import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { obtenerClientesEntrenador, ficharCliente } from "../../api/endpoints";
import { useAuth } from "../../context/AuthContext";
import { User, Plus, Search, Mail, ChevronRight, Check, MessageCircle, X } from "lucide-react";
import GymButton from "../../components/ui/GymButton";
import GymInput from "../../components/ui/GymInput";
// 👇 IMPORTANTE: Asegúrate de tener este componente creado (el que hicimos en el paso anterior)
import ChatComponent from "../../components/functional/ChatComponent"; 

export default function GestionAtletas() {
  const navigate = useNavigate();
  const { userId: entrenadorId } = useAuth();
  const [listaClientes, setListaClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal y Búsqueda
  const [showAddModal, setShowAddModal] = useState(false);
  const [newClientEmail, setNewClientEmail] = useState("");
  const [busqueda, setBusqueda] = useState("");

  // 👇 ESTADO NUEVO PARA EL CHAT
  const [chatOpen, setChatOpen] = useState(null); // Aquí guardamos el cliente con el que estamos hablando

  useEffect(() => {
    if (entrenadorId) cargarClientes();
  }, [entrenadorId]);

  const cargarClientes = async () => {
    try {
      setLoading(true);
      const data = await obtenerClientesEntrenador(entrenadorId);
      setListaClientes(data || []);
    } catch (error) { console.error(error); } 
    finally { setLoading(false); }
  };

  const handleFichar = async () => {
    try {
      await ficharCliente(entrenadorId, newClientEmail.trim());
      setShowAddModal(false);
      setNewClientEmail("");
      cargarClientes();
    } catch (e) { alert("Error al vincular"); }
  };

  // Filtrado por buscador
  const clientesFiltrados = listaClientes.filter(item => 
      item.cliente.nombre.toLowerCase().includes(busqueda.toLowerCase()) || 
      item.cliente.apellido.toLowerCase().includes(busqueda.toLowerCase())
  );

  const styles = {
    page: { minHeight: "100vh" },
    header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px" },
    title: { fontSize: "2rem", fontWeight: "900", color: "white", margin: 0, textTransform: "uppercase" },
    
    // Grid
    grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "20px", paddingBottom: "80px" },
    
    // TARJETA CLIENTE
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
    
    // Modal Vincular
    modalOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 100 },
    modalCard: { background: "#09090b", padding: "30px", borderRadius: "20px", border: "1px solid #333", width: "400px" }
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

      {/* GRID DE ATLETAS */}
      {loading ? <p style={{color: "#666"}}>Cargando...</p> : (
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
                            {cliente.fotoPerfil ? <img src={cliente.fotoPerfil} style={{width:"100%", height:"100%", objectFit:"cover"}}/> : <User size={24} color="#555"/>}
                        </div>
                        <div>
                            <div style={{color: "white", fontWeight: "bold", fontSize: "1.1rem"}}>{cliente.nombre} {cliente.apellido}</div>
                            <div style={{color: "#71717a", fontSize: "0.85rem"}}>{cliente.objetivo || "Sin objetivo"}</div>
                        </div>
                    </div>
                    
                    {/* 👇 BOTONERA DE ACCIÓN (CHAT + GESTIONAR) */}
                    <div style={{display: "flex", gap: "10px", marginTop: "auto"}}>
                        <button
                            style={{
                                padding: "10px", borderRadius: "8px", background: "#27272a", 
                                border: "1px solid #3f3f46", color: "#fff", cursor: "pointer", 
                                display: "flex", alignItems: "center", justifyContent: "center",
                                transition: "background 0.2s"
                            }}
                            onClick={(e) => {
                                e.stopPropagation(); // Evita que se abra la ficha al dar al chat
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
                                e.stopPropagation(); // Evita conflictos
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

      {/* MODAL VINCULAR */}
      {showAddModal && (
        <div style={styles.modalOverlay} onClick={() => setShowAddModal(false)}>
            <div style={styles.modalCard} onClick={e => e.stopPropagation()}>
                <h3 style={{color:"white", marginTop:0}}>Vincular Atleta</h3>
                <div style={{marginBottom:"20px"}}><GymInput icon={Mail} placeholder="Email del atleta" value={newClientEmail} onChange={e => setNewClientEmail(e.target.value)}/></div>
                <GymButton fullWidth onClick={handleFichar}>Vincular</GymButton>
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
            />
        </div>
      )}
    </div>
  );
}