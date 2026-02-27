import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

// Importamos el contexto
import { AuthProvider, useAuth } from './src/components/context/AuthContext';

// Importamos Pantallas Públicas (Sin Sesión)
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import ClienteOnboardingScreen from './src/screens/Cliente/ClienteOnboardingScreen'; 
import EntrenadorOnboardingScreen from './src/screens/Entrenador/EntrenadorOnboardingScreen'; 

// Importamos Pantallas Privadas (Con Sesión)
import ClienteTabNavigator from './src/navigation/ClienteTabNavigator';
// ✅ IMPORTANTE: Importa las pantallas de Editar Perfil (ajusta la ruta según cómo lo tengas en tus carpetas)
import EditarPerfilCliente from './src/screens/Cliente/EditarPerfilCliente'; 
// import EditarPerfilEntrenador from './src/screens/Entrenador/EditarPerfilEntrenador';    
// import EntrenadorTabNavigator from './src/navigation/EntrenadorTabNavigator';

const Stack = createStackNavigator();

function RootNavigation() {
  const { isAuthenticated, loading } = useAuth();

  // Pantalla de carga mientras verifica si hay sesión guardada
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#09090b', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#FACC15" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated() ? (
        // ❌ ZONA "SIN SESIÓN": Login, Registro y Onboardings (Nadie logueado debería ver esto)
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Registro" component={RegisterScreen} />
          <Stack.Screen name="ClienteOnboarding" component={ClienteOnboardingScreen} />
          <Stack.Screen name="EntrenadorOnboarding" component={EntrenadorOnboardingScreen} />
        </>
      ) : (
        // ✅ ZONA "CON SESIÓN": Todo lo que requiere estar logueado
        <>
          {/* El menú inferior principal */}
          <Stack.Screen name="ClienteTabs" component={ClienteTabNavigator} />
          
          {/* Pantallas a las que se puede viajar desde el menú inferior (Por encima de las pestañas) */}
          <Stack.Screen name="EditarPerfilCliente" component={EditarPerfilCliente} />
          {/* <Stack.Screen name="EditarPerfilEntrenador" component={EditarPerfilEntrenador} /> */}
          
          {/* <Stack.Screen name="EntrenadorTabs" component={EntrenadorTabNavigator} /> */}
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