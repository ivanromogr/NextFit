import React, { useState, useEffect, useRef } from "react";
import { useLocation } from 'react-router-dom';
import ChatComponent from "../../components/functional/ChatComponent";
import { api } from "../../api/endpoints"; 
import { Search, Edit, User, MessageSquare, Plus, X, Check } from "lucide-react";
import SockJS from 'sockjs-client';
import Stomp from 'stompjs';
import { useAuth } from "../../context/AuthContext"; // Usando tu nuevo Contexto de Copilot

export default function ChatClientePage() {
    const { userId: clienteId } = useAuth(); // Pillamos el ID del contexto blindado
    const [entrenador, setEntrenador] = useState(null);
    
    // Al cargar, leemos si ya teníamos amigos guardados en la memoria de la pestaña
    const [amigos, setAmigos] = useState(() => {
        const guardados = sessionStorage.getItem(`contactos_chat_${clienteId}`);
        return guardados ? JSON.parse(guardados) : [];
    }); 
    
    const [contactoSeleccionado, setContactoSeleccionado] = useState(null);
    const [busqueda, setBusqueda] = useState("");
    const [loading, setLoading] = useState(true);
    const [unreadUsers, setUnreadUsers] = useState(new Set());

    const [showModal, setShowModal] = useState(false);
    const [emailBuscado, setEmailBuscado] = useState("");
    const [usuarioEncontrado, setUsuarioEncontrado] = useState(null); 
    const [aliasContacto, setAliasContacto] = useState(""); 
    const [mensajeModal, setMensajeModal] = useState({ texto: "", tipo: "" });
    const [buscandoEmail, setBuscandoEmail] = useState(false);
    const [autoGreetNext, setAutoGreetNext] = useState(false);
    const [greetingMessageNext, setGreetingMessageNext] = useState("");

    const socketRef = useRef(null);

    // Cada vez que la lista de amigos cambie, la guardamos a fuego en la memoria
    useEffect(() => {
        if (amigos.length > 0) {
            sessionStorage.setItem(`contactos_chat_${clienteId}`, JSON.stringify(amigos));
        }
    }, [amigos, clienteId]);

    // Si venimos desde otra página pidiendo abrir un chat concreto, lo gestionamos
    const location = useLocation();
    useEffect(() => {
        const openWith = location?.state?.openChatWith;
        if (!openWith) return;

        const abrirChatExterno = async () => {
            try {
                // Intentamos obtener al usuario (entrenador) por id
                const res = await api.get(`/api/entrenador/${openWith}`);
                const fuente = res.data.entrenador || res.data;
                if (!fuente) return;

                const contacto = {
                    id: fuente.id,
                    nombre: fuente.nombre,
                    apellido: fuente.apellido,
                    fotoPerfil: fuente.fotoPerfil
                };

                setAmigos(prev => prev.some(a => a.id === contacto.id) ? prev : [...prev, contacto]);
                setContactoSeleccionado(contacto);

                // Si la navegación pedía enviar un saludo inicial, guardarlo para pasarlo al ChatComponent
                if (location?.state?.autoGreet) {
                    setAutoGreetNext(true);
                    setGreetingMessageNext(location.state.greetingMessage || 'Hola, te acabo de contactar desde NextFit.');
                }

                // Limpiar state de la navegación para que no se reabra al recargar
                try { window.history.replaceState({}, document.title, window.location.pathname + window.location.search); } catch(e){}
            } catch (err) {
                console.error('Error abriendo chat con id externo', err);
            }
        };

        abrirChatExterno();
    }, [location?.state?.openChatWith, clienteId]);

    useEffect(() => {
        if(clienteId) {
            cargarContactosBase();
            conectarSocketGlobal();
        }
        return () => { if (socketRef.current) socketRef.current.disconnect(); };
        // eslint-disable-next-line
    }, [clienteId]);

    const comprobarSiEsNuevoContacto = (remitenteId) => {
        if (entrenador && remitenteId === entrenador.id) return;

        setAmigos(prevAmigos => {
            if (prevAmigos.some(a => a.id === remitenteId)) return prevAmigos;
            
            api.get(`/api/clientes/${remitenteId}`).then(res => {
                if (res.data) {
                    setAmigos(actuales => {
                        if (actuales.some(a => a.id === res.data.id)) return actuales;
                        return [...actuales, res.data];
                    });
                }
            }).catch(err => console.error("Error buscando nuevo contacto", err));
            
            return prevAmigos;
        });
    };

    const conectarSocketGlobal = () => {
        const socket = new SockJS('http://localhost:8080/ws');
        const client = Stomp.over(socket);
        client.debug = null;

        client.connect({}, () => {
            socketRef.current = client;
            client.subscribe(`/topic/mensajes/${clienteId}`, (payload) => {
                const msg = JSON.parse(payload.body);
                
                if (msg.remitenteId !== clienteId) {
                    if (contactoSeleccionado?.id !== msg.remitenteId) {
                        setUnreadUsers(prev => new Set(prev).add(msg.remitenteId));
                    }
                    comprobarSiEsNuevoContacto(msg.remitenteId);
                }
            });
        });
    };

    const cargarContactosBase = async () => {
        try {
            setLoading(true);
            const resCliente = await api.get(`/api/clientes/${clienteId}`); 
            let idEntrenador = null;
            if (resCliente.data && resCliente.data.entrenador) {
                setEntrenador(resCliente.data.entrenador);
                idEntrenador = resCliente.data.entrenador.id;
            }

            try {
                const resContactos = await api.get(`/api/chat/contactos?usuarioId=${clienteId}`);
                if (resContactos.data) {
                    const nuevosDelBackend = resContactos.data.filter(c => c.id !== idEntrenador && c.id !== clienteId);
                    
                    // 👇 MAGIA 3: Fusionamos los amigos que teníamos guardados con los nuevos del backend
                    setAmigos(prev => {
                        const mapa = new Map();
                        // Metemos primero los que ya teníamos (para no perder sus apodos o los que no tienen mensajes)
                        prev.forEach(a => mapa.set(a.id, a));
                        // Metemos los nuevos de la base de datos
                        nuevosDelBackend.forEach(a => {
                            if (!mapa.has(a.id)) mapa.set(a.id, a);
                        });
                        return Array.from(mapa.values());
                    });
                }
            } catch (errorContactos) {
                console.warn("No se pudo cargar el historial del backend", errorContactos);
            }

        } catch (error) {
            console.error("Error cargando perfil", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectContacto = (contacto) => {
        setContactoSeleccionado(contacto);
        if (unreadUsers.has(contacto.id)) {
            const newSet = new Set(unreadUsers);
            newSet.delete(contacto.id);
            setUnreadUsers(newSet);
        }
    };

    const cerrarModal = () => {
        setShowModal(false);
        setEmailBuscado("");
        setUsuarioEncontrado(null);
        setAliasContacto("");
        setMensajeModal({ texto: "", tipo: "" });
    };

    const manejarFormularioAmigo = async (e) => {
        e.preventDefault();
        
        if (usuarioEncontrado) {
            const amigoConAlias = {
                ...usuarioEncontrado,
                alias: aliasContacto.trim() || `${usuarioEncontrado.nombre} ${usuarioEncontrado.apellido}`
            };
            setAmigos(prev => {
                if(prev.some(a => a.id === amigoConAlias.id)) return prev;
                return [...prev, amigoConAlias];
            }); 
            cerrarModal(); 
            handleSelectContacto(amigoConAlias); 
            return;
        }

        if(!emailBuscado.trim()) return;
        setBuscandoEmail(true);
        setMensajeModal({ texto: "", tipo: "" });

        try {
            const res = await api.get(`/api/clientes/buscar?email=${emailBuscado}`);
            const nuevoAmigo = res.data;

            if (nuevoAmigo.id === clienteId) {
                setMensajeModal({ texto: "No puedes añadirte a ti mismo.", tipo: "error" });
                setBuscandoEmail(false); return;
            }
            if (amigos.some(a => a.id === nuevoAmigo.id) || entrenador?.id === nuevoAmigo.id) {
                setMensajeModal({ texto: "Ya tienes a este usuario en tus contactos.", tipo: "error" });
                setBuscandoEmail(false); return;
            }

            setUsuarioEncontrado(nuevoAmigo);
            setAliasContacto(`${nuevoAmigo.nombre} ${nuevoAmigo.apellido}`); 
            setMensajeModal({ texto: "¡Usuario encontrado!", tipo: "success" });

        } catch (error) {
            setMensajeModal({ texto: "No se ha encontrado a nadie con este email.", tipo: "error" });
        } finally {
            setBuscandoEmail(false);
        }
    };

    const amigosFiltrados = amigos.filter(a => {
        const nombreAFiltrar = a.alias ? a.alias : (a.nombre + " " + a.apellido);
        return nombreAFiltrar.toLowerCase().includes(busqueda.toLowerCase());
    });

    const styles = {
        pageWrapper: { margin: "-28px", height: "100vh", display: "flex", background: "#0c0c0e", overflow: "hidden", position: 'relative' },
        contactPanel: { width: "340px", background: "#0c0c0e", borderRight: "1px solid #1f1f22", display: "flex", flexDirection: "column", height: "100%" },
        panelHeader: { padding: "24px 20px 16px 20px" },
        headerTop: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" },
        title: { color: "white", margin: 0, fontSize: "1.3rem", fontWeight: "800" },
        searchContainer: { background: "#18181b", borderRadius: "10px", padding: "8px 12px", display: "flex", alignItems: "center", gap: "10px", border: "1px solid #27272a" },
        searchInput: { background: "transparent", border: "none", color: "white", outline: "none", width: "100%", fontSize: "0.9rem" },
        lista: { flex: 1, overflowY: "auto", padding: "10px", display: "flex", flexDirection: "column", gap: "4px" },
        contactoItem: (activo) => ({ display: "flex", alignItems: "center", gap: "14px", padding: "12px", borderRadius: "10px", cursor: "pointer", background: activo ? "#1f1f22" : "transparent", transition: "background 0.2s ease", position: "relative" }),
        avatar: { width: "48px", height: "48px", borderRadius: "50%", background: "#27272a", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", position: "relative", flexShrink: 0 },
        avatarImg: { width: "100%", height: "100%", objectFit: "cover" },
        redDot: { width: "12px", height: "12px", borderRadius: "50%", background: "#3b82f6", border: "2px solid #0c0c0e", position: "absolute", bottom: "0", right: "0" }, 
        chatArea: { flex: 1, background: "#09090b", display: 'flex', flexDirection: 'column', position: 'relative', height: "100%" },
        emptyState: { height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#52525b" },
        modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' },
        modalBox: { background: '#121214', width: '400px', borderRadius: '16px', border: '1px solid #27272a', padding: '24px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' },
        modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
        modalTitle: { color: 'white', margin: 0, fontSize: '1.2rem', fontWeight: '700' },
        modalInput: { width: '100%', background: '#09090b', border: '1px solid #27272a', borderRadius: '8px', padding: '12px 16px', color: 'white', outline: 'none', marginBottom: '16px', fontSize: '0.95rem' },
        modalBtn: { width: '100%', background: '#FACC15', color: '#000', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', transition: 'opacity 0.2s', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }
    };

    return (
        <div style={styles.pageWrapper}>
            <style>{`.hide-scroll::-webkit-scrollbar { display: none; } .hide-scroll { -ms-overflow-style: none; scrollbar-width: none; }`}</style>

            {showModal && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalBox}>
                        <div style={styles.modalHeader}>
                            <h3 style={styles.modalTitle}>{!usuarioEncontrado ? "Añadir nuevo contacto" : "Guardar contacto"}</h3>
                            <X size={20} color="#71717a" style={{cursor: 'pointer'}} onClick={cerrarModal} />
                        </div>
                        <p style={{color: '#a1a1aa', fontSize: '0.9rem', marginBottom: '20px', marginTop: '-10px'}}>
                            {!usuarioEncontrado ? "Introduce el correo electrónico del usuario con el que quieres conectar." : "Hemos encontrado al usuario. Puedes asignarle un apodo si quieres."}
                        </p>
                        
                        <form onSubmit={manejarFormularioAmigo}>
                            {!usuarioEncontrado ? (
                                <input style={styles.modalInput} type="email" placeholder="usuario@email.com" value={emailBuscado} onChange={(e) => setEmailBuscado(e.target.value)} required />
                            ) : (
                                <div style={{marginBottom: '16px'}}>
                                    <label style={{color: '#71717a', fontSize: '0.8rem', marginBottom: '6px', display: 'block'}}>Nombre de contacto</label>
                                    <input style={styles.modalInput} type="text" placeholder="Ej: Juan Gym" value={aliasContacto} onChange={(e) => setAliasContacto(e.target.value)} required autoFocus />
                                    <p style={{fontSize: '0.8rem', color: '#52525b', marginTop: '-10px'}}>Nombre original: {usuarioEncontrado.nombre} {usuarioEncontrado.apellido}</p>
                                </div>
                            )}
                            
                            {mensajeModal.texto && (
                                <p style={{color: mensajeModal.tipo === 'error' ? '#ef4444' : '#22c55e', fontSize: '0.85rem', marginTop: '-8px', marginBottom: '16px'}}>
                                    {mensajeModal.texto}
                                </p>
                            )}

                            <button type="submit" style={{...styles.modalBtn, opacity: buscandoEmail ? 0.7 : 1}} disabled={buscandoEmail}>
                                {buscandoEmail ? 'Buscando...' : (usuarioEncontrado ? <><Check size={18}/> Guardar en contactos</> : 'Buscar usuario')}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            <div style={styles.contactPanel}>
                <div style={styles.panelHeader}>
                    <div style={styles.headerTop}>
                        <h2 style={styles.title}>Mensajes</h2>
                        <div style={{display: 'flex', gap: '15px'}}>
                            <Plus size={20} color="#FACC15" style={{cursor: 'pointer'}} onClick={() => setShowModal(true)}/>
                            <Edit size={18} color="#a1a1aa" style={{cursor: 'pointer'}}/>
                        </div>
                    </div>
                    <div style={styles.searchContainer}>
                        <Search size={16} color="#71717a" />
                        <input style={styles.searchInput} placeholder="Buscar en tus chats..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
                    </div>
                </div>
                
                <div className="hide-scroll" style={styles.lista}>
                    {loading ? <p style={{padding:'20px', color:'#71717a', textAlign:'center', fontSize:'0.9rem'}}>Cargando...</p> : (
                        <>
                            {entrenador && (!busqueda || (entrenador.nombre + " " + entrenador.apellido).toLowerCase().includes(busqueda.toLowerCase())) && (
                                <div style={styles.contactoItem(contactoSeleccionado?.id === entrenador.id)} onClick={() => handleSelectContacto(entrenador)}>
                                    <div style={styles.avatar}>
                                        {entrenador.fotoPerfil ? <img src={entrenador.fotoPerfil} style={styles.avatarImg} alt="entrenador"/> : <User size={20} color="#FACC15"/>}
                                        {unreadUsers.has(entrenador.id) && <div style={styles.redDot}></div>}
                                    </div>
                                    <div style={{flex: 1, minWidth: 0}}>
                                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                            <div style={{color: 'white', fontWeight: '700', fontSize:'0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>
                                                {entrenador.nombre} {entrenador.apellido}
                                            </div>
                                        </div>
                                        <div style={{color: unreadUsers.has(entrenador.id) ? '#3b82f6' : '#FACC15', fontSize:'0.85rem', fontWeight: '500', marginTop: '2px'}}>
                                            Tu entrenador ⭐
                                        </div>
                                    </div>
                                </div>
                            )}

                            {amigosFiltrados.length > 0 && (
                                <div style={{padding: '10px 12px', fontSize: '0.75rem', color: '#71717a', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '10px'}}>
                                    Tus Contactos
                                </div>
                            )}

                            {amigosFiltrados.map((amigo) => {
                                const nombreAMostrar = amigo.alias ? amigo.alias : `${amigo.nombre} ${amigo.apellido}`;
                                return (
                                    <div key={amigo.id} style={styles.contactoItem(contactoSeleccionado?.id === amigo.id)} onClick={() => handleSelectContacto(amigo)}>
                                        <div style={styles.avatar}>
                                            {amigo.fotoPerfil ? <img src={amigo.fotoPerfil} style={styles.avatarImg} /> : <User size={20} color="#71717a"/>}
                                            {unreadUsers.has(amigo.id) && <div style={styles.redDot}></div>}
                                        </div>
                                        <div style={{flex: 1, minWidth: 0}}>
                                            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                                <div style={{color: 'white', fontWeight: unreadUsers.has(amigo.id) ? '700' : '600', fontSize:'0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>
                                                    {nombreAMostrar}
                                                </div>
                                            </div>
                                            <div style={{color: unreadUsers.has(amigo.id) ? '#3b82f6' : '#71717a', fontSize:'0.85rem', fontWeight: unreadUsers.has(amigo.id) ? '500' : '400', marginTop: '2px'}}>
                                                {unreadUsers.has(amigo.id) ? 'Nuevo mensaje recibido' : 'Comunidad'}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </>
                    )}
                </div>
            </div>

            <div style={styles.chatArea}>
                {contactoSeleccionado ? (
                        <ChatComponent 
                            usuarioId={clienteId}
                            destinatarioId={contactoSeleccionado.id}
                            nombreDestinatario={contactoSeleccionado.alias ? contactoSeleccionado.alias : `${contactoSeleccionado.nombre} ${contactoSeleccionado.apellido}`}
                            fotoDestinatario={contactoSeleccionado.fotoPerfil}
                            autoGreet={autoGreetNext}
                            greetingMessage={greetingMessageNext}
                            onAutoGreetSent={() => { setAutoGreetNext(false); setGreetingMessageNext(''); }}
                        />
                ) : (
                    <div style={styles.emptyState}>
                        <div style={{padding: '30px', background: '#121214', borderRadius: '50%', marginBottom: '20px'}}>
                            <MessageSquare size={48} color="#27272a" />
                        </div>
                        <h3 style={{color:'white', margin:'0 0 8px 0', fontSize:'1.2rem', fontWeight:'600'}}>Comunidad NextFit</h3>
                        <p style={{fontSize:'0.9rem', margin:0, color: '#71717a'}}>Selecciona a tu entrenador o añade un amigo con el botón +</p>
                    </div>
                )}
            </div>
        </div>
    );
}