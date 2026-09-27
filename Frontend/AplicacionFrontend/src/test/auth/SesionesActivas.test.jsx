import '@testing-library/jest-dom';
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import SesionesActivas from '../../pages/auth/SesionesActivas';

const { api, clearLocalSession, navigate } = vi.hoisted(() => ({ api: { getSessions: vi.fn(), revokeSession: vi.fn(), logoutAllSessions: vi.fn() }, clearLocalSession: vi.fn(), navigate: vi.fn() }));
vi.mock('../../api/endpoints', () => api);
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ clearLocalSession }) }));
vi.mock('react-router-dom', async () => ({ ...(await vi.importActual('react-router-dom')), useNavigate: () => navigate }));

describe('SesionesActivas', () => {
  beforeEach(() => { vi.clearAllMocks(); window.confirm = vi.fn(() => true); api.getSessions.mockResolvedValue({ data: [{ familyId: 'private-family-id', clientType: 'WEB', createdAt: '2026-01-01T00:00:00Z', expiresAt: '2026-02-01T00:00:00Z' }, { familyId: 'mobile-family-id', clientType: 'MOBILE', createdAt: '2026-01-02T00:00:00Z', expiresAt: '2026-02-02T00:00:00Z' }] }); });
  const renderPage = () => render(<MemoryRouter><SesionesActivas /></MemoryRouter>);
  it('carga WEB y Móvil sin exponer identificadores', async () => { renderPage(); expect(await screen.findByText('Web')).toBeInTheDocument(); expect(screen.getByText('Móvil')).toBeInTheDocument(); expect(screen.queryByText('private-family-id')).not.toBeInTheDocument(); });
  it('revoca la familia seleccionada y recarga', async () => { renderPage(); await screen.findByText('Web'); fireEvent.click(screen.getAllByRole('button', { name: 'Cerrar sesión' })[0]); await waitFor(() => expect(api.revokeSession).toHaveBeenCalledWith('private-family-id')); expect(api.getSessions).toHaveBeenCalledTimes(2); });
  it('logout global limpia el estado y redirige', async () => { renderPage(); await screen.findByText('Web'); fireEvent.click(screen.getByRole('button', { name: 'Cerrar todas las sesiones' })); await waitFor(() => expect(api.logoutAllSessions).toHaveBeenCalled()); expect(clearLocalSession).toHaveBeenCalled(); expect(navigate).toHaveBeenCalledWith('/auth/login', { replace: true }); });
});
