import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { AuthProvider, useAuth } from '../../components/context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
jest.mock('../../api/api', () => ({ refreshMobileSession: jest.fn(), logoutMobileSession: jest.fn() }));
import { refreshMobileSession } from '../../api/api';

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
