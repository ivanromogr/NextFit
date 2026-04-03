import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { AuthProvider, useAuth } from '../../components/context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 1. MOCK DE ASYNC STORAGE
// Es vital porque en los tests no hay un móvil real donde guardar datos
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
}));

describe('AuthContext (Mobile)', () => {
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Wrapper para poder usar useAuth en los tests
  const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;

  it('inicia en estado de carga y luego recupera la sesión si existe', async () => {
    const sessionMock = JSON.stringify({ id: 'user-123', role: 'atleta' });
    AsyncStorage.getItem.mockResolvedValue(sessionMock);

    const { result } = renderHook(() => useAuth(), { wrapper });

    // Esperamos a que el useEffect interno termine (la carga)
    await act(async () => {});

    expect(AsyncStorage.getItem).toHaveBeenCalledWith('auth_session');
    expect(result.current.user.id).toBe('user-123');
    expect(result.current.role).toBe('atleta');
    expect(result.current.loading).toBe(false);
  });

  it('permite hacer login y guarda los datos de forma persistente', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.login('atleta-001', 'atleta');
    });

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      'auth_session',
      expect.stringContaining('"id":"atleta-001"')
    );
    expect(result.current.user.id).toBe('atleta-001');
    expect(result.current.isAuthenticated()).toBe(true);
  });

  it('permite hacer logout y limpia el almacenamiento', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    // Hacemos login primero
    await act(async () => {
      await result.current.login('user-99', 'atleta');
    });

    // Ahora hacemos logout
    await act(async () => {
      await result.current.logout();
    });

    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('auth_session');
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated()).toBe(false);
  });

  it('lanza error si se usa useAuth fuera del proveedor', () => {
    // Esto verifica que el guardián de seguridad del contexto funciona
    const t = () => {
      renderHook(() => useAuth());
    };
    expect(t).toThrow("useAuth debe usarse dentro de AuthProvider");
  });
});