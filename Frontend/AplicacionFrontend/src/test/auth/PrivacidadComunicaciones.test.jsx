import '@testing-library/jest-dom';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import PrivacidadComunicaciones from '../../pages/auth/PrivacidadComunicaciones';
const { api, auth } = vi.hoisted(() => ({api: {getConsents: vi.fn(), updateMarketingConsent: vi.fn()}, auth: {userId: 'first'}}));
vi.mock('../../api/endpoints', () => api);
vi.mock('../../context/AuthContext', () => ({useAuth: () => auth}));
const data = accepted => ({terms: {accepted: true, version: '1.0'}, privacy: {accepted: true, version: '1.0'}, marketing: {accepted}});
beforeEach(() => {
  vi.clearAllMocks(); auth.userId = 'first';
  api.getConsents.mockReset().mockResolvedValue({data: data(false)});
  api.updateMarketingConsent.mockReset().mockResolvedValue({status: 204});
});
it('retries failed loading without presenting invented legal records', async () => {
  api.getConsents.mockRejectedValueOnce(new Error('offline'));
  render(<PrivacidadComunicaciones />);
  expect(screen.getByLabelText('Comunicaciones de marketing')).toBeDisabled();
  await screen.findByRole('alert');
  expect(screen.queryByText(/versión/)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', {name: 'Reintentar privacidad'}));
  await waitFor(() => expect(screen.getByLabelText('Comunicaciones de marketing')).toBeEnabled());
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});
it('rejects a string consent value instead of enabling marketing', async () => {
  api.getConsents.mockResolvedValue({data: data('false')});
  render(<PrivacidadComunicaciones />);
  await screen.findByRole('alert');
  expect(screen.getByLabelText('Comunicaciones de marketing')).not.toBeChecked();
  expect(screen.getByLabelText('Comunicaciones de marketing')).toBeDisabled();
});
it('serializes saves and waits for acknowledgement before changing the value', async () => {
  let finish;
  api.updateMarketingConsent.mockImplementationOnce(() => new Promise(resolve => {finish = resolve;}));
  render(<PrivacidadComunicaciones />);
  const checkbox = screen.getByLabelText('Comunicaciones de marketing');
  await waitFor(() => expect(checkbox).toBeEnabled());
  fireEvent.click(checkbox); fireEvent.click(checkbox);
  expect(api.updateMarketingConsent).toHaveBeenCalledTimes(1);
  expect(checkbox).toBeDisabled(); expect(checkbox).not.toBeChecked();
  await act(async () => finish({status: 204}));
  expect(checkbox).toBeChecked(); expect(checkbox).toBeEnabled();
});
it('keeps the confirmed value after failure and allows a real retry', async () => {
  api.updateMarketingConsent.mockRejectedValueOnce(new Error('offline'));
  render(<PrivacidadComunicaciones />);
  const checkbox = screen.getByLabelText('Comunicaciones de marketing');
  await waitFor(() => expect(checkbox).toBeEnabled());
  fireEvent.click(checkbox);
  expect(await screen.findByRole('status')).toHaveTextContent('No se pudo actualizar');
  expect(checkbox).not.toBeChecked(); fireEvent.click(checkbox);
  await waitFor(() => expect(checkbox).toBeChecked());
  expect(api.updateMarketingConsent).toHaveBeenNthCalledWith(2, true);
});
it('ignores an old account load after switching accounts', async () => {
  let finish;
  api.getConsents.mockReturnValueOnce(new Promise(resolve => {finish = resolve;}));
  const view = render(<PrivacidadComunicaciones />);
  await waitFor(() => expect(api.getConsents).toHaveBeenCalledTimes(1));
  auth.userId = 'second'; view.rerender(<PrivacidadComunicaciones />);
  await waitFor(() => expect(screen.getByLabelText('Comunicaciones de marketing')).toBeEnabled());
  await act(async () => finish({data: data(true)}));
  expect(screen.getByLabelText('Comunicaciones de marketing')).not.toBeChecked();
});
it('does not apply a delayed save or its success message to another account', async () => {
  let finish;
  api.updateMarketingConsent.mockImplementationOnce(() => new Promise(resolve => {finish = resolve;}));
  const view = render(<PrivacidadComunicaciones />);
  await waitFor(() => expect(screen.getByLabelText('Comunicaciones de marketing')).toBeEnabled());
  fireEvent.click(screen.getByLabelText('Comunicaciones de marketing'));
  auth.userId = 'second'; view.rerender(<PrivacidadComunicaciones />);
  await waitFor(() => expect(screen.getByLabelText('Comunicaciones de marketing')).toBeEnabled());
  await act(async () => finish({status: 204}));
  expect(screen.getByLabelText('Comunicaciones de marketing')).not.toBeChecked();
  expect(screen.queryByText('Preferencia de marketing actualizada.')).not.toBeInTheDocument();
});
it('does not load or allow changes without an authenticated account', () => {
  auth.userId = null; render(<PrivacidadComunicaciones />);
  expect(api.getConsents).not.toHaveBeenCalled();
  expect(screen.getByLabelText('Comunicaciones de marketing')).toBeDisabled();
});
