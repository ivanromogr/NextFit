import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ChatClienteScreen from '../screens/Cliente/ChatClienteScreen';
import ChatsEntrenadorScreen from '../screens/Entrenador/ChatsEntrenadorScreen';
import * as api from '../api/endpoints';
import { getAccessToken } from '../components/context/authSession';

const mockNavigate = jest.fn();
const mockClients = [];
let mockFocus;
let mockUserId = 'self-fixture';
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
  useFocusEffect: (callback) => { mockFocus = callback; require('react').useEffect(callback, [callback]); },
}));
jest.mock('../components/context/AuthContext', () => ({ useAuth: () => ({ userId: mockUserId }) }));
jest.mock('../components/context/authSession', () => ({ getAccessToken: jest.fn() }));
jest.mock('../api/endpoints', () => ({ getCliente: jest.fn(), obtenerClientesEntrenador: jest.fn(), obtenerContactosChat: jest.fn(), buscarUsuarioPorEmail: jest.fn() }));
jest.mock('lucide-react-native', () => ({ Plus: () => null, Search: () => null, User: () => null }));
jest.mock('@stomp/stompjs', () => ({ Client: class {
  constructor(options) { this.options = options; this.activate = jest.fn(); this.deactivate = jest.fn(); this.subscribe = jest.fn((_destination, callback) => { this.receive = callback; }); mockClients.push(this); }
} }));

const friend = { id: 'friend-fixture', nombre: 'Ana', apellido: 'Prueba' };
beforeEach(() => {
  jest.clearAllMocks();
  mockClients.length = 0;
  mockUserId = 'self-fixture';
  AsyncStorage.getItem.mockResolvedValue(null);
  AsyncStorage.setItem.mockResolvedValue();
  api.getCliente.mockResolvedValue({ entrenador: { id: 'coach-fixture', nombre: 'Coach', apellido: 'Prueba' } });
  api.obtenerClientesEntrenador.mockResolvedValue([]);
  api.obtenerContactosChat.mockResolvedValue([friend]);
  getAccessToken.mockResolvedValue('access-token-fixture');
});

const screens = [['atleta', ChatClienteScreen], ['entrenador', ChatsEntrenadorScreen]];

test.each(screens)('chat de %s muestra contactos del servidor y abre la conversación compartida', async (_role, Screen) => {
  const view = render(<Screen />);
  await waitFor(() => view.getByText('Ana Prueba'));
  fireEvent.press(view.getByRole('button', { name: 'Ana Prueba' }));
  expect(mockNavigate).toHaveBeenCalledWith('PantallaChatIndividual', expect.objectContaining({ destinatarioId: 'friend-fixture', nombreDestinatario: 'Ana Prueba' }));
});

test.each(screens)('chat de %s distingue fallo de carga y permite reintentar', async (_role, Screen) => {
  api.obtenerContactosChat.mockRejectedValueOnce(new Error('network fixture'));
  const view = render(<Screen />);
  await waitFor(() => view.getByText(/No se pudieron cargar los contactos/));
  expect(view.queryByText(/Aún no tienes contactos/)).toBeNull();
  fireEvent.press(view.getByText('REINTENTAR'));
  await waitFor(() => view.getByText('Ana Prueba'));
  expect(view.queryByText(/No se pudieron cargar los contactos/)).toBeNull();
});

test.each(screens)('chat de %s recupera la lista del servidor aunque la caché esté dañada', async (_role, Screen) => {
  AsyncStorage.getItem.mockResolvedValueOnce('{invalid-json');
  const view = render(<Screen />);
  await waitFor(() => view.getByText('Ana Prueba'));
  expect(view.getByText(/No se pudieron recuperar los contactos guardados/)).toBeTruthy();
});

test.each(screens)('chat de %s busca por alias y distingue una búsqueda sin coincidencias', async (_role, Screen) => {
  AsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify([{ ...friend, alias: 'Compañera de fuerza' }]));
  const view = render(<Screen />);
  await waitFor(() => view.getByText('Compañera de fuerza'));
  fireEvent.changeText(view.getByLabelText('Buscar conversaciones'), '  FUERZA  ');
  expect(view.getByText('Compañera de fuerza')).toBeTruthy();
  fireEvent.changeText(view.getByLabelText('Buscar conversaciones'), 'sin coincidencias');
  expect(view.getByText(/No hay conversaciones que coincidan/)).toBeTruthy();
  expect(view.queryByText(/Aún no tienes contactos/)).toBeNull();
});

test('notificaciones usan credenciales actuales, toleran cargas inválidas y limpian la conexión', async () => {
  const view = render(<ChatClienteScreen />);
  await waitFor(() => view.getByText('Ana Prueba'));
  const client = mockClients[0];
  await client.options.beforeConnect();
  expect(client.connectHeaders).toEqual({ Authorization: 'Bearer access-token-fixture' });
  act(() => client.options.onConnect());
  act(() => { client.receive({ body: 'invalid-json' }); client.receive({ body: 'null' }); });
  act(() => client.receive({ body: JSON.stringify({ remitenteId: 'friend-fixture' }) }));
  expect(view.getByRole('button', { name: 'Ana Prueba, nuevos mensajes' })).toBeTruthy();
  fireEvent.press(view.getByRole('button', { name: 'Ana Prueba, nuevos mensajes' }));
  act(() => client.receive({ body: JSON.stringify({ remitenteId: 'friend-fixture' }) }));
  expect(view.queryByRole('button', { name: 'Ana Prueba, nuevos mensajes' })).toBeNull();
  await act(async () => { mockFocus(); });
  view.unmount();
  expect(client.deactivate).toHaveBeenCalledTimes(1);
});

test('contactos con identificador numérico y textual no se duplican', async () => {
  AsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify([{ id: 12, nombre: 'Persona', apellido: 'Prueba' }]));
  api.obtenerContactosChat.mockResolvedValueOnce([{ id: '12', nombre: 'Persona', apellido: 'Prueba' }]);
  const view = render(<ChatsEntrenadorScreen />);
  await waitFor(() => view.getByText('Persona Prueba'));
  expect(view.getAllByText('Persona Prueba')).toHaveLength(1);
});


test('cambiar de cuenta no mezcla ni guarda contactos de la cuenta anterior', async () => {
  AsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify([{ id: 'private-old-fixture', nombre: 'Contacto', apellido: 'Anterior' }]));
  const view = render(<ChatClienteScreen />);
  await waitFor(() => view.getByText('Contacto Anterior'));
  await waitFor(() => expect(AsyncStorage.setItem).toHaveBeenCalled());
  AsyncStorage.getItem.mockResolvedValueOnce(null);
  api.obtenerContactosChat.mockResolvedValueOnce([{ id: 'new-fixture', nombre: 'Contacto', apellido: 'Nuevo' }]);
  mockUserId = 'new-account-fixture';
  view.rerender(<ChatClienteScreen />);
  await waitFor(() => view.getByText('Contacto Nuevo'));
  expect(view.queryByText('Contacto Anterior')).toBeNull();
  await waitFor(() => expect(AsyncStorage.setItem).toHaveBeenCalledWith('contactos_chat_new-account-fixture', expect.any(String)));
  const newWrites = AsyncStorage.setItem.mock.calls.filter(([key]) => key === 'contactos_chat_new-account-fixture');
  expect(newWrites.length).toBeGreaterThan(0);
  for (const [, value] of newWrites) expect(JSON.parse(value).some((contact) => contact.id === 'private-old-fixture')).toBe(false);
});
