import React from 'react';
import { Alert, Platform } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import MetodosAccesoScreen from '../../screens/MetodosAccesoScreen';
import * as endpoints from '../../api/endpoints';
import { getGoogleIdToken } from '../../services/googleSignIn';
import { isAppleSignInAvailable, startAppleSignIn } from '../../services/appleAuthNative';
import { useAuth } from '../../components/context/AuthContext';

jest.mock('../../api/endpoints', () => ({
  getAuthIdentities: jest.fn(), linkGoogleIdentity: jest.fn(), linkAppleIdentity: jest.fn(),
  reauthWithPassword: jest.fn(), reauthWithGoogle: jest.fn(), reauthWithApple: jest.fn(),
  reauthCreateLocalWithGoogle: jest.fn(), reauthCreateLocalWithApple: jest.fn(), createLocalIdentity: jest.fn(),
  unlinkGoogleIdentity: jest.fn(), unlinkAppleIdentity: jest.fn(),
}));
jest.mock('../../services/googleSignIn', () => ({ getGoogleIdToken: jest.fn(), isGoogleCancel: jest.fn(() => false) }));
jest.mock('../../services/appleAuthNative', () => ({
  isAppleSignInAvailable: jest.fn(), isAppleSignInCancel: jest.fn(() => false), startAppleSignIn: jest.fn(),
}));
jest.mock('../../components/context/AuthContext', () => ({ useAuth: jest.fn() }));

const mockReset = jest.fn();
jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ reset: mockReset }) }));

const LOCAL = { provider: 'LOCAL', active: true };
const GOOGLE = { provider: 'GOOGLE', active: true };
const APPLE = { provider: 'APPLE', active: true };
const clearLocalSession = jest.fn();
let platform = 'ios';

const renderScreen = async identities => {
  endpoints.getAuthIdentities.mockResolvedValue({ data: identities });
  const screen = render(<MetodosAccesoScreen />);
  await waitFor(() => {
    expect(endpoints.getAuthIdentities).toHaveBeenCalled();
    expect(screen.queryByLabelText('Cargando métodos de acceso')).toBeNull();
  });
  return screen;
};

const continueUnlink = async (screen, buttonIndex) => {
  fireEvent.press(screen.getAllByRole('button')[buttonIndex]);
  const actions = Alert.alert.mock.calls.at(-1)[2];
  await act(async () => { await actions.find(action => action.text === 'Continuar').onPress(); });
};

