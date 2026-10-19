import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import ClienteDashboard from '../screens/DashboardScreen';
import CoachDashboard from '../screens/Entrenador/DashboardEntrenadorScreen';
import ClienteCalendar from '../screens/Cliente/CalendarioClienteScreen';
import CoachAgenda from '../screens/Entrenador/AgendaEntrenadorScreen';
import * as api from '../api/endpoints';
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
  useFocusEffect: (callback) => require('react').useEffect(callback, [callback]),
}));
jest.mock('../components/context/AuthContext', () => ({ useAuth: () => ({ userId: 'account-fixture', logout: jest.fn() }) }));
jest.mock('../api/endpoints', () => ({
  getCliente: jest.fn(), getEntrenador: jest.fn(), getImageUrl: jest.fn((value) => value || ''),
  obtenerResumenDashboard: jest.fn(), obtenerDashboardResumen: jest.fn(), obtenerClientesEntrenador: jest.fn(),
  obtenerEventosCalendario: jest.fn(), obtenerRutinasCliente: jest.fn(), obtenerRutinasAsignadasPorEntrenador: jest.fn(),
}));
jest.mock('lucide-react-native', () => new Proxy({ __esModule: true }, { get: (target, key) => key === '__esModule' ? true : () => null }));
jest.mock('react-native-calendars', () => ({
  LocaleConfig: { locales: {} },
  Calendar: (props) => {
    const React = require('react');
    const { Text, TouchableOpacity } = require('react-native');
    return React.createElement(TouchableOpacity, { onPress: () => props.onMonthChange({ dateString: '2027-02-01' }) }, React.createElement(Text, null, 'Mes siguiente de prueba'));
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
  api.getCliente.mockResolvedValue({ nombre: 'Atleta' });
  api.getEntrenador.mockResolvedValue({ nombre: 'Coach' });
  api.obtenerResumenDashboard.mockResolvedValue({ entrenosObjetivo: 3, entrenosHechos: 1 });
  api.obtenerDashboardResumen.mockResolvedValue({ stats: { hoy: 0, riesgo: 0, records: 0 } });
  api.obtenerClientesEntrenador.mockResolvedValue([]);
  api.obtenerEventosCalendario.mockResolvedValue([]);
  api.obtenerRutinasCliente.mockResolvedValue([]);
});

test('inicio de atleta muestra fallo y reintenta antes de ofrecer sus recorridos', async () => {
  api.obtenerResumenDashboard.mockRejectedValueOnce(new Error('fixture'));
  const view = render(<ClienteDashboard />);
  await waitFor(() => view.getByText(/No se pudo cargar tu inicio/));
  expect(view.queryByText('Rutinas')).toBeNull();
  fireEvent.press(view.getByText('REINTENTAR'));
  await waitFor(() => view.getByText('Rutinas'));
  fireEvent.press(view.getByText('Rutinas'));
  expect(mockNavigate).toHaveBeenCalledWith('Rutinas');
  fireEvent.press(view.getByText('Progreso'));
  expect(mockNavigate).toHaveBeenCalledWith('ProgresoCliente');
  fireEvent.press(view.getByText('Crear'));
  expect(mockNavigate).toHaveBeenCalledWith('CrearRutina', { isTemplate: false });
});

test('inicio de entrenador no presenta un equipo vacío por un fallo de red', async () => {
  api.obtenerClientesEntrenador.mockRejectedValueOnce(new Error('fixture'));
  const view = render(<CoachDashboard />);
  await waitFor(() => view.getByText(/No se pudo cargar el resumen de tu equipo/));
  fireEvent.press(view.getByText('REINTENTAR'));
  await waitFor(() => view.getByText(/Aquí tienes el resumen de tu equipo/));
  expect(api.obtenerClientesEntrenador).toHaveBeenCalledTimes(2);
});

test('calendario no confunde un fallo con un día libre y permite reintentar', async () => {
  api.obtenerEventosCalendario.mockRejectedValueOnce(new Error('fixture'));
  const view = render(<ClienteCalendar route={{}} />);
  await waitFor(() => view.getByText(/No se pudo cargar tu calendario/));
  expect(view.queryByText('Día libre')).toBeNull();
  fireEvent.press(view.getByText('REINTENTAR'));
  await waitFor(() => view.getByText('Día libre'));
});

test('una respuesta del mes anterior no reemplaza el calendario más reciente', async () => {
  let resolveOld;
  api.obtenerEventosCalendario.mockImplementationOnce(() => new Promise((done) => { resolveOld = done; }));
  api.obtenerEventosCalendario.mockResolvedValueOnce([{ id: 'new-fixture', fecha: '2027-02-01', rutinaNombre: 'Respuesta reciente' }]);
  const view = render(<ClienteCalendar route={{}} />);
  fireEvent.press(view.getByText('Mes siguiente de prueba'));
  await waitFor(() => view.getByText('Respuesta reciente'));
  const { act } = require('@testing-library/react-native');
  await act(async () => { resolveOld([{ id: 'old-fixture', fecha: '2000-01-01', rutinaNombre: 'Respuesta antigua' }]); });
  expect(view.queryByText('Respuesta antigua')).toBeNull();
  expect(view.getByText('Respuesta reciente')).toBeTruthy();
});

test('agenda no oculta el fallo de un calendario individual', async () => {
  api.obtenerClientesEntrenador.mockResolvedValue([{ id: 'athlete-fixture', nombre: 'Persona', apellido: 'Prueba' }]);
  api.obtenerEventosCalendario.mockRejectedValueOnce(new Error('fixture'));
  const view = render(<CoachAgenda />);
  await waitFor(() => view.getByText(/No se pudo cargar la agenda completa/));
  fireEvent.press(view.getByText('REINTENTAR'));
  await waitFor(() => view.getByText('AGENDA GLOBAL'));
  expect(api.obtenerEventosCalendario).toHaveBeenCalledTimes(2);
  expect(api.obtenerEventosCalendario).toHaveBeenLastCalledWith('athlete-fixture', expect.any(String), expect.any(String), 'account-fixture');
});


test('la vista del entrenador conserva el atleta y filtra sus rutinas y sesiones por entrenador', async () => {
  api.obtenerRutinasAsignadasPorEntrenador.mockResolvedValueOnce([]);
  const view = render(<ClienteCalendar route={{ params: { clienteIdProp: 'athlete-fixture' } }} />);
  await waitFor(() => view.getByText('Día libre'));
  expect(api.obtenerEventosCalendario).toHaveBeenCalledWith('athlete-fixture', expect.any(String), expect.any(String), 'account-fixture');
  expect(api.obtenerRutinasAsignadasPorEntrenador).toHaveBeenCalledWith('athlete-fixture', 'account-fixture', { throwOnError: true });
  expect(api.obtenerRutinasCliente).not.toHaveBeenCalled();
});
