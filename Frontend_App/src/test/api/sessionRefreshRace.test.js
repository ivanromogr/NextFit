import * as SecureStore from 'expo-secure-store';
import { api, refreshMobileSession } from '../../api/api';
import { clearAuthSession, getAccessToken, saveAuthSession } from '../../components/context/authSession';

const identity = id => ({ accessToken: 'access-' + id, refreshToken: 'refresh-' + id,
  user: { id, email: id + '@example.invalid', role: 'CLIENTE' } });
const pending = () => {
  let resolve, reject;
  const promise = new Promise((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
};
const denied = config => Object.assign(new Error('Unauthorized fixture'), { config, response: { status: 401 } });
const response = (config, data = {}) => ({ status: 200, data, headers: {}, config });
const flush = async () => { for (let i = 0; i < 15; i++) await Promise.resolve(); };
let previousAdapter;
beforeEach(async () => {
  previousAdapter = api.defaults.adapter;
  jest.clearAllMocks();
  SecureStore.getItemAsync.mockResolvedValue('refresh-old');
  await clearAuthSession();
  await saveAuthSession(identity('old'));
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(async () => {
  api.defaults.adapter = previousAdapter;
  jest.restoreAllMocks();
  await clearAuthSession();
});

test('un 401 atrasado no renueva la cuenta nueva ni repite la petición antigua', async () => {
  const request = pending();
  const started = pending();
  api.defaults.adapter = jest.fn(config => {
    if (config.url === '/fixture') { started.resolve(); return request.promise.then(() => { throw denied(config); }); }
    return Promise.resolve(response(config, identity('new')));
  });
  const result = api.get('/fixture').catch(error => error);
  await started.promise;
  await saveAuthSession(identity('new'));
  request.resolve();
  await result;
  expect(api.defaults.adapter).toHaveBeenCalledTimes(1);
  expect(await getAccessToken()).toBe('access-new');
});

test.each(['success', 'failure'])('refresh antiguo %s no sustituye ni borra el login posterior', async outcome => {
  const refresh = pending();
  const started = pending();
  api.defaults.adapter = jest.fn(async config => {
    if (config.url === '/auth/refresh') {
      started.resolve();
      await refresh.promise;
      return response(config, identity('old'));
    }
    if (!config.__refreshRetry) throw denied(config);
    return response(config);
  });
  const result = api.get('/fixture').catch(error => error);
  await started.promise;
  expect(api.defaults.adapter.mock.calls.some(([config]) => config.url === '/auth/refresh')).toBe(true);
  await saveAuthSession(identity('new'));
  SecureStore.setItemAsync.mockClear();
  SecureStore.deleteItemAsync.mockClear();
  if (outcome === 'success') refresh.resolve();
  else refresh.reject(new Error('old refresh failed'));
  await result;
  expect(await getAccessToken()).toBe('access-new');
  expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
  expect(SecureStore.deleteItemAsync).not.toHaveBeenCalled();
});

test('no entrega datos de una respuesta exitosa recibida después de cerrar sesión', async () => {
  const request = pending();
  api.defaults.adapter = jest.fn(async config => { await request.promise; return response(config, { private: true }); });
  const result = api.get('/fixture').then(() => 'delivered', () => 'discarded');
  await flush();
  await clearAuthSession();
  request.resolve();
  expect(await result).toBe('discarded');
});

test('dos 401 simultáneos comparten una rotación y ambos reintentan', async () => {
  const rotation = pending();
  let rotations = 0;
  api.defaults.adapter = jest.fn(async config => {
    if (config.url === '/auth/refresh') { rotations += 1; await rotation.promise; return response(config, identity('old')); }
    if (!config.__refreshRetry) throw denied(config);
    return response(config);
  });
  SecureStore.setItemAsync.mockClear();
  const first = api.get('/first');
  const second = api.get('/second');
  await flush();
  rotation.resolve();
  await expect(Promise.all([first, second])).resolves.toHaveLength(2);
  expect(rotations).toBe(1);
  expect(SecureStore.setItemAsync).toHaveBeenCalledTimes(1);
});

test('una rotación de la nueva cuenta no comparte la promesa de la anterior', async () => {
  const old = pending();
  const started = pending();
  let rotations = 0;
  api.defaults.adapter = jest.fn(async config => {
    rotations += 1;
    if (config.data.includes('refresh-old')) { started.resolve(); await old.promise; return response(config, identity('old')); }
    return response(config, identity('new'));
  });
  const first = refreshMobileSession().catch(error => error);
  await started.promise;
  await saveAuthSession(identity('new'));
  SecureStore.getItemAsync.mockResolvedValue('refresh-new');
  const second = refreshMobileSession();
  await flush();
  old.resolve();
  const [, result] = await Promise.all([first, second]);
  expect(result.data.user.id).toBe('new');
  expect(rotations).toBe(2);
});

test('un refresh rechazado de la cuenta vigente sí limpia su sesión', async () => {
  api.defaults.adapter = jest.fn(async config => { throw denied(config); });
  await expect(api.get('/fixture')).rejects.toBeDefined();
  expect(await getAccessToken()).toBeNull();
});

test('renovar el token de la misma cuenta conserva otra respuesta en curso', async () => {
  const delayed = pending();
  const started = pending();
  api.defaults.adapter = jest.fn(async config => {
    if (config.url === '/delayed') { started.resolve(); await delayed.promise; return response(config, { sameAccount: true }); }
    if (config.url === '/auth/refresh') return response(config, { ...identity('old'), accessToken: 'rotated-access' });
    if (!config.__refreshRetry) throw denied(config);
    return response(config);
  });
  const reading = api.get('/delayed');
  await started.promise;
  await api.get('/fixture');
  delayed.resolve();
  await expect(reading).resolves.toMatchObject({ data: { sameAccount: true } });
});

test('un 401 demorado reutiliza el token ya renovado sin rotar por segunda vez', async () => {
  const delayed = pending();
  const started = pending();
  let rotations = 0;
  api.defaults.adapter = jest.fn(async config => {
    if (config.url === '/auth/refresh') { rotations += 1; return response(config, { ...identity('old'), accessToken: 'rotated-access' }); }
    if (config.__refreshRetry) return response(config);
    if (config.url === '/delayed') { started.resolve(); await delayed.promise; }
    throw denied(config);
  });
  const reading = api.get('/delayed');
  await started.promise;
  await api.get('/fixture');
  delayed.resolve();
  await expect(reading).resolves.toMatchObject({ status: 200 });
  expect(rotations).toBe(1);
});
