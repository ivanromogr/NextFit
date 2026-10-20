import '@testing-library/jest-dom';
import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import CambiarPassword from '../../pages/auth/CambiarPassword';
const { api, clearLocalSession, navigate } = vi.hoisted(() => ({ api: { changePassword: vi.fn() }, clearLocalSession: vi.fn(), navigate: vi.fn() }));
const auth = vi.hoisted(() => ({ userId: 'first' }));
vi.mock('../../api/endpoints', () => api); vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ ...auth, clearLocalSession }) })); vi.mock('react-router-dom', async () => ({ ...(await vi.importActual('react-router-dom')), useNavigate: () => navigate }));
describe('CambiarPassword', () => {
  beforeEach(() => { vi.clearAllMocks(); auth.userId = 'first'; api.changePassword.mockReset().mockResolvedValue({}); clearLocalSession.mockReset().mockResolvedValue(); });
  const page = () => render(<MemoryRouter><CambiarPassword /></MemoryRouter>);
  const fill = (current = 'actual-password', next = 'new-password', confirm = next) => { fireEvent.change(screen.getByLabelText('Contraseña actual'), { target: { value: current } }); fireEvent.change(screen.getByLabelText('Nueva contraseña'), { target: { value: next } }); fireEvent.change(screen.getByLabelText('Confirmar nueva contraseña'), { target: { value: confirm } }); };
  it('valida confirmación, longitud e igualdad sin request', () => { page(); fill('actual-password', 'short', 'different'); fireEvent.click(screen.getByRole('button')); expect(api.changePassword).not.toHaveBeenCalled(); expect(screen.getByRole('status')).toHaveTextContent('entre 8 y 128'); });
  it('envía sólo las dos contraseñas y limpia sesión al éxito', async () => { api.changePassword.mockResolvedValue({}); page(); fill(); fireEvent.click(screen.getByRole('button')); await waitFor(() => expect(api.changePassword).toHaveBeenCalledWith('actual-password', 'new-password')); expect(clearLocalSession).toHaveBeenCalled(); await waitFor(() => expect(navigate).toHaveBeenCalledWith('/auth/login', { replace: true })); });
  it('mapea el error de contraseña actual', async () => { api.changePassword.mockRejectedValue({ response: { data: { code: 'INVALID_CURRENT_PASSWORD' } } }); page(); fill(); fireEvent.click(screen.getByRole('button')); expect(await screen.findByRole('status')).toHaveTextContent('actual no es correcta'); });
  it('blocks duplicate requests while saving and after confirmed success', async () => {
    let finish;
    api.changePassword.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    page(); fill(); const button = screen.getByRole('button');
    fireEvent.click(button); fireEvent.click(button);
    expect(api.changePassword).toHaveBeenCalledTimes(1);
    expect(button).toBeDisabled();
    expect(screen.getByLabelText('Contraseña actual')).toBeDisabled();
    await act(async () => finish({}));
    fireEvent.submit(button.closest('form'));
    expect(api.changePassword).toHaveBeenCalledTimes(1);
    expect(clearLocalSession).toHaveBeenCalledTimes(1);
  });
  it('keeps passwords after a transient failure and allows retry', async () => {
    api.changePassword.mockRejectedValueOnce(new Error('offline'));
    page(); fill(); fireEvent.click(screen.getByRole('button'));
    expect(await screen.findByRole('status')).toHaveTextContent('No se pudo actualizar');
    expect(screen.getByLabelText('Contraseña actual')).toHaveValue('actual-password');
    expect(screen.getByLabelText('Nueva contraseña')).toHaveValue('new-password');
    expect(clearLocalSession).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => expect(navigate).toHaveBeenCalled());
    expect(api.changePassword).toHaveBeenCalledTimes(2);
  });
  it('clears fields on account change and ignores the previous successful response', async () => {
    let finish;
    api.changePassword.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const view = page(); fill(); fireEvent.click(screen.getByRole('button'));
    auth.userId = 'second'; view.rerender(<MemoryRouter><CambiarPassword /></MemoryRouter>);
    expect(screen.getByLabelText('Contraseña actual')).toHaveValue('');
    expect(screen.getByLabelText('Nueva contraseña')).toHaveValue('');
    await act(async () => finish({}));
    expect(clearLocalSession).not.toHaveBeenCalled(); expect(navigate).not.toHaveBeenCalled();
    expect(screen.getByRole('button')).toBeEnabled();
  });
  it('ignores an error received after leaving the old account', async () => {
    let reject;
    api.changePassword.mockImplementationOnce(() => new Promise((_, fail) => { reject = fail; }));
    const view = page(); fill(); fireEvent.click(screen.getByRole('button'));
    auth.userId = 'second'; view.rerender(<MemoryRouter><CambiarPassword /></MemoryRouter>);
    await act(async () => reject(new Error('late')));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(clearLocalSession).not.toHaveBeenCalled();
  });
  it('does not resubmit after the server changed the password but local cleanup failed', async () => {
    clearLocalSession.mockRejectedValueOnce(new Error('cleanup failed'));
    page(); fill(); fireEvent.click(screen.getByRole('button'));
    expect(await screen.findByRole('status')).toHaveTextContent('ya se ha actualizado');
    expect(screen.getByLabelText('Contraseña actual')).toHaveValue('');
    expect(screen.getByLabelText('Nueva contraseña')).toHaveValue('');
    expect(screen.getByRole('button')).toBeDisabled();
    fireEvent.submit(screen.getByRole('button').closest('form'));
    expect(api.changePassword).toHaveBeenCalledTimes(1);
  });

});
