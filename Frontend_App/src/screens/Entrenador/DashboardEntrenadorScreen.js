import React, { useState, useEffect, useCallback } from 'react';
import { 
    View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, 
    ActivityIndicator, SafeAreaView, StatusBar, Modal, TextInput, Platform, Alert 
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { 
    User, Plus, X, Mail, Activity, ChevronRight, CheckCircle2, 
    AlertTriangle, Zap, Check, MessageCircle, TrendingUp, Bell
} from 'lucide-react-native';

// Importa tus endpoints y contexto (ajusta las rutas si es necesario)
import { obtenerClientesEntrenador, ficharCliente, obtenerDashboardResumen, getEntrenador } from '../../api/endpoints';
import { useAuth } from '../../components/context/AuthContext';

export default function DashboardEntrenadorScreen() {
    const navigation = useNavigation();
    const { userId: entrenadorId } = useAuth();
    
    const [perfil, setPerfil] = useState({ nombre: 'Coach', fotoPerfil: '' });
    const [listaClientes, setListaClientes] = useState([]); 
    const [feed, setFeed] = useState([]); 
    const [stats, setStats] = useState({ hoy: 0, riesgo: 0, records: 0 });
    const [loading, setLoading] = useState(true);

    // Estados UI
    const [showAddModal, setShowAddModal] = useState(false);
    const [newClientEmail, setNewClientEmail] = useState("");

    const cargarDatos = async () => {
        try {
            setLoading(true);
            const [dataClientes, dataDash, dataPerfil] = await Promise.all([
                obtenerClientesEntrenador(entrenadorId).catch(() => []),
                typeof obtenerDashboardResumen === 'function' ? obtenerDashboardResumen(entrenadorId).catch(() => null) : null,
                getEntrenador(entrenadorId).catch(() => null)
            ]);

            if (dataPerfil) {
                const info = dataPerfil.entrenador || dataPerfil;
                setPerfil({ nombre: info.nombre || 'Coach', fotoPerfil: info.fotoPerfil || '' });
            }
            setListaClientes(dataClientes || []);
            if (dataDash) {
                setFeed(dataDash.feedActividad || []);
                setStats(dataDash.stats || { hoy: 0, riesgo: 0, records: 0 });
            }
        } catch (error) {
            console.error("Error cargando dashboard:", error);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            if (entrenadorId) cargarDatos();
        }, [entrenadorId])
    );

    const handleFichar = async () => {
        if (!newClientEmail.trim()) {
            Alert.alert("Atención", "Por favor, introduce un correo válido.");
            return;
        }
        try {
            await ficharCliente(entrenadorId, newClientEmail.trim());
            setShowAddModal(false);
            setNewClientEmail("");
            cargarDatos(); 
            Alert.alert("¡Éxito!", "Atleta vinculado correctamente.");
        } catch (error) {
            const mensaje = error.response?.data?.message || error.response?.data || "Error al vincular el atleta.";
            Alert.alert("Error", typeof mensaje === 'string' ? mensaje : "El usuario no existe o ya está vinculado.");
        }
    };

    const handleGestionar = (idCliente) => {
        // En móvil, pasamos el ID por los parámetros de navegación en vez de localStorage
        navigation.navigate('RutinasDeCliente', { clienteId: idCliente }); 
    };

    const handleChat = (cliente) => {
        navigation.navigate('PantallaChatIndividual', {
            destinatarioId: cliente.id,
            nombreDestinatario: `${cliente.nombre} ${cliente.apellido}`
        });
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FACC15" />
                <Text style={styles.loadingText}>CARGANDO CUARTEL GENERAL...</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="light-content" backgroundColor="#050505" />
            
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                
                {/* --- 1. HEADER E IDENTIDAD --- */}
                <View style={styles.headerRow}>
                    <View style={styles.greetingBox}>
                        <Text style={styles.title}>Hola, <Text style={{ color: '#FACC15' }}>{perfil.nombre.split(' ')[0]}</Text> 👋</Text>
                        <Text style={styles.subtitle}>Aquí tienes el resumen de tu equipo.</Text>
                    </View>
                    <View style={styles.profileSection}>
                        <TouchableOpacity style={styles.bellBox}>
                            <Bell size={20} color="white" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => navigation.navigate('PerfilEntrenador')}>
                            {perfil.fotoPerfil ? (
                                <Image source={{ uri: perfil.fotoPerfil }} style={styles.avatarImg} />
                            ) : (
                                <View style={styles.avatarPlaceholder}><User size={20} color="#FACC15" /></View>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>

                {/* --- 2. BOTÓN NUEVO ATLETA --- */}
                <TouchableOpacity style={styles.btnPrimary} onPress={() => setShowAddModal(true)}>
                    <Plus size={20} color="#000" />
                    <Text style={styles.btnPrimaryText}>NUEVO ATLETA</Text>
                </TouchableOpacity>

                {/* --- 3. KPIs (SCROLL HORIZONTAL) --- */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.kpiContainer}>
                    <View style={styles.statCard}>
                        <View style={[styles.iconWrap, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                            <AlertTriangle size={24} color="#EF4444" />
                        </View>
                        <View>
                            <Text style={styles.statLabel}>En Riesgo</Text>
                            <Text style={styles.statValue}>{stats.riesgo}</Text>
                        </View>
                    </View>

                    <View style={styles.statCard}>
                        <View style={[styles.iconWrap, { backgroundColor: 'rgba(74, 222, 128, 0.1)' }]}>
                            <CheckCircle2 size={24} color="#4ade80" />
                        </View>
                        <View>
                            <Text style={styles.statLabel}>Entrenan Hoy</Text>
                            <Text style={styles.statValue}>{stats.hoy}</Text>
                        </View>
                    </View>

                    <View style={styles.statCard}>
                        <View style={[styles.iconWrap, { backgroundColor: 'rgba(250, 204, 21, 0.1)' }]}>
                            <Zap size={24} color="#FACC15" />
                        </View>
                        <View>
                            <Text style={styles.statLabel}>Récords Semanales</Text>
                            <Text style={styles.statValue}>{stats.records}</Text>
                        </View>
                    </View>
                </ScrollView>

                {/* --- 4. LISTA DE ATLETAS --- */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>MIS ATLETAS</Text>
                </View>

                {listaClientes.length === 0 ? (
                    <View style={styles.emptyState}>
                        <User size={40} color="rgba(255,255,255,0.2)" style={{ marginBottom: 15 }} />
                        <Text style={styles.emptyTitle}>No tienes atletas vinculados.</Text>
                        <Text style={styles.emptySub}>Añade a tu primer cliente para empezar.</Text>
                    </View>
                ) : (
                    <View style={styles.clientList}>
                        {listaClientes.map((item, idx) => {
                            const datosCliente = item.cliente ? item.cliente : item;
                            const semanaCompletada = item.semanaCompletada || false;
                            if (!datosCliente) return null;

                            return (
                                <TouchableOpacity 
                                    key={datosCliente.id || idx} 
                                    style={[styles.clientCard, semanaCompletada && { borderColor: 'rgba(74, 222, 128, 0.5)' }]}
                                    onPress={() => handleGestionar(datosCliente.id)}
                                    activeOpacity={0.8}
                                >
                                    {semanaCompletada && (
                                        <View style={styles.badgeSuccess}>
                                            <Check size={12} color="#4ade80" />
                                            <Text style={styles.badgeText}>CUMPLIDO</Text>
                                        </View>
                                    )}

                                    <View style={styles.clientInfoRow}>
                                        {datosCliente.fotoPerfil ? (
                                            <Image source={{ uri: datosCliente.fotoPerfil }} style={styles.clientAvatar} />
                                        ) : (
                                            <View style={styles.clientAvatarPlaceholder}><User size={20} color="#71717a" /></View>
                                        )}
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.clientName}>{datosCliente.nombre} {datosCliente.apellido}</Text>
                                            <Text style={styles.clientGoal}>{datosCliente.objetivo || "Sin objetivo definido"}</Text>
                                        </View>
                                    </View>

                                    <View style={styles.cardActions}>
                                        <TouchableOpacity style={styles.chatBtn} onPress={() => handleChat(datosCliente)}>
                                            <MessageCircle size={18} color="white" />
                                        </TouchableOpacity>
                                        <TouchableOpacity style={styles.manageBtn} onPress={() => handleGestionar(datosCliente.id)}>
                                            <Text style={styles.manageBtnText}>Gestionar</Text>
                                            <ChevronRight size={18} color="white" />
                                        </TouchableOpacity>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                )}

                {/* --- 5. FEED DE ACTIVIDAD --- */}
                <View style={styles.feedSection}>
                    <View style={styles.sectionHeader}>
                        <Activity size={18} color="#FACC15" />
                        <Text style={[styles.sectionTitle, { marginLeft: 8 }]}>ÚLTIMA ACTIVIDAD</Text>
                    </View>

                    {feed.length > 0 ? (
                        feed.map((item, idx) => (
                            <TouchableOpacity 
                                key={item.id || idx} 
                                style={styles.feedItem}
                                onPress={() => navigation.navigate('CalendarioClienteView', { clienteId: item.clienteId })}
                            >
                                <View style={styles.feedIcon}>
                                    {item.foto ? (
                                        <Image source={{ uri: item.foto }} style={styles.feedImg} />
                                    ) : (
                                        <User size={18} color="#FACC15" />
                                    )}
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.feedText}>
                                        <Text style={{ fontWeight: 'bold', color: 'white' }}>{item.clienteNombre} </Text>
                                        completó <Text style={{ color: '#FACC15' }}>{item.rutina}</Text>
                                    </Text>
                                    <Text style={styles.feedTime}>
                                        {new Date(item.fecha).toLocaleDateString([], {day:'2-digit', month:'2-digit'})} • {new Date(item.fecha).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        ))
                    ) : (
                        <View style={styles.emptyFeed}>
                            <TrendingUp size={30} color="rgba(255,255,255,0.1)" style={{ marginBottom: 10 }} />
                            <Text style={styles.emptySub}>No hay actividad reciente en tu equipo.</Text>
                        </View>
                    )}
                </View>
            </ScrollView>

            {/* --- MODAL VINCULAR ATLETA --- */}
            <Modal visible={showAddModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <TouchableOpacity style={styles.modalClose} onPress={() => setShowAddModal(false)}>
                            <X size={20} color="white" />
                        </TouchableOpacity>
                        
                        <Text style={styles.modalTitle}>Vincular Atleta</Text>
                        <Text style={styles.modalSub}>Introduce el correo del usuario para añadirlo a tu lista de gestión.</Text>
                        
                        <View style={styles.inputWrapper}>
                            <Mail size={20} color="#71717a" style={{ marginRight: 10 }} />
                            <TextInput 
                                style={styles.input}
                                placeholder="usuario@email.com"
                                placeholderTextColor="#71717a"
                                value={newClientEmail}
                                onChangeText={setNewClientEmail}
                                autoCapitalize="none"
                                keyboardType="email-address"
                            />
                        </View>

                        <TouchableOpacity style={styles.modalBtn} onPress={handleFichar}>
                            <Text style={styles.modalBtnText}>AÑADIR AL EQUIPO</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
            
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#050505' },
    scrollContent: { padding: 20, paddingBottom: 60 },
    loadingContainer: { flex: 1, backgroundColor: '#050505', justifyContent: 'center', alignItems: 'center' },
    loadingText: { color: '#FACC15', marginTop: 15, fontWeight: '800', letterSpacing: 1, fontSize: 12 },

    // Header
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 25 },
    greetingBox: { flex: 1 },
    title: { color: 'white', fontSize: 26, fontWeight: '900', letterSpacing: -0.5 },
    subtitle: { color: '#a1a1aa', fontSize: 14, marginTop: 4 },
    profileSection: { flexDirection: 'row', alignItems: 'center', gap: 15 },
    bellBox: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    avatarImg: { width: 45, height: 45, borderRadius: 22.5, borderWidth: 2, borderColor: '#FACC15' },
    avatarPlaceholder: { width: 45, height: 45, borderRadius: 22.5, backgroundColor: '#1a1a1a', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FACC15' },

    // Botón Principal
    btnPrimary: { backgroundColor: '#FACC15', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 16, marginBottom: 30, gap: 8 },
    btnPrimaryText: { color: '#000', fontWeight: '900', fontSize: 15, letterSpacing: 0.5 },

    // KPIs Horizontales
    kpiContainer: { gap: 15, marginBottom: 35, paddingRight: 20 },
    statCard: { backgroundColor: '#121214', borderWidth: 1, borderColor: '#1f1f22', borderRadius: 20, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 15, minWidth: 200, marginRight: 15 },
    iconWrap: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    statLabel: { color: '#71717a', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginBottom: 2 },
    statValue: { color: 'white', fontSize: 24, fontWeight: '900' },

    // Secciones
    sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
    sectionTitle: { color: 'white', fontSize: 14, fontWeight: '800', letterSpacing: 1 },

    // Atletas
    clientList: { gap: 15, marginBottom: 40 },
    clientCard: { backgroundColor: '#0a0a0a', borderWidth: 1, borderColor: '#1f1f22', borderRadius: 20, padding: 20, position: 'relative' },
    badgeSuccess: { position: 'absolute', top: 15, right: 15, backgroundColor: 'rgba(74, 222, 128, 0.15)', flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    badgeText: { color: '#4ade80', fontSize: 10, fontWeight: '800' },
    clientInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 15 },
    clientAvatar: { width: 50, height: 50, borderRadius: 14 },
    clientAvatarPlaceholder: { width: 50, height: 50, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
    clientName: { color: 'white', fontSize: 16, fontWeight: '800', textTransform: 'uppercase' },
    clientGoal: { color: '#a1a1aa', fontSize: 12, marginTop: 2, fontWeight: '500' },
    cardActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
    chatBtn: { padding: 14, backgroundColor: '#18181b', borderRadius: 12, borderWidth: 1, borderColor: '#27272a', justifyContent: 'center', alignItems: 'center' },
    manageBtn: { flex: 1, flexDirection: 'row', backgroundColor: '#18181b', borderRadius: 12, borderWidth: 1, borderColor: '#27272a', justifyContent: 'center', alignItems: 'center', gap: 6 },
    manageBtnText: { color: 'white', fontWeight: '700', fontSize: 14 },

    // Empty States
    emptyState: { backgroundColor: '#0a0a0a', borderWidth: 1, borderColor: '#1f1f22', borderStyle: 'dashed', borderRadius: 20, padding: 40, alignItems: 'center', marginBottom: 40 },
    emptyTitle: { color: 'white', fontSize: 16, fontWeight: '700', marginBottom: 5 },
    emptySub: { color: '#71717a', fontSize: 13, textAlign: 'center' },
    emptyFeed: { alignItems: 'center', paddingVertical: 30 },

    // Feed
    feedSection: { backgroundColor: '#0a0a0a', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: '#1f1f22' },
    feedItem: { flexDirection: 'row', alignItems: 'center', gap: 15, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#1f1f22' },
    feedIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(250, 204, 21, 0.1)', justifyContent: 'center', alignItems: 'center' },
    feedImg: { width: 40, height: 40, borderRadius: 20 },
    feedText: { color: '#d4d4d8', fontSize: 13, lineHeight: 18 },
    feedTime: { color: '#71717a', fontSize: 11, marginTop: 4, fontWeight: '600' },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    modalCard: { backgroundColor: '#121214', borderRadius: 24, padding: 30, width: '100%', borderWidth: 1, borderColor: '#27272a', position: 'relative' },
    modalClose: { position: 'absolute', top: 15, right: 15, padding: 10 },
    modalTitle: { color: 'white', fontSize: 22, fontWeight: '900', marginBottom: 10 },
    modalSub: { color: '#a1a1aa', fontSize: 14, marginBottom: 25, lineHeight: 20 },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0a0a0a', borderWidth: 1, borderColor: '#27272a', borderRadius: 16, paddingHorizontal: 15, height: 55, marginBottom: 25 },
    input: { flex: 1, color: 'white', fontSize: 16 },
    modalBtn: { backgroundColor: '#FACC15', padding: 16, borderRadius: 16, alignItems: 'center' },
    modalBtnText: { color: '#000', fontWeight: '900', fontSize: 15 }
});