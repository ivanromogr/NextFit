import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

// Contexto de Autenticación
import { AuthProvider, useAuth } from './src/components/context/AuthContext';

// Pantallas Públicas
import LoginScreen from './src/screens/LoginScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import ResetPasswordScreen from './src/screens/ResetPasswordScreen';
import ConfirmEmailChangeScreen from './src/screens/ConfirmEmailChangeScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import ClienteOnboardingScreen from './src/screens/Cliente/ClienteOnboardingScreen'; 
import EntrenadorOnboardingScreen from './src/screens/Entrenador/EntrenadorOnboardingScreen'; 

// Navegación Principal y Perfiles
import ClienteTabNavigator from './src/navigation/ClienteTabNavigator';
import EntrenadorTabNavigator from './src/navigation/EntrenadorTabNavigator'; 
import GestionarAtletaScreen from './src/screens/Entrenador/GestionarAtletaScreen';
import EditarPerfilCliente from './src/screens/Cliente/EditarPerfilCliente'; 
import ProgresoClienteScreen from './src/screens/Cliente/ProgresoClienteScreen';
import CrearRutinaScreen from './src/components/functional/CrearRutinaScreen';
import RutinasClienteScreen from './src/screens/Cliente/RutinasClienteScreen';
import EditarRutinaScreen from './src/screens/Cliente/EditarRutinaScreen';
import EntrenadorPerfilScreen from './src/screens/Entrenador/EntrenadorPerfilScreen'; 
import PantallaChatIndividual from './src/screens/Cliente/PantallaChatIndividual'; 
import CalendarioClienteScreen from './src/screens/Cliente/CalendarioClienteScreen';
import PantallaSesionEntrenamiento from './src/screens/Cliente/PantallaSesionEntrenamiento';
import EditarPerfilEntrenadorScreen from './src/screens/Entrenador/EditarPerfilEntrenadorScreen';
import PlantillasEntrenadorScreen from './src/screens/Entrenador/PlantillasEntrenadorScreen';
import GestionAtletas from './src/screens/Entrenador/GestionAtletas';
import CambiarEmailScreen from './src/screens/CambiarEmailScreen';
import CambiarPasswordScreen from './src/screens/CambiarPasswordScreen';
import EliminarCuentaScreen from './src/screens/EliminarCuentaScreen';
import SesionesActivasScreen from './src/screens/SesionesActivasScreen';
import TermsScreen from './src/screens/TermsScreen';
import PrivacyScreen from './src/screens/PrivacyScreen';
import GoogleOnboardingScreen from './src/screens/GoogleOnboardingScreen';
import AppleOnboardingScreen from './src/screens/AppleOnboardingScreen';
import PrivacidadComunicacionesScreen from './src/screens/PrivacidadComunicacionesScreen';
import MetodosAccesoScreen from './src/screens/MetodosAccesoScreen';
const Stack = createStackNavigator();

function RootNavigation() {
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
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
          <Stack.Screen name="ConfirmEmailChange" component={ConfirmEmailChangeScreen} />
          <Stack.Screen name="Registro" component={RegisterScreen} />
          <Stack.Screen name="GoogleOnboarding" component={GoogleOnboardingScreen} />
          <Stack.Screen name="AppleOnboarding" component={AppleOnboardingScreen} />
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
          <Stack.Screen name="GestionarAtleta" component={GestionarAtletaScreen} />
          <Stack.Screen name="EntrenadorPerfil" component={EntrenadorPerfilScreen} />
          <Stack.Screen name="CambiarEmail" component={CambiarEmailScreen} />
          <Stack.Screen name="CambiarPassword" component={CambiarPasswordScreen} />
          <Stack.Screen name="EliminarCuenta" component={EliminarCuentaScreen} />
          <Stack.Screen name="SesionesActivas" component={SesionesActivasScreen} />
          <Stack.Screen name="PrivacidadComunicaciones" component={PrivacidadComunicacionesScreen} />
          <Stack.Screen name="MetodosAcceso" component={MetodosAccesoScreen} />
          <Stack.Screen name="PantallaChatIndividual" component={PantallaChatIndividual} />
          <Stack.Screen name="EditarPerfilEntrenador" component={EditarPerfilEntrenadorScreen} />
          <Stack.Screen name="CalendarioCliente" component={CalendarioClienteScreen} />
          <Stack.Screen name="PlantillasEntrenador" component={PlantillasEntrenadorScreen} />
          <Stack.Screen name="GestionAtletas" component={GestionAtletas} />
        
        </>
      )}
      <Stack.Screen name="Terms" component={TermsScreen} />
      <Stack.Screen name="Privacy" component={PrivacyScreen} />
    </Stack.Navigator>
  );
}

export default function App() {
  const linking = { prefixes: ['nextfit://'], config: { screens: { ResetPassword: 'reset-password', ConfirmEmailChange: 'confirm-email-change' } } };
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer linking={linking}>
          <RootNavigation />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, backgroundColor: '#09090b', justifyContent: 'center', alignItems: 'center' },
});
