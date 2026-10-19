import React, { useState, useRef } from 'react';
import { 
  View, 
  Text, 
  Image, 
  StyleSheet, 
  Alert,
  Platform,
  TouchableOpacity, 
  KeyboardAvoidingView,
  ScrollView 
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Mail, Lock, ArrowRight } from 'lucide-react-native'; 
import { useAuth } from '../components/context/AuthContext';
import { loginForm } from '../api/endpoints';
import GoogleSignInButton from '../components/auth/GoogleSignInButton';
import AppleSignInButton from '../components/auth/AppleSignInButton';

// Componentes UI reutilizables
import GymButton from '../components/ui/GymButton';
import GymInput from '../components/ui/GymInput';

// Logo
import logoNextFit from '../../assets/logo-nextfit.png';

export default function LoginScreen() {
  const navigation = useNavigation();
  const passwordRef = useRef(null);
  const emailRef = useRef(null);
  const submitting = useRef(false);
  const { login } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (submitting.current) return;
    if (!email.trim() || !password) {
      Alert.alert('Faltan datos', 'Por favor, introduce tu correo y contraseña.');
      return;
    }

    submitting.current = true;
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
          'Correo o contraseña incorrectos. Comprueba que no haya espacios al final.'
        );
      } else {
        Alert.alert('Error', 'No se pudo conectar con el servidor.');
      }
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView 
        contentContainerStyle={styles.scrollContainer} 
        showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"
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
              ref={emailRef}
              returnKeyType="next"
              submitBehavior="submit"
              onSubmitEditing={() => passwordRef.current?.focus()}
              editable={!loading}
              keyboardType="email-address"
              autoCorrect={false}
              autoComplete="email"
            />

            <GymInput
              ref={passwordRef}
              returnKeyType="go"
              onSubmitEditing={handleLogin}
              editable={!loading}
              label="CONTRASEÑA"
              icon={Lock}
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={true}
              autoComplete="current-password"
            />

            <TouchableOpacity
              onPress={() => navigation.navigate('ForgotPassword')}
              style={styles.forgotPasswordContainer}
            >
              <Text style={styles.forgotPasswordText}>¿Olvidaste tu contraseña?</Text>
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
            <AppleSignInButton
              onAuthenticated={login}
              onOnboarding={(state) => navigation.navigate('AppleOnboarding', state)}
              onLinkRequired={(message) => Alert.alert('Cuenta existente', message)}
              onError={(message) => Alert.alert('Apple', message)}
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
    </KeyboardAvoidingView>
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
    maxWidth: '100%',
    width: 220, 
    height: 60,
    marginBottom: 10,
  },
  subtitle: {
    color: '#a1a1aa',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  form: {
    width: '100%',
  },
  forgotPasswordContainer: {
    minHeight: 44,
    justifyContent: 'center',
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
    minHeight: 44,
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
