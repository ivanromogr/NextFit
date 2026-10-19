import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import CambiarEmailScreen from '../screens/CambiarEmailScreen';
import ExportarDatosScreen from '../screens/ExportarDatosScreen';
import { requestEmailChange } from '../api/endpoints';
import { exportAndShareUserData } from '../services/dataExport';

jest.mock('../api/endpoints', () => ({ requestEmailChange: jest.fn() }));
jest.mock('../services/dataExport', () => ({ exportAndShareUserData: jest.fn() }));
beforeEach(() => jest.clearAllMocks());

test('email change validates email and password before contacting the server', () => {
  const view = render(<CambiarEmailScreen />);
  fireEvent.press(view.getByText('CAMBIAR CORREO'));
  expect(view.getByText('Introduce un correo válido.')).toBeTruthy();
  fireEvent.changeText(view.getByLabelText('Nuevo correo electrónico'), 'person@example.com');
  fireEvent.press(view.getByText('CAMBIAR CORREO'));
  expect(view.getByText('Introduce tu contraseña actual.')).toBeTruthy();
  expect(requestEmailChange).not.toHaveBeenCalled();
});

test('email change normalizes the address, preserves password and prevents duplicate submissions', async () => {
  let resolve;
  requestEmailChange.mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
  const view = render(<CambiarEmailScreen />);
  fireEvent.changeText(view.getByLabelText('Nuevo correo electrónico'), ' New@Example.COM ');
  fireEvent.changeText(view.getByLabelText('Contraseña actual'), ' password ');
  fireEvent(view.getByLabelText('Contraseña actual'), 'submitEditing');
  fireEvent(view.getByLabelText('Contraseña actual'), 'submitEditing');
  expect(requestEmailChange).toHaveBeenCalledTimes(1);
  expect(requestEmailChange).toHaveBeenCalledWith(' password ', 'new@example.com');
  resolve({});
  await waitFor(() => view.getByText(/Revisa tu nuevo correo/));
  expect(view.queryByLabelText('Contraseña actual')).toBeNull();
});

test('a rejected password leaves the email change form available for correction', async () => {
  requestEmailChange.mockRejectedValueOnce({ response: { data: { code: 'INVALID_CURRENT_PASSWORD' } } });
  const view = render(<CambiarEmailScreen />);
  fireEvent.changeText(view.getByLabelText('Nuevo correo electrónico'), 'new@example.com');
  fireEvent.changeText(view.getByLabelText('Contraseña actual'), 'incorrect');
  fireEvent.press(view.getByText('CAMBIAR CORREO'));
  await waitFor(() => view.getByText('La contraseña actual no es correcta.'));
  expect(view.getByLabelText('Contraseña actual').props.editable).toBe(true);
  expect(view.queryByText(/Revisa tu nuevo correo/)).toBeNull();
});

test('export creates only one sharing operation at a time and can be used again', async () => {
  let resolve;
  exportAndShareUserData.mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
  const view = render(<ExportarDatosScreen />);
  const button = view.getByText('EXPORTAR MIS DATOS');
  fireEvent.press(button);
  fireEvent.press(button);
  expect(exportAndShareUserData).toHaveBeenCalledTimes(1);
  resolve();
  await waitFor(() => view.getByText('EXPORTAR MIS DATOS'));
  exportAndShareUserData.mockResolvedValueOnce();
  fireEvent.press(view.getByText('EXPORTAR MIS DATOS'));
  await waitFor(() => expect(exportAndShareUserData).toHaveBeenCalledTimes(2));
});

test('export explains unavailable sharing and permits retry after an error', async () => {
  exportAndShareUserData.mockRejectedValueOnce(new Error('SHARING_UNAVAILABLE'));
  const view = render(<ExportarDatosScreen />);
  fireEvent.press(view.getByText('EXPORTAR MIS DATOS'));
  await waitFor(() => view.getByText('Compartir archivos no está disponible en este dispositivo.'));
  exportAndShareUserData.mockResolvedValueOnce();
  fireEvent.press(view.getByText('EXPORTAR MIS DATOS'));
  await waitFor(() => view.getByText('EXPORTAR MIS DATOS'));
  expect(view.queryByText('Compartir archivos no está disponible en este dispositivo.')).toBeNull();
});
