import '@testing-library/jest-dom';
import React, { StrictMode } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CambiarEmail from '../../pages/auth/CambiarEmail';
import ConfirmEmailChange from '../../pages/auth/ConfirmEmailChange';
import * as api from '../../api/endpoints';

const auth = vi.hoisted(() => ({ userId: 'current-user', loading: false, login: vi.fn() }));
vi.mock('../../api/endpoints', () => ({ requestEmailChange: vi.fn(), confirmEmailChange: vi.fn() }));
vi.mock('../../context/AuthContext', () => ({ useAuth: () => auth }));
const response = { data: { accessToken: 'fixture-access', user: { id: 'current-user', email: 'new@example.invalid', role: 'CLIENTE' } } };
const routed = element => <MemoryRouter initialEntries={['/confirm-email-change?token=first-link']}><Routes><Route path="*" element={element} /></Routes></MemoryRouter>;
function ChangeLink() {
  const navigate = useNavigate();
  return <><button onClick={() => navigate('/confirm-email-change?token=second-link')}>Otro enlace</button>
    <button onClick={() => navigate('/confirm-email-change')}>Quitar enlace</button><ConfirmEmailChange /></>;
}
const fillRequest = () => {
  fireEvent.change(screen.getByLabelText(/nuevo correo/i), { target: { value: 'new@example.invalid' } });
  fireEvent.change(screen.getByLabelText(/contraseña actual/i), { target: { value: 'fixture-password' } });
};

describe('recuperación del cambio de correo', () => {
  beforeEach(() => {
    api.requestEmailChange.mockReset(); api.confirmEmailChange.mockReset();
    auth.userId = 'current-user'; auth.loading = false; auth.login = vi.fn();
  });
  it('waits until session restoration finishes before consuming the link', async () => {
    auth.loading = true; api.confirmEmailChange.mockResolvedValue(response);
    const view = render(routed(<ConfirmEmailChange />));
    expect(screen.getByRole('status')).toHaveTextContent('Comprobando tu sesión');
    expect(api.confirmEmailChange).not.toHaveBeenCalled();
    auth.loading = false; view.rerender(routed(<ConfirmEmailChange />));
    await screen.findByText(/se ha confirmado correctamente/i);
    expect(api.confirmEmailChange).toHaveBeenCalledTimes(1);
  });
  it('does not consume the same one-use link twice under StrictMode', async () => {
    api.confirmEmailChange.mockResolvedValue(response);
    render(<StrictMode>{routed(<ConfirmEmailChange />)}</StrictMode>);
    await screen.findByText(/se ha confirmado correctamente/i);
    expect(api.confirmEmailChange).toHaveBeenCalledTimes(1);
    expect(auth.login).toHaveBeenCalledTimes(1);
  });
  it('does not reconfirm when the authentication callback changes identity', async () => {
    api.confirmEmailChange.mockResolvedValue(response);
    const view = render(routed(<ConfirmEmailChange />));
    await screen.findByText(/se ha confirmado correctamente/i);
    auth.login = vi.fn(); view.rerender(routed(<ConfirmEmailChange />));
    await act(async () => {});
    expect(api.confirmEmailChange).toHaveBeenCalledTimes(1);
    expect(auth.login).not.toHaveBeenCalled();
  });
  it('ignores an old link response after navigating to another confirmation', async () => {
    let finishOld;
    api.confirmEmailChange.mockImplementation(token => token === 'first-link'
      ? new Promise(resolve => { finishOld = resolve; }) : Promise.resolve(response));
    render(routed(<ChangeLink />));
    await waitFor(() => expect(api.confirmEmailChange).toHaveBeenCalledWith('first-link'));
    fireEvent.click(screen.getByRole('button', { name: 'Otro enlace' }));
    await screen.findByText(/se ha confirmado correctamente/i);
    await act(async () => finishOld({ data: { user: { id: 'old-user' } } }));
    expect(auth.login).toHaveBeenCalledTimes(1);
    expect(auth.login).toHaveBeenCalledWith(response.data);
  });
  it('shows an invalid link after the token is removed instead of retaining success', async () => {
    api.confirmEmailChange.mockResolvedValue(response); render(routed(<ChangeLink />));
    await screen.findByText(/se ha confirmado correctamente/i);
    fireEvent.click(screen.getByRole('button', { name: 'Quitar enlace' }));
    expect(screen.getByRole('alert')).toHaveTextContent(/no es válido/i);
    expect(api.confirmEmailChange).toHaveBeenCalledTimes(1);
  });
  it('offers an explicit retry for a network failure using the same link', async () => {
    api.confirmEmailChange.mockRejectedValueOnce(new Error('offline')).mockResolvedValue(response);
    render(routed(<ConfirmEmailChange />));
    fireEvent.click(await screen.findByRole('button', { name: 'Reintentar confirmación' }));
    await screen.findByText(/se ha confirmado correctamente/i);
    expect(api.confirmEmailChange.mock.calls).toEqual([['first-link'], ['first-link']]);
  });
  it('does not offer a transient retry for an invalid one-use link', async () => {
    api.confirmEmailChange.mockRejectedValue({ response: { status: 400, data: { code: 'INVALID_EMAIL_CHANGE_TOKEN' } } });
    render(routed(<ConfirmEmailChange />));
    expect(await screen.findByRole('alert')).toHaveTextContent(/no es válido o ha caducado/i);
    expect(screen.queryByRole('button', { name: 'Reintentar confirmación' })).not.toBeInTheDocument();
    expect(auth.login).not.toHaveBeenCalled();
  });
  it('retains a failed request draft and prevents concurrent retry submissions', async () => {
    let finishRetry;
    api.requestEmailChange.mockRejectedValueOnce(new Error('offline')).mockReturnValue(new Promise(resolve => { finishRetry = resolve; }));
    render(<CambiarEmail />); fillRequest(); fireEvent.click(screen.getByRole('button'));
    await screen.findByRole('status');
    expect(screen.getByLabelText(/contraseña actual/i)).toHaveValue('fixture-password');
    const retry = screen.getByRole('button', { name: 'Cambiar correo' });
    fireEvent.click(retry); fireEvent.click(retry);
    expect(api.requestEmailChange).toHaveBeenCalledTimes(2);
    await act(async () => finishRetry({}));
    expect(screen.getByRole('status')).toHaveTextContent(/enviado un enlace/i);
  });
  it('clears the request form and ignores its completion after switching account', async () => {
    let finishOld;
    api.requestEmailChange.mockReturnValue(new Promise(resolve => { finishOld = resolve; }));
    const view = render(<CambiarEmail />); fillRequest(); fireEvent.click(screen.getByRole('button'));
    auth.userId = 'new-user'; view.rerender(<CambiarEmail />);
    await act(async () => finishOld({}));
    expect(screen.getByLabelText(/nuevo correo/i)).toHaveValue('');
    expect(screen.getByLabelText(/contraseña actual/i)).toHaveValue('');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
