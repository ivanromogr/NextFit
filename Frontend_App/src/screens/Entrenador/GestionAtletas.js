import React, { useState, useEffect } from 'react';
import { 
    View, Text, StyleSheet, FlatList, TouchableOpacity, Image, 
    TextInput, SafeAreaView, Modal, Alert, ActivityIndicator 
} from 'react-native';
// ✅ Añadimos Users y Mail para el estado vacío y el modal
import { Search, User, ChevronRight, MessageCircle, UserMinus, X, AlertTriangle, Users, Mail, Plus } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { obtenerClientesEntrenador, desvincularAtleta, ficharCliente } from '../../api/endpoints';
import { useAuth } from '../../components/context/AuthContext';

export default function GestionAtletas() {
    const navigation = useNavigation();
    const { userId: entrenadorId } = useAuth();
    
    const [listaClientes, setListaClientes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busqueda, setBusqueda] = useState("");
    
    // Modales
    const [showUnlinkModal, setShowUnlinkModal] = useState(false);
    const [atletaToUnlink, setAtletaToUnlink] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newClientEmail, setNewClientEmail] = useState("");

    useEffect(() => {
        cargarClientes();
    }, []);

    const cargarClientes = async () => {
        try {
            setLoading(true);
            const data = await obtenerClientesEntrenador(entrenadorId);
            setListaClientes(data || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleFichar = async () => {
        if (!newClientEmail.trim()) return Alert.alert("Atención", "Introduce un correo.");
        try {
            await ficharCliente(entrenadorId, newClientEmail.trim());
            setShowAddModal(false);
            setNewClientEmail("");
            cargarClientes(); 
            Alert.alert("¡Éxito!", "Atleta vinculado correctamente.");
        } catch (error) {
            Alert.alert("Error", "No se pudo vincular al atleta.");
        }
    };

    const confirmDesvincular = async () => {
        try {
            await desvincularAtleta(entrenadorId, atletaToUnlink.id);
            setShowUnlinkModal(false);
            setAtletaToUnlink(null);
            cargarClientes();
        } catch (error) {
            Alert.alert("Error", "No se pudo desvincular.");
        }
    };

    const clientesFiltrados = listaClientes.filter(item => 
        item.cliente.nombre.toLowerCase().includes(busqueda.toLowerCase()) || 
        item.cliente.apellido.toLowerCase().includes(busqueda.toLowerCase())
    );

    const renderAtleta = ({ item }) => {
        const { cliente, semanaCompletada } = item;
        return (
            <View style={[styles.atletaCard, semanaCompletada && styles.cardSuccess]}>
                <TouchableOpacity 
                    style={styles.atletaInfo} 
                    onPress={() => navigation.navigate('GestionarAtleta', { id: cliente.id })}
                >
                    {cliente.fotoPerfil ? (
                        <Image source={{ uri: cliente.fotoPerfil }} style={styles.avatar} />
                    ) : (
                        <View style={styles.avatarPlaceholder}><User size={24} color="#555" /></View>
                    )}
                    <View style={{ flex: 1 }}>
                        <Text style={styles.atletaName}>{cliente.nombre} {cliente.apellido}</Text>
                        <Text style={styles.atletaGoal}>{cliente.objetivo || "Sin objetivo"}</Text>
                    </View>
                </TouchableOpacity>

                <View style={styles.actions}>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('PantallaChatIndividual', { destinatarioId: cliente.id, nombreDestinatario: cliente.nombre })}>
                        <MessageCircle size={20} color="white" />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionBtn, styles.btnDanger]} onPress={() => { setAtletaToUnlink(cliente); setShowUnlinkModal(true); }}>
                        <UserMinus size={20} color="#EF4444" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.manageBtn} onPress={() => navigation.navigate('GestionarAtleta', { id: cliente.id })}>
                        <Text style={styles.manageBtnText}>GESTIONAR</Text>
                        <ChevronRight size={16} color="black" />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View style={styles.topRow}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <ChevronRight size={24} color="white" style={{ transform: [{ rotate: '180deg' }] }} />
                    </TouchableOpacity>
                    <Text style={styles.title}>Mis Atletas</Text>
                    <TouchableOpacity style={styles.addBtnHeader} onPress={() => setShowAddModal(true)}>
                        <Plus size={24} color="#FACC15" />
                    </TouchableOpacity>
                </View>
                
                <View style={styles.searchContainer}>
                    <Search size={20} color="#555" style={{ marginRight: 10 }} />
                    <TextInput 
                        style={styles.searchInput}
                        placeholder="Buscar por nombre..."
                        placeholderTextColor="#555"
                        value={busqueda}
                        onChangeText={setBusqueda}
                    />
                </View>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#FACC15" style={{ marginTop: 50 }} />
            ) : clientesFiltrados.length === 0 ? (
                
                // ✅ ESTADO VACÍO (EMPTY STATE)
                <View style={styles.emptyContainer}>
                    <View style={styles.emptyIconBox}>
                        <Users size={50} color="#1a1a1a" />
                    </View>
                    <Text style={styles.emptyTitle}>Equipo vacío</Text>
                    <Text style={styles.emptySubtitle}>
                        Aún no tienes atletas vinculados. Empieza a construir tu equipo ahora mismo.
                    </Text>
                    <TouchableOpacity style={styles.emptyButton} onPress={() => setShowAddModal(true)}>
                        <Text style={styles.emptyButtonText}>VINCULAR PRIMER ATLETA</Text>
                    </TouchableOpacity>
                </View>

            ) : (
                <FlatList 
                    data={clientesFiltrados}
                    renderItem={renderAtleta}
                    keyExtractor={item => item.cliente.id.toString()}
                    contentContainerStyle={{ padding: 20 }}
                />
            )}

            {/* MODAL VINCULAR ATLETA */}
            <Modal visible={showAddModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <View style={styles.modalTop}>
                            <Text style={styles.modalTitleAdd}>Vincular Atleta</Text>
                            <TouchableOpacity onPress={() => setShowAddModal(false)}><X size={24} color="white" /></TouchableOpacity>
                        </View>
                        <View style={styles.inputWrapper}>
                            <Mail size={20} color="#555" style={{ marginRight: 12 }} />
                            <TextInput 
                                style={styles.modalInput} 
                                placeholder="Email del atleta" 
                                placeholderTextColor="#555"
                                value={newClientEmail}
                                onChangeText={setNewClientEmail}
                                autoCapitalize="none"
                            />
                        </View>
                        <TouchableOpacity style={styles.modalBtnAdd} onPress={handleFichar}>
                            <Text style={styles.modalBtnAddText}>AÑADIR AL EQUIPO</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* MODAL DESVINCULAR */}
            <Modal visible={showUnlinkModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <AlertTriangle size={48} color="#EF4444" style={{ alignSelf: 'center', marginBottom: 20 }} />
                        <Text style={styles.modalTitle}>¿DESVINCULAR?</Text>
                        <Text style={styles.modalSub}>Dejarás de gestionar a {atletaToUnlink?.nombre}.</Text>
                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.btnCancel} onPress={() => setShowUnlinkModal(false)}><Text style={styles.btnCancelText}>NO</Text></TouchableOpacity>
                            <TouchableOpacity style={styles.btnConfirm} onPress={confirmDesvincular}><Text style={styles.btnConfirmText}>SÍ, BORRAR</Text></TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#050505' },
    header: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#111' },
    topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
    backBtn: { padding: 5 },
    addBtnHeader: { padding: 5 },
    title: { color: 'white', fontSize: 22, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
    searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0c0c0e', paddingHorizontal: 15, borderRadius: 15, height: 50, borderWidth: 1, borderColor: '#1a1a1c' },
    searchInput: { flex: 1, color: 'white', fontSize: 16 },
    
    // ✅ ESTILOS ESTADO VACÍO
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
    emptyIconBox: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#0c0c0e', justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#1a1a1c' },
    emptyTitle: { color: 'white', fontSize: 20, fontWeight: '900', marginBottom: 10, textTransform: 'uppercase' },
    emptySubtitle: { color: '#555', textAlign: 'center', lineHeight: 20, marginBottom: 30, fontSize: 14 },
    emptyButton: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#FACC15', paddingVertical: 14, paddingHorizontal: 25, borderRadius: 15 },
    emptyButtonText: { color: '#FACC15', fontWeight: '900', fontSize: 13, letterSpacing: 1 },

    atletaCard: { backgroundColor: '#0c0c0e', borderRadius: 24, padding: 18, marginBottom: 15, borderWidth: 1, borderColor: '#1a1a1c' },
    cardSuccess: { borderColor: 'rgba(74, 222, 128, 0.3)' },
    atletaInfo: { flexDirection: 'row', alignItems: 'center', gap: 15, marginBottom: 18 },
    avatar: { width: 50, height: 50, borderRadius: 25 },
    avatarPlaceholder: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#1a1a1a', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#333' },
    atletaName: { color: 'white', fontSize: 16, fontWeight: '800', textTransform: 'uppercase' },
    atletaGoal: { color: '#666', fontSize: 12, fontWeight: '600' },
    actions: { flexDirection: 'row', gap: 10 },
    actionBtn: { width: 46, height: 46, borderRadius: 14, backgroundColor: '#141416', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#222' },
    btnDanger: { borderColor: 'rgba(239, 68, 68, 0.2)' },
    manageBtn: { flex: 1, backgroundColor: '#FACC15', borderRadius: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 5 },
    manageBtnText: { color: 'black', fontWeight: '900', fontSize: 12 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', padding: 25 },
    modalCard: { backgroundColor: '#111', padding: 30, borderRadius: 30, borderWidth: 1, borderColor: '#222' },
    modalTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
    modalTitleAdd: { color: 'white', fontSize: 22, fontWeight: '900' },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#050505', borderRadius: 16, paddingHorizontal: 15, height: 60, marginBottom: 25, borderWidth: 1, borderColor: '#222' },
    modalInput: { flex: 1, color: 'white', fontSize: 16 },
    modalBtnAdd: { backgroundColor: '#FACC15', padding: 18, borderRadius: 16, alignItems: 'center' },
    modalBtnAddText: { color: 'black', fontWeight: '900', letterSpacing: 1 },

    modalTitle: { color: 'white', fontSize: 20, fontWeight: '900', textAlign: 'center', marginBottom: 10 },
    modalSub: { color: '#71717a', textAlign: 'center', marginBottom: 30 },
    modalActions: { flexDirection: 'row', gap: 10 },
    btnCancel: { flex: 1, padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#333', alignItems: 'center' },
    btnCancelText: { color: '#71717a', fontWeight: '800' },
    btnConfirm: { flex: 1, padding: 15, borderRadius: 12, backgroundColor: '#EF4444', alignItems: 'center' },
    btnConfirmText: { color: 'white', fontWeight: '800' }
});