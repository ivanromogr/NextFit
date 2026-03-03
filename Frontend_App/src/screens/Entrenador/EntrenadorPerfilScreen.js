import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, Image, TouchableOpacity,
    ActivityIndicator, SafeAreaView, StatusBar, Modal, TextInput, Alert,
    KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard
} from 'react-native';
import {
    ChevronLeft, Star, Zap, ShieldCheck, Target, Users,
    CheckCircle2, MessageSquareText, X, Send
} from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../../components/context/AuthContext';
import { getEntrenador, getReviewsEntrenador, postReview, ficharEntrenador } from '../../api/endpoints';

export default function EntrenadorPerfilScreen() {
    const navigation = useNavigation();
    const route = useRoute();
    const { user } = useAuth();
    const { id } = route.params;

    const [entrenador, setEntrenador] = useState(null);
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);

    const [modalVisible, setModalVisible] = useState(false);
    const [rating, setRating] = useState(5);
    const [comentario, setComentario] = useState("");
    const [enviando, setEnviando] = useState(false);

    useEffect(() => {
        if (id) {
            cargarTodo();
        } else {
            setLoading(false);
        }
    }, [id]);

    const cargarTodo = async () => {
        try {
            setLoading(true);
            const [dataEntrenador, resReviews] = await Promise.all([
                getEntrenador(id),
                getReviewsEntrenador(id)
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
        try {
            Alert.alert(
                "¡A por ello!",
                "¿Confirmas que quieres iniciar tu transformación con este coach?",
                [
                    { text: "Cancelar", style: "cancel" },
                    {
                        text: "¡SÍ!", onPress: async () => {
                            await ficharEntrenador(entrenador.id);
                            navigation.navigate('PantallaChatIndividual', {
                                destinatarioId: entrenador.id,
                                nombreDestinatario: `${entrenador.nombre} ${entrenador.apellido}`
                            });
                        }
                    }
                ]
            );
        } catch (error) {
            Alert.alert("Error", "No se pudo realizar la suscripción en este momento.");
        }
    };

    const enviarResena = async () => {
        if (!comentario.trim()) return;
        setEnviando(true);
        try {
            await postReview({
                entrenadorId: id,
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

    if (loading) return (
        <View style={styles.center}><ActivityIndicator size="large" color="#FACC15" /></View>
    );

    if (!entrenador) return (
        <View style={styles.center}>
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>No se encontró el perfil.</Text>
            <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 20, padding: 10, backgroundColor: '#3f3f46', borderRadius: 8 }}>
                <Text style={{ color: '#fff' }}>Volver</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />

            <View style={styles.navBar}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <ChevronLeft color="#FACC15" size={24} />
                    <Text style={styles.backText}>Volver a la selección</Text>
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

                {/* --- SECCIÓN: IDENTIDAD --- */}
                <View style={styles.profileSection}>
                    <View style={styles.profileRow}>
                        <View style={styles.avatarWrapper}>
                            {entrenador?.fotoPerfil ? (
                                <Image source={{ uri: entrenador.fotoPerfil }} style={styles.avatar} />
                            ) : (
                                <View style={styles.avatarPlaceholder}><Users color="#71717a" size={35} /></View>
                            )}
                        </View>
                        <View style={styles.mainInfo}>
                            <View style={styles.nameRow}>
                                <Text style={styles.name} numberOfLines={2}>
                                    {(entrenador?.nombre + " " + entrenador?.apellido).toUpperCase()}
                                </Text>
                                <ShieldCheck size={20} color="#3b82f6" fill="#3b82f6" fillOpacity={0.2} style={{ marginLeft: 6, marginTop: 2 }} />
                            </View>
                            <View style={styles.badgeRow}>
                                <View style={styles.badgeYellow}>
                                    <Text style={styles.badgeTextBlack}>{entrenador?.modalidadTrabajo || 'ONLINE'}</Text>
                                </View>
                                <View style={styles.badgeDark}>
                                    <Text style={styles.badgeTextGray}>MIXTO</Text>
                                </View>
                                <View style={styles.badgeGreen}>
                                    <CheckCircle2 size={10} color="#10b981" />
                                    <Text style={styles.badgeTextGreen}>IDENTIDAD VERIFICADA</Text>
                                </View>
                            </View>
                        </View>
                    </View>

                    <View style={styles.statsRow}>
                        <Stat label="EXPERIENCIA" value={`${entrenador?.aniosExperiencia || 5}+ AÑOS`} />
                        {entrenador?.numeroClientes > 3 && (
                            <Stat label="ATLETAS" value={`${entrenador.numeroClientes} ACTIVOS`} />
                        )}
                        <Stat
                            label="RATING"
                            value={reviews.length > 0
                                ? (reviews.reduce((a, b) => a + (b.estrellas || 0), 0) / reviews.length).toFixed(1)
                                : "0.0"
                            }
                            isStar
                        />
                    </View>
                </View>

                <View style={styles.sectionSeparator} />

                {/* --- SECCIÓN: METODOLOGÍA --- */}
                <View style={styles.sectionContainer}>
                    <View style={styles.sectionTitleRow}>
                        <Target size={20} color="#FACC15" />
                        <Text style={styles.sectionTitle}>MI METODOLOGÍA</Text>
                    </View>
                    <Text style={styles.sectionText}>
                        {entrenador?.descripcionPerfil || "Enfoque basado en ciencia, biomecánica y resultados medibles a largo plazo."}
                    </Text>
                </View>

                <View style={styles.sectionSeparator} />

                {/* --- SECCIÓN: TESTIMONIOS --- */}
                <View style={styles.sectionContainer}>
                    <View style={styles.sectionTitleRow}>
                        <View style={styles.row}>
                            <MessageSquareText size={20} color="#FACC15" />
                            <Text style={styles.sectionTitle}>TESTIMONIOS RECIENTES</Text>
                        </View>
                        <TouchableOpacity style={styles.btnEscribir} onPress={() => setModalVisible(true)}>
                            <Text style={styles.btnEscribirText}>Escribir Reseña</Text>
                        </TouchableOpacity>
                    </View>

                    {reviews.length === 0 ? (
                        <Text style={styles.emptyText}>No hay testimonios todavía.</Text>
                    ) : (
                        reviews.map((t, i) => (
                            <View key={i} style={styles.testimonioItem}>
                                <View style={styles.starsRow}>
                                    {/* ✅ CORRECCIÓN 2: Mostrar estrellas individuales usando 'estrellas' */}
                                    {[...Array(5)].map((_, s) => (
                                        <Star
                                            key={s} size={14}
                                            color={s < t.estrellas ? "#FACC15" : "#3f3f46"}
                                            fill={s < t.estrellas ? "#FACC15" : "transparent"}
                                        />
                                    ))}
                                </View>
                                <Text style={styles.testimonioComment}>{t.comentario}</Text>
                            </View>
                        ))
                    )}
                </View>

                {/* --- TARJETA DE PRECIO --- */}
                <View style={styles.priceCard}>
                    <Text style={styles.priceTagline}>TRANSFORMACIÓN ELITE</Text>
                    <View style={styles.priceRow}>
                        <Text style={styles.priceValue}>{entrenador?.tarifaMensual || '20'}€</Text>
                        <Text style={styles.pricePeriod}> / MES</Text>
                    </View>

                    <View style={styles.benefitsList}>
                        <Benefit item="Plan de entrenamiento algorítmico" />
                        <Benefit item="Chat directo 24/7 con el coach" />
                        <Benefit item="Auditoría semanal de resultados" />
                    </View>

                    <TouchableOpacity style={styles.ctaButton} onPress={handleFichar}>
                        <Zap size={20} color="#fff" fill="#fff" />
                        <Text style={styles.ctaButtonText}>INICIAR TRANSFORMACIÓN</Text>
                    </TouchableOpacity>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>

            {/* --- MODAL PARA ESCRIBIR RESEÑA --- */}
            <Modal visible={modalVisible} animationType="slide" transparent>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={{ flex: 1 }}
                >
                    <TouchableOpacity
                        style={styles.modalOverlay}
                        activeOpacity={1}
                        onPress={Keyboard.dismiss}
                    >
                        <TouchableOpacity activeOpacity={1} style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Tu opinión importa</Text>
                                <TouchableOpacity onPress={() => {
                                    setModalVisible(false);
                                    Keyboard.dismiss();
                                }}>
                                    <X color="#fff" size={24} />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.starsSelector}>
                                {[1, 2, 3, 4, 5].map(num => (
                                    <TouchableOpacity key={num} onPress={() => setRating(num)}>
                                        <Star
                                            size={35}
                                            color={num <= rating ? "#FACC15" : "#3f3f46"}
                                            fill={num <= rating ? "#FACC15" : "transparent"}
                                        />
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <TextInput
                                style={styles.textInput}
                                placeholder="¿Cómo ha sido tu experiencia con este coach?"
                                placeholderTextColor="#71717a"
                                multiline
                                value={comentario}
                                onChangeText={setComentario}
                                returnKeyType="done"
                                blurOnSubmit={true}
                                onSubmitEditing={Keyboard.dismiss}
                            />

                            <TouchableOpacity
                                style={[styles.btnEnviar, enviando && { opacity: 0.5 }]}
                                onPress={enviarResena}
                                disabled={enviando}
                            >
                                {enviando ? (
                                    <ActivityIndicator color="#000" />
                                ) : (
                                    <><Send size={18} color="#000" /><Text style={styles.btnEnviarText}>Publicar Reseña</Text></>
                                )}
                            </TouchableOpacity>
                        </TouchableOpacity>
                    </TouchableOpacity>
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
    );
}

// Sub-componentes
const Stat = ({ label, value, isStar }) => (
    <View style={{ alignItems: 'flex-start' }}>
        <Text style={styles.statLabel}>{label}</Text>
        <View style={styles.row}>
            <Text style={styles.statValue}>{value}</Text>
            {isStar && <Star size={16} color="#FACC15" fill="#FACC15" style={{ marginLeft: 6 }} />}
        </View>
    </View>
);

const Benefit = ({ item }) => (
    <View style={styles.benefitItem}>
        <CheckCircle2 size={16} color="#000" />
        <Text style={styles.benefitText}>{item}</Text>
    </View>
);

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
    navBar: { paddingHorizontal: 20, paddingVertical: 15 },
    backBtn: { flexDirection: 'row', alignItems: 'center' },
    backText: { color: '#71717a', marginLeft: 8, fontSize: 13, fontWeight: '700' },
    scrollContent: { padding: 16 },
    row: { flexDirection: 'row', alignItems: 'center' },
    sectionSeparator: { height: 1, backgroundColor: '#1f1f22', marginVertical: 20 },

    // Sección de Perfil
    profileSection: { marginBottom: 10 },
    profileRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 25 },
    avatarWrapper: { width: 75, height: 75, borderRadius: 18, backgroundColor: '#1c1c1e', overflow: 'hidden' },
    avatarPlaceholder: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
    avatar: { width: '100%', height: '100%' },
    mainInfo: { marginLeft: 16, flex: 1 },
    nameRow: { flexDirection: 'row', alignItems: 'flex-start', flexWrap: 'wrap' },
    name: { color: '#fff', fontSize: 26, fontWeight: '900', letterSpacing: -0.5, lineHeight: 30 },

    // Badges
    badgeRow: { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' },
    badgeYellow: { backgroundColor: '#FACC15', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    badgeDark: { backgroundColor: '#27272a', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    badgeGreen: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)' },
    badgeTextBlack: { color: '#000', fontSize: 10, fontWeight: '800' },
    badgeTextGray: { color: '#a1a1aa', fontSize: 10, fontWeight: '800' },
    badgeTextGreen: { color: '#10b981', fontSize: 10, fontWeight: '800' },

    // Stats
    statsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 10 },
    statLabel: { color: '#71717a', fontSize: 10, fontWeight: '800', marginBottom: 4, letterSpacing: 0.5 },
    statValue: { color: '#fff', fontSize: 18, fontWeight: '900' },

    // Secciones
    sectionContainer: { marginBottom: 10 },
    sectionTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15 },
    sectionTitle: { color: '#FACC15', fontSize: 14, fontWeight: '900', marginLeft: 8 },
    sectionText: { color: '#a1a1aa', fontSize: 15, lineHeight: 24 },

    // Testimonios
    btnEscribir: { backgroundColor: '#1c1c1e', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#27272a' },
    btnEscribirText: { color: '#fff', fontSize: 12, fontWeight: '700' },
    emptyText: { color: '#71717a', fontSize: 14, textAlign: 'center', marginTop: 10, fontStyle: 'italic' },
    testimonioItem: { borderTopWidth: 1, borderTopColor: '#1f1f22', paddingTop: 15, marginTop: 15 },
    starsRow: { flexDirection: 'row', gap: 2, marginBottom: 6 },
    testimonioComment: { color: '#a1a1aa', fontSize: 14, lineHeight: 20 },

    // Tarjeta Amarilla
    priceCard: { backgroundColor: '#FACC15', borderRadius: 30, padding: 30, marginBottom: 16, marginTop: 10 },
    priceTagline: { color: '#000', fontSize: 12, fontWeight: '900', opacity: 0.7, letterSpacing: 0.5 },
    priceRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 5, marginBottom: 25 },
    priceValue: { color: '#000', fontSize: 52, fontWeight: '900', letterSpacing: -2 },
    pricePeriod: { color: '#000', fontSize: 18, fontWeight: '800' },

    // Lista de Beneficios
    benefitsList: { gap: 14, marginBottom: 30 },
    benefitItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    benefitText: { color: '#000', fontSize: 14, fontWeight: '700' },

    // Botón
    ctaButton: { backgroundColor: '#000', paddingVertical: 20, borderRadius: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
    ctaButtonText: { color: '#fff', fontWeight: '900', fontSize: 16 },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#121214', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 25, minHeight: 450, paddingBottom: Platform.OS === 'ios' ? 40 : 25 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
    modalTitle: { color: '#fff', fontSize: 22, fontWeight: '900' },
    starsSelector: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 30 },
    textInput: { backgroundColor: '#1c1c1e', borderRadius: 20, padding: 20, color: '#fff', fontSize: 16, height: 140, textAlignVertical: 'top', borderWidth: 1, borderColor: '#27272a' },
    btnEnviar: { backgroundColor: '#FACC15', marginTop: 25, paddingVertical: 18, borderRadius: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
    btnEnviarText: { color: '#000', fontWeight: '900', fontSize: 16 }
});