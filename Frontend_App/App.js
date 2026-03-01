import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

// Contexto de Autenticación
import { AuthProvider, useAuth } from './src/components/context/AuthContext';

// Pantallas Públicas (Sin Sesión)
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import ClienteOnboardingScreen from './src/screens/Cliente/ClienteOnboardingScreen'; 
import EntrenadorOnboardingScreen from './src/screens/Entrenador/EntrenadorOnboardingScreen'; 

// Navegación Principal y Perfiles
import ClienteTabNavigator from './src/navigation/ClienteTabNavigator';
import EditarPerfilCliente from './src/screens/Cliente/EditarPerfilCliente'; 

// ✅ Pantalla de Progreso (Ahora accesible desde el Dashboard)
import ProgresoClienteScreen from './src/screens/Cliente/ProgresoClienteScreen';

const Stack = createStackNavigator();

function RootNavigation() {
  const { isAuthenticated, loading } = useAuth();

  // Pantalla de carga mientras se verifica el token/sesión
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FACC15" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated() ? (
        // ❌ FLUJO PÚBLICO
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Registro" component={RegisterScreen} />
          <Stack.Screen name="ClienteOnboarding" component={ClienteOnboardingScreen} />
          <Stack.Screen name="EntrenadorOnboarding" component={EntrenadorOnboardingScreen} />
        </>
      ) : (
        // ✅ FLUJO PRIVADO
        <>
          {/* Menú Inferior (Inicio, Calendario, Chat, Entrenadores, Perfil) */}
          <Stack.Screen name="ClienteTabs" component={ClienteTabNavigator} />
          
          {/* Pantallas Full-Screen (Se abren encima del menú inferior) */}
          <Stack.Screen name="EditarPerfilCliente" component={EditarPerfilCliente} />
          
          {/* ✅ Progreso: Ahora se abre al pulsar "Estadísticas" en el Dashboard */}
          <Stack.Screen name="ProgresoCliente" component={ProgresoClienteScreen} />
          
          {/* 🚧 Marcadores para futuras funcionalidades */}
          {/* <Stack.Screen name="SesionActiva" component={SesionActiva} /> */}
          {/* <Stack.Screen name="CrearRutina" component={CrearRutina} /> */}
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <RootNavigation />
      </NavigationContainer>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { 
    flex: 1, 
    backgroundColor: '#09090b', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
});