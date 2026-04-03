import React, { useState, useEffect, useRef } from "react";
import { obtenerClientesEntrenador, getCliente } from "../../api/endpoints";
import { useAuth } from "../../context/AuthContext";
import { Search, MessageSquare, User, Edit } from "lucide-react";
import ChatComponent from "../../components/functional/ChatComponent";
import SockJS from 'sockjs-client';
import Stomp from 'stompjs';
import { WS_BASE_URL } from "../../api/config";

export default function ChatPage() {
    const { userId: entrenadorId } = useAuth();
    const [clientes, setClientes] = useState([]);
    const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
    const [busqueda, setBusqueda] = useState("");
    const [loading, setLoading] = useState(true);
    const [unreadUsers, setUnreadUsers] = useState(new Set());

    const socketRef = useRef(null);

    useEffect(() => {
        if (!entrenadorId) return;
        cargarClientes();
        conectarSocketGlobal();
        return () => { if (socketRef.current) socketRef.current.disconnect(); };
    }, [entrenadorId]);

   const conectarSocketGlobal = () => {
    const socket = new SockJS(`${WS_BASE_URL}/ws`);
    const client = Stomp.over(socket);
    client.debug = null;

    client.connect({}, () => {
        socketRef.current = client;

        client.subscribe(`/topic/mensajes/${entrenadorId}`, (payload) => {
            const msg = JSON.parse(payload.body);

            if (msg.remitenteId && msg.remitenteId !== entrenadorId) {
                setClientes((prev) => {
                    const exists = prev.some((c) => String(c.id) === String(msg.remitenteId));

                    if (!exists) {
                        getCliente(msg.remitenteId)
                            .then((res) => {
                                const clienteData = res.entrenador ? res.entrenador : res;

                                setClientes((old) => {
                                    if (old.some((c) => String(c.id) === String(clienteData.id))) {
                                        return old;
                                    }
                                    return [clienteData, ...old];
                                });
                            })
                            .catch((err) => {
                                console.warn('No se pudo cargar cliente remoto:', err);
                            });
                    }

                    if (clienteSeleccionado?.id !== msg.remitenteId) {
                        setUnreadUsers((prevUnread) => new Set(prevUnread).add(msg.remitenteId));
                    }

                    return prev;
                });
            }
        });
    });
};

    const cargarClientes = async () => {
        try {
            setLoading(true);
            const data = await obtenerClientesEntrenador(entrenadorId);
            const listaLimpia = data.map(item => item.cliente ? item.cliente : item);
            setClientes(listaLimpia || []);
        } catch (error) { console.error(error); } 
        finally { setLoading(false); }
    };

    const handleSelectCliente = (cliente) => {
        setClienteSeleccionado(cliente);
        if (unreadUsers.has(cliente.id)) {
            const newSet = new Set(unreadUsers);
            newSet.delete(cliente.id);
            setUnreadUsers(newSet);
        }
    };

    const clientesFiltrados = clientes.filter(c => 
        (c.nombre + " " + c.apellido).toLowerCase().includes(busqueda.toLowerCase())
    );

    const styles = {
        // Contenedor SEGURO: altura calculada menos un poco de margen para que respire
       pageWrapper: { 
            margin: "-64px", 
            height: "100vh", 
            display: "flex", 
            background: "#09090b",
            overflow: "hidden"
        }, 
        container: { 
            display: "flex", 
            width: "100%", 
            height: "100%", // Obligamos a que ocupe todo el alto
            background: "#09090b"
            
        },
        
        contactPanel: { width: "340px", background: "#0c0c0e", borderRight: "1px solid #1f1f22", display: "flex", flexDirection: "column" },
        panelHeader: { padding: "24px 20px 16px 20px" },
        headerTop: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" },
        title: { color: "white", margin: 0, fontSize: "1.3rem", fontWeight: "800" },
        
        searchContainer: { background: "#18181b", borderRadius: "10px", padding: "8px 12px", display: "flex", alignItems: "center", gap: "10px", border: "1px solid #27272a" },
        searchInput: { background: "transparent", border: "none", color: "white", outline: "none", width: "100%", fontSize: "0.9rem" },

        lista: { flex: 1, overflowY: "auto", padding: "10px", display: "flex", flexDirection: "column", gap: "4px" },
        
        clienteItem: (activo) => ({
            display: "flex", alignItems: "center", gap: "14px", padding: "12px", borderRadius: "10px", cursor: "pointer", 
            background: activo ? "#1f1f22" : "transparent",
            transition: "background 0.2s ease", position: "relative"
        }),
        avatar: { width: "48px", height: "48px", borderRadius: "50%", background: "#27272a", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", position: "relative" },
        avatarImg: { width: "100%", height: "100%", objectFit: "cover" },
        redDot: { width: "12px", height: "12px", borderRadius: "50%", background: "#3b82f6", border: "2px solid #0c0c0e", position: "absolute", bottom: "0", right: "0" }, 

        chatArea: { flex: 1, background: "#09090b", display: 'flex', flexDirection: 'column', position: 'relative' },
        emptyState: { height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#52525b" }
    };

    return (
        <div style={styles.pageWrapper}>
            <style>{`.hide-scroll::-webkit-scrollbar { display: none; } .hide-scroll { -ms-overflow-style: none; scrollbar-width: none; }`}</style>

            <div style={styles.container}>
                <div style={styles.contactPanel}>
                    <div style={styles.panelHeader}>
                        <div style={styles.headerTop}>
                            <h2 style={styles.title}>Mensajes</h2>
                            <Edit size={18} color="#a1a1aa" style={{cursor: 'pointer'}}/>
                        </div>
                        <div style={styles.searchContainer}>
                            <Search size={16} color="#71717a" />
                            <input 
                                style={styles.searchInput} 
                                placeholder="Buscar conversación..." 
                                value={busqueda} 
                                onChange={(e) => setBusqueda(e.target.value)} 
                            />
                        </div>
                    </div>
                    
                    <div className="hide-scroll" style={styles.lista}>
                        {loading ? <p style={{padding:'20px', color:'#71717a', textAlign:'center', fontSize:'0.9rem'}}>Cargando...</p> : (
                            clientesFiltrados.map((cliente) => {
                                const tieneNotificacion = unreadUsers.has(cliente.id);
                                return (
                                    <div key={cliente.id} style={styles.clienteItem(clienteSeleccionado?.id === cliente.id)} onClick={() => handleSelectCliente(cliente)}>
                                        <div style={styles.avatar}>
                                            {cliente.fotoPerfil ? <img src={cliente.fotoPerfil} style={styles.avatarImg} /> : <User size={20} color="#71717a"/>}
                                            {tieneNotificacion && <div style={styles.redDot}></div>}
                                        </div>
                                        <div style={{flex: 1, minWidth: 0}}>
                                            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                                <div style={{color: 'white', fontWeight: tieneNotificacion ? '700' : '600', fontSize:'0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>
                                                    {cliente.nombre} {cliente.apellido}
                                                </div>
                                            </div>
                                            <div style={{color: tieneNotificacion ? '#3b82f6' : '#71717a', fontSize:'0.85rem', fontWeight: tieneNotificacion ? '500' : '400', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>
                                                {tieneNotificacion ? 'Nuevo mensaje recibido' : 'Toca para abrir chat'}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                <div style={styles.chatArea}>
                    {clienteSeleccionado ? (
                        <ChatComponent 
                            usuarioId={entrenadorId}
                            destinatarioId={clienteSeleccionado.id}
                            nombreDestinatario={clienteSeleccionado.nombre + " " + clienteSeleccionado.apellido}
                            fotoDestinatario={clienteSeleccionado.fotoPerfil}
                        />
                    ) : (
                        <div style={styles.emptyState}>
                            <div style={{padding: '30px', background: '#121214', borderRadius: '50%', marginBottom: '20px'}}>
                                <MessageSquare size={48} color="#27272a" />
                            </div>
                            <h3 style={{color:'white', margin:'0 0 8px 0', fontSize:'1.2rem', fontWeight:'600'}}>Tus Conversaciones</h3>
                            <p style={{fontSize:'0.9rem', margin:0, color: '#71717a'}}>Selecciona un atleta en el panel para comenzar.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}