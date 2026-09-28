import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import ForgotPasswordScreen from '../../screens/ForgotPasswordScreen';
import ResetPasswordScreen from '../../screens/ResetPasswordScreen';
import LoginScreen from '../../screens/LoginScreen';
import * as api from '../../api/endpoints';

jest.mock('../../api/endpoints', () => ({ requestPasswordReset: jest.fn(), resetPassword: jest.fn() }));
jest.mock('../../components/context/AuthContext', () => ({ useAuth: () => ({ login: jest.fn() }) }));
jest.mock('lucide-react-native', () => ({ Mail: () => null, Lock: () => null, ArrowRight: () => null }));
jest.mock('@react-navigation/native', () => ({ useNavigation: () => mockNavigation }));
const mockNavigation = { navigate: jest.fn() };
describe('recuperación de contraseña móvil', () => {
  beforeEach(() => jest.clearAllMocks());
  it('solicita recuperación y presenta una respuesta neutral', async () => {
    api.requestPasswordReset.mockResolvedValue({ status: 200 }); const view = render(<ForgotPasswordScreen navigation={mockNavigation} />);
    fireEvent.changeText(view.getByPlaceholderText('usuario@email.com'), 'persona@nextfit.test'); fireEvent.press(view.getByText('ENVIAR INSTRUCCIONES'));
    await waitFor(() => expect(api.requestPasswordReset).toHaveBeenCalledWith('persona@nextfit.test'));
    expect(view.getByText(/Si existe una cuenta asociada/i)).toBeTruthy();
  });
  it('navega desde Login a solicitar recuperación', () => {
    const view = render(<LoginScreen />); fireEvent.press(view.getByText(/Olvidaste tu contrasena/i));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('ForgotPassword');
  });
  it('valida, resetea con token de navegación y vuelve al login', async () => {
    api.resetPassword.mockResolvedValue({ status: 200 }); const view = render(<ResetPasswordScreen navigation={mockNavigation} route={{ params: { token: 'navigation-only' } }} />);
    fireEvent.changeText(view.getByLabelText('Nueva contraseña'), 'password123'); fireEvent.changeText(view.getByLabelText('Confirmar contraseña'), 'password123'); fireEvent.press(view.getByText('RESTABLECER CONTRASEÑA'));
    await waitFor(() => expect(api.resetPassword).toHaveBeenCalledWith('navigation-only', 'password123'));
    fireEvent.press(view.getByText(/Ir a iniciar sesión/i)); expect(mockNavigation.navigate).toHaveBeenCalledWith('Login');
  });
  it('no permite reset sin token', () => { const view=render(<ResetPasswordScreen navigation={mockNavigation} route={{ params: {} }} />); expect(view.getByText(/no es válido o ha caducado/i)).toBeTruthy(); expect(api.resetPassword).not.toHaveBeenCalled(); });
  it('no envía contraseñas que no coinciden', () => { const view=render(<ResetPasswordScreen navigation={mockNavigation} route={{ params: { token: 'only' } }} />); fireEvent.changeText(view.getByLabelText('Nueva contraseña'), 'password123'); fireEvent.changeText(view.getByLabelText('Confirmar contraseña'), 'different123'); fireEvent.press(view.getByText('RESTABLECER CONTRASEÑA')); expect(view.getByText(/no coinciden/i)).toBeTruthy(); expect(api.resetPassword).not.toHaveBeenCalled(); });
});
