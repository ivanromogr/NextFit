import React, { useState, useEffect, useRef } from "react";
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, 
  Image, TextInput, SafeAreaView, ActivityIndicator, Modal,
  ScrollView, Platform
} from "react-native";
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCliente, obtenerContactosChat, buscarUsuarioPorEmail } from "../../api/endpoints"; 
import { useAuth } from "../../components/context/AuthContext";
import ChatComponent from "../../components/functional/ChatComponent";
import { Search, User, Plus, X, ChevronLeft } from "lucide-react-native";
import { Client } from '@stomp/stompjs';
import 'react-native-get-random-values';
import { WS_URL } from '../../config/environment';

export default function ChatClienteScreen() {
    const { userId: clienteId, user } = useAuth();
    
    const [entrenador, setEntrenador] = useState(null);
    const [amigos, setAmigos] = useState([]);
    const [contactoSeleccionado, setContactoSeleccionado] = useState(null);
    const [busqueda, setBusqueda] = useState("");
    const [loading, setLoading] = useState(true);
    const [unreadUsers, setUnreadUsers] = useState(new Set());

    const [showModal, setShowModal] = useState(false);
    const [emailBuscado, setEmailBuscado] = useState("");
    const [usuarioEncontrado, setUsuarioEncontrado] = useState(null); 
    const [aliasContacto, setAliasContacto] = useState(""); 
    const [buscandoEmail, setBuscandoEmail] = useState(false);

    const clientRef = useRef(null);

    useEffect(() => {
        const cargarPersistencia = async () => {
            if (!clienteId) return;
            const guardados = await AsyncStorage.getItem(`contactos_chat_${clienteId}`);
            if (guardados) setAmigos(JSON.parse(guardados));
            
            cargarContactosBase();
            conectarSocketGlobal();
        };

        cargarPersistencia();

        return () => {
            if (clientRef.current) clientRef.current.deactivate();
        };
    }, [clienteId]);

    useEffect(() => {
        if (amigos.length > 0 && clienteId) {
            AsyncStorage.setItem(`contactos_chat_${clienteId}`, JSON.stringify(amigos));
        }
    }, [amigos]);

    const conectarSocketGlobal = () => {
        const client = new Client({
            brokerURL: WS_URL,
            connectHeaders: { Authorization: `Bearer ${user?.accessToken || ''}` },
            onConnect: () => {
                client.subscribe('/user/queue/mensajes', (payload) => {
                    const msg = JSON.parse(payload.body);
                    if (msg.remitenteId !== clienteId && contactoSeleccionado?.id !== msg.remitenteId) {
                        setUnreadUsers(prev => new Set(prev).add(msg.remitenteId));
                    }
                });
            },
        });
        client.activate();
        clientRef.current = client;
    };

    const cargarContactosBase = async () => {
        try {
            setLoading(true);
            const dataCliente = await getCliente(clienteId); 
            if (dataCliente && dataCliente.entrenador) {
                setEntrenador(dataCliente.entrenador);
            }

            const datosContactos = await obtenerContactosChat(clienteId);
            if (datosContactos) {
                const nuevosDelBackend = datosContactos.filter(c => c.id !== clienteId);
                setAmigos(prev => {
                    const mapa = new Map();
                    prev.forEach(a => mapa.set(a.id, a));
                    nuevosDelBackend.forEach(a => { if (!mapa.has(a.id)) mapa.set(a.id, a); });
                    return Array.from(mapa.values());
                });
            }
        } catch (error) {
            console.error("Error cargando contactos:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleBuscarUsuario = async () => {
        if(!emailBuscado.trim()) return;
        setBuscandoEmail(true);
        try {
            const dataUsuario = await buscarUsuarioPorEmail(emailBuscado);
            if(dataUsuario) {
                setUsuarioEncontrado(dataUsuario);
                setAliasContacto(`${dataUsuario.nombre} ${dataUsuario.apellido}`);
            }
        } catch (error) {
            console.warn("Usuario no encontrado");
        } finally {
            setBuscandoEmail(false);
        }
    };

    const guardarNuevoContacto = () => {
        if (!usuarioEncontrado) return;
        const nuevo = { ...usuarioEncontrado, alias: aliasContacto };
        setAmigos(prev => [...prev, nuevo]);
        setShowModal(false);
        setContactoSeleccionado(nuevo);
        setUsuarioEncontrado(null);
        setEmailBuscado("");
    };

    const renderContacto = ({ item, esEntrenador = false }) => {
        const tieneUnread = unreadUsers.has(item.id);
        return (
            <TouchableOpacity style={styles.contactoItem} onPress={() => {
                setContactoSeleccionado(item);
                setUnreadUsers(prev => {
                    const next = new Set(prev);
                    next.delete(item.id);
                    return next;
                });
            }}>
                <View style={styles.avatarContainer}>
                    {item.fotoPerfil ? (
                        <Image source={{ uri: item.fotoPerfil }} style={styles.avatarImg} />
                    ) : (
                        <View style={styles.avatarPlaceholder}>
                            <User size={20} color={esEntrenador ? "#FACC15" : "#71717a"} />
                        </View>
                    )}
                    {tieneUnread && <View style={styles.unreadBadge} />}
                </View>
                <View style={styles.contactoInfo}>
                    <Text style={styles.contactoNombre}>{item.alias || `${item.nombre} ${item.apellido}`}</Text>
                    <Text style={[styles.contactoSub, esEntrenador && { color: '#FACC15' }]}>
                        {esEntrenador ? "Tu Entrenador ⭐" : "Comunidad NextFit"}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    if (contactoSeleccionado) {
        return (
            <SafeAreaView style={styles.chatLevel2}>
                <View style={styles.chatHeader}>
                    <TouchableOpacity onPress={() => setContactoSeleccionado(null)}>
                        <ChevronLeft size={28} color="white" />
                    </TouchableOpacity>
                    <View style={styles.headerInfo}>
                        <Text style={styles.headerName}>{contactoSeleccionado.alias || contactoSeleccionado.nombre}</Text>
                        <Text style={styles.headerStatus}>En línea</Text>
                    </View>
                </View>
                <ChatComponent usuarioId={clienteId} destinatarioId={contactoSeleccionado.id} nombreDestinatario={contactoSeleccionado.nombre} />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Mensajes</Text>
                <TouchableOpacity onPress={() => setShowModal(true)} style={styles.addBtn}>
                    <Plus size={24} color="#0A0A0A" />
                </TouchableOpacity>
            </View>

            <View style={styles.searchBar}>
                <Search size={18} color="#71717a" />
                <TextInput style={styles.searchInput} placeholder="Buscar chats..." placeholderTextColor="#71717a" value={busqueda} onChangeText={setBusqueda} />
            </View>

            <ScrollView style={styles.listArea} showsVerticalScrollIndicator={false}>
                {entrenador && renderContacto({ item: entrenador, esEntrenador: true })}
                <Text style={styles.sectionDivider}>TUS CONTACTOS</Text>
                {amigos.filter(a => (a.nombre + a.apellido).toLowerCase().includes(busqueda.toLowerCase())).map(amigo => (
                    <View key={amigo.id.toString()}>{renderContacto({ item: amigo })}</View>
                ))}
                {loading && <ActivityIndicator color="#FACC15" style={{ marginTop: 20 }} />}
            </ScrollView>

            <Modal visible={showModal} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalTop}>
                            <Text style={styles.modalTitle}>Nuevo Contacto</Text>
                            <TouchableOpacity onPress={() => { setShowModal(false); setUsuarioEncontrado(null); }}><X color="white" /></TouchableOpacity>
                        </View>
                        {!usuarioEncontrado ? (
                            <>
                                <TextInput style={styles.input} placeholder="Email del usuario" placeholderTextColor="#555" value={emailBuscado} onChangeText={setEmailBuscado} autoCapitalize="none" />
                                <TouchableOpacity style={styles.mainBtn} onPress={handleBuscarUsuario}>
                                    {buscandoEmail ? <ActivityIndicator color="black" /> : <Text style={styles.mainBtnText}>Buscar</Text>}
                                </TouchableOpacity>
                            </>
                        ) : (
                            <>
                                <Text style={styles.foundText}>¡Usuario encontrado!</Text>
                                <TextInput style={styles.input} value={aliasContacto} onChangeText={setAliasContacto} placeholder="Apodo (opcional)" />
                                <TouchableOpacity style={styles.mainBtn} onPress={guardarNuevoContacto}><Text style={styles.mainBtnText}>Añadir a mis chats</Text></TouchableOpacity>
                            </>
                        )}
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#09090b' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24 },
    title: { fontSize: 32, fontWeight: '900', color: 'white', fontStyle: 'italic' },
    addBtn: { backgroundColor: '#FACC15', width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
    searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#18181b', marginHorizontal: 24, paddingHorizontal: 15, borderRadius: 12, height: 45, marginBottom: 20 },
    searchInput: { flex: 1, color: 'white', marginLeft: 10, fontSize: 16 },
    listArea: { flex: 1, paddingHorizontal: 20 },
    sectionDivider: { color: '#52525b', fontSize: 12, fontWeight: '800', marginVertical: 15, letterSpacing: 1 },
    contactoItem: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 16, marginBottom: 8, backgroundColor: 'rgba(255,255,255,0.02)' },
    avatarContainer: { position: 'relative' },
    avatarImg: { width: 55, height: 55, borderRadius: 27.5 },
    avatarPlaceholder: { width: 55, height: 55, borderRadius: 27.5, backgroundColor: '#18181b', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#27272a' },
    unreadBadge: { position: 'absolute', right: 0, bottom: 0, width: 14, height: 14, borderRadius: 7, backgroundColor: '#3b82f6', borderWidth: 2, borderColor: '#09090b' },
    contactoInfo: { marginLeft: 15, flex: 1 },
    contactoNombre: { color: 'white', fontSize: 17, fontWeight: '700' },
    contactoSub: { color: '#71717a', fontSize: 13, marginTop: 2 },
    chatLevel2: { flex: 1, backgroundColor: '#09090b' },
    chatHeader: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#1f1f22', paddingTop: Platform.OS === 'ios' ? 10 : 30 },
    headerInfo: { marginLeft: 10 },
    headerName: { color: 'white', fontSize: 18, fontWeight: '800' },
    headerStatus: { color: '#4ade80', fontSize: 12, fontWeight: '600' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 20 },
    modalContent: { backgroundColor: '#18181b', borderRadius: 24, padding: 25 },
    modalTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    modalTitle: { color: 'white', fontSize: 20, fontWeight: '800' },
    input: { backgroundColor: '#09090b', color: 'white', padding: 15, borderRadius: 12, marginBottom: 15, fontSize: 16, borderWidth: 1, borderColor: '#27272a' },
    mainBtn: { backgroundColor: '#FACC15', padding: 15, borderRadius: 12, alignItems: 'center' },
    mainBtnText: { fontWeight: '800', fontSize: 16, color: '#0A0A0A' },
    foundText: { color: '#4ade80', marginBottom: 10, fontWeight: '700' }
});
