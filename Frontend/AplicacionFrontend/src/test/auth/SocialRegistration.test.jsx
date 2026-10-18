import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
const mocks = vi.hoisted(() => ({ google: vi.fn(), register: vi.fn(), login: vi.fn(), navigate: vi.fn() }));
vi.mock('../../api/endpoints', () => ({ loginWithGoogle: mocks.google, registerUser: mocks.register }));
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ login: mocks.login }) }));
vi.mock('react-router-dom', async () => ({ ...await vi.importActual('react-router-dom'), useNavigate: () => mocks.navigate }));
vi.mock('../../components/auth/GoogleSignIn', () => ({ default: ({ onCredential }) => <button type="button" onClick={() => onCredential('opaque-test-credential')}>Continuar con Google</button> }));
vi.mock('../../components/auth/AppleSignIn', () => ({ default: () => null }));
vi.mock('../../services/appleAuthWeb', () => ({ appleConfig: () => ({ appleAuthEnabled: false }) }));
import Register from '../../pages/auth/Register';
const start = () => { render(<MemoryRouter><Register /></MemoryRouter>); fireEvent.click(screen.getByRole('button', { name: 'Continuar con Google' })); };
beforeEach(() => { vi.clearAllMocks(); vi.stubEnv('VITE_GOOGLE_WEB_CLIENT_ID', 'web-client'); });
afterEach(() => vi.unstubAllEnvs());
describe('Registro social desde la elección de método', () => {
 it('inicia el registro con Google sin contraseña ni envío del formulario local', async () => {
  mocks.google.mockResolvedValue({ data: { status: 'ONBOARDING_REQUIRED', pendingToken: 'pending', email: 'new@example.test' } });
  start();
  await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith('/auth/google/onboarding', { state: { pendingToken: 'pending', email: 'new@example.test' } }));
  expect(mocks.register).not.toHaveBeenCalled(); expect(mocks.login).not.toHaveBeenCalled();
 });
 it('entra directamente si la cuenta ya se registró con Google', async () => {
  mocks.google.mockResolvedValue({ data: { accessToken: 'access', user: { role: 'CLIENTE' } } });
  mocks.login.mockReturnValue({ role: 'CLIENTE' }); start();
  await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith('/cliente/dashboard'));
  expect(mocks.login).toHaveBeenCalledTimes(1); expect(mocks.register).not.toHaveBeenCalled();
 });
 it('mantiene la confirmación para una cuenta previa con otro método', async () => {
  mocks.google.mockResolvedValue({ data: { status: 'LINK_REQUIRED' } }); start();
  await screen.findByRole('alert');
  expect(screen.getByRole('alert').textContent).toMatch(/Ya existe una cuenta/);
  expect(mocks.login).not.toHaveBeenCalled(); expect(mocks.navigate).not.toHaveBeenCalled();
 });
});
