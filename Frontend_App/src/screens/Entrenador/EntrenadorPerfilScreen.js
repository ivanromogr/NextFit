import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, Image, TouchableOpacity,
    ActivityIndicator, SafeAreaView, StatusBar, Modal, TextInput, Alert,
    KeyboardAvoidingView, Platform, Keyboard, Dimensions
} from 'react-native';
import {
    ChevronLeft, Star, Zap, ShieldCheck, Target, Users,
    CheckCircle2, MessageSquareText, X, Send, GraduationCap, Award,
    Edit, LogOut, Settings
} from 'lucide-react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../components/context/AuthContext';
import { getEntrenador, getReviewsEntrenador, postReview, ficharEntrenador } from '../../api/endpoints';

const { width } = Dimensions.get('window');

export default function EntrenadorPerfilScreen() {
    const navigation = useNavigation();
    const route = useRoute();
    const { user, logout } = useAuth();

    const targetId = route.params?.id || user?.id;

    const isOwner = user?.role === 'ENTRENADOR' && targetId === user?.id;

    const [entrenador, setEntrenador] = useState(null);
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);

    const [modalVisible, setModalVisible] = useState(false);
    const [rating, setRating] = useState(5);
    const [comentario, setComentario] = useState("");
    const [enviando, setEnviando] = useState(false);

    useFocusEffect(
        useCallback(() => {
            if (targetId) cargarTodo();
            else setLoading(false);
        }, [targetId])
    );

    const cargarTodo = async () => {
        try {
            setLoading(true);
            const [dataEntrenador, resReviews] = await Promise.all([
                getEntrenador(targetId),
                getReviewsEntrenador(targetId)
            ]);
            setEntrenador(dataEntrenador);
            setReviews(resReviews?.data || []);
        } catch (error) {
            console.error("Error cargando datos:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleFichar = async () => {
        Alert.alert(
            "¡A por ello!",
            "¿Confirmas que quieres iniciar tu transformación con este coach?",
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "¡SÍ!", onPress: async () => {
                        try {
                            await ficharEntrenador(entrenador.id);
                            navigation.navigate('PantallaChatIndividual', {
                                destinatarioId: entrenador.id,
                                nombreDestinatario: `${entrenador.nombre} ${entrenador.apellido}`
                            });
                        } catch (error) {
                            Alert.alert("Error", "No se pudo realizar la suscripción.");
                        }
                    }
                }
            ]
        );
    };

    const enviarResena = async () => {
        if (!comentario.trim()) return;
        setEnviando(true);
        try {
            await postReview({
                entrenadorId: targetId,
                clienteId: user.id,
                rating,
                comentario
            });
            setModalVisible(false);
            setComentario("");
            cargarTodo();
        } catch (error) {
            Alert.alert("Error", "No pudimos guardar tu opinión. Inténtalo más tarde.");
        } finally {
            setEnviando(false);
        }
    };

    const handleCerrarSesion = () => {
        Alert.alert(
            "Cerrar Sesión",
            "¿Estás seguro de que quieres salir de tu cuenta?",
            [
                { text: "Cancelar", style: "cancel" },
                { 
                    text: "Sí, salir", 
                    style: "destructive",
                    onPress: async () => {
                        await logout();
                    }
                }
            ]
        );
    };

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#FACC15" /></View>;

    if (!entrenador) return (
        <View style={styles.center}>
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>No se encontró el perfil.</Text>
            <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 20, padding: 10, backgroundColor: '#3f3f46', borderRadius: 8 }}>
                <Text style={{ color: '#fff' }}>Volver</Text>
            </TouchableOpacity>
        </View>
    );

    const ratingAvg = reviews.length > 0 ? (reviews.reduce((a, b) => a + (b.estrellas || 0), 0) / reviews.length).toFixed(1) : "5.0";

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            {/* Ajustamos el padding del ScrollView dependiendo de si hay footer fijo (cliente) o no (dueño) */}
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: isOwner ? 40 : 120 }}>
                
                {/* --- HERO HEADER --- */}
                <View style={styles.heroContainer}>
                    {entrenador?.fotoPerfil ? (
                        <Image source={{ uri: entrenador.fotoPerfil }} style={styles.heroImage} />
                    ) : (
                        <View style={styles.heroPlaceholder}><Users color="#333" size={80} /></View>
                    )}
                    <View style={styles.heroGradient} />

                    {/* Botón de Atrás (Izquierda) */}
                    <SafeAreaView style={styles.floatingHeader}>
                        {navigation.canGoBack() && (
                            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtnWrapper}>
                                <ChevronLeft color="#fff" size={24} />
                            </TouchableOpacity>
                        )}
                    </SafeAreaView>

                    {/* Botón de Ajustes (Derecha) - SOLO PARA EL DUEÑO */}
                    {isOwner && (
                        <SafeAreaView style={styles.floatingHeaderRight}>
                            <TouchableOpacity onPress={() => navigation.navigate('EditarPerfilEntrenador')} style={styles.iconBtnWrapper}>
                                <Settings color="#fff" size={24} />
                            </TouchableOpacity>
                        </SafeAreaView>
                    )}
                </View>

                {/* --- INFORMACIÓN PRINCIPAL --- */}
                <View style={styles.mainContent}>
                    <View style={styles.nameHeaderRow}>
                        <Text style={styles.name} numberOfLines={2}>
                            {(entrenador?.nombre + " " + entrenador?.apellido).toUpperCase()}
                        </Text>
                        <ShieldCheck size={24} color="#10b981" fill="rgba(16, 185, 129, 0.2)" style={{ marginTop: 4 }} />
                    </View>

                    {entrenador?.tituloAcademico && (
                        <Text style={styles.mainAcademicTitle}>{entrenador.tituloAcademico}</Text>
                    )}

                    <View style={styles.badgesRow}>
                        <View style={styles.badgePrimary}>
                            <Text style={styles.badgePrimaryText}>{entrenador?.modalidadTrabajo || 'ONLINE'}</Text>
                        </View>
                        <View style={styles.badgeVerified}>
                            <CheckCircle2 size={12} color="#10b981" />
                            <Text style={styles.badgeVerifiedText}>VERIFICADO</Text>
                        </View>
                    </View>

                    <View style={styles.statsCard}>
                        <View style={styles.statBox}>
                            <Text style={styles.statValue}>{ratingAvg}</Text>
                            <View style={styles.statLabelRow}><Star size={12} color="#FACC15" fill="#FACC15" /><Text style={styles.statLabel}>RATING</Text></View>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statBox}>
                            <Text style={styles.statValue}>+{entrenador?.aniosExperiencia || 5}</Text>
                            <Text style={styles.statLabel}>AÑOS EXP.</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statBox}>
                            <Text style={styles.statValue}>{entrenador?.numeroClientes > 0 ? entrenador.numeroClientes : '10+'}</Text>
                            <Text style={styles.statLabel}>ATLETAS</Text>
                        </View>
                    </View>

                    {/* --- BOTONES DE ACCIÓN (SOLO DUEÑO) --- */}
                    {isOwner && (
                        <View style={styles.actionButtonsContainer}>
                            <TouchableOpacity style={styles.editButton} onPress={() => navigation.navigate('EditarPerfilEntrenador')}>
                                <Edit size={20} color="#000" />
                                <Text style={styles.editButtonText}>EDITAR PERFIL</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.editButton} onPress={() => navigation.navigate('MetodosAcceso')}>
                                <Text style={styles.editButtonText}>Métodos de acceso</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.logoutButton} onPress={handleCerrarSesion}>
                                <LogOut size={20} color="#EF4444" />
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* --- FORMACIÓN Y ESPECIALIDAD --- */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>FORMACIÓN Y ENFOQUE</Text>
                        <View style={styles.credentialsList}>
                            {(entrenador?.titulacion || entrenador?.formacion) && (
                                <View style={styles.credentialItem}>
                                    <View style={styles.iconWrap}><GraduationCap size={20} color="#FACC15" /></View>
                                    <View style={styles.credentialTextWrap}>
                                        <Text style={styles.credentialTitle}>Certificación Oficial</Text>
                                        <Text style={styles.credentialValue}>{entrenador.titulacion || entrenador.formacion}</Text>
                                    </View>
                                </View>
                            )}

                            {entrenador?.especialidad && (
                                <View style={styles.credentialItem}>
                                    <View style={styles.iconWrap}><Target size={20} color="#FACC15" /></View>
                                    <View style={styles.credentialTextWrap}>
                                        <Text style={styles.credentialTitle}>Especialidad Principal</Text>
                                        <Text style={styles.credentialValue}>{entrenador.especialidad}</Text>
                                    </View>
                                </View>
                            )}
                            
                            {!entrenador?.titulacion && !entrenador?.formacion && !entrenador?.especialidad && (
                                <View style={styles.credentialItem}>
                                    <View style={styles.iconWrap}><Award size={20} color="#FACC15" /></View>
                                    <View style={styles.credentialTextWrap}>
                                        <Text style={styles.credentialTitle}>{isOwner ? "Coach Registrado" : "Coach Verificado"}</Text>
                                        <Text style={styles.credentialValue}>{isOwner ? "Añade tu formación al editar" : "Profesional apto"}</Text>
                                    </View>
                                </View>
                            )}
                        </View>
                    </View>

                    {/* --- METODOLOGÍA --- */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>METODOLOGÍA DE TRABAJO</Text>
                        <Text style={styles.bioText}>
                            {entrenador?.descripcionPerfil || "Enfoque 100% personalizado basado en la evidencia científica actual."}
                        </Text>
                    </View>

                    {/* --- TESTIMONIOS --- */}
                    <View style={styles.section}>
                        <View style={styles.reviewHeader}>
                            <Text style={styles.sectionTitle}>{isOwner ? "MIS TESTIMONIOS" : "TESTIMONIOS"}</Text>
                            
                            {/* Mostrar botón de escribir reseña SOLO a clientes */}
                            {!isOwner && (
                                <TouchableOpacity onPress={() => setModalVisible(true)}>
                                    <Text style={styles.writeReviewText}>+ Escribir</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        {reviews.length === 0 ? (
                            <View style={styles.emptyReviewBox}>
                                <MessageSquareText color="#3f3f46" size={30} />
                                <Text style={styles.emptyReviewText}>{isOwner ? "Aún no tienes valoraciones." : "Sé el primero en valorar a este coach."}</Text>
                            </View>
                        ) : (
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.reviewsScroll}>
                                {reviews.map((t, i) => (
                                    <View key={i} style={styles.reviewCard}>
                                        <View style={styles.reviewStars}>
                                            {[...Array(5)].map((_, s) => (
                                                <Star key={s} size={14} color={s < t.estrellas ? "#FACC15" : "#3f3f46"} fill={s < t.estrellas ? "#FACC15" : "transparent"} />
                                            ))}
                                        </View>
                                        <Text style={styles.reviewComment} numberOfLines={4}>{t.comentario}</Text>
                                    </View>
                                ))}
                            </ScrollView>
                        )}
                    </View>

                </View>
            </ScrollView>

            {/* --- STICKY FOOTER PARA COMPRAR (SOLO CLIENTES) --- */}
            {!isOwner && (
                <View style={styles.stickyFooter}>
                    <View>
                        <Text style={styles.priceLabel}>Transformación Elite</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                            <Text style={styles.priceValue}>{entrenador?.tarifaMensual || '20'}€</Text>
                            <Text style={styles.pricePeriod}>/mes</Text>
                        </View>
                    </View>
                    <TouchableOpacity style={styles.ctaButton} onPress={handleFichar}>
                        <Zap size={20} color="#000" fill="#000" />
                        <Text style={styles.ctaButtonText}>EMPEZAR YA</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* --- MODAL PARA ESCRIBIR RESEÑA --- */}
            <Modal visible={modalVisible} animationType="slide" transparent>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                    <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={Keyboard.dismiss}>
                        <TouchableOpacity activeOpacity={1} style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Tu opinión importa</Text>
                                <TouchableOpacity onPress={() => { setModalVisible(false); Keyboard.dismiss(); }}>
                                    <X color="#fff" size={24} />
                                </TouchableOpacity>
                            </View>
                            <View style={styles.starsSelector}>
                                {[1, 2, 3, 4, 5].map(num => (
                                    <TouchableOpacity key={num} onPress={() => setRating(num)}>
                                        <Star size={40} color={num <= rating ? "#FACC15" : "#3f3f46"} fill={num <= rating ? "#FACC15" : "transparent"} />
                                    </TouchableOpacity>
                                ))}
                            </View>
                            <TextInput
                                style={styles.textInput}
                                placeholder="¿Cómo ha sido tu experiencia con este coach?"
                                placeholderTextColor="#71717a"
                                multiline value={comentario} onChangeText={setComentario} returnKeyType="done" blurOnSubmit={true} onSubmitEditing={Keyboard.dismiss}
                            />
                            <TouchableOpacity style={[styles.btnEnviar, enviando && { opacity: 0.5 }]} onPress={enviarResena} disabled={enviando}>
                                {enviando ? <ActivityIndicator color="#000" /> : <><Send size={18} color="#000" /><Text style={styles.btnEnviarText}>Publicar Reseña</Text></>}
                            </TouchableOpacity>
                        </TouchableOpacity>
                    </TouchableOpacity>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#050505' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#050505' },

    heroContainer: { width: '100%', height: 420, position: 'relative' },
    heroImage: { width: '100%', height: '100%', resizeMode: 'cover' },
    heroPlaceholder: { width: '100%', height: '100%', backgroundColor: '#121214', justifyContent: 'center', alignItems: 'center' },
    heroGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 200, backgroundColor: 'transparent', 
        shadowColor: '#050505', shadowOffset: { width: 0, height: 100 }, shadowOpacity: 1, shadowRadius: 50, elevation: 10 },
    
    // Header flotante (botones arriba)
    floatingHeader: { position: 'absolute', top: Platform.OS === 'ios' ? 20 : 40, left: 20 },
    floatingHeaderRight: { position: 'absolute', top: Platform.OS === 'ios' ? 20 : 40, right: 20 },
    iconBtnWrapper: { backgroundColor: 'rgba(0,0,0,0.5)', padding: 10, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)' },

    mainContent: { flex: 1, paddingHorizontal: 24, marginTop: -60 },
    nameHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
    name: { color: 'white', fontSize: 32, fontWeight: '900', letterSpacing: -1, lineHeight: 36, flex: 1, textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 10 },
    mainAcademicTitle: { color: '#FACC15', fontSize: 15, fontWeight: '800', marginTop: 4, letterSpacing: 0.5, textTransform: 'uppercase', textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 5 },

    badgesRow: { flexDirection: 'row', gap: 10, marginTop: 15, marginBottom: 25 },
    badgePrimary: { backgroundColor: '#FACC15', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
    badgePrimaryText: { color: '#000', fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
    badgeVerified: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(16, 185, 129, 0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#10b981' },
    badgeVerifiedText: { color: '#10b981', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },

    statsCard: { flexDirection: 'row', backgroundColor: '#121214', borderRadius: 20, paddingVertical: 20, borderWidth: 1, borderColor: '#1f1f22', marginBottom: 25 },
    statBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    statValue: { color: '#fff', fontSize: 22, fontWeight: '900' },
    statLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
    statLabel: { color: '#a1a1aa', fontSize: 10, fontWeight: '800', letterSpacing: 0.5, marginTop: 2 },
    statDivider: { width: 1, backgroundColor: '#1f1f22', height: '60%', alignSelf: 'center' },

    actionButtonsContainer: { flexDirection: 'row', gap: 12, marginBottom: 35 },
    editButton: { flex: 1, backgroundColor: '#FACC15', paddingVertical: 14, borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
    editButtonText: { color: '#000', fontWeight: '900', fontSize: 13, letterSpacing: 0.5 },
    logoutButton: { backgroundColor: 'rgba(239, 68, 68, 0.1)', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)' },

    section: { marginBottom: 35 },
    sectionTitle: { color: 'white', fontSize: 14, fontWeight: '900', letterSpacing: 1, marginBottom: 15 },
    bioText: { color: '#a1a1aa', fontSize: 15, lineHeight: 24 },

    credentialsList: { gap: 12 },
    credentialItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0a0a0a', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#1f1f22' },
    iconWrap: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(250, 204, 21, 0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    credentialTextWrap: { flex: 1 },
    credentialTitle: { color: '#71717a', fontSize: 11, fontWeight: '800', textTransform: 'uppercase', marginBottom: 2 },
    credentialValue: { color: 'white', fontSize: 15, fontWeight: '700' },

    reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    writeReviewText: { color: '#FACC15', fontSize: 13, fontWeight: '800' },
    reviewsScroll: { paddingRight: 20, gap: 15 },
    reviewCard: { width: width * 0.7, backgroundColor: '#121214', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#1f1f22' },
    reviewStars: { flexDirection: 'row', gap: 2, marginBottom: 10 },
    reviewComment: { color: '#e4e4e7', fontSize: 14, lineHeight: 22 },
    emptyReviewBox: { alignItems: 'center', justifyContent: 'center', padding: 30, backgroundColor: '#0a0a0a', borderRadius: 20, borderWidth: 1, borderColor: '#1f1f22', borderStyle: 'dashed' },
    emptyReviewText: { color: '#71717a', marginTop: 10, fontSize: 14, fontWeight: '600' },

    stickyFooter: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#0a0a0a', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 15, paddingBottom: Platform.OS === 'ios' ? 35 : 20, borderTopWidth: 1, borderTopColor: '#1f1f22' },
    priceLabel: { color: '#71717a', fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
    priceValue: { color: 'white', fontSize: 28, fontWeight: '900', letterSpacing: -1 },
    pricePeriod: { color: '#a1a1aa', fontSize: 14, fontWeight: '700', marginLeft: 2 },
    ctaButton: { backgroundColor: '#FACC15', flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 24, borderRadius: 16, gap: 8 },
    ctaButtonText: { color: '#000', fontSize: 14, fontWeight: '900', letterSpacing: 0.5 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#121214', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 25, minHeight: 450, paddingBottom: Platform.OS === 'ios' ? 40 : 25, borderWidth: 1, borderColor: '#1f1f22' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
    modalTitle: { color: '#fff', fontSize: 22, fontWeight: '900' },
    starsSelector: { flexDirection: 'row', justifyContent: 'center', gap: 15, marginBottom: 35 },
    textInput: { backgroundColor: '#0a0a0a', borderRadius: 20, padding: 20, color: '#fff', fontSize: 16, height: 140, textAlignVertical: 'top', borderWidth: 1, borderColor: '#27272a' },
    btnEnviar: { backgroundColor: '#FACC15', marginTop: 25, paddingVertical: 18, borderRadius: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
    btnEnviarText: { color: '#000', fontWeight: '900', fontSize: 16 }
});
