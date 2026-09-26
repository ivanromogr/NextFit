import React, { useState, useCallback } from 'react';
import { 
    View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, 
    ActivityIndicator, SafeAreaView, StatusBar, Modal, TextInput, Platform, Alert 
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { 
    User, Plus, X, Mail, Activity, ChevronRight, CheckCircle2, 
    AlertTriangle, Zap, Check, MessageCircle, TrendingUp, Bell, Copy, LogOut,
    Users
} from 'lucide-react-native';

import { obtenerClientesEntrenador, ficharCliente, obtenerDashboardResumen, getEntrenador } from '../../api/endpoints';
import { useAuth } from '../../components/context/AuthContext';

export default function DashboardEntrenadorScreen() {
    const navigation = useNavigation();
    
    const { userId: entrenadorId, logout } = useAuth(); 
    
    const [perfil, setPerfil] = useState({ nombre: 'Coach', fotoPerfil: '' });
    const [listaClientes, setListaClientes] = useState([]); 
    const [feed, setFeed] = useState([]); 
    const [stats, setStats] = useState({ hoy: 0, riesgo: 0, records: 0 });
    const [loading, setLoading] = useState(true);

    const [showAddModal, setShowAddModal] = useState(false);
    const [newClientEmail, setNewClientEmail] = useState("");

    const [showKpiModal, setShowKpiModal] = useState(false);
    const [activeKpi, setActiveKpi] = useState(null); 
    const [detallesKpi, setDetallesKpi] = useState({ riesgo: [], hoy: [], records: [] });

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
                setDetallesKpi({
                    riesgo: dataDash.detallesRiesgo || [],
                    hoy: dataDash.detallesHoy || [],
                    records: dataDash.detallesRecords || []
                });
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

    const handleCerrarSesion = async () => {
        Alert.alert(
            "Cerrar Sesión",
            "¿Estás seguro de que quieres salir de tu cuenta?",
            [
                { text: "Cancelar", style: "cancel" },
                { 
                    text: "CERRAR SESIÓN", 
                    style: "destructive",
                    onPress: async () => {
                        try {
                            if (logout) {
                                await logout();
                            }
                            navigation.reset({
                                index: 0,
                                routes: [{ name: 'Login' }], 
                            });
                        } catch (e) {
                            console.error("Error al cerrar sesión:", e);
                        }
                    }
                }
            ]
        );
    };

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
        navigation.navigate('GestionarAtleta', { id: idCliente });
    };

    const abrirDetalleKpi = (tipo) => {
        setActiveKpi(tipo);
        setShowKpiModal(true);
    };

    const renderKpiContent = () => {
        let titulo = "";
        let icono = null;
        let lista = [];
        let mensajeVacio = "";

        if (activeKpi === 'riesgo') {
            titulo = "Atletas en Riesgo";
            icono = <AlertTriangle size={24} color="#EF4444" />;
            lista = detallesKpi.riesgo;
            mensajeVacio = "¡Genial! Ningún atleta se ha saltado sus rutinas recientemente.";
        } else if (activeKpi === 'hoy') {
            titulo = "Entrenan Hoy";
            icono = <CheckCircle2 size={24} color="#4ade80" />;
            lista = detallesKpi.hoy;
            mensajeVacio = "Nadie tiene entrenamientos programados para hoy.";
        } else if (activeKpi === 'records') {
            titulo = "Récords de la Semana";
            icono = <Zap size={24} color="#FACC15" />;
            lista = detallesKpi.records;
            mensajeVacio = "Aún no hay nuevos récords esta semana.";
        }

        return (
            <View style={styles.modalCardKpi}>
                <View style={styles.modalHeader}>
                    <View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}>
                        {icono}
                        <Text style={styles.modalTitleKpi}>{titulo}</Text>
                    </View>
                    <TouchableOpacity style={styles.modalClose} onPress={() => setShowKpiModal(false)}>
                        <X size={20} color="white" />
                    </TouchableOpacity>
                </View>

                <ScrollView style={{maxHeight: 400}} showsVerticalScrollIndicator={false}>
                    {lista.length > 0 ? (
                        lista.map((item, index) => (
                            <TouchableOpacity 
                                key={item.clienteId || index} 
                                style={styles.kpiListItem}
                                onPress={() => {
                                    setShowKpiModal(false);
                                    if(item.clienteId) handleGestionar(item.clienteId);
                                }}
                            >
                                {item.fotoPerfil ? (
                                    <Image source={{ uri: item.fotoPerfil }} style={styles.kpiAvatar} />
                                ) : (
                                    <View style={styles.kpiAvatarPlaceholder}><User size={18} color="#FACC15" /></View>
                                )}
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.kpiName}>{item.clienteNombre || item.nombre}</Text>
                                    <Text style={styles.kpiDetail}>{item.detalle || item.motivo || "Ver perfil del atleta"}</Text>
                                </View>
                                <ChevronRight size={18} color="rgba(255,255,255,0.3)" />
                            </TouchableOpacity>
                        ))
                    ) : (
                        <View style={styles.emptyKpiState}>
                            <Text style={styles.emptySub}>{mensajeVacio}</Text>
                        </View>
                    )}
                </ScrollView>
            </View>
        );
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

                        <TouchableOpacity 
                            style={[styles.bellBox, { borderColor: 'rgba(239, 68, 68, 0.3)' }]} 
                            onPress={handleCerrarSesion}
                        >
                            <LogOut size={20} color="#EF4444" />
                        </TouchableOpacity>
                        
                        <TouchableOpacity onPress={() => navigation.navigate('EntrenadorPerfil')}>
                            {perfil.fotoPerfil ? (
                                <Image source={{ uri: perfil.fotoPerfil }} style={styles.avatarImg} />
                            ) : (
                                <View style={styles.avatarPlaceholder}><User size={20} color="#FACC15" /></View>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>

                <TouchableOpacity style={styles.btnPrimary} onPress={() => setShowAddModal(true)}>
                    <Plus size={20} color="#000" />
                    <Text style={styles.btnPrimaryText}>VINCULAR ATLETA</Text>
                </TouchableOpacity>

                {/* --- 3. KPIs INTERACTIVOS --- */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.kpiContainer}>
                    <TouchableOpacity style={styles.statCard} activeOpacity={0.7} onPress={() => abrirDetalleKpi('riesgo')}>
                        <View style={[styles.iconWrap, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                            <AlertTriangle size={24} color="#EF4444" />
                        </View>
                        <View>
                            <Text style={styles.statLabel}>En Riesgo</Text>
                            <Text style={styles.statValue}>{stats.riesgo}</Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.statCard} activeOpacity={0.7} onPress={() => abrirDetalleKpi('hoy')}>
                        <View style={[styles.iconWrap, { backgroundColor: 'rgba(74, 222, 128, 0.1)' }]}>
                            <CheckCircle2 size={24} color="#4ade80" />
                        </View>
                        <View>
                            <Text style={styles.statLabel}>Entrenan Hoy</Text>
                            <Text style={styles.statValue}>{stats.hoy}</Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.statCard} activeOpacity={0.7} onPress={() => abrirDetalleKpi('records')}>
                        <View style={[styles.iconWrap, { backgroundColor: 'rgba(250, 204, 21, 0.1)' }]}>
                            <Zap size={24} color="#FACC15" />
                        </View>
                        <View>
                            <Text style={styles.statLabel}>Récords Semanales</Text>
                            <Text style={styles.statValue}>{stats.records}</Text>
                        </View>
                    </TouchableOpacity>
                </ScrollView>

                {/* --- 4. GESTIÓN PRINCIPAL (ESTILO SIDEBAR WEB) --- */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>GESTIÓN DE EQUIPO</Text>
                </View>

                <TouchableOpacity 
                    style={styles.menuNavCard} 
                    onPress={() => navigation.navigate('GestionAtletas')}
                    activeOpacity={0.8}
                >
                    <View style={[styles.menuIconBox, { backgroundColor: 'rgba(250, 204, 21, 0.1)' }]}>
                        <Users size={24} color="#FACC15" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.menuTitle}>Mis Atletas</Text>
                        <Text style={styles.menuSub}>Vincula y gestiona a tus {listaClientes.length} clientes</Text>
                    </View>
                    <ChevronRight size={20} color="rgba(255,255,255,0.2)" />
                </TouchableOpacity>

                {/* TARJETA "BIBLIOTECA" */}
                <TouchableOpacity 
                    style={styles.menuNavCard} 
                    onPress={() => navigation.navigate('PlantillasEntrenador')} 
                    activeOpacity={0.8}
                >
                    <View style={[styles.menuIconBox, { backgroundColor: 'rgba(255, 255, 255, 0.05)' }]}>
                        <Copy size={24} color="white" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.menuTitle}>Biblioteca</Text>
                        <Text style={styles.menuSub}>Gestiona tus plantillas maestras</Text>
                    </View>
                    <ChevronRight size={20} color="rgba(255,255,255,0.2)" />
                </TouchableOpacity>

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
                                onPress={() => handleGestionar(item.clienteId)}
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

            {/* MODAL KPIs */}
            <Modal visible={showKpiModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    {renderKpiContent()}
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

    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 25 },
    greetingBox: { flex: 1 },
    title: { color: 'white', fontSize: 26, fontWeight: '900', letterSpacing: -0.5 },
    subtitle: { color: '#a1a1aa', fontSize: 14, marginTop: 4 },
    profileSection: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    bellBox: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    avatarImg: { width: 45, height: 45, borderRadius: 22.5, borderWidth: 2, borderColor: '#FACC15' },
    avatarPlaceholder: { width: 45, height: 45, borderRadius: 22.5, backgroundColor: '#1a1a1a', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FACC15' },

    btnPrimary: { backgroundColor: '#FACC15', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 16, marginBottom: 30, gap: 8 },
    btnPrimaryText: { color: '#000', fontWeight: '900', fontSize: 15, letterSpacing: 0.5 },

    kpiContainer: { gap: 15, marginBottom: 30, paddingRight: 20 },
    statCard: { backgroundColor: '#121214', borderWidth: 1, borderColor: '#1f1f22', borderRadius: 20, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 15, minWidth: 200, marginRight: 15 },
    iconWrap: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    statLabel: { color: '#71717a', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginBottom: 2 },
    statValue: { color: 'white', fontSize: 24, fontWeight: '900' },

    sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
    sectionTitle: { color: 'white', fontSize: 14, fontWeight: '800', letterSpacing: 1 },

    menuNavCard: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        backgroundColor: '#0c0c0e', 
        borderWidth: 1, 
        borderColor: '#1a1a1c', 
        borderRadius: 24, 
        padding: 20, 
        marginBottom: 12 
    },
    menuIconBox: { 
        width: 56, 
        height: 56, 
        borderRadius: 18, 
        justifyContent: 'center', 
        alignItems: 'center', 
        marginRight: 15 
    },
    menuTitle: { color: 'white', fontSize: 18, fontWeight: '800', marginBottom: 2 },
    menuSub: { color: '#71717a', fontSize: 12 },

    feedSection: { backgroundColor: '#0a0a0a', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: '#1f1f22', marginTop: 20 },
    feedItem: { flexDirection: 'row', alignItems: 'center', gap: 15, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#1f1f22' },
    feedIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(250, 204, 21, 0.1)', justifyContent: 'center', alignItems: 'center' },
    feedImg: { width: 40, height: 40, borderRadius: 20 },
    feedText: { color: '#d4d4d8', fontSize: 13, lineHeight: 18 },
    feedTime: { color: '#71717a', fontSize: 11, marginTop: 4, fontWeight: '600' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    modalCard: { backgroundColor: '#121214', borderRadius: 24, padding: 30, width: '100%', borderWidth: 1, borderColor: '#27272a', position: 'relative' },
    modalCardKpi: { backgroundColor: '#121214', borderRadius: 24, padding: 30, width: '100%', borderWidth: 1, borderColor: '#27272a', position: 'relative', maxHeight: '80%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitleKpi: { color: 'white', fontSize: 20, fontWeight: '900' },
    modalClose: { padding: 5 },
    modalTitle: { color: 'white', fontSize: 22, fontWeight: '900', marginBottom: 10 },
    modalSub: { color: '#a1a1aa', fontSize: 14, marginBottom: 25, lineHeight: 20 },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0a0a0a', borderWidth: 1, borderColor: '#27272a', borderRadius: 16, paddingHorizontal: 15, height: 55, marginBottom: 25 },
    input: { flex: 1, color: 'white', fontSize: 16 },
    modalBtn: { backgroundColor: '#FACC15', padding: 16, borderRadius: 16, alignItems: 'center' },
    modalBtnText: { color: '#000', fontWeight: '900', fontSize: 15 },

    kpiListItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#18181b', padding: 15, borderRadius: 16, marginBottom: 10, borderWidth: 1, borderColor: '#27272a', gap: 15 },
    kpiAvatar: { width: 40, height: 40, borderRadius: 20 },
    kpiAvatarPlaceholder: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
    kpiName: { color: 'white', fontSize: 16, fontWeight: 'bold' },
    kpiDetail: { color: '#a1a1aa', fontSize: 13, marginTop: 2 },
    emptyKpiState: { padding: 30, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 16, borderWidth: 1, borderColor: '#27272a', borderStyle: 'dashed' },
    emptyFeed: { padding: 40, alignItems: 'center' },
    emptySub: { color: '#71717a', fontSize: 13, textAlign: 'center' },
});
