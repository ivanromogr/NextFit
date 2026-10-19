import { getAccessToken } from '../../components/context/authSession';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
    View, Text, StyleSheet, FlatList, TouchableOpacity, 
    Image, TextInput, SafeAreaView, ActivityIndicator, Platform, Modal, Alert
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Search, User, MessageSquare, Plus, X } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Tus endpoints y contexto
import { obtenerClientesEntrenador, getCliente, buscarUsuarioPorEmail } from '../../api/endpoints';
import { useAuth } from '../../components/context/AuthContext';
import { BASE_URL } from '../../config/environment';

// WebSockets 
const Stomp = require('stompjs/lib/stomp.js').Stomp;
import SockJS from 'sockjs-client';

export default function ChatsEntrenadorScreen() {
    const navigation = useNavigation();
    const { userId: entrenadorId } = useAuth();
    
    // Estados de las listas
    const [clientes, setClientes] = useState([]);
    const [contactosExtras, setContactosExtras] = useState([]);
    const [busqueda, setBusqueda] = useState('');
    const [loading, setLoading] = useState(true);
    const [unreadUsers, setUnreadUsers] = useState(new Set());

    // Estados del Modal de Añadir Contacto
    const [showModal, setShowModal] = useState(false);
    const [emailBuscado, setEmailBuscado] = useState("");
    const [usuarioEncontrado, setUsuarioEncontrado] = useState(null); 
    const [aliasContacto, setAliasContacto] = useState(""); 
    const [buscandoEmail, setBuscandoEmail] = useState(false);

    const socketRef = useRef(null);

    // Cargar clientes y persistencia al entrar
    useFocusEffect(
        useCallback(() => {
            if (entrenadorId) {
                cargarClientes();
                cargarPersistencia();
            }
        }, [entrenadorId])
    );

    useEffect(() => {
        if (!entrenadorId) return;
        conectarSocketGlobal();
        
        return () => { 
            if (socketRef.current) socketRef.current.disconnect(); 
        };
    }, [entrenadorId]);

    // Guardar contactos extra cada vez que cambien
    useEffect(() => {
        if (contactosExtras.length > 0 && entrenadorId) {
            AsyncStorage.setItem(`contactos_chat_entrenador_${entrenadorId}`, JSON.stringify(contactosExtras));
        }
    }, [contactosExtras]);

    const cargarPersistencia = async () => {
        try {
            const guardados = await AsyncStorage.getItem(`contactos_chat_entrenador_${entrenadorId}`);
            if (guardados) setContactosExtras(JSON.parse(guardados));
        } catch (error) {
            console.error("Error cargando contactos guardados:", error);
        }
    };

    const conectarSocketGlobal = async () => {
        const socket = new SockJS(`${BASE_URL}/ws`); 
        const client = Stomp.over(socket);
        client.debug = null;

        client.connect({ Authorization: `Bearer ${await getAccessToken() || ''}` }, () => {
            socketRef.current = client;
            client.subscribe('/user/queue/mensajes', (payload) => {
                const msg = JSON.parse(payload.body);

                if (msg.remitenteId && msg.remitenteId !== entrenadorId) {
                    setClientes(prev => {
                        const exists = prev.some(c => String(c.id) === String(msg.remitenteId));
                        if (!exists) {
                            getCliente(msg.remitenteId).then(res => {
                                const clienteData = res.entrenador ? res.entrenador : res;
                                setClientes(old => {
                                    if (old.some(c => String(c.id) === String(clienteData.id))) return old;
                                    return [clienteData, ...old];
                                });
                            }).catch(err => console.warn('No se pudo cargar cliente remoto:', err));
                        }
                        return prev;
                    });
                    setUnreadUsers(prev => new Set(prev).add(msg.remitenteId));
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
        } catch (error) { 
            console.error(error); 
        } finally { 
            setLoading(false); 
        }
    };

    // --- LÓGICA DE BUSCAR Y AÑADIR CONTACTO (AHORA CON ALERTAS) ---
    const handleBuscarUsuario = async () => {
        if(!emailBuscado.trim()) {
            Alert.alert("Aviso", "Por favor, escribe un email para buscar.");
            return;
        }

        setBuscandoEmail(true);
        try {
            const emailLimpio = emailBuscado.trim().toLowerCase();
            const dataUsuario = await buscarUsuarioPorEmail(emailLimpio);
            
            if(dataUsuario && dataUsuario.id) {
                setUsuarioEncontrado(dataUsuario);
                setAliasContacto(`${dataUsuario.nombre} ${dataUsuario.apellido}`);
            } else {
                Alert.alert("No encontrado", "No existe ningún usuario con este correo en la plataforma.");
            }
        } catch (error) {
            console.error("Error al buscar:", error);
            Alert.alert(
                "Error al buscar", 
                "No hemos podido encontrar al usuario. Comprueba que el correo está bien escrito."
            );
        } finally {
            setBuscandoEmail(false);
        }
    };

    const guardarNuevoContacto = () => {
        if (!usuarioEncontrado) return;
        const nuevo = { ...usuarioEncontrado, alias: aliasContacto, isManual: true };
        
        // Evitar duplicados
        const yaEsAtleta = clientes.some(c => c.id === nuevo.id);
        const yaEsExtra = contactosExtras.some(c => c.id === nuevo.id);
        
        if (yaEsAtleta || yaEsExtra) {
            Alert.alert("Ya lo tienes", "Este contacto ya está en tu lista de chats.");
        } else {
            setContactosExtras(prev => [...prev, nuevo]);
        }
        
        // Cerramos modal y limpiamos estados siempre
        setShowModal(false);
        setUsuarioEncontrado(null);
        setEmailBuscado("");
        setAliasContacto("");
    };

    const handleOpenChat = (contacto) => {
        if (unreadUsers.has(contacto.id)) {
            const newSet = new Set(unreadUsers);
            newSet.delete(contacto.id);
            setUnreadUsers(newSet);
        }

        navigation.navigate('PantallaChatIndividual', {
            destinatarioId: contacto.id,
            nombreDestinatario: contacto.alias || `${contacto.nombre} ${contacto.apellido}`,
            fotoDestinatario: contacto.fotoPerfil
        });
    };

    // Unimos atletas y contactos manuales para mostrarlos en la misma lista
    const todosLosContactos = [...clientes];
    contactosExtras.forEach(extra => {
        if (!todosLosContactos.some(c => c.id === extra.id)) {
            todosLosContactos.push(extra);
        }
    });

    const contactosFiltrados = todosLosContactos.filter(c => 
        (c.nombre + " " + c.apellido + " " + (c.alias || "")).toLowerCase().includes(busqueda.toLowerCase())
    );

    const renderContacto = ({ item }) => {
        const tieneUnread = unreadUsers.has(item.id);
        const nombreMostrar = item.alias || `${item.nombre} ${item.apellido}`;

        return (
            <TouchableOpacity 
                style={styles.contactoItem} 
                onPress={() => handleOpenChat(item)}
                activeOpacity={0.7}
            >
                <View style={styles.avatarContainer}>
                    {item.fotoPerfil ? (
                        <Image source={{ uri: item.fotoPerfil }} style={styles.avatarImg} />
                    ) : (
                        <View style={styles.avatarPlaceholder}>
                            <User size={20} color="#71717a" />
                        </View>
                    )}
                    {tieneUnread && <View style={styles.unreadBadge} />}
                </View>

                <View style={styles.contactoInfo}>
                    <Text style={styles.contactoNombre} numberOfLines={1}>
                        {nombreMostrar}
                    </Text>
                    <Text style={[styles.contactoSub, tieneUnread && { color: '#d4d4d8', fontWeight: '600' }]} numberOfLines={1}>
                        {tieneUnread ? 'Nuevos mensajes' : (item.isManual ? 'Contacto guardado' : 'Atleta de tu equipo')}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

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
                <TextInput 
                    style={styles.searchInput} 
                    placeholder="Buscar chats..." 
                    placeholderTextColor="#71717a" 
                    value={busqueda} 
                    onChangeText={setBusqueda} 
                />
            </View>

            <View style={styles.listArea}>
                <Text style={styles.sectionDivider}>TUS CONTACTOS</Text>
                
                {loading ? (
                    <ActivityIndicator color="#FACC15" style={{ marginTop: 20 }} />
                ) : contactosFiltrados.length === 0 ? (
                    <View style={styles.emptyState}>
                        <MessageSquare size={48} color="#27272a" style={{ marginBottom: 15 }} />
                        <Text style={{ color: '#71717a', fontSize: 14, textAlign: 'center' }}>
                            Aún no tienes contactos. Dale al + para empezar un chat.
                        </Text>
                    </View>
                ) : (
                    <FlatList 
                        data={contactosFiltrados}
                        keyExtractor={(item) => String(item.id)}
                        renderItem={renderContacto}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: 20 }}
                    />
                )}
            </View>

            {/* MODAL DE AÑADIR CONTACTO */}
            <Modal visible={showModal} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalTop}>
                            <Text style={styles.modalTitle}>Nuevo Contacto</Text>
                            <TouchableOpacity onPress={() => { setShowModal(false); setUsuarioEncontrado(null); }}>
                                <X color="white" />
                            </TouchableOpacity>
                        </View>
                        {!usuarioEncontrado ? (
                            <>
                                <TextInput 
                                    style={styles.input} 
                                    placeholder="Email del usuario" 
                                    placeholderTextColor="#555" 
                                    value={emailBuscado} 
                                    onChangeText={setEmailBuscado} 
                                    autoCapitalize="none" 
                                />
                                <TouchableOpacity style={styles.mainBtn} onPress={handleBuscarUsuario}>
                                    {buscandoEmail ? <ActivityIndicator color="black" /> : <Text style={styles.mainBtnText}>Buscar</Text>}
                                </TouchableOpacity>
                            </>
                        ) : (
                            <>
                                <Text style={styles.foundText}>¡Usuario encontrado!</Text>
                                <TextInput 
                                    style={styles.input} 
                                    value={aliasContacto} 
                                    onChangeText={setAliasContacto} 
                                    placeholder="Apodo (opcional)" 
                                    placeholderTextColor="#555"
                                />
                                <TouchableOpacity style={styles.mainBtn} onPress={guardarNuevoContacto}>
                                    <Text style={styles.mainBtnText}>Añadir a mis chats</Text>
                                </TouchableOpacity>
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

    emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40, marginTop: 40 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 20 },
    modalContent: { backgroundColor: '#18181b', borderRadius: 24, padding: 25, borderWidth: 1, borderColor: '#27272a' },
    modalTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { color: 'white', fontSize: 20, fontWeight: '800' },
    input: { backgroundColor: '#09090b', color: 'white', padding: 15, borderRadius: 12, marginBottom: 15, fontSize: 16, borderWidth: 1, borderColor: '#27272a' },
    mainBtn: { backgroundColor: '#FACC15', padding: 15, borderRadius: 12, alignItems: 'center' },
    mainBtnText: { fontWeight: '800', fontSize: 16, color: '#0A0A0A' },
    foundText: { color: '#4ade80', marginBottom: 10, fontWeight: '700' }
});
