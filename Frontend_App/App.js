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
import EditarPerfilCliente from './src/screens/Cliente/EditarPerfilCliente'; 
import ProgresoClienteScreen from './src/screens/Cliente/ProgresoClienteScreen';

// ✅ IMPORTACIONES CORREGIDAS
import EntrenadorPerfilScreen from './src/screens/Entrenador/EntrenadorPerfilScreen'; 
// Según tu imagen b0f270, el archivo está en la carpeta Cliente:
import PantallaChatIndividual from './src/screens/Cliente/PantallaChatIndividual'; 

const Stack = createStackNavigator();

function RootNavigation() {
  const { isAuthenticated, loading } = useAuth();

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
          <Stack.Screen name="ClienteTabs" component={ClienteTabNavigator} />
          <Stack.Screen name="EditarPerfilCliente" component={EditarPerfilCliente} />
          <Stack.Screen name="ProgresoCliente" component={ProgresoClienteScreen} />
          
          <Stack.Screen 
            name="EntrenadorPerfil" 
            component={EntrenadorPerfilScreen} 
          />

          <Stack.Screen 
            name="PantallaChatIndividual" 
            component={PantallaChatIndividual} 
          />
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