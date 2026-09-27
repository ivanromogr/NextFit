import '@testing-library/jest-dom';
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import CambiarPassword from '../../pages/auth/CambiarPassword';
const { api, clearLocalSession, navigate } = vi.hoisted(() => ({ api: { changePassword: vi.fn() }, clearLocalSession: vi.fn(), navigate: vi.fn() }));
vi.mock('../../api/endpoints', () => api); vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ clearLocalSession }) })); vi.mock('react-router-dom', async () => ({ ...(await vi.importActual('react-router-dom')), useNavigate: () => navigate }));
describe('CambiarPassword', () => {
  beforeEach(() => vi.clearAllMocks());
  const page = () => render(<MemoryRouter><CambiarPassword /></MemoryRouter>);
  const fill = (current = 'actual-password', next = 'new-password', confirm = next) => { fireEvent.change(screen.getByLabelText('Contraseña actual'), { target: { value: current } }); fireEvent.change(screen.getByLabelText('Nueva contraseña'), { target: { value: next } }); fireEvent.change(screen.getByLabelText('Confirmar nueva contraseña'), { target: { value: confirm } }); };
  it('valida confirmación, longitud e igualdad sin request', () => { page(); fill('actual-password', 'short', 'different'); fireEvent.click(screen.getByRole('button')); expect(api.changePassword).not.toHaveBeenCalled(); expect(screen.getByRole('status')).toHaveTextContent('entre 8 y 128'); });
  it('envía sólo las dos contraseñas y limpia sesión al éxito', async () => { api.changePassword.mockResolvedValue({}); page(); fill(); fireEvent.click(screen.getByRole('button')); await waitFor(() => expect(api.changePassword).toHaveBeenCalledWith('actual-password', 'new-password')); expect(clearLocalSession).toHaveBeenCalled(); expect(navigate).toHaveBeenCalledWith('/auth/login', { replace: true }); });
  it('mapea el error de contraseña actual', async () => { api.changePassword.mockRejectedValue({ response: { data: { code: 'INVALID_CURRENT_PASSWORD' } } }); page(); fill(); fireEvent.click(screen.getByRole('button')); expect(await screen.findByRole('status')).toHaveTextContent('actual no es correcta'); });
});
