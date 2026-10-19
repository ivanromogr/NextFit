import * as SecureStore from 'expo-secure-store';

process.env.EXPO_PUBLIC_API_BASE_URL = 'http://localhost:8080';
const { api, loginForm, requestPasswordReset, resetPassword, authenticateWithApple, completeAppleOnboarding } = require('../../api/endpoints');

describe('cliente HTTP de autenticación móvil', () => {
  beforeEach(() => jest.clearAllMocks());

  it('envía email/password JSON al contrato /api/auth/login', async () => {
    const post = jest.spyOn(api, 'post').mockResolvedValue({ status: 200 });
    await loginForm({ email: 'cliente@nextfit.test', password: 'secret' });
    expect(post).toHaveBeenCalledWith('/auth/login', { email: 'cliente@nextfit.test', password: 'secret' }, { headers: { 'X-Client-Type': 'MOBILE' } });
    post.mockRestore();
  });

  it('usa el contrato público de recuperación sin persistir el token', async () => {
    const post = jest.spyOn(api, 'post').mockResolvedValue({ status: 200 });
    await requestPasswordReset('cliente@nextfit.test');
    await resetPassword('only-in-memory', 'password123');
    expect(post).toHaveBeenNthCalledWith(1, '/auth/password/forgot', { email: 'cliente@nextfit.test' }, { headers: { 'X-Client-Type': 'MOBILE' } });
    expect(post).toHaveBeenNthCalledWith(2, '/auth/password/reset', { token: 'only-in-memory', newPassword: 'password123' }, { headers: { 'X-Client-Type': 'MOBILE' } });
    expect(SecureStore.setItemAsync).not.toHaveBeenCalledWith(expect.stringMatching(/reset/i), expect.anything());
    post.mockRestore();
  });

  it('envía los contratos Apple mínimos sin persistir identityToken', async () => {
    const post = jest.spyOn(api, 'post').mockResolvedValue({ status: 200 });
    await authenticateWithApple('apple-token', 'nonce');
    await completeAppleOnboarding({ pendingToken: 'pending', role: 'CLIENTE', nombre: 'Ada', apellido: 'Lovelace', acceptTerms: true, acceptPrivacy: true, marketingConsent: false, provider: 'APPLE', email: 'untrusted@example.test' });
    expect(post).toHaveBeenNthCalledWith(1, '/auth/apple', { identityToken: 'apple-token', nonce: 'nonce' }, { headers: { 'X-Client-Type': 'MOBILE' } });
    expect(post).toHaveBeenNthCalledWith(2, '/auth/apple/onboarding', { pendingToken: 'pending', role: 'CLIENTE', nombre: 'Ada', apellido: 'Lovelace', acceptTerms: true, acceptPrivacy: true, marketingConsent: false }, { headers: { 'X-Client-Type': 'MOBILE' } });
    expect(SecureStore.setItemAsync).not.toHaveBeenCalledWith(expect.stringMatching(/apple/i), expect.anything());
    post.mockRestore();
  });

  it('adjunta el accessToken solo en memoria', async () => {
    const { saveAuthSession } = require('../../components/context/authSession');
    await saveAuthSession({ accessToken: 'token', refreshToken: 'refresh', user: { id: '1', email: 'x@nextfit.test', role: 'CLIENTE' } });
    const interceptor = api.interceptors.request.handlers.at(-1).fulfilled;
    await expect(interceptor({ headers: {}, method: 'get', url: '/clientes/1' })).resolves.toMatchObject({ headers: { Authorization: 'Bearer token' } });
  });

  it('un 401 elimina la sesión y un 403 la conserva', async () => {
    const rejected = api.interceptors.response.handlers.at(-1).rejected;
    await expect(rejected({ response: { status: 403 }, config: {} })).rejects.toBeDefined();
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    expect(AsyncStorage.removeItem).not.toHaveBeenCalled();
    await expect(rejected({ response: { status: 401 }, config: {} })).rejects.toBeDefined();
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('auth_session');
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('nextfit_refresh');
  });
});

it('la baja usa solo el método elegido y desactiva reintentos automáticos', async () => {
  const { deleteAccount, deleteAccountWithGoogle, deleteAccountWithApple } = require('../../api/endpoints');
  const remove = jest.spyOn(api, 'delete').mockResolvedValue({});
  await deleteAccount('password'); await deleteAccountWithGoogle('google'); await deleteAccountWithApple('apple', 'nonce');
  expect(remove).toHaveBeenNthCalledWith(1, '/auth/account', { data: { currentPassword: 'password' }, skipAuthRefresh: true, skipNetworkRetry: true });
  expect(remove).toHaveBeenNthCalledWith(2, '/auth/account', { data: { provider: 'GOOGLE', credential: 'google' }, skipAuthRefresh: true, skipNetworkRetry: true });
  expect(remove).toHaveBeenNthCalledWith(3, '/auth/account', { data: { provider: 'APPLE', identityToken: 'apple', nonce: 'nonce' }, skipAuthRefresh: true, skipNetworkRetry: true });
  remove.mockRestore();
});

it('una verificación rechazada no renueva ni elimina la sesión automáticamente', async () => {
  const post = jest.spyOn(api, 'post').mockRejectedValue(new Error('must not refresh'));
  const AsyncStorage = require('@react-native-async-storage/async-storage');
  jest.clearAllMocks();
  const rejected = api.interceptors.response.handlers.at(-1).rejected;
  const error = { response: { status: 401, data: { code: 'INVALID_REAUTH_TOKEN' } }, config: { skipAuthRefresh: true, skipNetworkRetry: true, silentError: true } };
  await expect(rejected(error)).rejects.toBe(error);
  expect(post).not.toHaveBeenCalled(); expect(AsyncStorage.removeItem).not.toHaveBeenCalled();
  expect(SecureStore.deleteItemAsync).not.toHaveBeenCalled(); post.mockRestore();
});

it('un timeout de baja no reenvía una operación cuyo resultado puede haberse perdido', async () => {
  const rejected = api.interceptors.response.handlers.at(-1).rejected;
  const error = { code: 'ECONNABORTED', message: 'timeout', config: { skipAuthRefresh: true, skipNetworkRetry: true, silentError: true } };
  await expect(rejected(error)).rejects.toBe(error);
  expect(error.config.__retry).toBeUndefined();
});
