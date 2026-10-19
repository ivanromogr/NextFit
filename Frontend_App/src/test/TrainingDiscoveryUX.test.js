import React from 'react';
import { Alert } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import Explore from '../screens/Cliente/ExplorarEntrenadores';
import Routines from '../screens/Cliente/RutinasClienteScreen';
import Workout from '../screens/Cliente/PantallaSesionEntrenamiento';
import * as api from '../api/endpoints';
const mockNavigate = jest.fn();
const mockBack = jest.fn();
let mockParams;
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockBack }),
  useRoute: () => ({ params: mockParams }),
  useFocusEffect: (callback) => require('react').useEffect(callback, [callback]),
}));
jest.mock('../components/context/AuthContext', () => ({ useAuth: () => ({ userId: 'athlete-fixture' }) }));
jest.mock('../api/endpoints', () => ({ api: { get: jest.fn() }, obtenerRutinasCliente: jest.fn(), obtenerRutinasAsignadasPorEntrenador: jest.fn(), obtenerUltimaSesionRutina: jest.fn(), guardarSesionRealizada: jest.fn() }));
jest.mock('lucide-react-native', () => new Proxy({ __esModule: true }, { get: (target, key) => key === '__esModule' ? true : () => null }));
jest.mock('expo-av', () => ({ Video: () => null, ResizeMode: {} }));
jest.mock('react-native-webview', () => ({ WebView: () => null }));

const coach = { id: 'coach-fixture', nombre: 'Coach', apellido: 'Prueba', especialidad: 'Fuerza' };
const routine = { id: 'routine-fixture', nombre: 'Rutina de prueba', creador: 'CLIENTE', detalles: [{ id: 'detail-fixture', ejercicio: { id: 'exercise-fixture', nombreTraducido: 'Sentadilla de prueba' }, series: 1, peso: 20, repeticiones: 8 }] };
beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  mockParams = { rutinaId: 'routine-fixture' };
  api.api.get.mockResolvedValue({ data: [coach] });
  api.obtenerRutinasCliente.mockResolvedValue([routine]);
  api.obtenerRutinasAsignadasPorEntrenador.mockResolvedValue([]);
  api.obtenerUltimaSesionRutina.mockResolvedValue(null);
  api.guardarSesionRealizada.mockResolvedValue({});
  jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
});
afterEach(() => { jest.useRealTimers(); Alert.alert.mockRestore(); });

test('explorar distingue fallo y lista vacía; reintentar permite abrir un perfil', async () => {
  api.api.get.mockRejectedValueOnce(new Error('network fixture'));
  const view = render(<Explore />);
  await waitFor(() => view.getByText(/No se pudieron cargar los entrenadores/));
  expect(view.queryByText('No hay resultados')).toBeNull();
  fireEvent.press(view.getByText('REINTENTAR'));
  await waitFor(() => view.getByRole('button', { name: 'Ver perfil de Coach Prueba' }));
  fireEvent.press(view.getByRole('button', { name: 'Ver perfil de Coach Prueba' }));
  expect(mockNavigate).toHaveBeenCalledWith('EntrenadorPerfil', { id: 'coach-fixture' });
});

test('el resultado de un filtro anterior no reemplaza al más reciente', async () => {
  let resolveOld;
  api.api.get.mockImplementationOnce(() => new Promise((done) => { resolveOld = done; }));
  api.api.get.mockResolvedValueOnce({ data: [{ ...coach, id: 'new-coach', apellido: 'Reciente' }] });
  const view = render(<Explore />);
  fireEvent.press(view.getByRole('button', { name: 'Filtros de entrenadores' }));
  fireEvent.press(view.getByText('Fuerza'));
  await waitFor(() => view.getByRole('button', { name: 'Ver perfil de Coach Reciente' }));
  await act(async () => { resolveOld({ data: [coach] }); });
  expect(view.getByRole('button', { name: 'Ver perfil de Coach Reciente' })).toBeTruthy();
  expect(view.queryByRole('button', { name: 'Ver perfil de Coach Prueba' })).toBeNull();
});

test('rutinas reintenta una carga fallida y conserva el destino del entrenamiento', async () => {
  api.obtenerRutinasCliente.mockRejectedValueOnce(new Error('network fixture'));
  const view = render(<Routines />);
  await waitFor(() => view.getByText(/No se pudieron cargar tus rutinas/));
  expect(view.queryByText('No tienes rutinas')).toBeNull();
  fireEvent.press(view.getByText('REINTENTAR'));
  await waitFor(() => view.getByRole('button', { name: 'Iniciar Rutina de prueba' }));
  fireEvent.press(view.getByRole('button', { name: 'Iniciar Rutina de prueba' }));
  expect(mockNavigate).toHaveBeenCalledWith('PantallaSesionEntrenamiento', { rutinaId: 'routine-fixture', nombre: 'Rutina de prueba' });
});

