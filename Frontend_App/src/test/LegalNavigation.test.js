import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
const mockAuth = { loading: false, isAuthenticated: jest.fn(), user: null, userId: null };
jest.mock('../components/context/AuthContext', () => ({ AuthProvider: ({ children }) => children, useAuth: () => mockAuth }));
jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return { SafeAreaProvider: View, SafeAreaView: View };
});
jest.mock('@react-navigation/native', () => ({ NavigationContainer: ({ children }) => children }));
jest.mock('@react-navigation/stack', () => ({ createStackNavigator: () => {
  const React = require('react'); const { View, Text } = require('react-native');
  return { Navigator: ({ children }) => <View>{children}</View>, Screen: ({ name }) => <Text>{name}</Text> };
} }));
// Screen leaves are stubbed; the actual App route-selection JSX is evaluated.
const screens = [
  '../screens/LoginScreen',
  '../screens/ForgotPasswordScreen',
  '../screens/ResetPasswordScreen',
  '../screens/ConfirmEmailChangeScreen',
  '../screens/RegisterScreen',
  '../screens/Cliente/ClienteOnboardingScreen',
  '../screens/Entrenador/EntrenadorOnboardingScreen',
  '../navigation/ClienteTabNavigator',
  '../navigation/EntrenadorTabNavigator',
  '../screens/Entrenador/GestionarAtletaScreen',
  '../screens/Cliente/EditarPerfilCliente',
  '../screens/Cliente/ProgresoClienteScreen',
  '../components/functional/CrearRutinaScreen',
  '../screens/Cliente/RutinasClienteScreen',
  '../screens/Cliente/EditarRutinaScreen',
  '../screens/Entrenador/EntrenadorPerfilScreen',
  '../screens/Cliente/PantallaChatIndividual',
  '../screens/Cliente/CalendarioClienteScreen',
  '../screens/Cliente/PantallaSesionEntrenamiento',
  '../screens/Entrenador/EditarPerfilEntrenadorScreen',
  '../screens/Entrenador/PlantillasEntrenadorScreen',
  '../screens/Entrenador/GestionAtletas',
  '../screens/CambiarEmailScreen',
  '../screens/CambiarPasswordScreen',
  '../screens/EliminarCuentaScreen',
  '../screens/SesionesActivasScreen',
  '../screens/TermsScreen',
  '../screens/PrivacyScreen',
  '../screens/GoogleOnboardingScreen',
  '../screens/AppleOnboardingScreen',
  '../screens/PrivacidadComunicacionesScreen',
  '../screens/MetodosAccesoScreen',
 ];
for (const name of screens) jest.doMock(name, () => ({ __esModule: true, default: () => null }));
const App = require('../../App').default;

beforeEach(() => { jest.clearAllMocks(); mockAuth.loading = false; });
test.each([['guest', null], ['athlete', 'CLIENTE'], ['coach', 'ENTRENADOR']])('legal routes are registered for %s', (_label, role) => {
  mockAuth.isAuthenticated.mockReturnValue(Boolean(role));
  mockAuth.user = role ? { role } : null; mockAuth.userId = role ? 'fixture' : null;
  const view = render(<App />);
  expect(view.getByText('Terms')).toBeTruthy();
  expect(view.getByText('Privacy')).toBeTruthy();
  if (role) expect(view.queryByText('Login')).toBeNull();
});
test.each(['Terms', 'Privacy'])('%s document offers back navigation', name => {
  const Screen = jest.requireActual(`../screens/${name}Screen`).default;
  const navigation = { goBack: jest.fn() };
  const view = render(<Screen navigation={navigation} />);
  fireEvent.press(view.getByRole('button', { name: 'Volver' }));
  expect(navigation.goBack).toHaveBeenCalledTimes(1);
  expect(view.getByText(/Contenido provisional/)).toBeTruthy();
});
