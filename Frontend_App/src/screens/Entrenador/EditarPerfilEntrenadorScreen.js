import React, { useEffect, useState } from 'react';
import { 
    View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, 
    ActivityIndicator, TextInput, Switch, Modal, Platform, KeyboardAvoidingView
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
    User, ChevronLeft, Camera, CheckCircle, AlertCircle, 
    Briefcase, Mail, AlignLeft, Lock, Globe, ChevronDown, X
} from 'lucide-react-native';

// Tus endpoints y contexto
import { getEntrenador, actualizarEntrenador } from '../../api/endpoints'; // Ajusta la ruta si es necesario
import { useAuth } from '../../components/context/AuthContext'; // Ajusta la ruta

// Componentes UI de tu Design System
import GymButton from '../../components/ui/GymButton';
import GymInput from '../../components/ui/GymInput';
// Si tienes un componente ImageUpload para móvil, impórtalo. Si no, usaremos un placeholder temporal
// import ImageUpload from '../../components/ui/ImageUpload'; 

const LISTA_TITULACIONES = [
    "Grado en CAFD / INEF", "Doble Grado CAFD + Fisioterapia", "Técnico Superior (TSAF / TAFAD)",
    "Máster en Alto Rendimiento", "Certificación NSCA (CPT / CSCS)", "Certificación ACSM / NASM / ACE",
    "Entrenador Nacional (FEFF / IFBB)", "CrossFit Level 1 / 2", "Instructor de Yoga / Pilates",
    "Estudiante de CAFD", "Experiencia Propia / Autodidacta", "Otro"
];

const LISTA_ESPECIALIDADES = [
    "Fuerza", "Hipertrofia", "Pérdida de Peso", "CrossFit",
    "Cardio", "Movilidad", "Rehabilitación", "Funcional", "Calistenia"
];

// Componente para las tarjetas de especialidad
const SelectionCard = ({ title, selected, onPress }) => (
    <TouchableOpacity 
        style={[styles.cardSelection, selected && styles.cardSelectionActive]} 
        onPress={onPress}
        activeOpacity={0.7}
    >
        <Text style={[styles.cardSelectionText, selected && styles.cardSelectionTextActive]}>{title}</Text>
    </TouchableOpacity>
);

