import React from 'react';
import { Alert } from 'react-native';
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react-native';
import Create from '../components/functional/CrearRutinaScreen';
import Edit from '../screens/Cliente/EditarRutinaScreen';
import * as api from '../api/endpoints';
const mockBack = jest.fn();
const mockNavigate = jest.fn();
let mockParams;
jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ navigate: mockNavigate, goBack: mockBack }), useRoute: () => ({ params: mockParams }) }));
jest.mock('../components/context/AuthContext', () => ({ useAuth: () => ({ userId: 'athlete-fixture', user: { role: 'CLIENTE' } }) }));
jest.mock('../api/endpoints', () => ({ obtenerEjercicios: jest.fn(), obtenerRutinasCliente: jest.fn(), actualizarRutina: jest.fn(), guardarRutinaManual: jest.fn(), generarRutinaAuto: jest.fn() }));
jest.mock('lucide-react-native', () => new Proxy({ __esModule: true }, { get: (target, key) => key === '__esModule' ? true : () => null }));
jest.mock('expo-av', () => ({ Video: () => null, ResizeMode: {} }));
jest.mock('react-native-webview', () => ({ WebView: () => null }));
const exercise = { id: 'exercise-fixture', nombre: 'Sentadilla', nombreTraducido: 'Sentadilla', grupoMuscular: 'Piernas', grupoMuscularTraducido: 'Piernas' };
const routine = { id: 'routine-fixture', nombre: 'Plan anterior', descripcion: 'Descripción', detalles: [{ ejercicio: exercise, series: 2, repeticiones: 10, peso: 20, rpe: 8 }] };
beforeEach(() => {
  jest.useFakeTimers(); jest.clearAllMocks();
  mockParams = {};
  api.obtenerEjercicios.mockResolvedValue([exercise]);
  api.obtenerRutinasCliente.mockResolvedValue([routine]);
  api.actualizarRutina.mockResolvedValue({});
  api.guardarRutinaManual.mockResolvedValue({});
  api.generarRutinaAuto.mockResolvedValue({});
  jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
});
afterEach(() => { cleanup(); jest.clearAllTimers(); jest.useRealTimers(); Alert.alert.mockRestore(); });

async function manual() {
  const view = render(<Create />);
  await act(async () => { fireEvent.press(view.getByText('DISEÑAR MANUAL')); });
  fireEvent.changeText(view.getByPlaceholderText('Nombre del entrenamiento'), ' Plan de prueba ');
  fireEvent.press(view.getByText('AGREGAR EJERCICIO'));
  await waitFor(() => view.getByRole('button', { name: 'Añadir Sentadilla' }));
  fireEvent.press(view.getByRole('button', { name: 'Añadir Sentadilla' }));
  fireEvent.press(view.getByRole('button', { name: 'Cerrar biblioteca' }));
  return view;
}

test('crear exige nombre y ejercicios antes de enviar', async () => {
  const view = render(<Create />);
  await act(async () => { fireEvent.press(view.getByText('DISEÑAR MANUAL')); });
  fireEvent.press(view.getByRole('button', { name: 'Guardar rutina' }));
  expect(api.guardarRutinaManual).not.toHaveBeenCalled();
  fireEvent.changeText(view.getByPlaceholderText('Nombre del entrenamiento'), 'Plan');
  fireEvent.press(view.getByRole('button', { name: 'Guardar rutina' }));
  expect(Alert.alert).toHaveBeenLastCalledWith('Rutina vacía', 'Añade al menos un ejercicio.');
  expect(api.guardarRutinaManual).not.toHaveBeenCalled();
});

test('la biblioteca ofrece reintento y conserva el nombre escrito', async () => {
  api.obtenerEjercicios.mockRejectedValueOnce(new Error('network fixture'));
  const view = render(<Create />);
  await act(async () => { fireEvent.press(view.getByText('DISEÑAR MANUAL')); });
  fireEvent.changeText(view.getByPlaceholderText('Nombre del entrenamiento'), 'Mi borrador');
  fireEvent.press(view.getByText('AGREGAR EJERCICIO'));
  await waitFor(() => view.getByText(/No se pudo cargar la biblioteca/));
  expect(view.queryByText('No se encontraron ejercicios')).toBeNull();
  fireEvent.press(view.getByText('REINTENTAR BIBLIOTECA'));
  await waitFor(() => view.getByRole('button', { name: 'Añadir Sentadilla' }));
  fireEvent.press(view.getByRole('button', { name: 'Cerrar biblioteca' }));
  expect(view.getByPlaceholderText('Nombre del entrenamiento').props.value).toBe('Mi borrador');
});

test('crear bloquea envíos simultáneos y guarda pesos con coma decimal', async () => {
  let resolve;
  api.guardarRutinaManual.mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
  const view = await manual();
  fireEvent.changeText(view.getByLabelText('Peso de Sentadilla'), '35,5');
  const save = view.getByRole('button', { name: 'Guardar rutina' });
  fireEvent.press(save); fireEvent.press(save);
  expect(api.guardarRutinaManual).toHaveBeenCalledTimes(1);
  expect(api.guardarRutinaManual).toHaveBeenCalledWith(expect.objectContaining({ nombre: 'Plan de prueba', ejercicios: [expect.objectContaining({ idEjercicio: 'exercise-fixture', peso: 35.5 })] }));
  expect(Alert.alert).not.toHaveBeenCalled();
  await act(async () => { resolve({}); });
  expect(view.getByText('GUARDADO')).toBeTruthy();
  fireEvent.press(view.getByRole('button', { name: 'Guardar rutina' }));
  expect(api.guardarRutinaManual).toHaveBeenCalledTimes(1);
});

