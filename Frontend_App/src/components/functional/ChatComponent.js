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
import { WS_URL } from '../../config/environment';
import { useAuth } from '../context/AuthContext';

export default function ChatComponent({ usuarioId, destinatarioId, nombreDestinatario }) {
    const { user } = useAuth();
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

    useEffect(() => {
        setMensajes([]);
        cargarHistorial();
        conectarWebSocket();

        return () => {
            if (clientRef.current) {
                clientRef.current.deactivate();
            }
        };
    }, [destinatarioId]);

    useEffect(() => {
        const noLeidos = mensajes.filter(m => m.remitenteId === destinatarioId && !m.leido);
        if (noLeidos.length > 0 && clientRef.current?.connected && conectado) {
            clientRef.current.publish({
                destination: "/app/chat/leer",
                body: JSON.stringify({ remitenteId: destinatarioId })
            });
            setMensajes(prev => prev.map(m => (m.remitenteId === destinatarioId && !m.leido) ? { ...m, leido: true } : m));
        }
    }, [mensajes, conectado]);

    const conectarWebSocket = () => {
        const client = new Client({
            brokerURL: WS_URL,
            connectHeaders: { Authorization: `Bearer ${user?.accessToken || ''}` },
            reconnectDelay: 5000,
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,
            forceBinaryWSFrames: true,
            appendMissingNULLonIncoming: true,
            onConnect: () => {
                setConectado(true);
                client.subscribe('/user/queue/mensajes', (payload) => {
                    const msgRecibido = JSON.parse(payload.body);
                    if (msgRecibido.remitenteId === destinatarioId || msgRecibido.remitenteId === usuarioId) {
                        setMensajes(prev => {
                            const existe = prev.find(m => m.id === msgRecibido.id);
                            if (existe) return prev.map(m => m.id === msgRecibido.id ? msgRecibido : m);
                            return [...prev, msgRecibido];
                        });
                    }
                });
            },
            onDisconnect: () => setConectado(false),
            onStompError: (frame) => console.error('💥 Error STOMP: ' + frame.headers['message'])
        });

        client.activate();
        clientRef.current = client;
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
        if ((!nuevoMensaje.trim() && !archivoAdjunto) || !clientRef.current?.connected || isUploading) {
            return;
        }

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

        clientRef.current.publish({
            destination: "/app/chat",
            body: JSON.stringify(msgObj)
        });

        setNuevoMensaje('');
        setArchivoAdjunto(null);
        setIsEmojiPickerOpen(false); 
    };

    const cargarHistorial = async () => {
        try {
            setLoading(true);
            const dataMensajes = await obtenerHistorialChat(usuarioId, destinatarioId);
            setMensajes(dataMensajes);
        } catch (error) {
            console.error("Error cargando historial:", error);
        } finally {
            setLoading(false);
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
                    
                    {item.attachmentId && (
                        <TouchableOpacity activeOpacity={0.8} onPress={() => setImagenSeleccionada(getImageUrl(`/upload/files/${item.attachmentId}`))}>
                            <Image source={{ uri: getImageUrl(`/upload/files/${item.attachmentId}`), headers: { Authorization: `Bearer ${user?.accessToken || ''}` } }} style={styles.mediaImage} resizeMode="cover" />
                        </TouchableOpacity>
                    )}

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
            {loading ? (
                <View style={styles.center}><ActivityIndicator color="#FACC15" /></View>
            ) : (
                <FlatList
                    ref={flatListRef}
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
                        <TouchableOpacity style={styles.previewCancelBtn} onPress={cancelarAdjunto}>
                            <X size={16} color="#ef4444" />
                        </TouchableOpacity>
                    </View>
                )}

                <View style={styles.inputArea}>
                    <TouchableOpacity style={styles.iconBtn} onPress={seleccionarArchivo} disabled={isUploading}>
                        <Paperclip size={24} color="#71717a" />
                    </TouchableOpacity>
                    
                    <View style={styles.inputWrapper}>
                        <TextInput
                            style={styles.input}
                            placeholder={archivoAdjunto ? "Añade un comentario..." : "Escribe un mensaje..."}
                            placeholderTextColor="#52525b"
                            value={nuevoMensaje}
                            onChangeText={setNuevoMensaje}
                            multiline
                            onFocus={() => setIsEmojiPickerOpen(false)}
                            disabled={isUploading}
                        />
                        
                        <TouchableOpacity style={styles.emojiBtn} onPress={() => { Keyboard.dismiss(); setIsEmojiPickerOpen(true); }}>
                            <Smile size={24} color="#71717a" />
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity 
                        style={[styles.sendBtn, (!nuevoMensaje.trim() && !archivoAdjunto) && styles.sendBtnDisabled]} 
                        onPress={enviarMensaje}
                        disabled={(!nuevoMensaje.trim() && !archivoAdjunto) || isUploading}
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
                            source={{ uri: imagenSeleccionada }} 
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
    emojiBtn: { padding: 4 },
    iconBtn: { padding: 8, paddingBottom: 10 },
    sendBtn: { backgroundColor: '#FACC15', width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: 2 },
    sendBtnDisabled: { backgroundColor: '#27272a', opacity: 0.6 },

    fullScreenModal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
    closeModalBtn: { position: 'absolute', top: Platform.OS === 'ios' ? 60 : 40, right: 20, zIndex: 10, padding: 10, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20 },
    fullScreenImage: { width: '100%', height: '100%' }
});
