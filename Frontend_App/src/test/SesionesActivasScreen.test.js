import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import SesionesActivasScreen from '../screens/SesionesActivasScreen';
import * as endpoints from '../api/endpoints';
import { useAuth } from '../components/context/AuthContext';

jest.mock('../api/endpoints', () => ({ getSessions: jest.fn(), revokeSession: jest.fn(), logoutAllSessions: jest.fn() }));
jest.mock('../components/context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('@react-navigation/native', () => ({ useFocusEffect: (callback) => callback() }));

describe('SesionesActivasScreen', () => {
  const clearLocalSession = jest.fn();
  beforeEach(() => { jest.clearAllMocks(); useAuth.mockReturnValue({ clearLocalSession }); endpoints.getSessions.mockResolvedValue({ data: [{ familyId: 'web-family', clientType: 'WEB', createdAt: '2026-01-01T00:00:00Z', expiresAt: '2026-02-01T00:00:00Z' }, { familyId: 'mobile-family', clientType: 'MOBILE', createdAt: '2026-01-01T00:00:00Z', expiresAt: '2026-02-01T00:00:00Z' }] }); });
  it('carga y muestra WEB y Móvil sin identificadores', async () => { const view = render(<SesionesActivasScreen />); await waitFor(() => expect(endpoints.getSessions).toHaveBeenCalled()); expect(view.getByText('Web')).toBeTruthy(); expect(view.getByText('Móvil')).toBeTruthy(); expect(view.queryByText('web-family')).toBeNull(); });
  it('revoca una familia y vuelve a cargar', async () => { const view = render(<SesionesActivasScreen />); await waitFor(() => view.getByText('Web')); fireEvent.press(view.getAllByText('Cerrar sesión')[0]); await waitFor(() => expect(endpoints.revokeSession).toHaveBeenCalledWith('web-family')); });
  it('logout-all llama al servidor y limpia la sesión local', async () => { jest.spyOn(Alert, 'alert').mockImplementation((_title, _body, actions) => actions[1].onPress()); endpoints.logoutAllSessions.mockResolvedValue({}); const view = render(<SesionesActivasScreen />); fireEvent.press(view.getByText('Cerrar todas las sesiones')); await waitFor(() => expect(endpoints.logoutAllSessions).toHaveBeenCalled()); expect(clearLocalSession).toHaveBeenCalled(); Alert.alert.mockRestore(); });
});
