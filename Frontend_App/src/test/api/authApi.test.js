import * as SecureStore from 'expo-secure-store';

process.env.EXPO_PUBLIC_API_BASE_URL = 'http://localhost:8080';
const { api, loginForm, requestPasswordReset, resetPassword } = require('../../api/endpoints');

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
