import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import PrivacidadComunicacionesScreen from '../screens/PrivacidadComunicacionesScreen';
import { getConsents, updateMarketingConsent } from '../api/endpoints';

jest.mock('../components/context/AuthContext', () => ({ useAuth: () => ({ userId: 'privacy-fixture' }) }));
jest.mock('../api/endpoints', () => ({ getConsents: jest.fn(), updateMarketingConsent: jest.fn() }));
const data = { terms: { accepted: true, version: '1', acceptedAt: '2026-01-01' }, privacy: { accepted: true, version: '1', acceptedAt: '2026-01-01' }, marketing: { accepted: false } };
beforeEach(() => jest.clearAllMocks());

test('retrying a failed load restores the saved preference without changing it', async () => {
  getConsents.mockRejectedValueOnce(new Error('fixture'));
  getConsents.mockResolvedValueOnce({ data });
  const view = render(<PrivacidadComunicacionesScreen />);
  await waitFor(() => view.getByText('No se pudo cargar la configuración de privacidad.'));
  expect(view.queryByLabelText('Comunicaciones de marketing')).toBeNull();
  fireEvent.press(view.getByText('REINTENTAR'));
  await waitFor(() => view.getByLabelText('Comunicaciones de marketing'));
  expect(view.getByLabelText('Comunicaciones de marketing').props.value).toBe(false);
  expect(updateMarketingConsent).not.toHaveBeenCalled();
});

test('a failed save keeps the previous preference and permits retry without duplicate calls', async () => {
  let reject;
  getConsents.mockResolvedValueOnce({ data });
  updateMarketingConsent.mockImplementationOnce(() => new Promise((resolve, fail) => { reject = fail; }));
  const view = render(<PrivacidadComunicacionesScreen />);
  await waitFor(() => view.getByLabelText('Comunicaciones de marketing'));
  const toggle = view.getByLabelText('Comunicaciones de marketing');
  fireEvent(toggle, 'valueChange', true);
  fireEvent(toggle, 'valueChange', true);
  expect(updateMarketingConsent).toHaveBeenCalledTimes(1);
  expect(view.getByLabelText('Comunicaciones de marketing').props.value).toBe(false);
  reject(new Error('fixture'));
  await waitFor(() => view.getByText('No se pudo actualizar la preferencia de marketing.'));
  expect(view.getByLabelText('Comunicaciones de marketing').props.value).toBe(false);
  updateMarketingConsent.mockResolvedValueOnce({});
  fireEvent(view.getByLabelText('Comunicaciones de marketing'), 'valueChange', true);
  await waitFor(() => view.getByText('Preferencia de marketing actualizada.'));
  expect(view.getByLabelText('Comunicaciones de marketing').props.value).toBe(true);
  expect(view.queryByText('No se pudo actualizar la preferencia de marketing.')).toBeNull();
});
