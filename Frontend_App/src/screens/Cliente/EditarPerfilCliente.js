import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
  Platform
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
// 👇 AQUÍ ESTÁ LA CORRECCIÓN: Hemos añadido getImageUrl a la importación
import { getCliente, actualizarCliente, subirArchivoAdjunto, getImageUrl } from '../../api/endpoints'; 
import { useAuth } from '../../components/context/AuthContext';
import { User, Save, ChevronLeft, Camera, Mail, Lock, LogOut } from 'lucide-react-native';

export default function PerfilScreen() {
  const navigation = useNavigation();
  const { userId, logout } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  const [form, setForm] = useState({ 
    nombre: '', 
    apellido: '', 
    email: '', 
    fotoPerfil: '', 
    contrasena: '' 
  });
  const [focusedInput, setFocusedInput] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!userId) return;

      try {
        const data = await getCliente(userId);
        setForm({
          nombre: data.nombre || '',
          apellido: data.apellido || '',
          email: data.email || '',
          fotoPerfil: data.fotoPerfil || '',
          contrasena: ''
        });
      } catch (e) { 
        console.error('Error al cargar cliente:', e);
        Alert.alert('Error', 'No se pudieron cargar los datos del perfil');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [userId]);

  const handleChange = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSubmit = async () => {
    setSaving(true);
    
    try {
      const payload = {
        nombre: form.nombre || '',
        apellido: form.apellido || '',
        fotoPerfil: form.fotoPerfil || ''
      };

      if (form.contrasena && form.contrasena.trim() !== '') {
        payload.contrasena = form.contrasena;
      }

      await actualizarCliente(userId, payload);
      
      Alert.alert('¡Éxito!', 'Perfil actualizado correctamente', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
      
    } catch (err) {
      console.error('Error actualizando perfil:', err);
      Alert.alert('Error', 'Hubo un problema al guardar los cambios.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      "Cerrar Sesión",
      "¿Estás seguro de que quieres salir de tu cuenta?",
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Salir", 
          style: "destructive", 
          onPress: async () => {
            await logout(); 
          } 
        }
      ]
    );
  };

  // ==========================================
  // 📸 LÓGICA PARA CAMBIAR FOTO DE PERFIL 
  // ==========================================
  const handleCambiarFoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso', 'Necesitamos acceso a tu galería para cambiar la foto.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, 
      aspect: [1, 1],
      quality: 0.7, 
    });

    if (!result.canceled) {
      setUploadingImage(true);
      try {
        const asset = result.assets[0];
        const localUri = asset.uri;
        const filename = localUri.split('/').pop() || 'perfil.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const tipoArchivo = match ? `image/${match[1].toLowerCase()}` : `image/jpeg`;

        const formData = new FormData();
        formData.append('file', {
          uri: localUri, 
          name: filename,
          type: tipoArchivo
        });

        // 1. Subimos al servidor y recibimos la respuesta
        const respuestaBackend = await subirArchivoAdjunto(formData);
        
        // 2. Extraemos la ruta (dependiendo de si tu backend devuelve un String o un JSON)
        const rutaRelativa = typeof respuestaBackend === 'string' ? respuestaBackend : respuestaBackend.url || respuestaBackend.fileUrl;

        // 3. Usamos el Helper global para construir la URL completa
        const urlFinal = getImageUrl(rutaRelativa);

        if (urlFinal) {
          setForm(prev => ({ ...prev, fotoPerfil: urlFinal }));
        }
      } catch (error) {
        console.error('Error al subir la imagen:', error);
        Alert.alert('Error', 'Hubo un problema al subir la foto al servidor.');
      } finally {
        setUploadingImage(false);
      }
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FACC15" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
        
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ChevronLeft size={20} color="white" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>PERFIL ATLETA</Text>
        
        <TouchableOpacity style={styles.saveBtn} onPress={handleSubmit} disabled={saving || uploadingImage}>
          {saving ? (
            <ActivityIndicator size="small" color="#0A0A0A" />
          ) : (
            <>
              <Save size={18} color="#0A0A0A" />
              <Text style={styles.saveBtnText}>GUARDAR</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.mainCard}>
            
          <View style={styles.photoSection}>
            <View style={styles.avatarBox}>
              {form.fotoPerfil ? (
                // 👇 Usamos getImageUrl aquí también para cargar la foto correctamente al abrir la pantalla
                <Image source={{ uri: getImageUrl(form.fotoPerfil) }} style={styles.avatarImg} />
              ) : (
                <User size={35} color="#555" />
              )}
              
              {uploadingImage && (
                <View style={styles.uploadingOverlay}>
                  <ActivityIndicator size="small" color="#FACC15" />
                </View>
              )}
            </View>
            
            <View style={styles.photoInfo}>
              <Text style={styles.photoTitle}>Avatar</Text>
              <Text style={styles.photoSub}>Personaliza tu cuenta con una foto.</Text>
              
              <TouchableOpacity 
                style={[styles.uploadBtn, uploadingImage && { opacity: 0.5 }]} 
                onPress={handleCambiarFoto}
                disabled={uploadingImage}
              >
                <Camera size={16} color="white" />
                <Text style={styles.uploadBtnText}>
                  {uploadingImage ? 'Subiendo...' : 'Cambiar imagen'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <User size={20} color="#FACC15" />
            <Text style={styles.sectionTitle}>Datos Personales</Text>
          </View>
          
          <View style={styles.grid2}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nombre</Text>
              <TextInput 
                style={[styles.input, focusedInput === 'nombre' && styles.inputFocused]} 
                placeholder="Tu nombre" 
                placeholderTextColor="#666"
                value={form.nombre} 
                onChangeText={v => handleChange('nombre', v)}
                onFocus={() => setFocusedInput('nombre')}
                onBlur={() => setFocusedInput(null)}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Apellido</Text>
              <TextInput 
                style={[styles.input, focusedInput === 'apellido' && styles.inputFocused]} 
                placeholder="Tu apellido" 
                placeholderTextColor="#666"
                value={form.apellido} 
                onChangeText={v => handleChange('apellido', v)}
                onFocus={() => setFocusedInput('apellido')}
                onBlur={() => setFocusedInput(null)}
              />
            </View>
          </View>

          <View style={styles.inputGroupFull}>
            <Text style={styles.label}>Correo Electrónico</Text>
            <View style={styles.inputIconWrapper}>
              <Mail size={18} color="#666" style={styles.inputIcon} />
              <TextInput 
                style={[styles.input, styles.inputWithIcon, focusedInput === 'email' && styles.inputFocused]} 
                placeholder="email@ejemplo.com" 
                placeholderTextColor="#666"
                value={form.email} 
                onChangeText={v => handleChange('email', v)}
                onFocus={() => setFocusedInput('email')}
                onBlur={() => setFocusedInput(null)}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.sectionHeader}>
            <Lock size={20} color="#ef4444" />
            <Text style={[styles.sectionTitle, { color: '#ef4444' }]}>Seguridad</Text>
          </View>
          <View style={styles.inputGroupFull}>
            <Text style={styles.label}>Nueva Contraseña</Text>
            <TextInput 
              style={[styles.input, focusedInput === 'contrasena' && styles.inputFocusedError]} 
              placeholder="Déjalo en blanco si no quieres cambiarla" 
              placeholderTextColor="#666"
              secureTextEntry
              value={form.contrasena} 
              onChangeText={v => handleChange('contrasena', v)}
              onFocus={() => setFocusedInput('contrasena')}
              onBlur={() => setFocusedInput(null)}
            />
          </View>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <LogOut size={20} color="#ef4444" />
            <Text style={styles.logoutBtnText}>CERRAR SESIÓN</Text>
          </TouchableOpacity>

        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, background: '#09090b', justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, backgroundColor: '#050505' },
  
  header: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', 
    paddingHorizontal: 20, paddingTop: 50, paddingBottom: 15, 
    backgroundColor: 'rgba(5, 5, 5, 0.95)', borderBottomWidth: 1, borderBottomColor: '#1a1a1a', zIndex: 10
  },
  backBtn: { padding: 10, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, borderWidth: 1, borderColor: '#333' },
  headerTitle: { color: '#666', fontWeight: '800', fontSize: 13, letterSpacing: 2, textTransform: 'uppercase' },
  saveBtn: { flexDirection: 'row', backgroundColor: '#FACC15', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, alignItems: 'center', gap: 6 },
  saveBtnText: { color: '#0A0A0A', fontWeight: '900', fontSize: 12, letterSpacing: 1 },

  content: { padding: 20, paddingBottom: 60 },
  mainCard: { backgroundColor: '#0a0a0a', borderWidth: 1, borderColor: '#222', borderRadius: 24, padding: 20 },
  
  photoSection: { flexDirection: 'row', alignItems: 'center', gap: 15, marginBottom: 30, padding: 15, backgroundColor: '#111', borderRadius: 16, borderWidth: 1, borderColor: '#222' },
  avatarBox: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#1a1a1a', borderWidth: 2, borderColor: '#333', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' },
  avatarImg: { width: '100%', height: '100%' },
  uploadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  photoInfo: { flex: 1 },
  photoTitle: { color: 'white', fontSize: 16, fontWeight: '700', marginBottom: 2 },
  photoSub: { color: '#666', fontSize: 12, marginBottom: 10 },
  uploadBtn: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.1)', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
  uploadBtnText: { color: 'white', fontSize: 12, fontWeight: '600' },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 15 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: 'white', textTransform: 'uppercase', letterSpacing: 1 },
  
  grid2: { flexDirection: 'row', gap: 15, marginBottom: 20 },
  inputGroup: { flex: 1, gap: 8 },
  inputGroupFull: { gap: 8, marginBottom: 20 },
  label: { fontSize: 11, color: '#666', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  
  input: { backgroundColor: '#121212', borderWidth: 1, borderColor: '#333', color: 'white', padding: 14, borderRadius: 12, fontSize: 14 },
  inputFocused: { borderColor: '#FACC15' },
  inputFocusedError: { borderColor: '#ef4444' },
  
  inputIconWrapper: { position: 'relative', justifyContent: 'center' },
  inputIcon: { position: 'absolute', left: 14, zIndex: 1 },
  inputWithIcon: { paddingLeft: 45 },

  divider: { height: 1, backgroundColor: '#222', marginVertical: 25 },

  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: 16, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)' },
  logoutBtnText: { color: '#ef4444', fontWeight: '900', fontSize: 14, letterSpacing: 1 }
});