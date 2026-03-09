import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

// Contexto de Autenticación
import { AuthProvider, useAuth } from './src/components/context/AuthContext';

// Pantallas Públicas
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import ClienteOnboardingScreen from './src/screens/Cliente/ClienteOnboardingScreen'; 
import EntrenadorOnboardingScreen from './src/screens/Entrenador/EntrenadorOnboardingScreen'; 

// Navegación Principal y Perfiles
import ClienteTabNavigator from './src/navigation/ClienteTabNavigator';
// ✅ IMPORTAMOS EL NUEVO MENÚ DE ENTRENADOR
import EntrenadorTabNavigator from './src/navigation/EntrenadorTabNavigator'; 

import EditarPerfilCliente from './src/screens/Cliente/EditarPerfilCliente'; 
import ProgresoClienteScreen from './src/screens/Cliente/ProgresoClienteScreen';
import CrearRutinaScreen from './src/components/functional/CrearRutinaScreen';
import RutinasClienteScreen from './src/screens/Cliente/RutinasClienteScreen';
import EditarRutinaScreen from './src/screens/Cliente/EditarRutinaScreen';
import EntrenadorPerfilScreen from './src/screens/Entrenador/EntrenadorPerfilScreen'; 
import PantallaChatIndividual from './src/screens/Cliente/PantallaChatIndividual'; 
import PantallaSesionEntrenamiento from './src/screens/Cliente/PantallaSesionEntrenamiento';
import EditarPerfilEntrenadorScreen from './src/screens/Entrenador/EditarPerfilEntrenadorScreen';
const Stack = createStackNavigator();

function RootNavigation() {
  // ✅ EXTRAEMOS EL 'user' PARA PODER LEER SU ROL
  const { isAuthenticated, loading, user } = useAuth();

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
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Registro" component={RegisterScreen} />
          <Stack.Screen name="ClienteOnboarding" component={ClienteOnboardingScreen} />
          <Stack.Screen name="EntrenadorOnboarding" component={EntrenadorOnboardingScreen} />
        </>
      ) : (
        <>
          
          {user?.role === 'ENTRENADOR' ? (
            <Stack.Screen name="EntrenadorTabs" component={EntrenadorTabNavigator} />
          ) : (
            <Stack.Screen name="ClienteTabs" component={ClienteTabNavigator} />
          )}

          {/* Pantallas compartidas (se abren por encima de los Tabs) */}
          <Stack.Screen name="EditarPerfilCliente" component={EditarPerfilCliente} />
          <Stack.Screen name="ProgresoCliente" component={ProgresoClienteScreen} />
          <Stack.Screen name="CrearRutina" component={CrearRutinaScreen} />
          <Stack.Screen name="PantallaSesionEntrenamiento" component={PantallaSesionEntrenamiento} />
          <Stack.Screen name="Rutinas" component={RutinasClienteScreen} />
          <Stack.Screen name="EditarRutina" component={EditarRutinaScreen} />
          <Stack.Screen name="EntrenadorPerfil" component={EntrenadorPerfilScreen} />
          <Stack.Screen name="PantallaChatIndividual" component={PantallaChatIndividual} />
          <Stack.Screen name="EditarPerfilEntrenador" component={EditarPerfilEntrenadorScreen} />
        
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
  loadingContainer: { flex: 1, backgroundColor: '#09090b', justifyContent: 'center', alignItems: 'center' },
});