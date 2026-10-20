import '@testing-library/jest-dom';
import React from 'react';
import { fireEvent, render, screen, waitFor, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import ForgotPassword from '../../pages/auth/ForgotPassword';
import ResetPassword from '../../pages/auth/ResetPassword';
import * as api from '../../api/endpoints';

vi.mock('../../api/endpoints', () => ({ requestPasswordReset: vi.fn(), resetPassword: vi.fn() }));
const renderAt = (path, element) => render(<MemoryRouter initialEntries={[path]}><Routes><Route path="*" element={element} /></Routes></MemoryRouter>);

function ChangeResetLink() {
  const navigate = useNavigate();
  return <><button onClick={() => navigate('/reset-password?token=new-link')}>Abrir otro enlace</button>
    <button onClick={() => navigate('/reset-password')}>Quitar enlace</button><ResetPassword /></>;
}

describe('recuperación de contraseña web', () => {
  beforeEach(() => { vi.clearAllMocks(); api.requestPasswordReset.mockReset(); api.resetPassword.mockReset(); });
  it('envía forgot y siempre muestra el mensaje neutral', async () => {
    api.requestPasswordReset.mockResolvedValue({ status: 200 }); renderAt('/forgot-password', <ForgotPassword />);
    fireEvent.change(screen.getByLabelText(/correo electrónico/i), { target: { value: 'persona@nextfit.test' } });
    fireEvent.click(screen.getByRole('button', { name: /enviar instrucciones/i }));
    await waitFor(() => expect(api.requestPasswordReset).toHaveBeenCalledWith('persona@nextfit.test'));
    expect(screen.getByRole('status')).toHaveTextContent(/si existe una cuenta/i);
  });
  it('no llama a la API si falta token y permite pedir otro enlace', () => {
    renderAt('/reset-password', <ResetPassword />);
    expect(screen.getByText(/enlace de recuperación no es válido/i)).toBeInTheDocument();
    expect(api.resetPassword).not.toHaveBeenCalled();
  });
  it('valida contraseña y completa el reset sin persistir token', async () => {
    api.resetPassword.mockResolvedValue({ status: 200 }); renderAt('/reset-password?token=only-in-memory', <ResetPassword />);
    fireEvent.change(screen.getByLabelText(/^nueva contraseña$/i), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText(/confirmar contraseña/i), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /restablecer contraseña/i }));
    await waitFor(() => expect(api.resetPassword).toHaveBeenCalledWith('only-in-memory', 'password123'));
    expect(screen.getByRole('status')).toHaveTextContent(/se ha restablecido/i);
    expect(localStorage.getItem('resetToken')).toBeNull(); expect(sessionStorage.getItem('resetToken')).toBeNull();
  });
  it('rechaza localmente contraseñas cortas y que no coinciden', () => {
    renderAt('/reset-password?token=only-in-memory', <ResetPassword />);
    fireEvent.change(screen.getByLabelText(/^nueva contraseña$/i), { target: { value: 'short' } });
    fireEvent.change(screen.getByLabelText(/confirmar contraseña/i), { target: { value: 'other' } });
    fireEvent.click(screen.getByRole('button', { name: /restablecer contraseña/i }));
    expect(screen.getByRole('alert')).toHaveTextContent(/entre 8 y 128/i);
    expect(api.resetPassword).not.toHaveBeenCalled();
  });
  it('muestra un error genérico cuando el token no es válido', async () => {
    api.resetPassword.mockRejectedValue({ response: { status: 400, data: { code: 'INVALID_RESET_TOKEN' } } }); renderAt('/reset-password?token=bad', <ResetPassword />);
    fireEvent.change(screen.getByLabelText(/^nueva contraseña$/i), { target: { value: 'password123' } }); fireEvent.change(screen.getByLabelText(/confirmar contraseña/i), { target: { value: 'password123' } }); fireEvent.click(screen.getByRole('button', { name: /restablecer contraseña/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/no es válido o ha caducado/i);
  });

  const fillReset = (password = 'password123', confirmation = password) => {
    fireEvent.change(screen.getByLabelText(/^nueva contraseña$/i), { target: { value: password } });
    fireEvent.change(screen.getByLabelText(/confirmar contraseña/i), { target: { value: confirmation } });
  };
  it('uses the new link and clears passwords when navigation changes the token', async () => {
    api.resetPassword.mockResolvedValue({});
    renderAt('/reset-password?token=old-link', <ChangeResetLink />);
    fillReset();
    fireEvent.click(screen.getByRole('button', { name: 'Abrir otro enlace' }));
    expect(screen.getByLabelText(/^nueva contraseña$/i)).toHaveValue('');
    fillReset('new-password123');
    fireEvent.click(screen.getByRole('button', { name: /restablecer contraseña/i }));
    await screen.findByRole('status');
    expect(api.resetPassword).toHaveBeenCalledWith('new-link', 'new-password123');
  });
  it('ignores a completed request from the previous recovery link', async () => {
    let finishOld;
    api.resetPassword.mockReturnValue(new Promise(resolve => { finishOld = resolve; }));
    renderAt('/reset-password?token=old-link', <ChangeResetLink />);
    fillReset();
    fireEvent.click(screen.getByRole('button', { name: /restablecer contraseña/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Abrir otro enlace' }));
    await act(async () => finishOld({}));
    expect(screen.queryByText(/tu contraseña se ha restablecido/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/^nueva contraseña$/i)).toHaveValue('');
  });
  it('does not keep using the previous token after the link is removed', () => {
    renderAt('/reset-password?token=old-link', <ChangeResetLink />);
    fillReset();
    fireEvent.click(screen.getByRole('button', { name: 'Quitar enlace' }));
    expect(screen.getByRole('alert')).toHaveTextContent(/no es válido o ha caducado/i);
    expect(screen.queryByLabelText(/^nueva contraseña$/i)).not.toBeInTheDocument();
    expect(api.resetPassword).not.toHaveBeenCalled();
  });
  it('retains the reset draft after a network failure and prevents concurrent retries', async () => {
    let finishRetry;
    api.resetPassword.mockRejectedValueOnce(new Error('offline')).mockReturnValue(new Promise(resolve => { finishRetry = resolve; }));
    renderAt('/reset-password?token=current-link', <ResetPassword />);
    fillReset();
    fireEvent.click(screen.getByRole('button', { name: /restablecer contraseña/i }));
    await screen.findByRole('alert');
    expect(screen.getByLabelText(/^nueva contraseña$/i)).toHaveValue('password123');
    const retry = screen.getByRole('button', { name: /restablecer contraseña/i });
    fireEvent.click(retry); fireEvent.click(retry);
    expect(api.resetPassword).toHaveBeenCalledTimes(2);
    await act(async () => finishRetry({}));
    expect(screen.getByRole('status')).toHaveTextContent(/se ha restablecido/i);
  });
  it('rejects mismatched passwords of otherwise valid length without sending', () => {
    renderAt('/reset-password?token=current-link', <ResetPassword />);
    fillReset('password123', 'password456');
    fireEvent.click(screen.getByRole('button', { name: /restablecer contraseña/i }));
    expect(screen.getByRole('alert')).toHaveTextContent(/no coinciden/i);
    expect(api.resetPassword).not.toHaveBeenCalled();
  });
  it('retains the recovery email after failure and sends only one concurrent retry', async () => {
    let finishRetry;
    api.requestPasswordReset.mockRejectedValueOnce(new Error('offline')).mockReturnValue(new Promise(resolve => { finishRetry = resolve; }));
    renderAt('/forgot-password', <ForgotPassword />);
    fireEvent.change(screen.getByLabelText(/correo electrónico/i), { target: { value: 'persona@example.invalid' } });
    fireEvent.click(screen.getByRole('button', { name: /enviar instrucciones/i }));
    await screen.findByRole('alert');
    expect(screen.getByLabelText(/correo electrónico/i)).toHaveValue('persona@example.invalid');
    const retry = screen.getByRole('button', { name: /enviar instrucciones/i });
    fireEvent.click(retry); fireEvent.click(retry);
    expect(api.requestPasswordReset).toHaveBeenCalledTimes(2);
    await act(async () => finishRetry({}));
    expect(screen.getByRole('status')).toHaveTextContent(/si existe una cuenta/i);
  });
});
