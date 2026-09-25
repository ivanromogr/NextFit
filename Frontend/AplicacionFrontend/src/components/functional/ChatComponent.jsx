import React, { useState, useEffect, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { Send, User, CheckCheck, Paperclip, Smile, X, Image as ImageIcon, Film } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import { api } from '../../api/endpoints';
import { API_BASE_URL, SOCKJS_URL } from '../../api/config';

export default function ChatComponent({ usuarioId, destinatarioId, nombreDestinatario, fotoDestinatario, autoGreet = false, greetingMessage = '', onAutoGreetSent }) {
    const [mensajes, setMensajes] = useState([]);
    const [nuevoMensaje, setNuevoMensaje] = useState("");
    const [conectado, setConectado] = useState(false);

    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [archivoAdjunto, setArchivoAdjunto] = useState(null);
    const [isUploading, setIsUploading] = useState(false);

    const stompClientRef = useRef(null);
    const messagesEndRef = useRef(null);
    const isConnected = useRef(false);
    const fileInputRef = useRef(null);

    useEffect(() => {
        setMensajes([]);
        cargarHistorial();

        if (stompClientRef.current) {
            stompClientRef.current.deactivate();
            isConnected.current = false;
        }

        conectarWebSocket();

        return () => {
            if (stompClientRef.current) {
                stompClientRef.current.deactivate();
            }
            isConnected.current = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [usuarioId, destinatarioId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

        const noLeidos = mensajes.filter(
            (m) => m.remitenteId === destinatarioId && !m.leido
        );

        const isVisible =
            typeof document !== 'undefined' &&
            document.visibilityState === 'visible' &&
            document.hasFocus &&
            document.hasFocus();

        if (noLeidos.length > 0 && stompClientRef.current?.connected && isVisible) {
            stompClientRef.current.publish({
                destination: "/app/chat/leer",
                body: JSON.stringify({
                    remitenteId: destinatarioId,
                    destinatarioId: usuarioId
                })
            });

            setMensajes((prev) =>
                prev.map((m) =>
                    (m.remitenteId === destinatarioId && !m.leido)
                        ? { ...m, leido: true }
                        : m
                )
            );
        }
    }, [mensajes, destinatarioId, usuarioId, conectado]);

    useEffect(() => {
        if (!conectado || !autoGreet || !stompClientRef.current || mensajes.length > 0) return;

        const saludo =
            greetingMessage && greetingMessage.trim() !== ''
                ? greetingMessage
                : 'Hola, encantado. Me gustaría iniciar la transformación.';

        const mensaje = {
            remitenteId: usuarioId,
            destinatarioId: destinatarioId,
            contenido: saludo,
            leido: false
        };

        try {
            stompClientRef.current.publish({
                destination: "/app/chat",
                body: JSON.stringify(mensaje)
            });

            if (typeof onAutoGreetSent === 'function') {
                onAutoGreetSent();
            }
        } catch (err) {
            console.error('Error enviando saludo automático', err);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [conectado, autoGreet, destinatarioId, usuarioId]);

    const cargarHistorial = async () => {
        try {
            const response = await api.get(`/api/chat/historial?usuario1=${usuarioId}&usuario2=${destinatarioId}`);
            setMensajes(response.data || []);
        } catch (error) {
            console.error(error);
        }
    };

    const conectarWebSocket = () => {
        if (isConnected.current) return;
        isConnected.current = true;

        const client = new Client({
            brokerURL: undefined,
            webSocketFactory: () => new SockJS(SOCKJS_URL),
            reconnectDelay: 5000,
            onConnect: () => {
                setConectado(true);
                stompClientRef.current = client;

                client.subscribe(`/topic/mensajes/${usuarioId}`, (payload) => {
                    const mensajeRecibido = JSON.parse(payload.body);

                    if (
                        mensajeRecibido.remitenteId === destinatarioId ||
                        mensajeRecibido.remitenteId === usuarioId
                    ) {
                        setMensajes((prev) => {
                            const index = prev.findIndex((m) => m.id === mensajeRecibido.id);

                            if (index !== -1) {
                                const actualizados = [...prev];
                                actualizados[index] = mensajeRecibido;
                                return actualizados;
                            }

                            return [...prev, mensajeRecibido];
                        });
                    }
                });
            },
            onDisconnect: () => {
                setConectado(false);
                isConnected.current = false;
            },
            onStompError: (frame) => {
                console.error('Error STOMP en Web: ' + frame.headers['message']);
            }
        });

        client.activate();
    };

    const handleEmojiClick = (emojiObject) => {
        setNuevoMensaje((prev) => prev + emojiObject.emoji);
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            setArchivoAdjunto(file);
            setShowEmojiPicker(false);
        }
    };

    const cancelarAdjunto = () => {
        setArchivoAdjunto(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const enviarMensaje = async (e) => {
        e.preventDefault();
        if (!nuevoMensaje.trim() && !archivoAdjunto) return;
        if (!stompClientRef.current?.connected) return;

        let archivoUrlFinal = null;
        let tipoArchivoFinal = null;

        if (archivoAdjunto) {
            setIsUploading(true);
            const formData = new FormData();
            formData.append("file", archivoAdjunto);

            try {
                const res = await api.post('/api/upload', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                archivoUrlFinal = res.data.url;
                tipoArchivoFinal = archivoAdjunto.type.startsWith('video') ? 'VIDEO' : 'IMAGEN';
            } catch (error) {
                console.error("Error subiendo archivo", error);
                setIsUploading(false);
                return;
            }

            setIsUploading(false);
        }

        const mensaje = {
            remitenteId: usuarioId,
            destinatarioId: destinatarioId,
            contenido: nuevoMensaje,
            leido: false,
            archivoUrl: archivoUrlFinal,
            tipoArchivo: tipoArchivoFinal
        };

        stompClientRef.current.publish({
            destination: "/app/chat",
            body: JSON.stringify(mensaje)
        });

        setNuevoMensaje("");
        cancelarAdjunto();
        setShowEmojiPicker(false);
    };

    const formatearFechaSeparador = (fechaString) => {
        const fecha = new Date(fechaString);
        const hoy = new Date();
        const ayer = new Date(hoy);
        ayer.setDate(ayer.getDate() - 1);

        if (fecha.toDateString() === hoy.toDateString()) return "Hoy";
        if (fecha.toDateString() === ayer.toDateString()) return "Ayer";

        return fecha.toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    const formatearUrlMedia = (url) => {
        if (!url) return null;

        if (url.startsWith('http')) {
            return url;
        }

        return `${API_BASE_URL}${url}`;
    };

    const esSoloEmojis = (texto, url) => {
        if (!texto || url) return false;
        const textoLimpio = texto.replace(/\s/g, '');
        if (textoLimpio.length === 0 || textoLimpio.length > 15) return false;
        if (/[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ.,!?¿¡]/.test(textoLimpio)) return false;
        return [...textoLimpio].some((char) => char.codePointAt(0) > 127);
    };

    const styles = {
        container: { display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, width: '100%', minWidth: 0, background: '#09090b', position: 'relative', overflow: 'hidden' },
        header: { padding: '14px clamp(14px, 2vw, 24px)', minHeight: '68px', background: '#09090b', borderBottom: '1px solid #1f1f22', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10, flexShrink: 0 },
        headerLeft: { display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0, maxWidth: '100%' },
        avatar: { width: '40px', height: '40px', flexShrink: 0, borderRadius: '50%', background: '#1f1f22', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
        chatArea: { flex: 1, minHeight: 0, padding: '24px clamp(16px, 5vw, 64px)', overflowY: 'auto', overflowX: 'hidden', display: 'flex', flexDirection: 'column', gap: '8px', background: '#0c0c0e' },
        dateSeparator: { display: 'flex', justifyContent: 'center', margin: '24px 0 12px 0' },
        dateBadge: { background: 'rgba(39, 39, 42, 0.6)', color: '#e4e4e7', padding: '4px 12px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '500' },

        bubbleRow: { display: 'flex', flexDirection: 'column', width: '100%' },

        bubbleMe: {
            alignSelf: 'flex-end',
            background: 'rgba(250, 204, 21, 0.08)',
            color: '#e4e4e7',
            padding: '8px 14px',
            borderRadius: '14px 14px 2px 14px',
            maxWidth: '75%',
            marginBottom: '4px',
            border: '1px solid rgba(250, 204, 21, 0.25)',
            boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
        },

        bubbleThem: {
            alignSelf: 'flex-start',
            background: '#18181b',
            color: '#e4e4e7',
            padding: '8px 14px',
            borderRadius: '14px 14px 14px 2px',
            maxWidth: '75%',
            marginBottom: '4px',
            border: '1px solid #27272a',
            boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
        },

        mensajeTexto: { fontSize: '0.95rem', fontWeight: '400', lineHeight: '1.4', wordBreak: 'break-word', whiteSpace: 'pre-wrap' },
        mediaContent: { maxWidth: '100%', borderRadius: '8px', marginBottom: '6px', maxHeight: '250px', objectFit: 'cover' },

        timeMe: { fontSize: '0.65rem', marginTop: '2px', color: '#71717a', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' },
        timeThem: { fontSize: '0.65rem', marginTop: '2px', color: '#71717a', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' },

        inputAreaContainer: { position: 'relative', background: '#09090b', borderTop: '1px solid #1f1f22', flexShrink: 0 },
        previewBox: { padding: '10px 5%', background: '#121214', borderBottom: '1px solid #1f1f22', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
        previewInfo: { display: 'flex', alignItems: 'center', gap: '10px', color: '#e4e4e7', fontSize: '0.9rem', fontWeight: '500' },
        previewCancelBtn: { background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },

        inputArea: { padding: '14px clamp(12px, 5vw, 64px)', display: 'flex', alignItems: 'flex-end', gap: '10px' },
        actionBtn: { width: '40px', height: '40px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#71717a', cursor: 'pointer', background: 'transparent', border: 'none', borderRadius: '50%', transition: 'color 0.2s' },
        inputWrapper: { flex: 1, background: '#18181b', borderRadius: '20px', padding: '10px 16px', display: 'flex', alignItems: 'center', border: '1px solid transparent', minHeight: '40px' },
        input: { flex: 1, background: 'transparent', border: 'none', color: 'white', outline: 'none', fontSize: '0.95rem', width: '100%' },
        sendBtn: { width: '40px', height: '40px', flexShrink: 0, borderRadius: '50%', background: (nuevoMensaje || archivoAdjunto) ? '#FACC15' : '#1f1f22', color: (nuevoMensaje || archivoAdjunto) ? '#000' : '#52525b', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s', opacity: isUploading ? 0.5 : 1 }
    };

    return (
        <div style={styles.container}>
            <style>{`
                .hide-scroll::-webkit-scrollbar { display: none; }
                .hide-scroll { -ms-overflow-style: none; scrollbar-width: none; }
                @media (max-width: 520px) {
                    .chat-component-header { min-height: 60px !important; }
                    .chat-component-input { gap: 6px !important; }
                    .chat-component-input button { width: 36px !important; height: 36px !important; }
                }
            `}</style>

            <div className="chat-component-header" style={styles.header}>
                <div style={styles.headerLeft}>
                    <div style={styles.avatar}>
                        {fotoDestinatario ? (
                            <img src={fotoDestinatario} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            <User size={20} color="#71717a" />
                        )}
                    </div>
                    <div style={{ minWidth: 0 }}>
                        <div style={{ color: 'white', fontWeight: '600', fontSize: '1.05rem', letterSpacing: '0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 'min(62vw, 520px)' }}>
                            {nombreDestinatario}
                        </div>
                        <div style={{ color: conectado ? '#22c55e' : '#71717a', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {conectado ? 'En línea' : 'Desconectado'}
                        </div>
                    </div>
                </div>
            </div>

            <div className="hide-scroll" style={styles.chatArea}>
                {mensajes.length === 0 && (
                    <div style={{ textAlign: 'center', color: '#52525b', marginTop: 'auto', marginBottom: 'auto' }}>
                        <p style={{ margin: 0, fontSize: '0.9rem' }}>Aún no hay mensajes.</p>
                    </div>
                )}

                {mensajes.map((msg, i) => {
                    const esMio = msg.remitenteId === usuarioId;
                    const fechaActual = formatearFechaSeparador(msg.fechaHora);
                    const fechaAnterior = i > 0 ? formatearFechaSeparador(mensajes[i - 1].fechaHora) : null;
                    const mostrarFecha = fechaActual !== fechaAnterior;

                    const soloEmoji = esSoloEmojis(msg.contenido, msg.archivoUrl);

                    return (
                        <React.Fragment key={msg.id || i}>
                            {mostrarFecha && (
                                <div style={styles.dateSeparator}>
                                    <span style={styles.dateBadge}>{fechaActual}</span>
                                </div>
                            )}

                            <div style={styles.bubbleRow}>
                                <div
                                    style={{
                                        ...(esMio ? styles.bubbleMe : styles.bubbleThem),
                                        ...(soloEmoji
                                            ? {
                                                background: 'transparent',
                                                boxShadow: 'none',
                                                border: 'none',
                                                padding: '4px 0'
                                            }
                                            : {})
                                    }}
                                >
                                    {msg.archivoUrl && (
                                        msg.tipoArchivo === 'VIDEO' ? (
                                            <video
                                                controls
                                                style={{ ...styles.mediaContent, backgroundColor: '#000' }}
                                                preload="metadata"
                                                playsInline
                                            >
                                                <source src={formatearUrlMedia(msg.archivoUrl)} type="video/mp4" />
                                                <source src={formatearUrlMedia(msg.archivoUrl)} type="video/webm" />
                                                Tu navegador no soporta la reproducción de este vídeo.
                                            </video>
                                        ) : (
                                            <img
                                                src={formatearUrlMedia(msg.archivoUrl)}
                                                alt="Adjunto"
                                                style={styles.mediaContent}
                                            />
                                        )
                                    )}

                                    {msg.contenido && (
                                        <span
                                            style={{
                                                ...styles.mensajeTexto,
                                                ...(soloEmoji ? { fontSize: '3.5rem', lineHeight: '1' } : {})
                                            }}
                                        >
                                            {msg.contenido}
                                        </span>
                                    )}

                                    <div
                                        style={{
                                            ...(esMio ? styles.timeMe : styles.timeThem),
                                            ...(soloEmoji && esMio ? { color: '#a1a1aa' } : {})
                                        }}
                                    >
                                        {new Date(msg.fechaHora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}

                                        {esMio && (
                                            <CheckCheck
                                                size={14}
                                                strokeWidth={2.5}
                                                color={msg.leido ? "#3b82f6" : "#71717a"}
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>
                        </React.Fragment>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            <div style={styles.inputAreaContainer}>
                {showEmojiPicker && (
                    <div style={{ position: 'absolute', bottom: '100%', right: '5%', zIndex: 1000, marginBottom: '10px', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}>
                        <EmojiPicker onEmojiClick={handleEmojiClick} theme="dark" />
                    </div>
                )}

                {archivoAdjunto && (
                    <div style={styles.previewBox}>
                        <div style={styles.previewInfo}>
                            {archivoAdjunto.type.startsWith('video')
                                ? <Film size={20} color="#3b82f6" />
                                : <ImageIcon size={20} color="#22c55e" />}
                            <span>{archivoAdjunto.name}</span>
                        </div>
                        <button style={styles.previewCancelBtn} onClick={cancelarAdjunto}>
                            <X size={16} />
                        </button>
                    </div>
                )}

                <form className="chat-component-input" style={styles.inputArea} onSubmit={enviarMensaje}>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        style={{ display: 'none' }}
                        accept="image/*,video/*"
                    />
                    <button
                        type="button"
                        style={styles.actionBtn}
                        onClick={() => fileInputRef.current.click()}
                        onMouseEnter={(e) => (e.currentTarget.style.color = 'white')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = '#71717a')}
                    >
                        <Paperclip size={22} />
                    </button>

                    <div style={styles.inputWrapper}>
                        <input
                            style={styles.input}
                            placeholder={archivoAdjunto ? "Añade un comentario..." : "Escribe un mensaje..."}
                            value={nuevoMensaje}
                            onChange={(e) => setNuevoMensaje(e.target.value)}
                            autoComplete="off"
                        />
                        <button
                            type="button"
                            style={{ background: 'none', border: 'none', display: 'flex', cursor: 'pointer', padding: 0 }}
                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        >
                            <Smile
                                size={22}
                                color={showEmojiPicker ? "#FACC15" : "#71717a"}
                                style={{ transition: 'color 0.2s' }}
                            />
                        </button>
                    </div>

                    <button
                        type="submit"
                        style={styles.sendBtn}
                        disabled={(!nuevoMensaje && !archivoAdjunto) || isUploading}
                    >
                        <Send size={18} style={{ marginLeft: (nuevoMensaje || archivoAdjunto) ? '-2px' : '0' }} />
                    </button>
                </form>
            </div>
        </div>
    );
}