describe('MetodosAccesoScreen social reauthentication', () => {
  beforeAll(() => Object.defineProperty(Platform, 'OS', { configurable: true, get: () => platform }));

  beforeEach(() => {
    jest.clearAllMocks();
    platform = 'ios';
    useAuth.mockReturnValue({ clearLocalSession });
    isAppleSignInAvailable.mockResolvedValue(true);
    jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
  });

  afterEach(() => Alert.alert.mockRestore());

  it('offers only LOCAL and Apple to verify before unlinking Google', async () => {
    const screen = await renderScreen([LOCAL, GOOGLE, APPLE]);
    await continueUnlink(screen, 0);
    expect(screen.getByText('Usar contraseña')).toBeTruthy();
    expect(screen.getByText('Continuar con Apple')).toBeTruthy();
    expect(screen.queryByText('Continuar con Google')).toBeNull();
  });

  it('offers only LOCAL and Google to verify before unlinking Apple', async () => {
    const screen = await renderScreen([LOCAL, GOOGLE, APPLE]);
    await continueUnlink(screen, 1);
    expect(screen.getByText('Usar contraseña')).toBeTruthy();
    expect(screen.getByText('Continuar con Google')).toBeTruthy();
    expect(screen.queryByText('Continuar con Apple')).toBeNull();
  });

  it('reauthenticates with Google and then unlinks Apple for a social-only account', async () => {
    getGoogleIdToken.mockResolvedValue('fresh-google-credential');
    endpoints.reauthWithGoogle.mockResolvedValue({ data: { reauthToken: 'reauth-token' } });
    endpoints.unlinkAppleIdentity.mockResolvedValue({});
    const screen = await renderScreen([GOOGLE, APPLE]);
    await continueUnlink(screen, 1);
    await act(async () => { fireEvent.press(screen.getByText('Continuar con Google')); });
    expect(endpoints.reauthWithGoogle).toHaveBeenCalledWith('fresh-google-credential', 'APPLE');
    expect(endpoints.unlinkAppleIdentity).toHaveBeenCalledWith('reauth-token');
    expect(clearLocalSession).toHaveBeenCalled();
    expect(mockReset).toHaveBeenCalledWith({ index: 0, routes: [{ name: 'Login' }] });
  });

  it('reauthenticates with Apple and then unlinks Google for a social-only iOS account', async () => {
    startAppleSignIn.mockResolvedValue({ identityToken: 'fresh-apple-token', nonce: 'fresh-nonce' });
    endpoints.reauthWithApple.mockResolvedValue({ data: { reauthToken: 'reauth-token' } });
    endpoints.unlinkGoogleIdentity.mockResolvedValue({});
    const screen = await renderScreen([GOOGLE, APPLE]);
    await continueUnlink(screen, 0);
    await act(async () => { fireEvent.press(screen.getByText('Continuar con Apple')); });
    expect(endpoints.reauthWithApple).toHaveBeenCalledWith('fresh-apple-token', 'fresh-nonce', 'GOOGLE');
    expect(endpoints.unlinkGoogleIdentity).toHaveBeenCalledWith('reauth-token');
    expect(clearLocalSession).toHaveBeenCalled();
  });

  it('does not offer Apple to unlink Google on Android', async () => {
    platform = 'android';
    const screen = await renderScreen([GOOGLE, APPLE]);
    await continueUnlink(screen, 0);
    expect(Alert.alert).toHaveBeenCalledWith('Métodos de acceso', expect.stringContaining('No hay otro método'));
    expect(screen.queryByLabelText('selector-de-reautenticacion')).toBeNull();
    expect(endpoints.unlinkGoogleIdentity).not.toHaveBeenCalled();
  });

  it('does not offer disabled or unavailable Apple as a reauthentication method', async () => {
    isAppleSignInAvailable.mockResolvedValue(false);
    const screen = await renderScreen([GOOGLE, APPLE]);
    await continueUnlink(screen, 0);
    expect(Alert.alert).toHaveBeenCalledWith('Métodos de acceso', expect.stringContaining('No hay otro método'));
    expect(screen.queryByLabelText('selector-de-reautenticacion')).toBeNull();
    expect(endpoints.unlinkGoogleIdentity).not.toHaveBeenCalled();
  });

  it('lists LOCAL, Google and Apple while LOCAL itself cannot be unlinked', async () => {
    const screen = await renderScreen([LOCAL, GOOGLE, APPLE]);
    expect(screen.getByText(/Correo y contraseña.*Vinculado/)).toBeTruthy();
    expect(screen.getByText(/Google.*Vinculado/)).toBeTruthy();
    expect(screen.getByText(/Apple.*Vinculado/)).toBeTruthy();
    expect(screen.getAllByRole('button')).toHaveLength(2);
  });

  it('shows LOCAL as not configured and protects a Google-only account', async () => {
    const screen = await renderScreen([GOOGLE]);
    expect(screen.getByText(/Correo y contraseña.*No configurado/)).toBeTruthy();
    expect(screen.getAllByRole('button')[0]).toBeDisabled();
  });
  it('creates LOCAL from Google without ending the current session', async () => {
    getGoogleIdToken.mockResolvedValue('fresh-google-credential');
    endpoints.reauthCreateLocalWithGoogle.mockResolvedValue({ data: { reauthToken: 'one-use' } });
    endpoints.createLocalIdentity.mockResolvedValue({});
    const screen = await renderScreen([GOOGLE]);
    await act(async () => { fireEvent.press(screen.getByText(/crear contraseña/i)); });
    await act(async () => { fireEvent.press(screen.getByText('Continuar con Google')); });
    fireEvent.changeText(screen.getByPlaceholderText('Nueva contraseña'), 'ValidPassword123');
    fireEvent.changeText(screen.getByPlaceholderText('Confirmar contraseña'), 'ValidPassword123');
    await act(async () => { fireEvent.press(screen.getByText('Guardar contraseña')); });
    expect(endpoints.reauthCreateLocalWithGoogle).toHaveBeenCalledWith('fresh-google-credential');
    expect(endpoints.createLocalIdentity).toHaveBeenCalledWith('one-use', 'ValidPassword123');
    expect(clearLocalSession).not.toHaveBeenCalled(); expect(mockReset).not.toHaveBeenCalled();
  });
  it('blocks Apple-only create on Android', async () => {
    platform = 'android';
    const screen = await renderScreen([APPLE]);
    await act(async () => { fireEvent.press(screen.getByText(/crear contraseña/i)); });
    expect(Alert.alert).toHaveBeenCalledWith('Métodos de acceso', 'No hay un método de verificación disponible en este dispositivo.');
    expect(startAppleSignIn).not.toHaveBeenCalled();
  });

  it('links Google through the native helper and refetches identities', async () => {
    getGoogleIdToken.mockResolvedValue('fresh-google-credential');
    endpoints.linkGoogleIdentity.mockResolvedValue({});
    const screen = await renderScreen([LOCAL]);
    await act(async () => { fireEvent.press(screen.getByText('Vincular Google')); });
    expect(endpoints.linkGoogleIdentity).toHaveBeenCalledWith('fresh-google-credential');
    expect(endpoints.getAuthIdentities).toHaveBeenCalledTimes(2);
  });

  it('links Apple through the native helper and refetches identities', async () => {
    startAppleSignIn.mockResolvedValue({ identityToken: 'fresh-apple-token', nonce: 'fresh-nonce' });
    endpoints.linkAppleIdentity.mockResolvedValue({});
    const screen = await renderScreen([LOCAL]);
    const button = await screen.findByText('Vincular Apple');
    await act(async () => { fireEvent.press(button); });
    expect(endpoints.linkAppleIdentity).toHaveBeenCalledWith('fresh-apple-token', 'fresh-nonce');
    expect(endpoints.getAuthIdentities).toHaveBeenCalledTimes(2);
  });

  it('reauthenticates with password and unlinks Google before logging out', async () => {
    endpoints.reauthWithPassword.mockResolvedValue({ data: { reauthToken: 'reauth-token' } });
    endpoints.unlinkGoogleIdentity.mockResolvedValue({});
    const screen = await renderScreen([LOCAL, GOOGLE]);
    await continueUnlink(screen, 0);
    fireEvent.press(screen.getByText('Usar contraseña'));
    fireEvent.changeText(screen.getByPlaceholderText('Contraseña actual'), 'current-password');
    await act(async () => { fireEvent.press(screen.getByText('Confirmar con contraseña')); });
    expect(endpoints.reauthWithPassword).toHaveBeenCalledWith('current-password', 'GOOGLE');
    expect(endpoints.unlinkGoogleIdentity).toHaveBeenCalledWith('reauth-token');
    expect(clearLocalSession).toHaveBeenCalled();
  });

  it('handles invalid reauth without unlinking or logging out', async () => {
    endpoints.reauthWithGoogle.mockRejectedValue({ response: { data: { code: 'INVALID_REAUTH_TOKEN' } } });
    getGoogleIdToken.mockResolvedValue('fresh-google-credential');
    const screen = await renderScreen([GOOGLE, APPLE]);
    await continueUnlink(screen, 1);
    await act(async () => { fireEvent.press(screen.getByText('Continuar con Google')); });
    expect(Alert.alert).toHaveBeenCalledWith('Métodos de acceso', expect.stringContaining('caducado'));
    expect(endpoints.unlinkAppleIdentity).not.toHaveBeenCalled();
    expect(clearLocalSession).not.toHaveBeenCalled();
  });

  it.each(['CANNOT_UNLINK_LAST_IDENTITY', 'IDENTITY_NOT_LINKED'])('handles %s without logout and refetches identities', async errorCode => {
    endpoints.reauthWithPassword.mockResolvedValue({ data: { reauthToken: 'reauth-token' } });
    endpoints.unlinkGoogleIdentity.mockRejectedValue({ response: { data: { code: errorCode } } });
    const screen = await renderScreen([LOCAL, GOOGLE]);
    await continueUnlink(screen, 0);
    fireEvent.press(screen.getByText('Usar contraseña'));
    fireEvent.changeText(screen.getByPlaceholderText('Contraseña actual'), 'current-password');
    await act(async () => { fireEvent.press(screen.getByText('Confirmar con contraseña')); });
    expect(clearLocalSession).not.toHaveBeenCalled();
    expect(endpoints.getAuthIdentities).toHaveBeenCalledTimes(2);
  });

  it('reports a cross-account link conflict without exposing third-party data', async () => {
    getGoogleIdToken.mockResolvedValue('fresh-google-credential');
    endpoints.linkGoogleIdentity.mockRejectedValue({ response: { data: { code: 'SOCIAL_IDENTITY_ALREADY_LINKED' } } });
    const screen = await renderScreen([LOCAL]);
    await act(async () => { fireEvent.press(screen.getByText('Vincular Google')); });
    expect(Alert.alert).toHaveBeenCalledWith('Google', 'Esta cuenta ya está vinculada a otra cuenta de NextFit.');
  });

  it('keeps the selector open when Google reauthentication is cancelled', async () => {
    getGoogleIdToken.mockResolvedValue(null);
    const screen = await renderScreen([GOOGLE, APPLE]);
    await continueUnlink(screen, 1);
    await act(async () => { fireEvent.press(screen.getByText('Continuar con Google')); });
    expect(screen.getByLabelText('selector-de-reautenticacion')).toBeTruthy();
    expect(endpoints.unlinkAppleIdentity).not.toHaveBeenCalled();
    expect(clearLocalSession).not.toHaveBeenCalled();
  });

  it('keeps the selector open when Apple reauthentication is cancelled', async () => {
    startAppleSignIn.mockRejectedValue(new Error('APPLE_AUTH_CANCELLED'));
    const screen = await renderScreen([GOOGLE, APPLE]);
    await continueUnlink(screen, 0);
    await act(async () => { fireEvent.press(screen.getByText('Continuar con Apple')); });
    expect(screen.getByLabelText('selector-de-reautenticacion')).toBeTruthy();
    expect(endpoints.unlinkGoogleIdentity).not.toHaveBeenCalled();
    expect(clearLocalSession).not.toHaveBeenCalled();
  });
});

