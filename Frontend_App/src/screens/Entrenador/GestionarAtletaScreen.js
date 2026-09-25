import React, { useState, useCallback } from 'react';
import { 
    View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, 
    ActivityIndicator, SafeAreaView, StatusBar, Alert, Platform, Modal
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { 
    ChevronLeft, TrendingUp, Calendar, Download, Plus, 
    Edit3, Trash2, Dumbbell, User, Copy, X, PlusCircle
} from 'lucide-react-native';

// Tus endpoints
import { 
    getCliente, 
    obtenerRutinasAsignadasPorEntrenador,
    eliminarRutina, 
    obtenerPlantillasEntrenador, 
    clonarPlantilla 
} from '../../api/endpoints'; 
import { useAuth } from '../../components/context/AuthContext';

export default function GestionarAtletaScreen() {
    const navigation = useNavigation();
    const route = useRoute();
    const { userId: entrenadorId } = useAuth(); 
    
    const { id: clienteId } = route.params || {};

    const [cliente, setCliente] = useState(null);
    const [rutinas, setRutinas] = useState([]);
    const [loading, setLoading] = useState(true);

    const [showModalPlantillas, setShowModalPlantillas] = useState(false);
    const [listaPlantillas, setListaPlantillas] = useState([]);
    const [loadingPlantillas, setLoadingPlantillas] = useState(false);

    useFocusEffect(
        useCallback(() => {
            if (clienteId) {
                cargarDatos();
            } else {
                Alert.alert("Error", "No se encontró el atleta.");
                navigation.goBack();
            }
        }, [clienteId])
    );

    const cargarDatos = async () => {
        setLoading(true);
        try {
            const dataCliente = await getCliente(clienteId);
            setCliente(dataCliente);

            const dataRutinas = await obtenerRutinasAsignadasPorEntrenador(clienteId, entrenadorId).catch(() => []);
            
            setRutinas(dataRutinas);
        } catch (error) {
            console.error("Error cargando perfil del cliente:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleEliminar = (idRutina, nombreRutina) => {
        Alert.alert(
            "Eliminar Rutina",
            `¿Seguro que quieres borrar '${nombreRutina}' del perfil de este atleta?`,
            [
                { text: "Cancelar", style: "cancel" },
                { 
                    text: "Eliminar", 
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await eliminarRutina(idRutina);
                            setRutinas(prev => prev.filter(r => r.id !== idRutina));
                        } catch(e) {
                            Alert.alert("Error", "No se pudo borrar.");
                        }
                    }
                }
            ]
        );
    };

    const abrirModalPlantillas = async () => {
        setShowModalPlantillas(true);
        setLoadingPlantillas(true);
        try {
            const data = await obtenerPlantillasEntrenador(entrenadorId);
            setListaPlantillas(data || []);
        } catch (error) {
            Alert.alert("Error", "No se pudieron cargar tus plantillas.");
        } finally {
            setLoadingPlantillas(false);
        }
    };

    const handleImportar = async (plantillaId) => {
        try {
            await clonarPlantilla(plantillaId, clienteId);
            setShowModalPlantillas(false);
            cargarDatos(); 
            Alert.alert("¡Éxito!", "Plantilla importada y asignada al atleta.");
        } catch (error) {
            Alert.alert("Error", "Hubo un problema al importar la plantilla.");
        }
    };

    if (loading || !cliente) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FACC15" />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />
            
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <ChevronLeft color="#a1a1aa" size={24} />
                    <Text style={styles.backText}>Volver al Panel</Text>
                </TouchableOpacity>

                <View style={styles.profileRow}>
                    {cliente.fotoPerfil ? (
                        <Image source={{ uri: cliente.fotoPerfil }} style={styles.avatar} />
                    ) : (
                        <View style={styles.avatarPlaceholder}><User color="#FACC15" size={24}/></View>
                    )}
                    <View style={styles.profileInfo}>
                        <Text style={styles.clientName}>{cliente.nombre} {cliente.apellido}</Text>
                        <Text style={styles.clientSub}>Gestionando su biblioteca de entrenamiento</Text>
                    </View>
                </View>
            </View>

            <View style={styles.actionsContainer}>
                <TouchableOpacity 
                    style={styles.primaryBtn} 
                    onPress={() => navigation.navigate('CrearRutina', { atletaId: clienteId })}
                >
                    <Plus color="#000" size={20} />
                    <Text style={styles.primaryBtnText}>CREAR DE CERO</Text>
                </TouchableOpacity>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.secondaryActionsScroll}>
                    <TouchableOpacity 
                        style={styles.secondaryBtn}
                        onPress={() => navigation.navigate('ProgresoCliente', { clienteIdProp: clienteId, isCoachMode: true })}
                    >
                        <TrendingUp color="white" size={16} />
                        <Text style={styles.secondaryBtnText}>PROGRESO</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                        style={styles.secondaryBtn}
                        onPress={() => navigation.navigate('CalendarioCliente', { clienteIdProp: clienteId, isCoachMode: true })}
                    >
                        <Calendar color="white" size={16} />
                        <Text style={styles.secondaryBtnText}>CALENDARIO</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.secondaryBtn} onPress={abrirModalPlantillas}>
                        <Download color="white" size={16} />
                        <Text style={styles.secondaryBtnText}>IMPORTAR PLANTILLA</Text>
                    </TouchableOpacity>
                </ScrollView>
            </View>

            <ScrollView contentContainerStyle={styles.rutinasList} showsVerticalScrollIndicator={false}>
                {rutinas.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Dumbbell color="#3f3f46" size={40} style={{marginBottom: 10}}/>
                        <Text style={{color: '#a1a1aa', fontWeight: 'bold'}}>No hay rutinas asignadas</Text>
                        <Text style={{color: '#52525b', fontSize: 13, textAlign: 'center', marginTop: 5}}>Las rutinas personales del atleta no se muestran aquí.</Text>
                    </View>
                ) : (
                    rutinas.map((rutina, index) => (
                        <View key={rutina.id || index} style={styles.rutinaCard}>
                            <View style={styles.cardHeader}>
                                <View style={[styles.badge, rutina.esMaestra && styles.badgeMaestra]}>
                                    <Text style={[styles.badgeText, rutina.esMaestra && styles.badgeTextMaestra]}>
                                        {rutina.esMaestra ? 'PLANTILLA MAESTRA' : 'PERSONALIZADO'}
                                    </Text>
                                </View>
                                <Dumbbell color="#52525b" size={18} />
                            </View>

                            <Text style={styles.rutinaTitle}>{rutina.nombre}</Text>
                            <Text style={styles.rutinaMeta}>
                                {rutina.objetivo || 'Personalizado'} • {rutina.detalles?.length || 0} ejercicios
                            </Text>

                            <View style={styles.divider} />

                            <View style={styles.cardActions}>
                                <TouchableOpacity 
                                    style={styles.editBtn} 
                                    onPress={() => navigation.navigate('EditarRutina', { 
                                        rutinaId: rutina.id, 
                                        clienteId: clienteId 
                                    })}
                                >
                                    <Edit3 color="white" size={16} />
                                    <Text style={styles.editBtnText}>Editar</Text>
                                </TouchableOpacity>

                                <TouchableOpacity 
                                    style={styles.deleteBtn} 
                                    onPress={() => handleEliminar(rutina.id, rutina.nombre)}
                                >
                                    <Trash2 color="#EF4444" size={16} />
                                    <Text style={styles.deleteBtnText}>Eliminar</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))
                )}
            </ScrollView>

            <Modal visible={showModalPlantillas} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>IMPORTAR PLANTILLA</Text>
                            <TouchableOpacity onPress={() => setShowModalPlantillas(false)} style={styles.closeBtn}>
                                <X size={20} color="white" />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.modalSubtitle}>Selecciona una rutina maestra para copiarla a {cliente?.nombre}.</Text>
                        {loadingPlantillas ? (
                            <ActivityIndicator size="large" color="#FACC15" style={{ marginVertical: 30 }} />
                        ) : (
                            <ScrollView style={{maxHeight: 400}} showsVerticalScrollIndicator={false}>
                                {listaPlantillas.length > 0 ? (
                                    listaPlantillas.map(p => (
                                        <TouchableOpacity key={p.id} style={styles.plantillaOptionCard} onPress={() => handleImportar(p.id)}>
                                            <View style={styles.plantillaIconBox}><Copy size={20} color="#FACC15"/></View>
                                            <View style={{flex: 1}}>
                                                <Text style={styles.plantillaTitle}>{p.nombre}</Text>
                                                <Text style={styles.plantillaSub}>{p.objetivo || 'Multinivel'} • {p.detalles?.length || 0} ejercicios</Text>
                                            </View>
                                            <PlusCircle size={24} color="#FACC15"/>
                                        </TouchableOpacity>
                                    ))
                                ) : (
                                    <View style={styles.emptyPlantillasState}>
                                        <Copy size={32} color="rgba(255,255,255,0.2)" style={{marginBottom:10}}/>
                                        <Text style={styles.emptyTitle}>No tienes plantillas</Text>
                                    </View>
                                )}
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#050505' },
    loadingContainer: { flex: 1, backgroundColor: '#050505', justifyContent: 'center', alignItems: 'center' },
    header: { padding: 20, paddingTop: Platform.OS === 'android' ? 20 : 10 },
    backBtn: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    backText: { color: '#a1a1aa', fontSize: 14, fontWeight: '600', marginLeft: 5 },
    profileRow: { flexDirection: 'row', alignItems: 'center' },
    avatar: { width: 55, height: 55, borderRadius: 27.5, borderWidth: 1, borderColor: '#333' },
    avatarPlaceholder: { width: 55, height: 55, borderRadius: 27.5, backgroundColor: '#18181b', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#333' },
    profileInfo: { marginLeft: 15, flex: 1 },
    clientName: { color: 'white', fontSize: 24, fontWeight: '900', textTransform: 'uppercase', letterSpacing: -0.5 },
    clientSub: { color: '#71717a', fontSize: 13, marginTop: 4 },
    actionsContainer: { paddingHorizontal: 20, marginBottom: 20 },
    primaryBtn: { backgroundColor: '#FACC15', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 12, marginBottom: 15, gap: 10 },
    primaryBtnText: { color: '#000', fontSize: 15, fontWeight: '900' },
    secondaryActionsScroll: { gap: 10, paddingRight: 20 },
    secondaryBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'transparent', borderWidth: 1, borderColor: '#27272a', paddingVertical: 10, paddingHorizontal: 15, borderRadius: 10, gap: 8, marginRight: 10 },
    secondaryBtnText: { color: 'white', fontSize: 12, fontWeight: '800' },
    rutinasList: { padding: 20, paddingBottom: 50, gap: 15 },
    emptyState: { padding: 40, alignItems: 'center', backgroundColor: '#111113', borderRadius: 20, borderWidth: 1, borderColor: '#1f1f22', borderStyle: 'dashed' },
    rutinaCard: { backgroundColor: '#111113', borderWidth: 1, borderColor: '#1f1f22', borderRadius: 20, padding: 20 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    badge: { backgroundColor: 'rgba(250, 204, 21, 0.1)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
    badgeText: { color: '#FACC15', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
    badgeMaestra: { backgroundColor: 'rgba(74, 222, 128, 0.1)' },
    badgeTextMaestra: { color: '#4ade80' },
    rutinaTitle: { color: 'white', fontSize: 22, fontWeight: '900', textTransform: 'uppercase', marginBottom: 5 },
    rutinaMeta: { color: '#71717a', fontSize: 13, fontWeight: '500' },
    divider: { height: 1, backgroundColor: '#1f1f22', marginVertical: 20, borderStyle: 'dashed', borderWidth: 1, borderColor: '#1f1f22', borderRadius: 1 },
    cardActions: { flexDirection: 'row', gap: 10 },
    editBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#18181b', borderWidth: 1, borderColor: '#27272a', paddingVertical: 12, borderRadius: 10, gap: 8 },
    editBtnText: { color: 'white', fontSize: 13, fontWeight: '700' },
    deleteBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(239, 68, 68, 0.05)', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.2)', paddingVertical: 12, borderRadius: 10, gap: 8 },
    deleteBtnText: { color: '#EF4444', fontSize: 13, fontWeight: '700' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#121214', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 25, paddingBottom: Platform.OS === 'ios' ? 40 : 25, borderWidth: 1, borderColor: '#27272a' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    modalTitle: { color: 'white', fontSize: 20, fontWeight: '900', letterSpacing: 0.5 },
    closeBtn: { backgroundColor: 'rgba(255,255,255,0.05)', padding: 8, borderRadius: 20 },
    modalSubtitle: { color: '#a1a1aa', fontSize: 14, marginBottom: 25, lineHeight: 20 },
    plantillaOptionCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#18181b', borderWidth: 1, borderColor: '#27272a', padding: 18, borderRadius: 20, marginBottom: 12 },
    plantillaIconBox: { backgroundColor: 'rgba(250, 204, 21, 0.1)', padding: 12, borderRadius: 14, marginRight: 15 },
    plantillaTitle: { color: 'white', fontSize: 16, fontWeight: '800', marginBottom: 4 },
    plantillaSub: { color: '#71717a', fontSize: 13, fontWeight: '500' },
    emptyPlantillasState: { alignItems: 'center', padding: 30, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 20, borderWidth: 1, borderColor: '#27272a', borderStyle: 'dashed' },
    emptyTitle: { color: 'white', fontWeight: '800', fontSize: 16, marginBottom: 5 },
    emptySub: { color: '#71717a', fontSize: 13, textAlign: 'center', lineHeight: 20 },
});
