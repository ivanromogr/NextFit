import React, { useState, useEffect, useRef } from 'react';
import 'text-encoding';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Image,
    Keyboard,
    Modal
} from 'react-native';
import { Send, Paperclip, CheckCheck, X, Image as ImageIcon, Smile, Film } from 'lucide-react-native';
import { Client } from '@stomp/stompjs';
import { format, isToday, isYesterday } from 'date-fns';
import { Video, ResizeMode } from 'expo-av';
import { es } from 'date-fns/locale';
import EmojiPicker from 'rn-emoji-keyboard';
import 'react-native-get-random-values';

import * as ImagePicker from 'expo-image-picker';
import { obtenerHistorialChat, api, getImageUrl } from '../../api/endpoints';
import { getAccessToken } from '../context/authSession';
import ChatSafetyControls from './ChatSafetyControls';
import GymButton from '../ui/GymButton';
import { FormMessage } from '../ui/AccountFormScreen';
import { WS_URL } from '../../config/environment';


function PrivateAttachmentImage({ attachmentId, onOpen }) {
    const [source, setSource] = useState(null);
    useEffect(() => {
        let active = true;
        setSource(null);
        getAccessToken().then(token => {
            if (active && token) setSource({ uri: getImageUrl(`/api/upload/files/${attachmentId}`), headers: { Authorization: `Bearer ${token}` } });
        });
        return () => { active = false; };
    }, [attachmentId]);
    return source ? <TouchableOpacity accessibilityRole="button" accessibilityLabel="Ver adjunto" activeOpacity={0.8} onPress={() => onOpen(source)}>
        <Image source={source} style={styles.mediaImage} resizeMode="cover" />
    </TouchableOpacity> : null;
}

