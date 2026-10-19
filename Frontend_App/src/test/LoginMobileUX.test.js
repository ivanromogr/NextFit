import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import LoginScreen from '../screens/LoginScreen';
import { loginForm } from '../api/endpoints';
const mockLogin = jest.fn();
jest.mock('../components/context/AuthContext', () => ({ useAuth: () => ({ login: mockLogin }) }));
jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ navigate: jest.fn() }) }));
jest.mock('../api/endpoints', () => ({ loginForm: jest.fn() }));
jest.mock('../components/auth/GoogleSignInButton', () => () => null);
jest.mock('../components/auth/AppleSignInButton', () => () => null);
jest.mock('lucide-react-native', () => ({ Mail: () => null, Lock: () => null, ArrowRight: () => null }));

beforeEach(() => jest.clearAllMocks());

test('keyboard submission normalizes email and prevents concurrent requests', async () => {
  let resolve;
  loginForm.mockImplementation(() => new Promise((done) => { resolve = done; }));
  const view = render(<LoginScreen />);
  fireEvent.changeText(view.getByPlaceholderText('ejemplo@nextfit.com'), ' Person@Example.COM ');
  const password = view.getByPlaceholderText('••••••••');
  fireEvent.changeText(password, ' secret ');
  fireEvent(password, 'submitEditing');
  fireEvent(password, 'submitEditing');
  expect(loginForm).toHaveBeenCalledTimes(1);
  expect(loginForm).toHaveBeenCalledWith({ email: 'person@example.com', password: ' secret ' });
  resolve({ status: 200, data: { accessToken: 'test-fixture' } });
  await waitFor(() => expect(mockLogin).toHaveBeenCalledWith({ accessToken: 'test-fixture' }));
});

test('whitespace email never reaches the API', () => {
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  const view = render(<LoginScreen />);
  fireEvent.changeText(view.getByPlaceholderText('ejemplo@nextfit.com'), '   ');
  fireEvent.changeText(view.getByPlaceholderText('••••••••'), 'secret');
  fireEvent.press(view.getByText('INICIAR SESIÓN'));
  expect(loginForm).not.toHaveBeenCalled();
  Alert.alert.mockRestore();
});
