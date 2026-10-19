import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import ClienteProfile from '../screens/Cliente/EditarPerfilCliente';
import CoachProfile from '../screens/Entrenador/EditarPerfilEntrenadorScreen';
import { getCliente, getEntrenador } from '../api/endpoints';
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }) }));
jest.mock('../components/context/AuthContext', () => ({ useAuth: () => ({ userId: 'fixture', logout: jest.fn() }) }));
jest.mock('../api/endpoints', () => ({ getCliente: jest.fn(), getEntrenador: jest.fn() }));
jest.mock('expo-image-picker', () => ({}));
jest.mock('lucide-react-native', () => {
  const names = ['User', 'Save', 'ChevronLeft', 'Camera', 'Mail', 'LogOut', 'CheckCircle', 'AlertCircle', 'Briefcase', 'AlignLeft', 'Globe', 'ChevronDown', 'X'];
  return Object.fromEntries(names.map((name) => [name, () => null]));
});
beforeEach(() => {
  jest.clearAllMocks();
  const fixture = { nombre: 'Persona', apellido: 'Prueba', email: 'saved@example.test' };
  getCliente.mockResolvedValue(fixture);
  getEntrenador.mockResolvedValue(fixture);
});

test.each([['atleta', ClienteProfile], ['entrenador', CoachProfile]])('perfil de %s dirige el cambio de correo al flujo verificado', async (_role, Screen) => {
  const view = render(<Screen />);
  await waitFor(() => view.getByLabelText('Correo electrónico actual'));
  expect(view.getByLabelText('Correo electrónico actual').props.editable).toBe(false);
  expect(view.getByLabelText('Correo electrónico actual').props.value).toBe('saved@example.test');
  fireEvent.press(view.getByRole('button', { name: 'Cambiar correo' }));
  expect(mockNavigate).toHaveBeenCalledWith('CambiarEmail');
  expect(view.getByRole('button', { name: 'Métodos de acceso' })).toBeTruthy();
});
