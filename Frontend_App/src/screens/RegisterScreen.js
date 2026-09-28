import React, { useState } from 'react';
import { 
  View, 
  Text, 
  Image, 
  StyleSheet, 
  Alert, 
  TouchableOpacity, 
  ScrollView,
  Dimensions,
  Platform
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Mail, Lock, ArrowRight, Trophy, Dumbbell } from 'lucide-react-native'; 
import { api } from '../api/api';
import { useAuth } from '../components/context/AuthContext';

// Componentes UI reutilizables
import GymButton from '../components/ui/GymButton';
import GymInput from '../components/ui/GymInput';
import GoogleSignInButton from '../components/auth/GoogleSignInButton';

// Logo
import logoNextFit from '../../assets/logo-nextfit.png';

const { width } = Dimensions.get('window');

// 1. Componente interno para las tarjetas de rol (Atleta/Coach)
const GymCard = ({ title, icon: Icon, selected, onPress }) => (
  <TouchableOpacity 
    style={[styles.gymCard, selected ? styles.gymCardSelected : null]} 
    onPress={onPress}
    activeOpacity={0.8}
  >
    <Icon size={32} color={selected ? "#0A0A0A" : "#FACC15"} style={styles.cardIcon} />
    <Text style={[styles.cardTitle, selected ? styles.cardTitleSelected : null]}>
      {title}
    </Text>
  </TouchableOpacity>
);

