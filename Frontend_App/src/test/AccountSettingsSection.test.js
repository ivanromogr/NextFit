import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import AccountSettingsSection from '../components/ui/AccountSettingsSection';

test.each([
  ['Métodos de acceso', 'MetodosAcceso'],
  ['Cambiar contraseña', 'CambiarPassword'],
  ['Cambiar correo', 'CambiarEmail'],
  ['Sesiones activas', 'SesionesActivas'],
  ['Privacidad y comunicaciones', 'PrivacidadComunicaciones'],
  ['Exportar mis datos', 'ExportarDatos'],
  ['Eliminar cuenta', 'EliminarCuenta'],
])('%s opens its account flow without executing the action', (label, route) => {
  const navigate = jest.fn();
  const view = render(<AccountSettingsSection navigation={{ navigate }} />);
  fireEvent.press(view.getByRole('button', { name: label }));
  expect(navigate).toHaveBeenCalledTimes(1);
  expect(navigate).toHaveBeenCalledWith(route);
});
