import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import CambiarPasswordScreen from '../screens/CambiarPasswordScreen';
import * as endpoints from '../api/endpoints'; import { useAuth } from '../components/context/AuthContext';
jest.mock('../api/endpoints', () => ({ changePassword: jest.fn() })); jest.mock('../components/context/AuthContext', () => ({ useAuth: jest.fn() }));
describe('CambiarPasswordScreen', () => { const clearLocalSession = jest.fn(); beforeEach(() => { jest.clearAllMocks(); useAuth.mockReturnValue({ clearLocalSession }); jest.spyOn(Alert, 'alert').mockImplementation(jest.fn()); }); afterEach(() => Alert.alert.mockRestore());
  const fill = (view, current = 'actual-password', next = 'new-password', confirm = next) => { fireEvent.changeText(view.getByPlaceholderText('Contraseña actual'), current); fireEvent.changeText(view.getByPlaceholderText('Nueva contraseña'), next); fireEvent.changeText(view.getByPlaceholderText('Confirmar nueva contraseña'), confirm); };
  it('valida confirmación y no llama API', () => { const view = render(<CambiarPasswordScreen />); fill(view, 'actual-password', 'new-password', 'otra-password'); fireEvent.press(view.getByText('ACTUALIZAR CONTRASEÑA')); expect(endpoints.changePassword).not.toHaveBeenCalled(); });
  it('actualiza y limpia sesión', async () => { endpoints.changePassword.mockResolvedValue({}); const view = render(<CambiarPasswordScreen />); fill(view); fireEvent.press(view.getByText('ACTUALIZAR CONTRASEÑA')); await waitFor(() => expect(endpoints.changePassword).toHaveBeenCalledWith('actual-password', 'new-password')); expect(clearLocalSession).toHaveBeenCalled(); });
});

describe('envío y errores del cambio de contraseña', () => {
  const clearLocalSession = jest.fn();
  beforeEach(() => {
    jest.clearAllMocks();
    useAuth.mockReturnValue({ clearLocalSession });
    jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
  });
  afterEach(() => Alert.alert.mockRestore());
  const fill = (view) => {
    fireEvent.changeText(view.getByLabelText('Contraseña actual'), 'actual-password');
    fireEvent.changeText(view.getByLabelText('Nueva contraseña'), 'new-password');
    fireEvent.changeText(view.getByLabelText('Confirmar nueva contraseña'), 'new-password');
  };

  it('envía una vez y conserva la sesión si la contraseña actual es incorrecta', async () => {
    let reject;
    endpoints.changePassword.mockImplementationOnce(() => new Promise((resolve, fail) => { reject = fail; }));
    const view = render(<CambiarPasswordScreen />);
    fill(view);
    fireEvent(view.getByLabelText('Confirmar nueva contraseña'), 'submitEditing');
    fireEvent(view.getByLabelText('Confirmar nueva contraseña'), 'submitEditing');
    expect(endpoints.changePassword).toHaveBeenCalledTimes(1);
    reject({ response: { data: { code: 'INVALID_CURRENT_PASSWORD' } } });
    await waitFor(() => expect(view.getByText('La contraseña actual no es correcta.')).toBeTruthy());
    expect(clearLocalSession).not.toHaveBeenCalled();
    expect(view.getByLabelText('Contraseña actual').props.editable).toBe(true);
  });

  it('valida la confirmación con un error visible', () => {
    const view = render(<CambiarPasswordScreen />);
    fill(view);
    fireEvent.changeText(view.getByLabelText('Confirmar nueva contraseña'), 'different-password');
    fireEvent.press(view.getByText('ACTUALIZAR CONTRASEÑA'));
    expect(view.getByText('Las nuevas contraseñas no coinciden.')).toBeTruthy();
    expect(endpoints.changePassword).not.toHaveBeenCalled();
    expect(clearLocalSession).not.toHaveBeenCalled();
  });
});
