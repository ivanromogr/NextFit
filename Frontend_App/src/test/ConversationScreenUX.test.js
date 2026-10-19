import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import PantallaChatIndividual from '../screens/Cliente/PantallaChatIndividual';
const mockBack = jest.fn();
const mockChat = jest.fn(() => null);
let mockParams;
jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ goBack: mockBack }), useRoute: () => ({ params: mockParams }) }));
jest.mock('../components/context/AuthContext', () => ({ useAuth: () => ({ userId: 'self-fixture' }) }));
jest.mock('../components/functional/ChatComponent', () => (props) => mockChat(props));
jest.mock('lucide-react-native', () => ({ ChevronLeft: () => null }));
beforeEach(() => jest.clearAllMocks());

test('abre la conversación usando el identificador de sesión y permite volver sin inventar presencia', () => {
  mockParams = { destinatarioId: 'friend-fixture', nombreDestinatario: 'Ana Prueba' };
  const view = render(<PantallaChatIndividual />);
  expect(mockChat).toHaveBeenCalledWith(expect.objectContaining({ usuarioId: 'self-fixture', destinatarioId: 'friend-fixture' }));
  expect(view.queryByText('En línea')).toBeNull();
  fireEvent.press(view.getByRole('button', { name: 'Volver a conversaciones' }));
  expect(mockBack).toHaveBeenCalledTimes(1);
});

test('sin destinatario ofrece volver y no intenta abrir un chat inválido', () => {
  mockParams = undefined;
  const view = render(<PantallaChatIndividual />);
  expect(view.getByText(/No se pudo abrir esta conversación/)).toBeTruthy();
  expect(mockChat).not.toHaveBeenCalled();
});