describe('estados móviles de métodos de acceso', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    platform = 'android';
    useAuth.mockReturnValue({ clearLocalSession });
    isAppleSignInAvailable.mockResolvedValue(false);
    jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
  });
  afterEach(() => Alert.alert.mockRestore());

  it('oculta acciones durante una carga fallida y permite reintentar', async () => {
    endpoints.getAuthIdentities.mockRejectedValueOnce(new Error('fixture'));
    endpoints.getAuthIdentities.mockResolvedValueOnce({ data: [LOCAL, GOOGLE] });
    const screen = render(<MetodosAccesoScreen />);
    await waitFor(() => screen.getByText('No se pudieron cargar los métodos de acceso.'));
    expect(screen.queryByText('Vincular Google')).toBeNull();
    expect(screen.queryByText('Crear contraseña')).toBeNull();
    fireEvent.press(screen.getByText('Reintentar'));
    await waitFor(() => screen.getByText(/Google.*Vinculado/));
    expect(screen.queryByText('No se pudieron cargar los métodos de acceso.')).toBeNull();
    expect(endpoints.linkGoogleIdentity).not.toHaveBeenCalled();
  });

  it('el teclado no duplica la creación de contraseña ni termina la sesión', async () => {
    let resolve;
    getGoogleIdToken.mockResolvedValueOnce('google-fixture');
    endpoints.reauthCreateLocalWithGoogle.mockResolvedValueOnce({ data: { reauthToken: 'one-use-fixture' } });
    endpoints.createLocalIdentity.mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
    const screen = await renderScreen([GOOGLE]);
    await act(async () => { fireEvent.press(screen.getByText('Crear contraseña')); });
    await act(async () => { fireEvent.press(screen.getByText('Continuar con Google')); });
    fireEvent.changeText(screen.getByPlaceholderText('Nueva contraseña'), 'ValidPassword123');
    const confirmation = screen.getByPlaceholderText('Confirmar contraseña');
    fireEvent.changeText(confirmation, 'ValidPassword123');
    fireEvent(confirmation, 'submitEditing');
    fireEvent(confirmation, 'submitEditing');
    expect(endpoints.createLocalIdentity).toHaveBeenCalledTimes(1);
    expect(endpoints.createLocalIdentity).toHaveBeenCalledWith('one-use-fixture', 'ValidPassword123');
    await act(async () => { resolve({}); });
    expect(clearLocalSession).not.toHaveBeenCalled();
    expect(mockReset).not.toHaveBeenCalled();
  });
});