export default function RegisterScreen() {
  const navigation = useNavigation();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    nombre: "", 
    apellido: "", 
    email: "", 
    contrasena: "", 
    rol: "CLIENTE", acceptTerms: false, acceptPrivacy: false, marketingConsent: false
  });

  const handleChange = (field, value) => setForm({ ...form, [field]: value });

  const handleRegister = async () => {
    if (!form.nombre || !form.apellido || !form.email || !form.contrasena) {
      setError("Por favor, rellena todos los campos.");
      return;
    }
    if (!form.acceptTerms) {
      setError("Debes aceptar los Términos de uso para continuar.");
      return;
    }
    if (!form.acceptPrivacy) {
      setError("Debes aceptar la Política de privacidad para continuar.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const resp = await api.post('/register', form);

      if (resp.status >= 200 && resp.status < 300) {
        
        const session = await login(resp.data);
        if (session.role === "CLIENTE") {
          navigation.navigate('ClienteOnboarding');
        } else {
          navigation.navigate('EntrenadorOnboarding');
        }
      }
    } catch (err) {
      console.error("Error en registro:", err);
      if (err.response?.data) {
        setError(typeof err.response.data === "string" ? err.response.data : (err.response.data.message || "Error al registrar."));
      } else {
        setError("Error de conexión con el servidor.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        <View style={styles.card}>
          
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>ÚNETE AL</Text>
              <Text style={styles.headerTitleHighlight}>TEAM.</Text>
              <Text style={styles.headerSubtitle}>Empieza tu transformación hoy.</Text>
            </View>
            <Image source={logoNextFit} style={styles.logo} resizeMode="contain" />
          </View>

          {/* Selector de Rol */}
          <View style={styles.roleContainer}>
            <Text style={styles.roleLabel}>SELECCIONA TU PERFIL</Text>
            <View style={styles.cardsRow}>
              <GymCard
                title="ATLETA"
                icon={Trophy}
                selected={form.rol === "CLIENTE"}
                onPress={() => handleChange("rol", "CLIENTE")}
              />
              <GymCard
                title="COACH"
                icon={Dumbbell}
                selected={form.rol === "ENTRENADOR"}
                onPress={() => handleChange("rol", "ENTRENADOR")}
              />
            </View>
          </View>

          {/* Formulario de Datos */}
          <View style={styles.form}>
            {/* Fila para Nombre y Apellido */}
            <View style={styles.row}>
              <View style={styles.halfInput}>
                <GymInput
                  label="Nombre"
                  placeholder="Juan"
                  value={form.nombre}
                  onChangeText={(val) => handleChange("nombre", val)}
                />
              </View>
              <View style={styles.halfInput}>
                <GymInput
                  label="Apellido"
                  placeholder="Pérez"
                  value={form.apellido}
                  onChangeText={(val) => handleChange("apellido", val)}
                />
              </View>
            </View>

            <GymInput
              label="Correo Electrónico"
              icon={Mail}
              placeholder="juan@nextfit.com"
              value={form.email}
              onChangeText={(val) => handleChange("email", val)}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => handleChange('acceptTerms', !form.acceptTerms)}><Text style={styles.footerText}>{form.acceptTerms ? '☑' : '☐'} Acepto los Términos de uso</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('Terms')}><Text style={styles.legalLink}>Ver Términos de uso</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => handleChange('acceptPrivacy', !form.acceptPrivacy)}><Text style={styles.footerText}>{form.acceptPrivacy ? '☑' : '☐'} Acepto la Política de privacidad</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('Privacy')}><Text style={styles.legalLink}>Ver Política de privacidad</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => handleChange('marketingConsent', !form.marketingConsent)}><Text style={styles.footerText}>{form.marketingConsent ? '☑' : '☐'} Comunicaciones de NextFit (opcional)</Text></TouchableOpacity>

            <GymInput
              label="Contraseña"
              icon={Lock}
              placeholder="Mínimo 6 caracteres"
              value={form.contrasena}
              onChangeText={(val) => handleChange("contrasena", val)}
              secureTextEntry={true}
            />

            {error ? <Text style={styles.errorText}>⚠️ {error}</Text> : null}

            <GymButton 
              loading={loading} 
              onPress={handleRegister}
              fullWidth
              style={styles.registerButton}
            >
              {loading ? "CREANDO CUENTA..." : "COMENZAR AHORA"}
            </GymButton>
            <GoogleSignInButton
              onAuthenticated={login}
              onOnboarding={(state) => navigation.navigate('GoogleOnboarding', state)}
              onLinkRequired={() => Alert.alert('Cuenta existente', 'Ya existe una cuenta de NextFit asociada a este correo. Inicia sesión con tu método habitual y podrás vincular Google desde la configuración.')}
              onError={(message) => setError(message)}
            />
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>¿Ya tienes cuenta?</Text>
            <TouchableOpacity 
              style={styles.loginLinkButton}
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={styles.loginLinkText}>Inicia sesión aquí</Text>
            </TouchableOpacity>
          </View>
          
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090b', 
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 15, 
  },
  card: {
    backgroundColor: '#18181b',
    borderRadius: 24,
    paddingTop: 40,
    paddingBottom: 35,
    paddingHorizontal: 25,
    width: '100%',
    maxWidth: 450,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 25,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    color: 'white',
    fontSize: Platform.OS === 'ios' ? 32 : 28,
    fontWeight: '900',
    fontStyle: 'italic',
  },
  headerTitleHighlight: {
    color: '#FACC15',
    fontSize: Platform.OS === 'ios' ? 32 : 28,
    fontWeight: '900',
    fontStyle: 'italic',
    marginTop: -8, 
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  logo: {
    width: 180, 
    height: 100,
  },
  roleContainer: {
    marginBottom: 25,
  },
  roleLabel: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  cardsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  gymCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gymCardSelected: {
    backgroundColor: '#FACC15',
    borderColor: '#FACC15',
    shadowColor: '#FACC15',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  cardIcon: {
    marginBottom: 10,
  },
  cardTitle: {
    color: 'white',
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 1,
  },
  cardTitleSelected: {
    color: '#0A0A0A',
  },
  form: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  errorText: {
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 15,
    fontWeight: '600',
  },
  registerButton: {
    marginTop: 10,
    marginBottom: 25,
  },
  footer: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  footerText: {
    color: '#a1a1aa',
    fontSize: 15,
  },
  legalLink: { color: '#FACC15', marginBottom: 8, fontSize: 14 },
  loginLinkButton: {
    marginLeft: 6,
  },
  loginLinkText: {
    color: '#FACC15',
    fontWeight: 'bold',
    fontSize: 15,
    letterSpacing: 0.5,
  }
});