export default function ChatComponent({ usuarioId, destinatarioId, nombreDestinatario }) {

    const [safety, setSafety] = useState(null);
    const [safetyRevision, setSafetyRevision] = useState(0);
    const [reportMessageId, setReportMessageId] = useState(null);
    const [sendError, setSendError] = useState('');
    const [historyError, setHistoryError] = useState('');
    const safetyRef = useRef(null);
    safetyRef.current = safety;
    const [mensajes, setMensajes] = useState([]);
    const [nuevoMensaje, setNuevoMensaje] = useState('');
    const [conectado, setConectado] = useState(false);
    const [loading, setLoading] = useState(true);
    
    const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
    
    const [archivoAdjunto, setArchivoAdjunto] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    
    const [imagenSeleccionada, setImagenSeleccionada] = useState(null);
    
    const clientRef = useRef(null);
    const flatListRef = useRef(null);
    const conversationVersion = useRef(0);

    useEffect(() => {
        const version = ++conversationVersion.current;
        setMensajes([]);
        setSafety(null); setReportMessageId(null); setSendError(''); setNuevoMensaje(''); setArchivoAdjunto(null); setConectado(false);
        cargarHistorial(version);
        conectarWebSocket(version);

        return () => {
            conversationVersion.current += 1;
            if (clientRef.current) {
                clientRef.current.deactivate();
            }
        };
    }, [usuarioId, destinatarioId]);

    useEffect(() => {
        const noLeidos = mensajes.filter(m => m.remitenteId === destinatarioId && !m.leido);
        if (safety?.canSend && noLeidos.length > 0 && clientRef.current?.connected && conectado) {
            clientRef.current.publish({
                destination: "/app/chat/leer",
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ remitenteId: destinatarioId })
            });
            setMensajes(prev => prev.map(m => (m.remitenteId === destinatarioId && !m.leido) ? { ...m, leido: true } : m));
        }
    }, [mensajes, conectado, destinatarioId, safety?.canSend]);

    const conectarWebSocket = (version) => {
        const client = new Client({
            brokerURL: WS_URL,

            reconnectDelay: 5000,
            beforeConnect: async () => { client.connectHeaders = { Authorization: `Bearer ${await getAccessToken() || ''}` }; },
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,
            forceBinaryWSFrames: false,
            appendMissingNULLonIncoming: true,
            onConnect: () => {
                if (version !== conversationVersion.current) { client.deactivate(); return; }
                setConectado(true);
                client.subscribe('/user/queue/mensajes', (payload) => {
                    if (version !== conversationVersion.current) return;
                    let msgRecibido;
                    try { msgRecibido = JSON.parse(payload.body); } catch { return; }
                    if (!msgRecibido || typeof msgRecibido !== 'object') return;
                    if (msgRecibido.type === 'CHAT_ERROR') {
                        setSendError(msgRecibido.message || 'No se pudo enviar el mensaje.');
                        setSafetyRevision(value => value + 1);
                        return;
                    }
                    if ((msgRecibido.remitenteId === destinatarioId && msgRecibido.destinatarioId === usuarioId) || (msgRecibido.remitenteId === usuarioId && msgRecibido.destinatarioId === destinatarioId)) {
                        setMensajes(prev => {
                            const existe = prev.find(m => m.id === msgRecibido.id);
                            if (existe) return prev.map(m => m.id === msgRecibido.id ? msgRecibido : m);
                            return [...prev, msgRecibido];
                        });
                    }
                });
            },
            onDisconnect: () => { if (version === conversationVersion.current) setConectado(false); },
            onWebSocketClose: () => { if (version === conversationVersion.current) setConectado(false); },
            onStompError: (frame) => console.error('💥 Error STOMP: ' + frame.headers['message'])
        });

        clientRef.current = client;
        client.activate();
    };

    const seleccionarArchivo = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.All, 
            allowsEditing: false, 
            quality: 0.8, 
        });

        if (!result.canceled) {
            setArchivoAdjunto(result.assets[0]);
            setIsEmojiPickerOpen(false);
            Keyboard.dismiss();
        }
    };

    const cancelarAdjunto = () => {
        setArchivoAdjunto(null);
    };

    const enviarMensaje = async () => {
        if ((!nuevoMensaje.trim() && !archivoAdjunto) || !clientRef.current?.connected || isUploading || !safety?.canSend || nuevoMensaje.trim().length > 4000) {
            return;
        }

        const sendingVersion = conversationVersion.current;
        setSendError('');
        let attachmentId = null;

        if (archivoAdjunto) {
            setIsUploading(true);
            const formData = new FormData();
            
            const localUri = archivoAdjunto.uri;
            const filename = archivoAdjunto.fileName || localUri.split('/').pop() || 'imagen.jpg';
            const match = /\.(\w+)$/.exec(filename);
            const tipoArchivo = archivoAdjunto.type === 'video' ? 'video/mp4' : (match ? `image/${match[1].toLowerCase()}` : `image/jpeg`);

            formData.append("file", {
                uri: localUri,
                name: filename,
                type: tipoArchivo
            });
            formData.append("purpose", "CHAT_ATTACHMENT");

            try {
                const res = await api.post('/upload', formData, { 
                    headers: {
                        'Content-Type': 'multipart/form-data',
                        'Accept': 'application/json'
                    },
                    transformRequest: (data, headers) => {
                        return formData; 
                    },
                });
                
                attachmentId = res.data?.id;
            } catch (error) {
                console.error("Error subiendo archivo:", error);
                setIsUploading(false);
                return; 
            }
            setIsUploading(false);
        }

        const msgObj = {
            destinatarioId: destinatarioId,
            contenido: nuevoMensaje.trim(),
            leido: false,
            fechaHora: new Date().toISOString(),
            ...(attachmentId ? { attachmentId } : {})
        };

        if (sendingVersion !== conversationVersion.current || !safetyRef.current?.canSend || !clientRef.current?.connected) return;
        clientRef.current.publish({
            destination: "/app/chat",
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(msgObj)
        });

        setNuevoMensaje('');
        setArchivoAdjunto(null);
        setIsEmojiPickerOpen(false); 
    };

    const cargarHistorial = async (version) => {
        try {
            setLoading(true);
            setHistoryError('');
            const dataMensajes = await obtenerHistorialChat(usuarioId, destinatarioId);
            if (version === conversationVersion.current) setMensajes((current) => {
                const merged = new Map(dataMensajes.map((message) => [String(message.id), message]));
                current.forEach((message) => merged.set(String(message.id), message));
                return Array.from(merged.values());
            });
        } catch (error) {
            if (version === conversationVersion.current) setHistoryError('No se pudo cargar el historial. Comprueba la conexión e inténtalo de nuevo.');
        } finally {
            if (version === conversationVersion.current) setLoading(false);
        }
    };

    const handlePickEmoji = (emojiObject) => setNuevoMensaje(prev => prev + emojiObject.emoji);

    const esSoloEmojis = (texto, url) => {
        if (!texto || url) return false; 
        const textoLimpio = texto.replace(/\s/g, '');
        if (textoLimpio.length === 0 || textoLimpio.length > 5) return false;
        const emojiRegex = /\p{Emoji}/u;
        return emojiRegex.test(textoLimpio) && !/[a-zA-Z0-9]/.test(textoLimpio);
    };

    const renderFechaSeparador = (fechaStr) => {
        const d = new Date(fechaStr);
        if (isToday(d)) return "Hoy";
        if (isYesterday(d)) return "Ayer";
        return format(d, "d 'de' MMMM", { locale: es });
    };

    const renderMensaje = ({ item, index }) => {
        const esMio = item.remitenteId === usuarioId;
        const soloEmoji = esSoloEmojis(item.contenido, item.attachmentId);
        
        const mostrarFecha = index === 0 || 
            renderFechaSeparador(item.fechaHora) !== renderFechaSeparador(mensajes[index-1].fechaHora);

        return (
            <View>
                {mostrarFecha && (
                    <View style={styles.dateSeparator}>
                        <Text style={styles.dateText}>{renderFechaSeparador(item.fechaHora)}</Text>
                    </View>
                )}
                <View style={[
                    styles.bubble, 
                    esMio ? styles.bubbleMe : styles.bubbleThem,
                    soloEmoji && styles.bubbleEmoji,
                    item.attachmentId && { paddingHorizontal: 6, paddingVertical: 6 }
                ]}>
                    
                    {item.attachmentId && <PrivateAttachmentImage attachmentId={item.attachmentId} onOpen={setImagenSeleccionada} />}

                    {!esMio && <TouchableOpacity accessibilityRole="button" onPress={() => setReportMessageId(item.id)} style={{ paddingVertical: 8, alignSelf: 'flex-end' }}><Text style={{ color: '#a1a1aa', fontSize: 12 }}>Denunciar mensaje</Text></TouchableOpacity>}
                    {item.contenido ? (
                        <Text style={[
                            styles.text, 
                            esMio ? styles.textMe : styles.textThem,
                            soloEmoji && { fontSize: 45, lineHeight: 55 },
                            item.attachmentId && { marginTop: 6, paddingHorizontal: 6 }
                        ]}>
                            {item.contenido}
                        </Text>
                    ) : null}
                    
                    <View style={[styles.msgFooter, item.attachmentId && { paddingHorizontal: 6 }]}>
                        <Text style={styles.time}>{format(new Date(item.fechaHora), 'HH:mm')}</Text>
                        
                        {esMio && !soloEmoji && (
                            <CheckCheck size={15} color={item.leido ? "#3b82f6" : "#a1a1aa"} style={styles.checkIcon} />
                        )}
                        
                        {esMio && soloEmoji && (
                            <View style={styles.emojiCheckBg}>
                                <CheckCheck size={12} color={item.leido ? "#3b82f6" : "#a1a1aa"} />
                            </View>
                        )}
                    </View>
                </View>
            </View>
        );
    };

    return (
        <KeyboardAvoidingView 
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.container}
            keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
        >
            <Text accessibilityLiveRegion="polite" style={styles.connectionStatus}>{conectado ? 'Conectado al chat' : 'Conectando con el chat…'}</Text>
            <ChatSafetyControls key={destinatarioId} otherId={destinatarioId} onStateChange={setSafety}
                reportMessageId={reportMessageId} onCloseReport={() => setReportMessageId(null)} revision={safetyRevision} />
            {!!sendError && <Text accessibilityRole="alert" style={{ color: '#fca5a5', padding: 12 }}>{sendError}</Text>}
            {!!historyError && <View style={styles.historyError}><FormMessage>{historyError}</FormMessage><GymButton variant="secondary" onPress={() => cargarHistorial(conversationVersion.current)}>Reintentar historial</GymButton></View>}
            {loading ? (
                <View style={styles.center}><ActivityIndicator color="#FACC15" /></View>
            ) : (
                <FlatList
                    ref={flatListRef}
                    ListEmptyComponent={!historyError ? <Text style={styles.emptyHistory}>Todavía no hay mensajes en esta conversación.</Text> : null}
                    data={mensajes}
                    renderItem={renderMensaje}
                    keyExtractor={(item, index) => item.id?.toString() || index.toString()}
                    contentContainerStyle={styles.listPadding}
                    onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                />
            )}

            <View style={styles.inputContainer}>
                {archivoAdjunto && (
                    <View style={styles.previewBox}>
                        <View style={styles.previewInfo}>
                            {archivoAdjunto.type === 'video' ? <Film size={20} color="#3b82f6"/> : <ImageIcon size={20} color="#22c55e"/>}
                            <Image source={{ uri: archivoAdjunto.uri }} style={styles.previewThumb} />
                        </View>
                        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Quitar adjunto" style={styles.previewCancelBtn} onPress={cancelarAdjunto}>
                            <X size={16} color="#ef4444" />
                        </TouchableOpacity>
                    </View>
                )}

                <View style={styles.inputArea}>
                    <TouchableOpacity accessibilityRole="button" accessibilityLabel="Adjuntar archivo" style={styles.iconBtn} onPress={seleccionarArchivo} disabled={isUploading}>
                        <Paperclip size={24} color="#71717a" />
                    </TouchableOpacity>
                    
                    <View style={styles.inputWrapper}>
                        <TextInput
                            accessibilityLabel="Mensaje"
                            style={styles.input}
                            placeholder={archivoAdjunto ? "Añade un comentario..." : "Escribe un mensaje..."}
                            placeholderTextColor="#52525b"
                            value={nuevoMensaje}
                            onChangeText={setNuevoMensaje}
                            maxLength={4000}
                            editable={!!safety?.canSend && !isUploading}
                            multiline
                            onFocus={() => setIsEmojiPickerOpen(false)}
                        />
                        
                        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Elegir emoji" style={styles.emojiBtn} onPress={() => { Keyboard.dismiss(); setIsEmojiPickerOpen(true); }}>
                            <Smile size={24} color="#71717a" />
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity 
                        style={[styles.sendBtn, (!nuevoMensaje.trim() && !archivoAdjunto) && styles.sendBtnDisabled]} 
                        onPress={enviarMensaje}
                        accessibilityRole="button"
                        accessibilityLabel="Enviar mensaje"
                        disabled={(!nuevoMensaje.trim() && !archivoAdjunto) || isUploading || !safety?.canSend || !conectado}
                    >
                        {isUploading ? (
                            <ActivityIndicator size="small" color="#0A0A0A" />
                        ) : (
                            <Send size={20} color="#0A0A0A" />
                        )}
                    </TouchableOpacity>
                </View>
            </View>

            <EmojiPicker 
                onEmojiSelected={handlePickEmoji} 
                open={isEmojiPickerOpen} 
                onClose={() => setIsEmojiPickerOpen(false)} 
                theme={{
                    backdrop: 'rgba(0, 0, 0, 0.4)',
                    knob: '#FACC15',
                    container: '#18181b',
                    header: '#ffffff',
                    search: { background: '#27272a', text: '#ffffff', placeholder: '#71717a' }
                }}
            />

            <Modal visible={!!imagenSeleccionada} transparent={true} animationType="fade">
                <View style={styles.fullScreenModal}>
                    <TouchableOpacity 
                        style={styles.closeModalBtn} 
                        onPress={() => setImagenSeleccionada(null)}
                    >
                        <X size={28} color="#ffffff" />
                    </TouchableOpacity>
                    {imagenSeleccionada && (
                        <Image 
                            source={imagenSeleccionada}
                            style={styles.fullScreenImage} 
                            resizeMode="contain" 
                        />
                    )}
                </View>
            </Modal>

        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    connectionStatus: { color: '#a1a1aa', fontSize: 12, paddingHorizontal: 16, paddingVertical: 8 },
    historyError: { paddingHorizontal: 16 },
    emptyHistory: { color: '#a1a1aa', fontSize: 15, lineHeight: 23, textAlign: 'center', paddingVertical: 24 },
    container: { flex: 1, backgroundColor: '#0c0c0e' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listPadding: { paddingHorizontal: 16, paddingVertical: 20 },
    dateSeparator: { alignSelf: 'center', marginVertical: 20, backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
    dateText: { color: '#71717a', fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
    
    // BURBUJAS
    bubble: { paddingHorizontal: 14, paddingVertical: 10, marginBottom: 10, maxWidth: '82%', shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 1.5, elevation: 2 },
    bubbleMe: { alignSelf: 'flex-end', backgroundColor: '#27272a', borderTopLeftRadius: 18, borderTopRightRadius: 18, borderBottomLeftRadius: 18, borderBottomRightRadius: 4, borderWidth: 1, borderColor: 'rgba(250,204,21,0.25)' },
    bubbleThem: { alignSelf: 'flex-start', backgroundColor: '#18181b', borderTopLeftRadius: 18, borderTopRightRadius: 18, borderBottomRightRadius: 18, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#3f3f46' },
    bubbleEmoji: { backgroundColor: 'transparent', borderWidth: 0, shadowOpacity: 0, elevation: 0 },
    
    mediaImage: { width: 220, height: 220, borderRadius: 14, backgroundColor: '#1f1f22' },
    
    text: { fontSize: 15, lineHeight: 22, fontWeight: '400' },
    textMe: { color: '#f4f4f5' },
    textThem: { color: '#e4e4e7' },
    msgFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 4 },
    time: { color: '#a1a1aa', fontSize: 11, fontWeight: '500' },
    checkIcon: { marginLeft: 4, marginTop: 1 },
    emojiCheckBg: { backgroundColor: 'rgba(0,0,0,0.5)', padding: 2, borderRadius: 10, marginLeft: 6, marginTop: -10 },

    // ZONA INFERIOR
    inputContainer: { backgroundColor: '#09090b', borderTopWidth: 1, borderTopColor: '#1f1f22' },
    
    previewBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#121214', borderBottomWidth: 1, borderBottomColor: '#1f1f22' },
    previewInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    previewThumb: { width: 36, height: 36, borderRadius: 6, backgroundColor: '#27272a' },
    previewCancelBtn: { backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: 6, borderRadius: 20 },

    inputArea: { flexDirection: 'row', alignItems: 'flex-end', padding: 12 },
    inputWrapper: { flex: 1, backgroundColor: '#18181b', borderRadius: 24, paddingHorizontal: 12, paddingVertical: Platform.OS === 'ios' ? 10 : 0, marginHorizontal: 8, maxHeight: 120, flexDirection: 'row', alignItems: 'center' },
    input: { flex: 1, color: 'white', fontSize: 16, paddingRight: 8 },
    emojiBtn: { minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center', padding: 4 },
    iconBtn: { minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center', padding: 8, paddingBottom: 10 },
    sendBtn: { backgroundColor: '#FACC15', width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: 2 },
    sendBtnDisabled: { backgroundColor: '#27272a', opacity: 0.6 },

    fullScreenModal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
    closeModalBtn: { position: 'absolute', top: Platform.OS === 'ios' ? 60 : 40, right: 20, zIndex: 10, padding: 10, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20 },
    fullScreenImage: { width: '100%', height: '100%' }
});
