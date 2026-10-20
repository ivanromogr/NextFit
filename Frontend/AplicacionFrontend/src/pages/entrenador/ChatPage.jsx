import { getAccessToken } from '../../utils/authSession';
import React, { useState, useEffect, useRef, useCallback } from "react";
import { obtenerClientesEntrenador, getCliente, obtenerContactosChat } from "../../api/endpoints";
import { useAuth } from "../../context/AuthContext";
import { Search, MessageSquare, User, Edit } from "lucide-react";
import ChatComponent from "../../components/functional/ChatComponent";
import SockJS from 'sockjs-client';
import Stomp from 'stompjs';
import { SOCKJS_URL } from "../../api/config";

export default function ChatPage() {
    const { userId: entrenadorId } = useAuth();
    const [clientes, setClientes] = useState([]);
    const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
    const [busqueda, setBusqueda] = useState("");
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const loadRequests = useRef(0);
    const selectedContact = useRef(null);
    useEffect(() => { selectedContact.current = clienteSeleccionado?.id; }, [clienteSeleccionado?.id]);
    const [unreadUsers, setUnreadUsers] = useState(new Set());

    const socketRef = useRef(null);

   const conectarSocketGlobal = useCallback(() => {
    const socket = new SockJS(SOCKJS_URL);
    const client = Stomp.over(socket);
    client.debug = null;

    client.connect({ Authorization: `Bearer ${getAccessToken() || ''}` }, () => {
        socketRef.current = client;

        client.subscribe('/user/queue/mensajes', (payload) => {
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

                    if (selectedContact.current !== msg.remitenteId) {
                        setUnreadUsers((prevUnread) => new Set(prevUnread).add(msg.remitenteId));
                    }

                    return prev;
                });
            }
        });
    });
}, [entrenadorId]);

    const cargarClientes = useCallback(() => {
        const request = ++loadRequests.current;
        return Promise.allSettled([
            Promise.resolve().then(() => obtenerClientesEntrenador(entrenadorId)),
            Promise.resolve().then(() => obtenerContactosChat(entrenadorId))
        ]).then(([assigned, contacts]) => {
            if (request !== loadRequests.current) return;
            const assignedOk = assigned.status === 'fulfilled' && Array.isArray(assigned.value);
            const contactsOk = contacts.status === 'fulfilled' && Array.isArray(contacts.value);
            const complete = assignedOk && contactsOk;
            setClientes(previous => {
                const map = new Map();
                const available = [
                    ...(!complete ? previous : []),
                    ...(assignedOk ? assigned.value.map(item => item?.cliente || item) : []),
                    ...(contactsOk ? contacts.value : [])
                ];
                available.filter(contact => contact?.id && String(contact.id) !== String(entrenadorId))
                    .forEach(contact => { if (!map.has(String(contact.id))) map.set(String(contact.id), contact); });
                return [...map.values()];
            });
            setLoadError(!complete);
            setLoading(false);
        });
    }, [entrenadorId]);

    useEffect(() => {
        if (!entrenadorId) return;
        cargarClientes();
        conectarSocketGlobal();
        return () => { loadRequests.current += 1; if (socketRef.current) socketRef.current.disconnect(); };
    }, [entrenadorId, cargarClientes, conectarSocketGlobal]);

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
            margin: "-50px -80px", 
            height: "100dvh",
            maxHeight: "100dvh",
            width: "calc(100% + 160px)",
            maxWidth: "calc(100% + 160px)",
            display: "flex", 
            background: "#09090b",
            overflow: "hidden",
            minWidth: 0
        }, 
        container: { 
            display: "flex", 
            width: "100%", 
            height: "100%", // Obligamos a que ocupe todo el alto
            background: "#09090b",
            minWidth: 0
            
        },
        
        contactPanel: { width: "clamp(280px, 28vw, 370px)", flex: "0 0 clamp(280px, 28vw, 370px)", minWidth: 0, background: "#0c0c0e", borderRight: "1px solid #1f1f22", display: "flex", flexDirection: "column" },
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
        avatar: { width: "48px", height: "48px", flexShrink: 0, borderRadius: "50%", background: "#27272a", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", position: "relative" },
        avatarImg: { width: "100%", height: "100%", objectFit: "cover" },
        redDot: { width: "12px", height: "12px", borderRadius: "50%", background: "#3b82f6", border: "2px solid #0c0c0e", position: "absolute", bottom: "0", right: "0" }, 

        chatArea: { flex: 1, minWidth: 0, background: "#09090b", display: 'flex', flexDirection: 'column', position: 'relative' },
        emptyState: { height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#52525b" }
    };

    return (
        <div className="trainer-chat-page" style={styles.pageWrapper}>
            <style>{`
                .hide-scroll::-webkit-scrollbar { display: none; }
                .hide-scroll { -ms-overflow-style: none; scrollbar-width: none; }
                @media (max-width: 900px) {
                    .trainer-chat-page {
                        margin: 0 !important;
                        width: 100% !important;
                        max-width: 100% !important;
                    }
                    .trainer-chat-container { flex-direction: column; }
                    .trainer-chat-sidebar {
                        width: 100% !important;
                        flex: 0 0 auto !important;
                        height: 260px !important;
                        border-right: none !important;
                        border-bottom: 1px solid #1f1f22 !important;
                    }
                    .trainer-chat-main { min-height: 0 !important; flex: 1 1 auto !important; }
                }
            `}</style>

            <div className="trainer-chat-container" style={styles.container}>
                <div className="trainer-chat-sidebar" style={styles.contactPanel}>
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
                        {loading && <p role="status" style={{padding:'20px', color:'#71717a', textAlign:'center', fontSize:'0.9rem'}}>Cargando...</p>}
                        {loadError && <div role="alert" style={{padding: '12px', color: '#fca5a5'}}>
                            <p>No se pudieron cargar todas las conversaciones.</p>
                            <button type="button" onClick={() => { setLoading(true); setLoadError(false); cargarClientes(); }} style={{background: '#1f1f22', color: '#FACC15', border: '1px solid #3f3f46', borderRadius: '8px', padding: '8px 12px', font: 'inherit', cursor: 'pointer'}}>Reintentar conversaciones</button>
                        </div>}
                        {!loading && !loadError && clientes.length === 0 && <p>Todavía no tienes conversaciones.</p>}
                        {clientesFiltrados.map((cliente) => {
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
                            })}
                    </div>
                </div>

                <div className="trainer-chat-main" style={styles.chatArea}>
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
