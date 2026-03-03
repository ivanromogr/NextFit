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
import { api } from '../api/api';
import axios from 'axios';
import { useAuth } from '../components/context/AuthContext';

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
      Alert.alert('Faltan datos', 'Por favor, introduce tu correo y contraseña.');
      return;
    }

    setLoading(true);
    try {
      // ✅ Enviamos el objeto JSON limpio. 
      // Se incluyen 'email' y 'username' para asegurar compatibilidad con tu controlador de Java.
      const loginData = {
        username: email,
        password: password,
        email: email
      };

      // Serializamos a application/x-www-form-urlencoded para Spring Security
      const body = new URLSearchParams(loginData).toString();

      // Realizamos la petición POST al endpoint /login
      // 2. Petición POST al endpoint de login (Spring Security usa /login sin prefijo /api)
      const AUTH_HOST = 'http://192.168.1.26:8080';
      const resp = await axios.post(`${AUTH_HOST}/login`, body, {
         headers: {
           "Content-Type": "application/x-www-form-urlencoded"
         }
       });

      // Verificamos la respuesta exitosa (status 200) y que contenga el ID
      if (resp.status === 200 && resp.data?.id) {
        const { rol, id } = resp.data;
        // Guardamos la sesión en el contexto global
        await login(id, rol);
        // La redirección al Dashboard es automática gracias al RootNavigation en App.js
      }
    } catch (err) {
      console.log("Error status:", err.response?.status);
      
      if (err.response?.status === 404) {
        // 🚨 Este es el error que estabas viendo
        // Indica que el servidor responde pero la ruta /login no está mapeada correctamente.
        Alert.alert(
          'Servidor no encontrado', 
          'El móvil conecta, pero la ruta no existe. Si el registro funciona, revisa si tu login en Java usa el prefijo /api.'
        );
      } else if (err.response?.status === 401) {
        Alert.alert('Acceso denegado', 'Correo o contraseña incorrectos.');
      } else {
        // Manejo de errores de red o tiempo de espera
        Alert.alert('Error', 'No se pudo conectar con el servidor. Revisa tu conexión Wi-Fi.');
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
              onPress={() => Alert.alert('Info', 'Funcionalidad en desarrollo.')} 
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