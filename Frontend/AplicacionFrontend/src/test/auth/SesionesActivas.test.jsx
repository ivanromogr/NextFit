import '@testing-library/jest-dom';
import React from 'react';
import { fireEvent, render, screen, waitFor, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import SesionesActivas from '../../pages/auth/SesionesActivas';

const { api, clearLocalSession, navigate } = vi.hoisted(() => ({ api: { getSessions: vi.fn(), revokeSession: vi.fn(), logoutAllSessions: vi.fn() }, clearLocalSession: vi.fn(), navigate: vi.fn() }));
vi.mock('../../api/endpoints', () => api);
const auth = vi.hoisted(() => ({ userId: 'client-test' }));
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ ...auth, clearLocalSession }) }));
vi.mock('react-router-dom', async () => ({ ...(await vi.importActual('react-router-dom')), useNavigate: () => navigate }));

describe('SesionesActivas', () => {
  beforeEach(() => { vi.clearAllMocks(); auth.userId = 'client-test'; api.getSessions.mockReset(); api.revokeSession.mockReset(); api.logoutAllSessions.mockReset(); window.confirm = vi.fn(() => true); api.getSessions.mockResolvedValue({ data: [{ familyId: 'private-family-id', clientType: 'WEB', createdAt: '2026-01-01T00:00:00Z', expiresAt: '2026-02-01T00:00:00Z' }, { familyId: 'mobile-family-id', clientType: 'MOBILE', createdAt: '2026-01-02T00:00:00Z', expiresAt: '2026-02-02T00:00:00Z' }] }); });
  const renderPage = () => render(<MemoryRouter><SesionesActivas /></MemoryRouter>);
  it('carga WEB y Móvil sin exponer identificadores', async () => { renderPage(); expect(await screen.findByText('Web')).toBeInTheDocument(); expect(screen.getByText('Móvil')).toBeInTheDocument(); expect(screen.queryByText('private-family-id')).not.toBeInTheDocument(); });
  it('revoca la familia seleccionada y recarga', async () => { renderPage(); await screen.findByText('Web'); fireEvent.click(screen.getAllByRole('button', { name: 'Cerrar sesión' })[0]); await waitFor(() => expect(api.revokeSession).toHaveBeenCalledWith('private-family-id')); await waitFor(() => expect(api.getSessions).toHaveBeenCalledTimes(2)); });
  it('logout global limpia el estado y redirige', async () => { renderPage(); await screen.findByText('Web'); fireEvent.click(screen.getByRole('button', { name: 'Cerrar todas las sesiones' })); await waitFor(() => expect(api.logoutAllSessions).toHaveBeenCalled()); expect(clearLocalSession).toHaveBeenCalled(); expect(navigate).toHaveBeenCalledWith('/auth/login', { replace: true }); });

  it('recovers a failed load without pretending the list is empty', async () => {
    api.getSessions.mockRejectedValueOnce(new Error('offline')).mockResolvedValue({ data: [] });
    renderPage();
    await screen.findByRole('alert');
    expect(screen.queryByText('No hay sesiones activas.')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar sesiones' }));
    expect(await screen.findByText('No hay sesiones activas.')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
  it('rejects malformed session records rather than displaying a fake empty result', async () => {
    api.getSessions.mockResolvedValue({ data: [{ clientType: 'WEB' }] });
    renderPage();
    await screen.findByRole('alert');
    expect(screen.queryByText('No hay sesiones activas.')).not.toBeInTheDocument();
  });
  it('ignores a delayed list belonging to a previous account', async () => {
    let finishOld;
    api.getSessions.mockReturnValueOnce(new Promise(resolve => { finishOld = resolve; })).mockResolvedValue({ data: [] });
    const view = renderPage();
    await waitFor(() => expect(api.getSessions).toHaveBeenCalledTimes(1));
    auth.userId = 'new-account';
    view.rerender(<MemoryRouter><SesionesActivas /></MemoryRouter>);
    await screen.findByText('No hay sesiones activas.');
    await act(async () => finishOld({ data: [{ familyId: 'old-private-id', clientType: 'WEB' }] }));
    expect(screen.queryByText('Web')).not.toBeInTheDocument();
  });
  it('keeps the session after a failed revocation and prevents duplicate retries', async () => {
    let finishRevoke;
    api.revokeSession.mockRejectedValueOnce(new Error('offline')).mockReturnValue(new Promise(resolve => { finishRevoke = resolve; }));
    renderPage();
    await screen.findByText('Web');
    fireEvent.click(screen.getAllByRole('button', { name: 'Cerrar sesión' })[0]);
    await screen.findByRole('alert');
    expect(screen.getByText('Web')).toBeInTheDocument();
    const retry = screen.getAllByRole('button', { name: 'Cerrar sesión' })[0];
    fireEvent.click(retry); fireEvent.click(retry);
    expect(api.revokeSession).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('button', { name: 'Procesando…' })).toBeDisabled();
    api.getSessions.mockResolvedValue({ data: [] });
    await act(async () => finishRevoke({}));
    await screen.findByText('No hay sesiones activas.');
  });
  it('recovers a failed reload after a confirmed revocation independently', async () => {
    renderPage(); await screen.findByText('Web');
    api.getSessions.mockRejectedValueOnce(new Error('offline')).mockResolvedValue({ data: [] });
    api.revokeSession.mockResolvedValue({});
    fireEvent.click(screen.getAllByRole('button', { name: 'Cerrar sesión' })[0]);
    await screen.findByRole('alert');
    expect(screen.getByRole('status')).toHaveTextContent('cerrado la sesión seleccionada');
    expect(screen.queryByText('No hay sesiones activas.')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar sesiones' }));
    await screen.findByText('No hay sesiones activas.');
  });
  it('does not clear local authentication when global logout fails', async () => {
    api.logoutAllSessions.mockRejectedValue(new Error('offline'));
    renderPage(); await screen.findByText('Web');
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar todas las sesiones' }));
    await screen.findByRole('alert');
    expect(clearLocalSession).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
    expect(screen.getByText('Web')).toBeInTheDocument();
  });
  it('ignores completion of global logout after the account changes', async () => {
    let finishLogout;
    api.logoutAllSessions.mockReturnValue(new Promise(resolve => { finishLogout = resolve; }));
    const view = renderPage(); await screen.findByText('Web');
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar todas las sesiones' }));
    auth.userId = 'new-account';
    api.getSessions.mockResolvedValue({ data: [] });
    view.rerender(<MemoryRouter><SesionesActivas /></MemoryRouter>);
    await screen.findByText('No hay sesiones activas.');
    await act(async () => finishLogout({}));
    expect(clearLocalSession).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });
  it('allows cancellation without sending global logout', async () => {
    window.confirm.mockReturnValue(false);
    renderPage(); await screen.findByText('Web');
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar todas las sesiones' }));
    expect(api.logoutAllSessions).not.toHaveBeenCalled();
  });
});