test('la pestaña de asignadas presenta las rutinas del entrenador', async () => {
  api.obtenerRutinasCliente.mockResolvedValueOnce([routine, { ...routine, id: 'assigned', nombre: 'Plan asignado', creador: 'ENTRENADOR' }]);
  const view = render(<Routines />);
  await waitFor(() => view.getByText('Rutina de prueba'));
  fireEvent.press(view.getByRole('tab', { name: 'Asignadas' }));
  expect(view.getByText('Plan asignado')).toBeTruthy();
  expect(view.queryByText('Rutina de prueba')).toBeNull();
});

test('un entrenamiento que no carga permite reintentar sin expulsar al usuario', async () => {
  api.obtenerRutinasCliente.mockRejectedValueOnce(new Error('network fixture'));
  const view = render(<Workout />);
  await waitFor(() => view.getByText(/No se pudo cargar el entrenamiento/));
  expect(mockBack).not.toHaveBeenCalled();
  fireEvent.press(view.getByText('REINTENTAR'));
  await waitFor(() => view.getByText('Sentadilla de prueba'));
});

test('guardar dos veces solo envía una sesión y no confirma éxito antes de recibir respuesta', async () => {
  let resolve;
  api.guardarSesionRealizada.mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
  const view = render(<Workout />);
  await waitFor(() => view.getByText('Sentadilla de prueba'));
  fireEvent.changeText(view.getByLabelText('Peso de la serie 1 de Sentadilla de prueba'), '30');
  fireEvent.changeText(view.getByLabelText('Repeticiones de la serie 1 de Sentadilla de prueba'), '10');
  fireEvent.press(view.getByRole('button', { name: 'Terminar entrenamiento' }));
  const save = view.getByText('GUARDAR');
  fireEvent.press(save);
  fireEvent.press(save);
  expect(api.guardarSesionRealizada).toHaveBeenCalledTimes(1);
  expect(api.guardarSesionRealizada).toHaveBeenCalledWith(expect.objectContaining({ series: [expect.objectContaining({ ejercicioId: 'exercise-fixture', peso: 30, reps: 10 })] }));
  expect(Alert.alert).not.toHaveBeenCalled();
  await act(async () => { resolve({}); });
  expect(view.getByText('GUARDADO')).toBeTruthy();
  fireEvent.press(view.getByRole('button', { name: 'Terminar entrenamiento' }));
  expect(api.guardarSesionRealizada).toHaveBeenCalledTimes(1);
});

test('un fallo al guardar conserva las series para corregir o reintentar', async () => {
  api.guardarSesionRealizada.mockRejectedValueOnce(new Error('network fixture'));
  const view = render(<Workout />);
  await waitFor(() => view.getByText('Sentadilla de prueba'));
  fireEvent.changeText(view.getByLabelText('Peso de la serie 1 de Sentadilla de prueba'), '35,5');
  fireEvent.press(view.getByRole('button', { name: 'Terminar entrenamiento' }));
  fireEvent.press(view.getByText('GUARDAR'));
  await waitFor(() => view.getByText(/Tus series siguen aquí/));
  fireEvent.press(view.getByText('SEGUIR'));
  expect(view.getByLabelText('Peso de la serie 1 de Sentadilla de prueba').props.value).toBe('35,5');
  fireEvent.press(view.getByRole('button', { name: 'Terminar entrenamiento' }));
  fireEvent.press(view.getByText('GUARDAR'));
  await waitFor(() => view.getByText('GUARDADO'));
  expect(api.guardarSesionRealizada).toHaveBeenLastCalledWith(expect.objectContaining({ series: [expect.objectContaining({ peso: 35.5 })] }));
});

test('el modo observador no permite editar ni guardar un entrenamiento', async () => {
  mockParams = { rutinaId: 'routine-fixture', isReadOnly: true, clienteId: 'other-athlete' };
  api.obtenerUltimaSesionRutina.mockResolvedValueOnce({ duracionSegundos: 60, series: [{ ejercicioId: 'exercise-fixture', setIndex: 0, peso: 40, reps: 8, rpe: 7 }] });
  const view = render(<Workout />);
  await waitFor(() => view.getByText('MODO OBSERVADOR'));
  expect(view.getByLabelText('Peso de la serie 1 de Sentadilla de prueba').props.editable).toBe(false);
  expect(view.queryByRole('button', { name: 'Terminar entrenamiento' })).toBeNull();
  expect(api.guardarSesionRealizada).not.toHaveBeenCalled();
});
