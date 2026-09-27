import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Register from '../../pages/auth/Register';
import PrivacidadComunicaciones from '../../pages/auth/PrivacidadComunicaciones';
import { getConsents, registerUser, updateMarketingConsent } from '../../api/endpoints';

const navigate = vi.fn(); const login = vi.fn(() => ({ role: 'CLIENTE' }));
vi.mock('../../api/endpoints', () => ({ registerUser: vi.fn(), getConsents: vi.fn(), updateMarketingConsent: vi.fn() }));
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ login }) }));
vi.mock('react-router-dom', async (importOriginal) => ({ ...(await importOriginal()), useNavigate: () => navigate }));
const renderRegister = () => render(<MemoryRouter><Register /></MemoryRouter>);
const consent = { terms: { accepted: true, version: '2.0', acceptedAt: '2026-01-02T10:00:00Z' }, privacy: { accepted: true, version: '3.0', acceptedAt: '2026-01-03T10:00:00Z' }, marketing: { accepted: false, version: '2.0' } };

describe('3.9 web: registro y legales', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  it('exige términos y privacidad y mantiene marketing opcional para cliente y entrenador', async () => {
    renderRegister();
    fireEvent.click(screen.getByRole('button', { name: /comenzar ahora/i }));
    expect(await screen.findByText(/Debes aceptar los Términos/)).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(/Términos de uso/));
    fireEvent.click(screen.getByRole('button', { name: /comenzar ahora/i }));
    expect(await screen.findByText(/Debes aceptar la Política/)).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(/Política de privacidad/));
    fireEvent.change(screen.getByPlaceholderText('Juan'), { target: { value: 'Ana' } });
    fireEvent.change(screen.getByPlaceholderText('Pérez'), { target: { value: 'Test' } });
    fireEvent.change(screen.getByPlaceholderText('juan@gym.com'), { target: { value: 'ana@test.dev' } });
    fireEvent.change(screen.getByPlaceholderText(/Mínimo 6/), { target: { value: 'secreto' } });
    registerUser.mockResolvedValue({ status: 201, data: {} });
    fireEvent.click(screen.getByRole('button', { name: /comenzar ahora/i }));
    await waitFor(() => expect(registerUser).toHaveBeenCalledWith(expect.objectContaining({ rol: 'CLIENTE', acceptTerms: true, acceptPrivacy: true, marketingConsent: false })));
    fireEvent.click(screen.getByText('COACH'));
    fireEvent.click(screen.getByLabelText(/comunicaciones de NextFit/i));
    fireEvent.click(screen.getByRole('button', { name: /comenzar ahora/i }));
    await waitFor(() => expect(registerUser).toHaveBeenLastCalledWith(expect.objectContaining({ rol: 'ENTRENADOR', marketingConsent: true })));
  });
  it('expone enlaces internos de términos y privacidad', () => { renderRegister(); expect(screen.getByRole('link', { name: /Términos de uso/ })).toHaveAttribute('href', '/terms'); expect(screen.getByRole('link', { name: /Política de privacidad/ })).toHaveAttribute('href', '/privacy'); });
});

describe('3.9 web: privacidad y comunicaciones', () => {
  beforeEach(() => { vi.clearAllMocks(); getConsents.mockResolvedValue({ data: consent }); });
  it('muestra versiones/fechas, sólo permite marketing y actualiza ambos sentidos', async () => {
    render(<PrivacidadComunicaciones />); await screen.findByText(/versión 2.0/); expect(screen.getByText(/versión 3.0/)).toBeInTheDocument();
    const toggle = screen.getByLabelText('Comunicaciones de marketing'); expect(screen.getAllByRole('checkbox')).toHaveLength(1);
    updateMarketingConsent.mockResolvedValue({}); fireEvent.click(toggle); await waitFor(() => expect(updateMarketingConsent).toHaveBeenCalledWith(true)); expect(screen.getByText(/Marketing: activado/)).toBeInTheDocument();
    fireEvent.click(toggle); await waitFor(() => expect(updateMarketingConsent).toHaveBeenLastCalledWith(false));
  });
  it('no inventa datos legacy y conserva UI ante error de marketing', async () => {
    getConsents.mockResolvedValue({ data: { terms: { status: 'LEGACY_MISSING' }, privacy: { status: 'LEGACY_MISSING' }, marketing: { accepted: false } } });
    updateMarketingConsent.mockRejectedValue(new Error('network')); render(<PrivacidadComunicaciones />);
    expect((await screen.findAllByText(/Sin consentimiento histórico registrado/)).length).toBe(2); fireEvent.click(screen.getByLabelText('Comunicaciones de marketing'));
    expect(await screen.findByRole('status')).toHaveTextContent('No se pudo actualizar'); expect(screen.getByLabelText('Comunicaciones de marketing')).not.toBeChecked();
  });
});
