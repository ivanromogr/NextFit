import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import Screen from '../screens/PrivacidadComunicacionesScreen';
import { getConsents, updateMarketingConsent } from '../api/endpoints';

const mockAuth = { userId: 'first' };
jest.mock('../components/context/AuthContext', () => ({ useAuth: () => mockAuth }));
jest.mock('../api/endpoints', () => ({ getConsents: jest.fn(), updateMarketingConsent: jest.fn() }));
const data = accepted => ({ terms: { accepted: true, version: '1.0' }, privacy: { accepted: true, version: '1.0' }, marketing: { accepted } });
const navigation = { navigate: jest.fn(), goBack: jest.fn() };
beforeEach(() => {
  jest.clearAllMocks(); mockAuth.userId = 'first';
  getConsents.mockReset().mockResolvedValue({ data: data(false) });
  updateMarketingConsent.mockReset().mockResolvedValue({ status: 204 });
});
const ready = async view => waitFor(() => expect(view.getByLabelText('Comunicaciones de marketing').props.disabled).toBe(false));

test('legal documents remain accessible when the consent API fails', async () => {
  getConsents.mockRejectedValueOnce(new Error('offline'));
  const view = render(<Screen navigation={navigation} />);
  await view.findByText('No se pudo cargar la configuración de privacidad.');
  fireEvent.press(view.getByRole('button', { name: /leer términos de uso/i }));
  fireEvent.press(view.getByRole('button', { name: /leer política de privacidad/i }));
  expect(navigation.navigate.mock.calls).toEqual([['Terms'], ['Privacy']]);
});

test('invalid consent values cannot enable marketing', async () => {
  getConsents.mockResolvedValueOnce({ data: data('false') });
  const view = render(<Screen navigation={navigation} />);
  await view.findByText('No se pudo cargar la configuración de privacidad.');
  expect(view.queryByLabelText('Comunicaciones de marketing')).toBeNull();
  expect(updateMarketingConsent).not.toHaveBeenCalled();
});

test('does not load or modify consent without an account', () => {
  mockAuth.userId = null;
  const view = render(<Screen navigation={navigation} />);
  expect(getConsents).not.toHaveBeenCalled();
  expect(view.queryByLabelText('Comunicaciones de marketing')).toBeNull();
  expect(view.queryByRole('button', { name: 'REINTENTAR' })).toBeNull();
});

test('late loading from another account cannot replace its preferences', async () => {
  let finish;
  getConsents.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  const view = render(<Screen navigation={navigation} />);
  mockAuth.userId = 'second'; view.rerender(<Screen navigation={navigation} />);
  await ready(view);
  await act(async () => finish({ data: data(true) }));
  expect(view.getByLabelText('Comunicaciones de marketing').props.value).toBe(false);
});

test('late save cannot change another account or announce success there', async () => {
  let finish;
  updateMarketingConsent.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  const view = render(<Screen navigation={navigation} />); await ready(view);
  fireEvent(view.getByLabelText('Comunicaciones de marketing'), 'valueChange', true);
  mockAuth.userId = 'second'; view.rerender(<Screen navigation={navigation} />); await ready(view);
  await act(async () => finish({ status: 204 }));
  expect(view.getByLabelText('Comunicaciones de marketing').props.value).toBe(false);
  expect(view.queryByText('Preferencia de marketing actualizada.')).toBeNull();
});

test('saves serialize and only acknowledgement changes the confirmed preference', async () => {
  let finish;
  updateMarketingConsent.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  const view = render(<Screen navigation={navigation} />); await ready(view);
  const control = view.getByLabelText('Comunicaciones de marketing');
  fireEvent(control, 'valueChange', true); fireEvent(control, 'valueChange', true);
  expect(updateMarketingConsent).toHaveBeenCalledTimes(1);
  expect(view.getByLabelText('Comunicaciones de marketing').props.value).toBe(false);
  expect(view.getByLabelText('Comunicaciones de marketing').props.disabled).toBe(true);
  await act(async () => finish({ status: 204 }));
  expect(view.getByLabelText('Comunicaciones de marketing').props.value).toBe(true);
});

test('a failed save preserves the confirmed value and can be retried', async () => {
  updateMarketingConsent.mockRejectedValueOnce(new Error('offline'));
  const view = render(<Screen navigation={navigation} />); await ready(view);
  fireEvent(view.getByLabelText('Comunicaciones de marketing'), 'valueChange', true);
  await view.findByText('No se pudo actualizar la preferencia de marketing.');
  expect(view.getByLabelText('Comunicaciones de marketing').props.value).toBe(false);
  fireEvent(view.getByLabelText('Comunicaciones de marketing'), 'valueChange', true);
  await waitFor(() => expect(view.getByLabelText('Comunicaciones de marketing').props.value).toBe(true));
});
