import React from 'react';
import { Alert } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import EliminarCuentaScreen from '../screens/EliminarCuentaScreen';
import * as api from '../api/endpoints';
import { useAuth } from '../components/context/AuthContext';
import * as google from '../services/googleSignIn';
import * as apple from '../services/appleAuthNative';
jest.mock('../api/endpoints', () => ({ deleteAccount: jest.fn(), deleteAccountWithGoogle: jest.fn(), deleteAccountWithApple: jest.fn(), getAuthIdentities: jest.fn() }));
jest.mock('../components/context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../services/googleSignIn', () => ({ getGoogleIdToken: jest.fn(), isGoogleCancel: error => error?.code === 'CANCEL' }));
jest.mock('../services/appleAuthNative', () => ({ isAppleSignInAvailable: jest.fn(), startAppleSignIn: jest.fn() }));
const clear = jest.fn();
const methods = (...names) => ({ data: names.map(provider => ({ provider, active: true })) });
const open = async () => {
  const view = render(<EliminarCuentaScreen />);
  await act(async () => {});
  await waitFor(() => expect(view.queryByText('Cargando métodos de verificación…')).toBeNull(), { timeout: 5000 });
  return view;
};
beforeEach(() => {
  jest.resetAllMocks(); useAuth.mockReturnValue({ clearLocalSession: clear });
  clear.mockResolvedValue(); api.getAuthIdentities.mockResolvedValue(methods('LOCAL'));
  api.deleteAccount.mockResolvedValue({}); api.deleteAccountWithGoogle.mockResolvedValue({}); api.deleteAccountWithApple.mockResolvedValue({});
  apple.isAppleSignInAvailable.mockResolvedValue(true); apple.startAppleSignIn.mockResolvedValue({ identityToken: 'apple', nonce: 'nonce' });
  google.getGoogleIdToken.mockResolvedValue('google');
  jest.spyOn(Alert, 'alert').mockImplementation((_title, _body, actions) => actions[1].onPress());
});
afterEach(() => jest.restoreAllMocks());
it('confirma la contraseña y limpia sesión tras el éxito', async () => {
  const view = await open(); fireEvent.changeText(view.getByLabelText('Contraseña actual'), 'secret');
  fireEvent.press(view.getByText('ELIMINAR MI CUENTA'));
  await waitFor(() => expect(api.deleteAccount).toHaveBeenCalledWith('secret')); expect(clear).toHaveBeenCalled();
});
it('cancelar conserva la cuenta y permite abrir otra confirmación', async () => {
  Alert.alert.mockImplementation((_title, _body, actions) => actions[0].onPress());
  const view = await open(); fireEvent.changeText(view.getByLabelText('Contraseña actual'), 'secret');
  fireEvent.press(view.getByText('ELIMINAR MI CUENTA')); fireEvent.press(view.getByText('ELIMINAR MI CUENTA'));
  expect(Alert.alert).toHaveBeenCalledTimes(2); expect(api.deleteAccount).not.toHaveBeenCalled();
});
it('valida contraseña vacía antes de confirmar', async () => {
  const view = await open(); fireEvent.press(view.getByText('ELIMINAR MI CUENTA'));
  expect(view.getByText('Introduce tu contraseña actual.')).toBeTruthy(); expect(Alert.alert).not.toHaveBeenCalled();
});
it('Google-only no pide contraseña y bloquea peticiones simultáneas', async () => {
  let resolve; api.deleteAccountWithGoogle.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
  api.getAuthIdentities.mockResolvedValue(methods('GOOGLE')); const view = await open();
  expect(view.queryByLabelText('Contraseña actual')).toBeNull();
  fireEvent.press(view.getByText('CONFIRMAR CON GOOGLE Y ELIMINAR CUENTA'));
  await waitFor(() => expect(api.deleteAccountWithGoogle).toHaveBeenCalledWith('google'));
  fireEvent.press(view.getByText('CONFIRMAR CON GOOGLE Y ELIMINAR CUENTA'));
  expect(api.deleteAccountWithGoogle).toHaveBeenCalledTimes(1); resolve({}); await waitFor(() => expect(clear).toHaveBeenCalledTimes(1));
});
it('Apple-only confirma usando token y nonce', async () => {
  api.getAuthIdentities.mockResolvedValue(methods('APPLE')); const view = await open();
  fireEvent.press(view.getByText('CONFIRMAR CON APPLE Y ELIMINAR CUENTA'));
  await waitFor(() => expect(api.deleteAccountWithApple).toHaveBeenCalledWith('apple', 'nonce'));
  expect(api.deleteAccount).not.toHaveBeenCalled();
});
it('cancelar el proveedor no borra la cuenta ni la sesión', async () => {
  google.getGoogleIdToken.mockResolvedValueOnce(null); api.getAuthIdentities.mockResolvedValue(methods('GOOGLE'));
  const view = await open(); fireEvent.press(view.getByText('CONFIRMAR CON GOOGLE Y ELIMINAR CUENTA'));
  await waitFor(() => expect(google.getGoogleIdToken).toHaveBeenCalled());
  expect(api.deleteAccountWithGoogle).not.toHaveBeenCalled(); expect(clear).not.toHaveBeenCalled();
});
it('un error de verificación mantiene la sesión y permite reintentar', async () => {
  api.deleteAccountWithGoogle.mockRejectedValueOnce({ response: { data: { code: 'INVALID_REAUTH_TOKEN' } } });
  api.getAuthIdentities.mockResolvedValue(methods('GOOGLE')); const view = await open();
  fireEvent.press(view.getByText('CONFIRMAR CON GOOGLE Y ELIMINAR CUENTA'));
  await waitFor(() => view.getByText('Confirma tu identidad con una cuenta que esté vinculada a NextFit.'));
  expect(clear).not.toHaveBeenCalled();
});
it('si falla cargar métodos no permite borrar y ofrece reintentar', async () => {
  api.getAuthIdentities.mockRejectedValueOnce(new Error('offline')); const view = await open();
  expect(view.queryByLabelText('Contraseña actual')).toBeNull(); fireEvent.press(view.getByText('REINTENTAR'));
  await waitFor(() => view.getByLabelText('Contraseña actual')); expect(api.deleteAccount).not.toHaveBeenCalled();
});

it('salir mientras Google verifica no inicia una baja tardía', async () => {
  let finish;
  google.getGoogleIdToken.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  api.getAuthIdentities.mockResolvedValue(methods('GOOGLE'));
  const view = await open(); fireEvent.press(view.getByText('CONFIRMAR CON GOOGLE Y ELIMINAR CUENTA'));
  await waitFor(() => expect(google.getGoogleIdToken).toHaveBeenCalled());
  view.unmount(); await act(async () => { finish('late-google'); });
  expect(api.deleteAccountWithGoogle).not.toHaveBeenCalled(); expect(clear).not.toHaveBeenCalled();
});
