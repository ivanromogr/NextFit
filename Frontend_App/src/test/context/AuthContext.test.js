import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { AuthProvider, useAuth } from '../../components/context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
jest.mock('../../api/api', () => ({ refreshMobileSession: jest.fn(), logoutMobileSession: jest.fn() }));
import { refreshMobileSession, logoutMobileSession } from '../../api/api';

describe('AuthContext (Mobile)', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
    SecureStore.getItemAsync.mockResolvedValue(null);
    refreshMobileSession.mockReset();
    refreshMobileSession.mockRejectedValue(new Error('no refresh'));
  });

  // Wrapper para poder usar useAuth en los tests
  const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;

  it('inicia en estado de carga y luego recupera la sesión si existe', async () => {
    const sessionMock = JSON.stringify({ id: 'user-123', email: 'cliente@nextfit.test', role: 'CLIENTE' });
    AsyncStorage.getItem.mockResolvedValue(sessionMock);
    SecureStore.getItemAsync.mockResolvedValue('refresh');
    refreshMobileSession.mockResolvedValue({ data: { accessToken: 'token', refreshToken: 'new-refresh', user: { id: 'user-123', email: 'cliente@nextfit.test', role: 'CLIENTE' } } });

    const { result } = renderHook(() => useAuth(), { wrapper });

    // Esperamos a que el useEffect interno termine (la carga)
    await act(async () => {});

    expect(AsyncStorage.getItem).toHaveBeenCalledWith('auth_session');
    expect(result.current.user.id).toBe('user-123');
    expect(result.current.role).toBe('CLIENTE');
    expect(result.current.loading).toBe(false);
  });

  it('permite hacer login y guarda los datos de forma persistente', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => {});

    await act(async () => {
      await result.current.login({ accessToken: 'token', refreshToken: 'refresh', user: { id: 'atleta-001', email: 'cliente@nextfit.test', role: 'CLIENTE' } });
    });

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      'auth_session',
      expect.stringContaining('"id":"atleta-001"')
    );
    expect(result.current.user.id).toBe('atleta-001');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('nextfit_refresh', 'refresh');
    expect(result.current.isAuthenticated()).toBe(true);
  });

  it('permite hacer logout y limpia el almacenamiento', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => {});

    // Hacemos login primero
    await act(async () => {
      await result.current.login({ accessToken: 'token', refreshToken: 'refresh', user: { id: 'user-99', email: 'cliente@nextfit.test', role: 'ENTRENADOR' } });
    });

    // Ahora hacemos logout
    await act(async () => {
      await result.current.logout();
    });

    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('auth_session');
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated()).toBe(false);
  });

  it('descarta una sesión expirada', async () => {
    AsyncStorage.getItem.mockResolvedValue(JSON.stringify({ id: 'user-1', email: 'x@nextfit.test', role: 'CLIENTE' }));
    SecureStore.getItemAsync.mockResolvedValue(null);
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => {});
    expect(result.current.isAuthenticated()).toBe(false);
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('auth_session');
  });

  it('lanza error si se usa useAuth fuera del proveedor', () => {
    // Esto verifica que el guardián de seguridad del contexto funciona
    const t = () => {
      renderHook(() => useAuth());
    };
    expect(t).toThrow("useAuth debe usarse dentro de AuthProvider");
  });
});

describe('respuestas atrasadas de sesión', () => {
  const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
  const oldUser = { id: 'old', email: 'old@example.invalid', role: 'CLIENTE' };
  const newUser = { id: 'new', email: 'new@example.invalid', role: 'ENTRENADOR' };
  const payload = user => ({ accessToken: 'access-' + user.id, refreshToken: 'refresh-' + user.id, user });
  const pending = () => {
    let resolve, reject;
    const promise = new Promise((done, fail) => { resolve = done; reject = fail; });
    return { promise, resolve, reject };
  };
  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.getItem.mockResolvedValue(null);
    SecureStore.getItemAsync.mockResolvedValue(null);
    refreshMobileSession.mockReset();
    logoutMobileSession.mockReset();
  });

  test.each(['success', 'failure'])('la restauración antigua %s no sustituye ni borra un login nuevo', async outcome => {
    const request = pending();
    AsyncStorage.getItem.mockResolvedValue(JSON.stringify(oldUser));
    refreshMobileSession.mockReturnValue(request.promise);
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(refreshMobileSession).toHaveBeenCalled());
    await act(async () => { await result.current.login(payload(newUser)); });
    AsyncStorage.removeItem.mockClear();
    await act(async () => {
      if (outcome === 'success') request.resolve({ data: payload(oldUser) });
      else request.reject(new Error('old request failed'));
    });
    expect(result.current.user).toEqual(newUser);
    expect(AsyncStorage.setItem).not.toHaveBeenCalledWith('auth_session', JSON.stringify(oldUser));
    expect(AsyncStorage.removeItem).not.toHaveBeenCalled();
  });

  test('una restauración pendiente no vuelve a entrar después de borrar la sesión', async () => {
    const request = pending();
    AsyncStorage.getItem.mockResolvedValue(JSON.stringify(oldUser));
    refreshMobileSession.mockReturnValue(request.promise);
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(refreshMobileSession).toHaveBeenCalled());
    await act(async () => { await result.current.clearLocalSession(); });
    await act(async () => { request.resolve({ data: payload(oldUser) }); });
    expect(result.current.user).toBeNull();
    expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
  });

  test('descarta la restauración si el proveedor se desmonta', async () => {
    const request = pending();
    AsyncStorage.getItem.mockResolvedValue(JSON.stringify(oldUser));
    refreshMobileSession.mockReturnValue(request.promise);
    const { unmount } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(refreshMobileSession).toHaveBeenCalled());
    unmount();
    await act(async () => { request.resolve({ data: payload(oldUser) }); });
    expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
  });

  test('cerrar sesión limpia localmente aunque el servidor no responda', async () => {
    logoutMobileSession.mockRejectedValue(new Error('offline'));
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => {});
    await act(async () => { await result.current.login(payload(oldUser)); });
    await act(async () => { await result.current.logout(); });
    expect(result.current.user).toBeNull();
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('nextfit_refresh');
  });

  test('un logout atrasado no cierra una cuenta que entró después', async () => {
    const request = pending();
    logoutMobileSession.mockReturnValue(request.promise);
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => {});
    await act(async () => { await result.current.login(payload(oldUser)); });
    let logout;
    act(() => { logout = result.current.logout(); });
    await act(async () => { await result.current.login(payload(newUser)); });
    AsyncStorage.removeItem.mockClear();
    await act(async () => { request.resolve(); await logout; });
    expect(result.current.user).toEqual(newUser);
    expect(AsyncStorage.removeItem).not.toHaveBeenCalled();
  });
});
