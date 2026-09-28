import '@testing-library/jest-dom';
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ForgotPassword from '../../pages/auth/ForgotPassword';
import ResetPassword from '../../pages/auth/ResetPassword';
import * as api from '../../api/endpoints';

vi.mock('../../api/endpoints', () => ({ requestPasswordReset: vi.fn(), resetPassword: vi.fn() }));
const renderAt = (path, element) => render(<MemoryRouter initialEntries={[path]}><Routes><Route path="*" element={element} /></Routes></MemoryRouter>);

describe('recuperación de contraseña web', () => {
  beforeEach(() => vi.clearAllMocks());
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
});
