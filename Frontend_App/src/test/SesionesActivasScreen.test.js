import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import SesionesActivasScreen from '../screens/SesionesActivasScreen';
import * as endpoints from '../api/endpoints';
import { useAuth } from '../components/context/AuthContext';

jest.mock('../api/endpoints', () => ({ getSessions: jest.fn(), revokeSession: jest.fn(), logoutAllSessions: jest.fn() }));
jest.mock('../components/context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('@react-navigation/native', () => ({ useFocusEffect: (callback) => require('react').useEffect(callback, [callback]) }));

describe('SesionesActivasScreen', () => {
  const clearLocalSession = jest.fn();
  beforeEach(() => { jest.clearAllMocks(); useAuth.mockReturnValue({ clearLocalSession }); endpoints.getSessions.mockResolvedValue({ data: [{ familyId: 'web-family', clientType: 'WEB', createdAt: '2026-01-01T00:00:00Z', expiresAt: '2026-02-01T00:00:00Z' }, { familyId: 'mobile-family', clientType: 'MOBILE', createdAt: '2026-01-01T00:00:00Z', expiresAt: '2026-02-01T00:00:00Z' }] }); });
  it('carga y muestra WEB y Móvil sin identificadores', async () => { const view = render(<SesionesActivasScreen />); await waitFor(() => expect(endpoints.getSessions).toHaveBeenCalled()); expect(view.getByText('Web')).toBeTruthy(); expect(view.getByText('Móvil')).toBeTruthy(); expect(view.queryByText('web-family')).toBeNull(); });
  it('revoca una familia y vuelve a cargar', async () => { const view = render(<SesionesActivasScreen />); await waitFor(() => view.getByText('Web')); fireEvent.press(view.getAllByText('CERRAR SESIÓN')[0]); await waitFor(() => expect(endpoints.revokeSession).toHaveBeenCalledWith('web-family')); });
  it('logout-all llama al servidor y limpia la sesión local', async () => { jest.spyOn(Alert, 'alert').mockImplementation((_title, _body, actions) => actions[1].onPress()); endpoints.logoutAllSessions.mockResolvedValue({}); const view = render(<SesionesActivasScreen />); fireEvent.press(view.getByText('CERRAR TODAS LAS SESIONES')); await waitFor(() => expect(endpoints.logoutAllSessions).toHaveBeenCalled()); expect(clearLocalSession).toHaveBeenCalled(); Alert.alert.mockRestore(); });
});

describe('estados y protección de sesiones', () => {
  const clearLocalSession = jest.fn();
  beforeEach(() => { jest.clearAllMocks(); useAuth.mockReturnValue({ clearLocalSession }); });

  it('permite reintentar la carga sin confundir un error con una lista vacía', async () => {
    endpoints.getSessions.mockRejectedValueOnce(new Error('fixture'));
    endpoints.getSessions.mockResolvedValueOnce({ data: [] });
    const view = render(<SesionesActivasScreen />);
    await waitFor(() => expect(view.getByText('No se pudieron cargar las sesiones activas.')).toBeTruthy());
    expect(view.queryByText('No hay sesiones activas.')).toBeNull();
    fireEvent.press(view.getByText('ACTUALIZAR'));
    await waitFor(() => expect(view.getByText('No hay sesiones activas.')).toBeTruthy());
    expect(view.queryByText('No se pudieron cargar las sesiones activas.')).toBeNull();
  });

  it('eliminar una sesión requiere una sola petición y actualiza la lista', async () => {
    let resolve;
    endpoints.getSessions.mockResolvedValueOnce({ data: [{ familyId: 'web-fixture', clientType: 'WEB' }] });
    endpoints.getSessions.mockResolvedValueOnce({ data: [] });
    endpoints.revokeSession.mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
    const view = render(<SesionesActivasScreen />);
    await waitFor(() => view.getByText('Web'));
    const button = view.getByText('CERRAR SESIÓN');
    fireEvent.press(button);
    fireEvent.press(button);
    expect(endpoints.revokeSession).toHaveBeenCalledTimes(1);
    resolve({});
    await waitFor(() => expect(view.getByText('No hay sesiones activas.')).toBeTruthy());
    expect(view.queryByText('Web')).toBeNull();
    expect(clearLocalSession).not.toHaveBeenCalled();
  });

  it('cancelar cerrar todas no llama al servidor ni borra la sesión local', async () => {
    endpoints.getSessions.mockResolvedValueOnce({ data: [] });
    const alert = jest.spyOn(Alert, 'alert').mockImplementation((_title, _body, actions) => actions[0].onPress());
    const view = render(<SesionesActivasScreen />);
    await waitFor(() => view.getByText('No hay sesiones activas.'));
    fireEvent.press(view.getByText('CERRAR TODAS LAS SESIONES'));
    expect(endpoints.logoutAllSessions).not.toHaveBeenCalled();
    expect(clearLocalSession).not.toHaveBeenCalled();
    alert.mockRestore();
  });
});
