import * as SecureStore from 'expo-secure-store';

process.env.EXPO_PUBLIC_API_BASE_URL = 'http://localhost:8080';
const { api, loginForm } = require('../../api/endpoints');

describe('cliente HTTP de autenticación móvil', () => {
  beforeEach(() => jest.clearAllMocks());

  it('envía email/password JSON al contrato /api/auth/login', async () => {
    const post = jest.spyOn(api, 'post').mockResolvedValue({ status: 200 });
    await loginForm({ email: 'cliente@nextfit.test', password: 'secret' });
    expect(post).toHaveBeenCalledWith('/auth/login', { email: 'cliente@nextfit.test', password: 'secret' }, { headers: { 'X-Client-Type': 'MOBILE' } });
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
