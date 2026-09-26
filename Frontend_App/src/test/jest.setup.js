import '@testing-library/jest-native/extend-expect';
process.env.EXPO_PUBLIC_API_BASE_URL = 'http://localhost:8080';

// Mock oficial de AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(), setItemAsync: jest.fn(), deleteItemAsync: jest.fn(),
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
