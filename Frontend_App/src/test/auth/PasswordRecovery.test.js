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
    const view = render(<LoginScreen />); fireEvent.press(view.getByText(/Olvidaste tu contraseña/i));
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

describe('interacción y errores de recuperación', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rechaza correo vacío antes de llamar al servidor', () => {
    const view = render(<ForgotPasswordScreen navigation={mockNavigation} />);
    fireEvent.changeText(view.getByLabelText('Correo electrónico'), '   ');
    fireEvent(view.getByLabelText('Correo electrónico'), 'submitEditing');
    expect(api.requestPasswordReset).not.toHaveBeenCalled();
    expect(view.getByText('Introduce tu correo electrónico.')).toBeTruthy();
  });

  it('no duplica una solicitud enviada con el teclado y permite reintentar tras un fallo', async () => {
    let reject;
    api.requestPasswordReset.mockImplementationOnce(() => new Promise((resolve, fail) => { reject = fail; }));
    const view = render(<ForgotPasswordScreen navigation={mockNavigation} />);
    const input = view.getByLabelText('Correo electrónico');
    fireEvent.changeText(input, ' PERSONA@NextFit.Test ');
    fireEvent(input, 'submitEditing');
    fireEvent(input, 'submitEditing');
    expect(api.requestPasswordReset).toHaveBeenCalledTimes(1);
    expect(api.requestPasswordReset).toHaveBeenCalledWith('persona@nextfit.test');
    reject(new Error('network fixture'));
    await waitFor(() => expect(view.getByText(/No se pudo procesar/)).toBeTruthy());
    api.requestPasswordReset.mockResolvedValueOnce({ status: 200 });
    fireEvent.press(view.getByText('ENVIAR INSTRUCCIONES'));
    await waitFor(() => expect(view.getByText(/Si existe una cuenta asociada/i)).toBeTruthy());
    expect(api.requestPasswordReset).toHaveBeenCalledTimes(2);
  });

  it('ofrece un nuevo enlace cuando el servidor rechaza el token', async () => {
    api.resetPassword.mockRejectedValueOnce({ response: { status: 400, data: { code: 'INVALID_RESET_TOKEN' } } });
    const view = render(<ResetPasswordScreen navigation={mockNavigation} route={{ params: { token: 'expired-fixture' } }} />);
    fireEvent.changeText(view.getByLabelText('Nueva contraseña'), 'password123');
    fireEvent.changeText(view.getByLabelText('Confirmar contraseña'), 'password123');
    fireEvent.press(view.getByText('RESTABLECER CONTRASEÑA'));
    await waitFor(() => expect(view.getByText(/no es válido o ha caducado/)).toBeTruthy());
    expect(view.queryByLabelText('Nueva contraseña')).toBeNull();
    fireEvent.press(view.getByText('Solicitar un nuevo enlace'));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('ForgotPassword');
  });

  it('conserva el token para corregir una contraseña rechazada por la política', async () => {
    api.resetPassword.mockRejectedValueOnce({ response: { status: 400, data: { code: 'PASSWORD_POLICY_VIOLATION' } } });
    api.resetPassword.mockResolvedValueOnce({ status: 200 });
    const view = render(<ResetPasswordScreen navigation={mockNavigation} route={{ params: { token: 'valid-fixture' } }} />);
    fireEvent.changeText(view.getByLabelText('Nueva contraseña'), 'password123');
    fireEvent.changeText(view.getByLabelText('Confirmar contraseña'), 'password123');
    fireEvent(view.getByLabelText('Confirmar contraseña'), 'submitEditing');
    await waitFor(() => expect(view.getByText(/Elige otra contraseña/)).toBeTruthy());
    fireEvent.changeText(view.getByLabelText('Nueva contraseña'), 'Another-password123');
    fireEvent.changeText(view.getByLabelText('Confirmar contraseña'), 'Another-password123');
    fireEvent.press(view.getByText('RESTABLECER CONTRASEÑA'));
    await waitFor(() => expect(view.getByText('Contraseña restablecida')).toBeTruthy());
    expect(api.resetPassword).toHaveBeenLastCalledWith('valid-fixture', 'Another-password123');
  });
});
