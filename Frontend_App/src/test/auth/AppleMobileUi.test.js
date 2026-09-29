import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import AppleSignInButton from '../../components/auth/AppleSignInButton';
import AppleOnboardingScreen from '../../screens/AppleOnboardingScreen';
import { isAppleSignInAvailable, startAppleSignIn } from '../../services/appleAuthNative';
import { authenticateWithApple, completeAppleOnboarding } from '../../api/endpoints';
import { useAuth } from '../../components/context/AuthContext';

const mockNavigate = jest.fn();
let mockParams = { pendingToken: 'pending', nombre: 'Ada', apellido: 'Lovelace' };
jest.mock('../../services/appleAuthNative', () => ({ isAppleSignInAvailable: jest.fn(), startAppleSignIn: jest.fn() }));
jest.mock('../../api/endpoints', () => ({ authenticateWithApple: jest.fn(), completeAppleOnboarding: jest.fn() }));
jest.mock('../../components/context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ navigate: mockNavigate }), useRoute: () => ({ params: mockParams }) }));

describe('Apple mobile UI', () => {
  const onAuthenticated = jest.fn(); const onOnboarding = jest.fn(); const onLinkRequired = jest.fn(); const onError = jest.fn();
  beforeEach(() => {
    jest.clearAllMocks();
    mockParams = { pendingToken: 'pending', nombre: 'Ada', apellido: 'Lovelace' };
    isAppleSignInAvailable.mockResolvedValue(true);
    useAuth.mockReturnValue({ login: onAuthenticated });
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  it('muestra el botón oficial sólo cuando Apple está disponible', async () => {
    const availableView = render(<AppleSignInButton onAuthenticated={onAuthenticated} />);
    expect(await screen.findByRole('button', { name: /continuar con apple/i })).toBeTruthy();
    availableView.unmount();
    isAppleSignInAvailable.mockResolvedValue(false);
    const unavailableView = render(<AppleSignInButton onAuthenticated={onAuthenticated} />);
    await waitFor(() => expect(unavailableView.queryByRole('button', { name: /continuar con apple/i })).toBeNull());
  });

  it('instala sesión NextFit para AUTHENTICATED sin persistir el token Apple', async () => {
    startAppleSignIn.mockResolvedValue({ identityToken: 'apple-token', nonce: 'nonce' });
    authenticateWithApple.mockResolvedValue({ data: { accessToken: 'jwt', refreshToken: 'refresh', user: { id: '1', role: 'CLIENTE', email: 'a@b.test' } } });
    render(<AppleSignInButton onAuthenticated={onAuthenticated} />);
    fireEvent.press(await screen.findByRole('button', { name: /continuar con apple/i }));
    await waitFor(() => expect(authenticateWithApple).toHaveBeenCalledWith('apple-token', 'nonce'));
    expect(onAuthenticated).toHaveBeenCalled();
    expect(SecureStore.setItemAsync).not.toHaveBeenCalledWith(expect.stringMatching(/apple/i), 'apple-token');
  });

  it('maneja LINK_REQUIRED, onboarding y cancelación sin linking ni token en navegación', async () => {
    startAppleSignIn.mockResolvedValue({ identityToken: 'apple-token', nonce: 'nonce', user: { name: { firstName: 'Ada', lastName: 'Lovelace' } } });
    authenticateWithApple.mockResolvedValueOnce({ data: { status: 'LINK_REQUIRED' } });
    const view = render(<AppleSignInButton onAuthenticated={onAuthenticated} onLinkRequired={onLinkRequired} onOnboarding={onOnboarding} onError={onError} />);
    fireEvent.press(await screen.findByRole('button', { name: /continuar con apple/i }));
    await waitFor(() => expect(onLinkRequired).toHaveBeenCalled());
    authenticateWithApple.mockResolvedValueOnce({ data: { status: 'ONBOARDING_REQUIRED', pendingToken: 'pending' } });
    fireEvent.press(screen.getByRole('button', { name: /continuar con apple/i }));
    await waitFor(() => expect(onOnboarding).toHaveBeenCalledWith({ pendingToken: 'pending', nombre: 'Ada', apellido: 'Lovelace' }));
    expect(onOnboarding.mock.calls[0][0]).not.toHaveProperty('identityToken');
    startAppleSignIn.mockRejectedValue(new Error('APPLE_AUTH_CANCELLED'));
    fireEvent.press(screen.getByRole('button', { name: /continuar con apple/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: /continuar con apple/i })).toBeTruthy());
    expect(onError).not.toHaveBeenCalled();
    view.unmount();
  });

  it('valida role y consentimientos antes del onboarding', () => {
    render(<AppleOnboardingScreen />);
    fireEvent.press(screen.getByText('CONTINUAR'));
    expect(Alert.alert).toHaveBeenCalledWith('Perfil requerido', expect.any(String));
    fireEvent.press(screen.getByText('ATLETA'));
    fireEvent.press(screen.getByText('CONTINUAR'));
    expect(Alert.alert).toHaveBeenCalledWith('Consentimiento requerido', expect.any(String));
  });

  it('envía onboarding mínimo, instala sesión y maneja errores sociales', async () => {
    completeAppleOnboarding.mockResolvedValueOnce({ data: { accessToken: 'jwt', refreshToken: 'refresh', user: { id: '2', role: 'ENTRENADOR', email: 'a@b.test' } } });
    render(<AppleOnboardingScreen />);
    fireEvent.press(screen.getByText('COACH'));
    fireEvent.press(screen.getByText(/acepto los términos/i));
    fireEvent.press(screen.getByText(/acepto la política/i));
    fireEvent.press(screen.getByText('CONTINUAR'));
    await waitFor(() => expect(completeAppleOnboarding).toHaveBeenCalledWith({ pendingToken: 'pending', role: 'ENTRENADOR', nombre: 'Ada', apellido: 'Lovelace', acceptTerms: true, acceptPrivacy: true, marketingConsent: false }));
    expect(onAuthenticated).toHaveBeenCalled();
    expect(SecureStore.setItemAsync).not.toHaveBeenCalledWith(expect.stringMatching(/apple/i), expect.anything());
  });

  it.each(['SOCIAL_EMAIL_REQUIRED', 'INVALID_PENDING_SOCIAL_AUTH', 'EMAIL_ALREADY_IN_USE'])('muestra un error seguro para %s', async (code) => {
    completeAppleOnboarding.mockRejectedValueOnce({ response: { data: { code } } });
    render(<AppleOnboardingScreen />);
    fireEvent.press(screen.getByText('ATLETA'));
    fireEvent.press(screen.getByText(/acepto los términos/i));
    fireEvent.press(screen.getByText(/acepto la política/i));
    fireEvent.press(screen.getByText('CONTINUAR'));
    await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith('Apple', expect.any(String)));
  });
});