test('crear conserva el borrador al fallar y permite reintentar', async () => {
  api.guardarRutinaManual.mockRejectedValueOnce(new Error('network fixture'));
  const view = await manual();
  fireEvent.changeText(view.getByLabelText('Peso de Sentadilla'), '40,5');
  fireEvent.press(view.getByRole('button', { name: 'Guardar rutina' }));
  await waitFor(() => view.getByText(/Tus cambios siguen aquí/));
  expect(view.getByLabelText('Peso de Sentadilla').props.value).toBe('40,5');
  expect(view.getByPlaceholderText('Nombre del entrenamiento').props.value).toBe(' Plan de prueba ');
  fireEvent.press(view.getByRole('button', { name: 'Guardar rutina' }));
  await waitFor(() => view.getByText('GUARDADO'));
  expect(api.guardarRutinaManual).toHaveBeenCalledTimes(2);
});

test('editar permite reintentar una carga fallida sin mostrar un formulario vacío', async () => {
  mockParams = { rutinaId: 'routine-fixture' };
  api.obtenerRutinasCliente.mockRejectedValueOnce(new Error('network fixture'));
  const view = render(<Edit />);
  await waitFor(() => view.getByText(/No se pudo cargar la rutina/));
  expect(view.queryByPlaceholderText('Nombre del entrenamiento')).toBeNull();
  expect(mockBack).not.toHaveBeenCalled();
  fireEvent.press(view.getByText('REINTENTAR'));
  await waitFor(() => view.getByPlaceholderText('Nombre del entrenamiento'));
  expect(view.getByPlaceholderText('Nombre del entrenamiento').props.value).toBe('Plan anterior');
});

test('editar mantiene una pauta común visible y no duplica la actualización', async () => {
  mockParams = { rutinaId: 'routine-fixture' };
  let resolve;
  api.actualizarRutina.mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
  const view = render(<Edit />);
  await waitFor(() => view.getByLabelText('Peso de la serie 1 de Sentadilla'));
  fireEvent.changeText(view.getByLabelText('Peso de la serie 2 de Sentadilla'), '32,5');
  expect(view.getByLabelText('Peso de la serie 1 de Sentadilla').props.value).toBe('32,5');
  const save = view.getByRole('button', { name: 'Guardar cambios' });
  fireEvent.press(save); fireEvent.press(save);
  expect(api.actualizarRutina).toHaveBeenCalledTimes(1);
  expect(api.actualizarRutina).toHaveBeenCalledWith('routine-fixture', expect.objectContaining({ detalles: [expect.objectContaining({ series: 2, peso: 32.5 })] }));
  await act(async () => { resolve({}); });
  fireEvent.press(view.getByRole('button', { name: 'Guardar cambios' }));
  expect(api.actualizarRutina).toHaveBeenCalledTimes(1);
});

test('editar conserva los cambios tras un fallo y permite reintentar', async () => {
  mockParams = { rutinaId: 'routine-fixture' };
  api.actualizarRutina.mockRejectedValueOnce(new Error('network fixture'));
  const view = render(<Edit />);
  await waitFor(() => view.getByPlaceholderText('Nombre del entrenamiento'));
  fireEvent.changeText(view.getByPlaceholderText('Nombre del entrenamiento'), 'Nombre corregido');
  fireEvent.press(view.getByRole('button', { name: 'Guardar cambios' }));
  await waitFor(() => view.getByText(/Tus cambios siguen aquí/));
  expect(view.getByPlaceholderText('Nombre del entrenamiento').props.value).toBe('Nombre corregido');
  fireEvent.press(view.getByRole('button', { name: 'Guardar cambios' }));
  await waitFor(() => expect(api.actualizarRutina).toHaveBeenCalledTimes(2));
});

test('generar un plan no duplica peticiones y permite reintentar conservando las opciones', async () => {
  let reject;
  api.generarRutinaAuto.mockImplementationOnce(() => new Promise((resolve, fail) => { reject = fail; }));
  const view = render(<Create />);
  fireEvent.press(view.getByText('GENERAR RUTINAS'));
  fireEvent.press(view.getByText('FUERZA'));
  fireEvent.press(view.getByText('PRINCIPIANTE'));
  fireEvent.press(view.getByText('3 DÍAS'));
  const generate = view.getByRole('button', { name: 'Generar plan automático' });
  fireEvent.press(generate); fireEvent.press(generate);
  expect(api.generarRutinaAuto).toHaveBeenCalledTimes(1);
  await act(async () => { reject(new Error('network fixture')); });
  expect(view.getByText(/Conservamos tus opciones/)).toBeTruthy();
  await act(async () => { fireEvent.press(view.getByRole('button', { name: 'Generar plan automático' })); });
  await waitFor(() => expect(api.generarRutinaAuto).toHaveBeenCalledTimes(2));
  expect(api.generarRutinaAuto).toHaveBeenLastCalledWith(expect.objectContaining({ objetivo: 'FUERZA', nivel: 'PRINCIPIANTE', diasSemana: 3 }));
});


test('editar busca por el nombre traducido de un ejercicio y permite añadirlo', async () => {
  mockParams = { rutinaId: 'routine-fixture' };
  api.obtenerEjercicios.mockResolvedValueOnce([{ ...exercise, nombre: 'Squat' }]);
  const view = render(<Edit />);
  await waitFor(() => view.getByPlaceholderText('Nombre del entrenamiento'));
  fireEvent.press(view.getByText('AÑADIR'));
  fireEvent.changeText(view.getByLabelText('Buscar ejercicio'), 'Sentadilla');
  expect(view.getByRole('button', { name: 'Añadir Sentadilla' })).toBeTruthy();
  fireEvent.press(view.getByRole('button', { name: 'Añadir Sentadilla' }));
  expect(view.getByText('RUTINA ACTUAL (2)')).toBeTruthy();
});
