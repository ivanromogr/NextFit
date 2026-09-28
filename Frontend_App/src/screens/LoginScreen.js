import React, { useState } from 'react';
import { 
  View, 
  Text, 
  Image, 
  StyleSheet, 
  Alert, 
  TouchableOpacity, 
  ScrollView 
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Mail, Lock, ArrowRight } from 'lucide-react-native'; 
import { useAuth } from '../components/context/AuthContext';
import { loginForm } from '../api/endpoints';
import GoogleSignInButton from '../components/auth/GoogleSignInButton';

// Componentes UI reutilizables
import GymButton from '../components/ui/GymButton';
import GymInput from '../components/ui/GymInput';

// Logo
import logoNextFit from '../../assets/logo-nextfit.png';

export default function LoginScreen() {
  const navigation = useNavigation();
  const { login } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Faltan datos', 'Por favor, introduce tu correo y contrasena.');
      return;
    }

    setLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();

      const resp = await loginForm({ email: cleanEmail, password });

      if (resp.status >= 200 && resp.status < 300) {
        await login(resp.data);
      }
    } catch (err) {
      if (err.response?.status === 404 || err.response?.status === 401) {
        Alert.alert(
          'Acceso denegado', 
          'Correo o contrasena incorrectos. Comprueba que no haya espacios al final.'
        );
      } else {
        Alert.alert('Error', 'No se pudo conectar con el servidor.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContainer} 
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          
          <View style={styles.header}>
            <Image 
              source={logoNextFit} 
              style={styles.logo} 
              resizeMode="contain" 
            />
            <Text style={styles.subtitle}>TU EVOLUCIÓN COMIENZA AQUÍ</Text>
          </View>

          <View style={styles.form}>
            <GymInput
              label="CORREO ELECTRÓNICO"
              icon={Mail}
              placeholder="ejemplo@nextfit.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
            />

            <GymInput
              label="CONTRASEÑA"
              icon={Lock}
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={true}
            />

            <TouchableOpacity
              onPress={() => navigation.navigate('ForgotPassword')}
              style={styles.forgotPasswordContainer}
            >
              <Text style={styles.forgotPasswordText}>¿Olvidaste tu contrasena?</Text>
            </TouchableOpacity>

            <GymButton 
              loading={loading} 
              onPress={handleLogin}
              fullWidth
              style={styles.loginButton}
            >
              INICIAR SESIÓN
            </GymButton>
            <GoogleSignInButton
              onAuthenticated={login}
              onOnboarding={(state) => navigation.navigate('GoogleOnboarding', state)}
              onLinkRequired={() => Alert.alert('Cuenta existente', 'Ya existe una cuenta de NextFit asociada a este correo. Inicia sesión con tu método habitual y podrás vincular Google desde la configuración.')}
              onError={(message) => Alert.alert('Google', message)}
            />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>¿Todavía no tienes cuenta?</Text>
            <TouchableOpacity 
              style={styles.createAccountButton}
              onPress={() => navigation.navigate('Registro')}
            >
              <Text style={styles.createAccountText}>Regístrate ahora</Text>
              <ArrowRight size={18} color="#FACC15" style={styles.arrowIcon} />
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
    backgroundColor: '#09090b', // Fondo oscuro NextFit
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#18181b', // Color de tarjeta oscuro
    borderRadius: 24,
    paddingTop: 40,
    paddingBottom: 35,
    paddingHorizontal: 25,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  header: {
    alignItems: 'center',
    marginBottom: 35,
  },
  logo: {
    width: 220, 
    height: 60,
    marginBottom: 10,
  },
  subtitle: {
    color: '#a1a1aa',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  form: {
    width: '100%',
  },
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginBottom: 25,
    marginTop: -5,
  },
  forgotPasswordText: {
    color: '#71717a',
    fontSize: 13,
  },
  loginButton: {
    marginTop: 10,
    marginBottom: 20,
  },
  footer: {
    alignItems: 'center',
    marginTop: 15,
  },
  footerText: {
    color: '#a1a1aa',
    fontSize: 14,
    marginBottom: 5,
  },
  createAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 5,
  },
  createAccountText: {
    color: '#FACC15',
    fontWeight: 'bold',
    fontSize: 16,
    marginRight: 6,
  },
  arrowIcon: {
    marginTop: 2,
  }
});
