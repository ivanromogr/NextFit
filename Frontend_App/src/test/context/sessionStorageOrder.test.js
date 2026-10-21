import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import {
  clearAuthSession, getAccessToken, getAuthSession, getRefreshToken,
  saveAuthSession, setSessionInvalidationHandler,
} from '../../components/context/authSession';

const payload = id => ({ accessToken: 'access-' + id, refreshToken: 'refresh-' + id,
  user: { id, email: id + '@example.invalid', role: 'CLIENTE' } });
const pending = () => {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
};

beforeEach(async () => {
  jest.clearAllMocks();
  SecureStore.setItemAsync.mockResolvedValue(undefined);
  SecureStore.deleteItemAsync.mockResolvedValue(undefined);
  AsyncStorage.removeItem.mockResolvedValue(undefined);
  AsyncStorage.setItem.mockResolvedValue(undefined);
  AsyncStorage.getItem.mockResolvedValue(null);
  await clearAuthSession();
  jest.clearAllMocks();
});

test('serializa dos guardados para que el último conserve ambos almacenes', async () => {
  const first = pending();
  SecureStore.setItemAsync.mockImplementationOnce(() => first.promise);
  const oldSave = saveAuthSession(payload('old'));
  const newSave = saveAuthSession(payload('new'));
  await Promise.resolve(); await Promise.resolve();
  expect(SecureStore.setItemAsync).toHaveBeenCalledTimes(1);
  first.resolve();
  await Promise.all([oldSave, newSave]);
  expect(SecureStore.setItemAsync).toHaveBeenLastCalledWith('nextfit_refresh', 'refresh-new');
  expect(AsyncStorage.setItem).toHaveBeenLastCalledWith('auth_session', JSON.stringify(payload('new').user));
  expect(await getAccessToken()).toBe('access-new');
});

test('un borrado pendiente no invalida un login posterior', async () => {
  const removal = pending();
  const invalidated = jest.fn();
  const unsubscribe = setSessionInvalidationHandler(invalidated);
  try {
    AsyncStorage.removeItem.mockImplementationOnce(() => removal.promise);
    const clear = clearAuthSession();
    const save = saveAuthSession(payload('new'));
    await Promise.resolve(); await Promise.resolve();
    expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
    removal.resolve();
    await Promise.all([clear, save]);
    expect(invalidated).not.toHaveBeenCalled();
    expect(await getAccessToken()).toBe('access-new');
    expect(SecureStore.setItemAsync).toHaveBeenLastCalledWith('nextfit_refresh', 'refresh-new');
  } finally { unsubscribe(); }
});

test('la cola se recupera después de fallar un guardado', async () => {
  SecureStore.setItemAsync.mockRejectedValueOnce(new Error('storage unavailable'));
  await expect(saveAuthSession(payload('old'))).rejects.toThrow('storage unavailable');
  await clearAuthSession();
  await saveAuthSession(payload('new'));
  expect(await getAccessToken()).toBe('access-new');
});

test('una lectura vieja corrupta no borra una sesión guardada después', async () => {
  const read = pending();
  AsyncStorage.getItem.mockReturnValueOnce(read.promise);
  const restoring = getAuthSession();
  await Promise.resolve(); await Promise.resolve();
  expect(AsyncStorage.getItem).toHaveBeenCalled();
  await saveAuthSession(payload('new'));
  read.resolve('{broken');
  expect(await restoring).toBeNull();
  expect(AsyncStorage.removeItem).not.toHaveBeenCalled();
  expect(await getAccessToken()).toBe('access-new');
});

test('leer refresh espera al guardado pendiente', async () => {
  const write = pending();
  SecureStore.setItemAsync.mockReturnValueOnce(write.promise);
  SecureStore.getItemAsync.mockResolvedValueOnce('refresh-new');
  const save = saveAuthSession(payload('new'));
  const read = getRefreshToken();
  await Promise.resolve(); await Promise.resolve();
  expect(SecureStore.getItemAsync).not.toHaveBeenCalled();
  write.resolve();
  await save;
  expect(await read).toBe('refresh-new');
});

test('leer la cuenta espera a que termine su guardado', async () => {
  const write = pending();
  SecureStore.setItemAsync.mockReturnValueOnce(write.promise);
  AsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(payload('new').user));
  const save = saveAuthSession(payload('new'));
  const read = getAuthSession();
  await Promise.resolve(); await Promise.resolve();
  expect(AsyncStorage.getItem).not.toHaveBeenCalled();
  write.resolve();
  await save;
  expect(await read).toEqual(payload('new').user);
});
