import React from 'react'; import { Alert } from 'react-native'; import { fireEvent, render, waitFor } from '@testing-library/react-native'; import EliminarCuentaScreen from '../screens/EliminarCuentaScreen'; import * as endpoints from '../api/endpoints'; import { useAuth } from '../components/context/AuthContext';
jest.mock('../api/endpoints',()=>({deleteAccount:jest.fn()}));jest.mock('../components/context/AuthContext',()=>({useAuth:jest.fn()}));describe('EliminarCuentaScreen',()=>{const clearLocalSession=jest.fn();beforeEach(()=>{jest.clearAllMocks();useAuth.mockReturnValue({clearLocalSession});jest.spyOn(Alert,'alert').mockImplementation((_a,_b,actions)=>actions?.[1]?.onPress());});afterEach(()=>Alert.alert.mockRestore());it('confirma y limpia sesión',async()=>{endpoints.deleteAccount.mockResolvedValue({});const view=render(<EliminarCuentaScreen/>);fireEvent.changeText(view.getByPlaceholderText('Contraseña actual'),'secret');fireEvent.press(view.getByText('ELIMINAR MI CUENTA'));await waitFor(()=>expect(endpoints.deleteAccount).toHaveBeenCalledWith('secret'));expect(clearLocalSession).toHaveBeenCalled();});});

describe('confirmación y errores al eliminar la cuenta', () => {
  const clearLocalSession = jest.fn();
  beforeEach(() => { jest.clearAllMocks(); useAuth.mockReturnValue({ clearLocalSession }); });
  afterEach(() => jest.restoreAllMocks());

  it('cancelar la confirmación conserva la cuenta y permite abrirla de nuevo', () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation((_title, _body, actions) => actions[0].onPress());
    const view = render(<EliminarCuentaScreen />);
    fireEvent.changeText(view.getByLabelText('Contraseña actual'), 'password-fixture');
    fireEvent.press(view.getByText('ELIMINAR MI CUENTA'));
    fireEvent.press(view.getByText('ELIMINAR MI CUENTA'));
    expect(alert).toHaveBeenCalledTimes(2);
    expect(endpoints.deleteAccount).not.toHaveBeenCalled();
    expect(clearLocalSession).not.toHaveBeenCalled();
  });

  it('valida contraseña vacía antes de mostrar la confirmación', () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
    const view = render(<EliminarCuentaScreen />);
    fireEvent.press(view.getByText('ELIMINAR MI CUENTA'));
    expect(view.getByText('Introduce tu contraseña actual.')).toBeTruthy();
    expect(alert).not.toHaveBeenCalled();
    expect(endpoints.deleteAccount).not.toHaveBeenCalled();
  });

  it('bloquea peticiones duplicadas y conserva la sesión si la contraseña es incorrecta', async () => {
    let reject;
    endpoints.deleteAccount.mockImplementationOnce(() => new Promise((resolve, fail) => { reject = fail; }));
    jest.spyOn(Alert, 'alert').mockImplementation((_title, _body, actions) => actions[1].onPress());
    const view = render(<EliminarCuentaScreen />);
    fireEvent.changeText(view.getByLabelText('Contraseña actual'), 'incorrect-fixture');
    fireEvent(view.getByLabelText('Contraseña actual'), 'submitEditing');
    fireEvent(view.getByLabelText('Contraseña actual'), 'submitEditing');
    expect(endpoints.deleteAccount).toHaveBeenCalledTimes(1);
    reject({ response: { data: { code: 'INVALID_CURRENT_PASSWORD' } } });
    await waitFor(() => view.getByText('La contraseña actual no es correcta.'));
    expect(clearLocalSession).not.toHaveBeenCalled();
    expect(view.getByLabelText('Contraseña actual').props.editable).toBe(true);
  });
});