export default function EditarPerfilEntrenadorScreen() {
    const navigation = useNavigation();
    const { userId } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Toast de notificaciones
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

    const [form, setForm] = useState({
        nombre: '', apellido: '', email: '', especialidad: [], aniosExperiencia: '',
        formacion: '', descripcionPerfil: '', modalidadTrabajo: '', genero: '',
        fotoPerfil: '', contrasena: '', perfilPublico: false, tarifaMensual: ''
    });

    const [visibleEspecialidades, setVisibleEspecialidades] = useState(LISTA_ESPECIALIDADES);

    // Estados para los modales de los Selects
    const [pickerConfig, setPickerConfig] = useState({ visible: false, field: '', title: '', options: [] });

    useEffect(() => {
        const fetchDatos = async () => {
            if (!userId) {
                navigation.navigate('Login');
                return;
            }

            try {
                const data = await getEntrenador(userId);
                
                // Normalizamos las especialidades de string a array
                let especialidadesArray = [];
                if (data.especialidad) {
                    especialidadesArray = data.especialidad.split(',').map(s => s.trim()).filter(Boolean);
                    
                    // Asegurarnos de que las especialidades raras también se muestren en la lista
                    const extras = especialidadesArray.filter(esp => 
                        !LISTA_ESPECIALIDADES.some(opt => opt.toLowerCase() === esp.toLowerCase())
                    );
                    if (extras.length > 0) {
                        setVisibleEspecialidades(prev => [...prev, ...extras]);
                    }
                }

                setForm({
                    nombre: data.nombre || '',
                    apellido: data.apellido || '',
                    email: data.email || '',
                    especialidad: especialidadesArray,
                    aniosExperiencia: data.aniosExperiencia != null ? String(data.aniosExperiencia) : '',
                    formacion: data.formacion || '',
                    descripcionPerfil: data.descripcionPerfil || '',
                    modalidadTrabajo: data.modalidadTrabajo || 'ONLINE',
                    genero: data.genero || '',
                    fotoPerfil: data.fotoPerfil || '',
                    contrasena: '',
                    perfilPublico: data.perfilPublico || false,
                    tarifaMensual: data.tarifaMensual != null ? String(data.tarifaMensual) : ''
                });

                setLoading(false);
            } catch (error) {
                console.error('Error al cargar perfil:', error);
                showToast('Error al cargar datos del perfil', 'error');
                setLoading(false);
            }
        };

        fetchDatos();
    }, [userId]);

    const handleChange = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

    const toggleEspecialidad = (esp) => {
        setForm(prev => {
            const current = Array.isArray(prev.especialidad) ? prev.especialidad : [];
            const exists = current.some(e => e.toLowerCase() === esp.toLowerCase());
            if (exists) return { ...prev, especialidad: current.filter(e => e.toLowerCase() !== esp.toLowerCase()) };
            return { ...prev, especialidad: [...current, esp] };
        });
    };

    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
    };

    const handleGuardar = async () => {
        setSaving(true);
        try {
            const payload = {
                nombre: form.nombre,
                apellido: form.apellido,
                fotoPerfil: form.fotoPerfil,
                especialidad: form.especialidad.join(', '),
                aniosExperiencia: form.aniosExperiencia ? Number(form.aniosExperiencia) : null,
                formacion: form.formacion,
                descripcionPerfil: form.descripcionPerfil,
                modalidadTrabajo: form.modalidadTrabajo,
                genero: form.genero,
                perfilPublico: form.perfilPublico,
                tarifaMensual: form.tarifaMensual ? Number(form.tarifaMensual) : null
            };

            if (form.contrasena && form.contrasena.trim() !== '') {
                payload.contrasena = form.contrasena;
            }

            await actualizarEntrenador(userId, payload);
            showToast('Perfil actualizado correctamente', 'success');
            
            // Volver al Dashboard tras 1.5s
            setTimeout(() => navigation.goBack(), 1500);

        } catch (error) {
            console.error('Error actualizando:', error);
            showToast('Error al actualizar el perfil', 'error');
        } finally {
            setSaving(false);
        }
    };

    const openPicker = (field, title, options) => {
        setPickerConfig({ visible: true, field, title, options });
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FACC15" />
                <Text style={styles.loadingText}>CARGANDO PERFIL...</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                
                {/* TOAST FLOTANTE */}
                {toast.show && (
                    <View style={[styles.toast, toast.type === 'error' && { borderColor: '#EF4444' }]}>
                        {toast.type === 'success' ? <CheckCircle size={18} color="#10B981" /> : <AlertCircle size={18} color="#EF4444" />}
                        <Text style={styles.toastText}>{toast.message}</Text>
                    </View>
                )}

                {/* HEADER FIJO */}
                <View style={styles.header}>
                    <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}>
                        <ChevronLeft size={24} color="white" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>EDITAR PERFIL</Text>
                    <View style={{ width: 44 }} /> 
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    
                    {/* FOTO DE PERFIL */}
                    <View style={styles.photoSection}>
                        <View style={styles.avatarBox}>
                            {form.fotoPerfil ? (
                                <Image source={{ uri: form.fotoPerfil }} style={{ width: '100%', height: '100%' }} />
                            ) : (
                                <User size={40} color="rgba(255,255,255,0.35)" />
                            )}
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.photoTitle}>Foto de perfil</Text>
                            <Text style={styles.helper}>Sube una imagen profesional</Text>
                            {/* Aquí puedes poner tu componente ImageUpload nativo. Como placeholder ponemos un botón */}
                            <TouchableOpacity style={styles.uploadBtn} onPress={() => console.log('Abre selector de imagen')}>
                                <Camera size={16} color="#000" />
                                <Text style={styles.uploadBtnText}>Cambiar foto</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* DATOS PERSONALES */}
                    <View style={styles.sectionHeader}>
                        <User size={18} color="#FACC15" />
                        <Text style={styles.sectionTitle}>Datos Personales</Text>
                    </View>
                    <View style={styles.row}>
                        <View style={{ flex: 1, marginRight: 10 }}>
                            <GymInput label="Nombre" value={form.nombre} onChangeText={(val) => handleChange('nombre', val)} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <GymInput label="Apellido" value={form.apellido} onChangeText={(val) => handleChange('apellido', val)} />
                        </View>
                    </View>
                    <GymInput label="Correo electrónico" icon={Mail} value={form.email} onChangeText={(val) => handleChange('email', val)} keyboardType="email-address" />

                    <View style={styles.divider} />

                    {/* ESCAPARATE PÚBLICO */}
                    <View style={styles.sectionHeader}>
                        <Globe size={18} color="#FACC15" />
                        <Text style={styles.sectionTitle}>Escaparate Público</Text>
                    </View>
                    <View style={styles.escaparateBox}>
                        <View style={styles.switchRow}>
                            <View style={{ flex: 1, paddingRight: 10 }}>
                                <Text style={styles.switchTitle}>Aparecer en búsquedas</Text>
                                <Text style={styles.switchSub}>Permite que clientes te encuentren en el Marketplace.</Text>
                            </View>
                            <Switch 
                                value={form.perfilPublico}
                                onValueChange={(val) => handleChange('perfilPublico', val)}
                                trackColor={{ false: 'rgba(255,255,255,0.1)', true: '#FACC15' }}
                                thumbColor={form.perfilPublico ? '#000' : '#f4f3f4'}
                            />
                        </View>

                        {form.perfilPublico && (
                            <View style={{ marginTop: 20 }}>
                                <GymInput 
                                    label="Tarifa Mensual (€)" 
                                    placeholder="Ej: 50" 
                                    value={form.tarifaMensual} 
                                    onChangeText={(val) => handleChange('tarifaMensual', val)} 
                                    keyboardType="numeric" 
                                />
                                <Text style={styles.escaparateHelper}>Tus especialidades y biografía se usarán como presentación.</Text>
                            </View>
                        )}
                    </View>

                    <View style={styles.divider} />

                    {/* PERFIL PROFESIONAL */}
                    <View style={styles.sectionHeader}>
                        <Briefcase size={18} color="#FACC15" />
                        <Text style={styles.sectionTitle}>Perfil Profesional</Text>
                    </View>

                    <Text style={styles.fieldLabel}>Especialidades</Text>
                    <View style={styles.especialidadesGrid}>
                        {visibleEspecialidades.map(opt => (
                            <SelectionCard 
                                key={opt} 
                                title={opt} 
                                selected={form.especialidad.includes(opt)} 
                                onPress={() => toggleEspecialidad(opt)} 
                            />
                        ))}
                    </View>

                    <GymInput 
                        label="Años de experiencia" 
                        placeholder="Ej: 5" 
                        value={form.aniosExperiencia} 
                        onChangeText={(val) => handleChange('aniosExperiencia', val)} 
                        keyboardType="numeric" 
                    />

                    {/* Select Formación */}
                    <Text style={styles.fieldLabel}>Formación / Titulación</Text>
                    <TouchableOpacity 
                        style={styles.selectBtn} 
                        onPress={() => openPicker('formacion', 'Selecciona tu Titulación', LISTA_TITULACIONES.map(t => ({ label: t, value: t })))}
                    >
                        <Text style={[styles.selectBtnText, !form.formacion && { color: 'rgba(255,255,255,0.4)' }]}>
                            {form.formacion || 'Seleccionar...'}
                        </Text>
                        <ChevronDown size={20} color="#FACC15" />
                    </TouchableOpacity>

                    <View style={styles.row}>
                        {/* Select Modalidad */}
                        <View style={{ flex: 1, marginRight: 10 }}>
                            <Text style={styles.fieldLabel}>Modalidad</Text>
                            <TouchableOpacity 
                                style={styles.selectBtn} 
                                onPress={() => openPicker('modalidadTrabajo', 'Modalidad', [
                                    { label: '100% Online', value: 'ONLINE' },
                                    { label: 'Presencial', value: 'PRESENCIAL' },
                                    { label: 'Mixto', value: 'MIXTO' },
                                ])}
                            >
                                <Text style={styles.selectBtnText}>{form.modalidadTrabajo || 'Seleccionar...'}</Text>
                                <ChevronDown size={16} color="#FACC15" />
                            </TouchableOpacity>
                        </View>

                        {/* Select Género */}
                        <View style={{ flex: 1 }}>
                            <Text style={styles.fieldLabel}>Género</Text>
                            <TouchableOpacity 
                                style={styles.selectBtn} 
                                onPress={() => openPicker('genero', 'Género', [
                                    { label: 'Masculino', value: 'MASCULINO' },
                                    { label: 'Femenino', value: 'FEMENINO' },
                                    { label: 'Prefiero no decirlo', value: 'NO_DECIR' },
                                ])}
                            >
                                <Text style={styles.selectBtnText}>
                                    {form.genero === 'MASCULINO' ? 'Masculino' : form.genero === 'FEMENINO' ? 'Femenino' : form.genero === 'NO_DECIR' ? 'No decirlo' : 'Seleccionar...'}
                                </Text>
                                <ChevronDown size={16} color="#FACC15" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Biografía */}
                    <Text style={styles.fieldLabel}>Biografía Pública</Text>
                    <View style={styles.textareaContainer}>
                        <AlignLeft size={18} color="#FACC15" style={styles.textareaIcon} />
                        <TextInput
                            style={styles.textarea}
                            placeholder="Describe tu metodología, logros o filosofía..."
                            placeholderTextColor="rgba(255,255,255,0.4)"
                            value={form.descripcionPerfil}
                            onChangeText={(val) => handleChange('descripcionPerfil', val)}
                            multiline
                            textAlignVertical="top"
                        />
                    </View>

                    <View style={styles.divider} />

                    {/* SEGURIDAD */}
                    <View style={styles.sectionHeader}>
                        <Lock size={18} color="#EF4444" />
                        <Text style={styles.sectionTitle}>Seguridad</Text>
                    </View>
                    <GymInput 
                        label="Cambiar Contraseña" 
                        placeholder="Déjalo vacío para no cambiar" 
                        icon={Lock} 
                        value={form.contrasena} 
                        onChangeText={(val) => handleChange('contrasena', val)} 
                        secureTextEntry 
                    />
                    <Text style={styles.dangerHint}>La contrasena solo se enviará si escribes algo aquí.</Text>

                    {/* BOTÓN GUARDAR */}
                    <View style={{ marginTop: 40, marginBottom: 20 }}>
                        <GymButton fullWidth loading={saving} onPress={handleGuardar}>
                            GUARDAR CAMBIOS
                        </GymButton>
                    </View>

                </ScrollView>
            </KeyboardAvoidingView>

            {/* MODAL SELECTOR REUTILIZABLE */}
            <Modal visible={pickerConfig.visible} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{pickerConfig.title}</Text>
                            <TouchableOpacity onPress={() => setPickerConfig({ ...pickerConfig, visible: false })}>
                                <X size={24} color="white" />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={{ maxHeight: 350 }}>
                            {pickerConfig.options.map((opt, idx) => (
                                <TouchableOpacity 
                                    key={idx} 
                                    style={styles.modalOption}
                                    onPress={() => {
                                        handleChange(pickerConfig.field, opt.value);
                                        setPickerConfig({ ...pickerConfig, visible: false });
                                    }}
                                >
                                    <Text style={[
                                        styles.modalOptionText, 
                                        form[pickerConfig.field] === opt.value && { color: '#FACC15', fontWeight: 'bold' }
                                    ]}>
                                        {opt.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#050505' },
    loadingContainer: { flex: 1, backgroundColor: '#050505', justifyContent: 'center', alignItems: 'center' },
    loadingText: { color: 'white', marginTop: 15, fontWeight: '800', letterSpacing: 1, fontSize: 12 },
    
    // Header
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    headerBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'flex-start' },
    headerTitle: { color: 'white', fontWeight: '900', fontSize: 14, letterSpacing: 1 },

    scrollContent: { padding: 20 },
    row: { flexDirection: 'row' },
    divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginVertical: 30 },

    // Foto de perfil
    photoSection: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#121214', padding: 20, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', marginBottom: 30 },
    avatarBox: { width: 80, height: 80, borderRadius: 16, backgroundColor: '#1a1a1a', justifyContent: 'center', alignItems: 'center', marginRight: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    photoTitle: { color: 'white', fontWeight: '900', fontSize: 16, marginBottom: 4 },
    helper: { color: '#a1a1aa', fontSize: 13, marginBottom: 15 },
    uploadBtn: { backgroundColor: '#FACC15', alignSelf: 'flex-start', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 6 },
    uploadBtnText: { color: '#000', fontWeight: '800', fontSize: 13 },

    // Secciones
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
    sectionTitle: { color: 'white', fontSize: 14, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
    fieldLabel: { color: '#a1a1aa', fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, marginTop: 15 },

    // Escaparate Público
    escaparateBox: { backgroundColor: 'rgba(250, 204, 21, 0.03)', borderWidth: 1, borderColor: 'rgba(250, 204, 21, 0.2)', borderRadius: 20, padding: 20 },
    switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    switchTitle: { color: 'white', fontWeight: '800', fontSize: 15, marginBottom: 4 },
    switchSub: { color: '#a1a1aa', fontSize: 12, lineHeight: 18 },
    escaparateHelper: { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 8, fontStyle: 'italic' },

    // Especialidades (Tarjetas)
    especialidadesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10 },
    cardSelection: { backgroundColor: '#121214', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12 },
    cardSelectionActive: { backgroundColor: '#FACC15', borderColor: '#FACC15' },
    cardSelectionText: { color: 'white', fontWeight: '600', fontSize: 13 },
    cardSelectionTextActive: { color: '#000', fontWeight: '800' },

    // Selects
    selectBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#121214', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', height: 55, borderRadius: 16, paddingHorizontal: 15, marginBottom: 15 },
    selectBtnText: { color: 'white', fontSize: 15 },

    // Textarea
    textareaContainer: { flexDirection: 'row', backgroundColor: '#121214', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 16, padding: 15, minHeight: 120 },
    textareaIcon: { marginRight: 15, marginTop: 3 },
    textarea: { flex: 1, color: 'white', fontSize: 15 },

    dangerHint: { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 8 },

    // Toast
    toast: { position: 'absolute', top: 50, left: 20, right: 20, backgroundColor: '#18181b', borderWidth: 1, borderColor: '#10B981', borderRadius: 16, padding: 15, flexDirection: 'row', alignItems: 'center', gap: 10, zIndex: 100, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 15 },
    toastText: { color: 'white', fontWeight: '700', fontSize: 14 },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#18181b', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, paddingBottom: 50 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
    modalTitle: { color: 'white', fontSize: 20, fontWeight: '900' },
    modalOption: { paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    modalOptionText: { color: 'white', fontSize: 16, fontWeight: '500' }
});