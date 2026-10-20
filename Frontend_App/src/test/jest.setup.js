import { configure } from '@testing-library/react-native';
import '@testing-library/jest-native/extend-expect';
// Leave time for async UI updates when the cloud runner also compiles Java/Metro.
configure({ asyncUtilTimeout: 5000 });
jest.setTimeout(15000);
process.env.EXPO_PUBLIC_API_BASE_URL = 'http://localhost:8080';

// Mock oficial de AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(), setItemAsync: jest.fn(), deleteItemAsync: jest.fn(),
}));
jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: { configure: jest.fn(), hasPlayServices: jest.fn(), signIn: jest.fn() },
  statusCodes: { SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED' },
}));
jest.mock('expo-apple-authentication', () => ({
  isAvailableAsync: jest.fn(),
  signInAsync: jest.fn(),
  AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 },
  AppleAuthenticationButton: ({ onPress }) => {
    const React = require('react');
    const { TouchableOpacity, Text } = require('react-native');
    return React.createElement(TouchableOpacity, { accessibilityRole: 'button', accessibilityLabel: 'Continuar con Apple', onPress }, React.createElement(Text, null, 'Continuar con Apple'));
  },
  AppleAuthenticationButtonType: { CONTINUE: 1 },
  AppleAuthenticationButtonStyle: { BLACK: 2 },
}));

// Mock para Lucide Icons (evita errores con los SVG)
jest.mock('lucide-react-native', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: (props) => React.createElement(View, props),
    User: (props) => React.createElement(View, props),
    LogOut: (props) => React.createElement(View, props),
    // Añade aquí más iconos si el test falla por otros
  };
});
