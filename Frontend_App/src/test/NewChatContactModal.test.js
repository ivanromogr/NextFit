import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import NewChatContactModal from '../components/ui/NewChatContactModal';
import { buscarUsuarioPorEmail } from '../api/endpoints';
jest.mock('../api/endpoints', () => ({ buscarUsuarioPorEmail: jest.fn() }));
beforeEach(() => jest.clearAllMocks());

test('búsqueda valida el correo y no permite consultar la propia cuenta como contacto', async () => {
  const onAdd = jest.fn();
  const view = render(<NewChatContactModal visible ownUserId="self" onClose={jest.fn()} onAdd={onAdd} />);
  fireEvent.press(view.getByText('BUSCAR'));
  expect(view.getByText('Introduce un correo electrónico válido.')).toBeTruthy();
  expect(buscarUsuarioPorEmail).not.toHaveBeenCalled();
  buscarUsuarioPorEmail.mockResolvedValueOnce({ id: 'self', nombre: 'Persona' });
  fireEvent.changeText(view.getByLabelText('Correo del contacto'), 'self@example.test');
  fireEvent.press(view.getByText('BUSCAR'));
  await waitFor(() => view.getByText('No puedes añadir tu propia cuenta como contacto.'));
  expect(onAdd).not.toHaveBeenCalled();
});

test('el teclado no duplica la búsqueda y el alias se conserva al añadir', async () => {
  let resolve;
  const onAdd = jest.fn();
  buscarUsuarioPorEmail.mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
  const view = render(<NewChatContactModal visible ownUserId="self" onClose={jest.fn()} onAdd={onAdd} />);
  const email = view.getByLabelText('Correo del contacto');
  fireEvent.changeText(email, ' Person+Gym@Example.Test ');
  fireEvent(email, 'submitEditing');
  fireEvent(email, 'submitEditing');
  expect(buscarUsuarioPorEmail).toHaveBeenCalledTimes(1);
  expect(buscarUsuarioPorEmail).toHaveBeenCalledWith('person+gym@example.test');
  await act(async () => { resolve({ id: 'friend', nombre: 'Ana', apellido: 'Prueba' }); });
  fireEvent.changeText(view.getByLabelText('Nombre del contacto'), '  Compañera  ');
  fireEvent(view.getByLabelText('Nombre del contacto'), 'submitEditing');
  fireEvent(view.getByLabelText('Nombre del contacto'), 'submitEditing');
  expect(onAdd).toHaveBeenCalledTimes(1);
  expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ id: 'friend', alias: 'Compañera' }));
});

test('un fallo de red permite reintentar y no afirma que el contacto no exista', async () => {
  buscarUsuarioPorEmail.mockRejectedValueOnce(new Error('network fixture'));
  buscarUsuarioPorEmail.mockResolvedValueOnce({ id: 'friend', nombre: 'Ana' });
  const view = render(<NewChatContactModal visible ownUserId="self" onClose={jest.fn()} onAdd={jest.fn()} />);
  fireEvent.changeText(view.getByLabelText('Correo del contacto'), 'person@example.test');
  fireEvent.press(view.getByText('BUSCAR'));
  await waitFor(() => view.getByText(/Comprueba la conexión/));
  expect(view.queryByText('No se encontró un contacto con ese correo.')).toBeNull();
  fireEvent.press(view.getByText('BUSCAR'));
  await waitFor(() => view.getByLabelText('Nombre del contacto'));
});

test('cerrar el modal descarta una respuesta tardía de la búsqueda', async () => {
  let resolve;
  const onAdd = jest.fn();
  buscarUsuarioPorEmail.mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
  const props = { ownUserId: 'self', onClose: jest.fn(), onAdd };
  const view = render(<NewChatContactModal {...props} visible />);
  fireEvent.changeText(view.getByLabelText('Correo del contacto'), 'person@example.test');
  fireEvent.press(view.getByText('BUSCAR'));
  fireEvent.press(view.getByText('CANCELAR'));
  view.rerender(<NewChatContactModal {...props} visible={false} />);
  await act(async () => { resolve({ id: 'friend', nombre: 'Ana' }); });
  view.rerender(<NewChatContactModal {...props} visible />);
  expect(view.queryByLabelText('Nombre del contacto')).toBeNull();
  expect(view.getByLabelText('Correo del contacto').props.value).toBe('');
  expect(onAdd).not.toHaveBeenCalled();
});
