import '@testing-library/jest-dom';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import EliminarCuenta from '../../pages/auth/EliminarCuenta';
const m = vi.hoisted(() => ({
  api: { deleteAccount: vi.fn(), deleteAccountWithGoogle: vi.fn(), deleteAccountWithApple: vi.fn(), getAuthIdentities: vi.fn() },
  clear: vi.fn(), navigate: vi.fn(), apple: vi.fn(),
}));
vi.mock('../../api/endpoints', () => m.api);
const auth = vi.hoisted(() => ({ userId: 'first' }));
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ ...auth, clearLocalSession: m.clear }) }));
vi.mock('react-router-dom', async () => ({ ...await vi.importActual('react-router-dom'), useNavigate: () => m.navigate }));
vi.mock('../../components/auth/GoogleSignIn', () => ({ default: ({ onCredential, disabled }) => <button disabled={disabled} onClick={() => onCredential('google-fixture')}>Verificar Google</button> }));
vi.mock('../../services/appleAuthWeb', () => ({ appleConfig: () => ({ appleAuthEnabled: true }), startAppleSignIn: m.apple }));
const methods = (...names) => ({ data: names.map(provider => ({ provider, active: true })) });
const open = async () => {
  render(<MemoryRouter><EliminarCuenta /></MemoryRouter>);
  await waitFor(() => expect(screen.queryByText('Cargando métodos de verificación…')).not.toBeInTheDocument());
};
beforeEach(() => {
  vi.clearAllMocks(); auth.userId = 'first'; vi.stubEnv('VITE_GOOGLE_WEB_CLIENT_ID', 'test-client');
  m.api.getAuthIdentities.mockResolvedValue(methods('LOCAL'));
  m.api.deleteAccount.mockResolvedValue({}); m.api.deleteAccountWithGoogle.mockResolvedValue({});
  m.api.deleteAccountWithApple.mockResolvedValue({}); m.clear.mockResolvedValue();
  m.apple.mockResolvedValue({ identityToken: 'apple-fixture', nonce: 'nonce' });
  vi.spyOn(window, 'confirm').mockReturnValue(true);
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });
describe('Eliminar cuenta con un método vinculado', () => {
  it('conserva el flujo de contraseña y limpia la sesión después del éxito', async () => {
    await open(); fireEvent.change(screen.getByLabelText('Contraseña actual'), { target: { value: 'secret' } });
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar mi cuenta' }));
    await waitFor(() => expect(m.api.deleteAccount).toHaveBeenCalledWith('secret'));
    await waitFor(() => expect(m.navigate).toHaveBeenCalledWith('/auth/login', { replace: true }));
    expect(m.clear).toHaveBeenCalledTimes(1);
  });
  it('una contraseña incorrecta conserva la cuenta y permite corregirla', async () => {
    m.api.deleteAccount.mockRejectedValueOnce({ response: { data: { code: 'INVALID_CURRENT_PASSWORD' } } });
    await open(); fireEvent.change(screen.getByLabelText('Contraseña actual'), { target: { value: 'bad' } });
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar mi cuenta' }));
    expect(await screen.findByText('La contraseña actual no es correcta.')).toBeInTheDocument();
    expect(m.clear).not.toHaveBeenCalled(); expect(screen.getByLabelText('Contraseña actual')).toBeEnabled();
  });
  it('Google-only no exige crear una contraseña y envía la credencial al endpoint de baja', async () => {
    m.api.getAuthIdentities.mockResolvedValue(methods('GOOGLE')); await open();
    expect(screen.queryByLabelText('Contraseña actual')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Verificar Google' }));
    await waitFor(() => expect(m.api.deleteAccountWithGoogle).toHaveBeenCalledWith('google-fixture'));
    expect(m.api.deleteAccount).not.toHaveBeenCalled();
  });
  it('Apple-only usa token y nonce sin pasar por login', async () => {
    m.api.getAuthIdentities.mockResolvedValue(methods('APPLE')); await open();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar con Apple y eliminar cuenta' }));
    await waitFor(() => expect(m.api.deleteAccountWithApple).toHaveBeenCalledWith('apple-fixture', 'nonce'));
    expect(m.api.deleteAccount).not.toHaveBeenCalled();
  });
  it('cancelar no solicita Apple ni elimina la cuenta', async () => {
    m.api.getAuthIdentities.mockResolvedValue(methods('APPLE')); window.confirm.mockReturnValue(false); await open();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar con Apple y eliminar cuenta' }));
    expect(m.apple).not.toHaveBeenCalled(); expect(m.api.deleteAccountWithApple).not.toHaveBeenCalled();
  });
  it('no duplica peticiones y una identidad incorrecta mantiene la sesión', async () => {
    let reject; m.api.deleteAccountWithGoogle.mockImplementationOnce(() => new Promise((_, fail) => { reject = fail; }));
    m.api.getAuthIdentities.mockResolvedValue(methods('GOOGLE')); await open();
    const button = screen.getByRole('button', { name: 'Verificar Google' }); fireEvent.click(button); fireEvent.click(button);
    expect(m.api.deleteAccountWithGoogle).toHaveBeenCalledTimes(1);
    reject({ response: { data: { code: 'INVALID_REAUTH_TOKEN' } } });
    expect(await screen.findByText('Confirma tu identidad con una cuenta que esté vinculada a NextFit.')).toBeInTheDocument(); expect(m.clear).not.toHaveBeenCalled();
  });
  it('un fallo al cargar métodos no ofrece una baja sin verificar y permite reintentar', async () => {
    m.api.getAuthIdentities.mockRejectedValueOnce(new Error('offline')); await open();
    expect(screen.getByRole('alert')).toHaveTextContent('No se pudieron cargar');
    expect(screen.queryByLabelText('Contraseña actual')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByLabelText('Contraseña actual')).toBeInTheDocument(); expect(m.api.deleteAccount).not.toHaveBeenCalled();
  });
});

it('salir de la pantalla mientras Apple verifica no inicia una baja tardía', async () => {
  let finish;
  m.apple.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  m.api.getAuthIdentities.mockResolvedValue(methods('APPLE'));
  const view = render(<MemoryRouter><EliminarCuenta /></MemoryRouter>);
  fireEvent.click(await screen.findByRole('button', { name: 'Confirmar con Apple y eliminar cuenta' }));
  await waitFor(() => expect(m.apple).toHaveBeenCalled());
  view.unmount();
  await act(async () => { finish({ identityToken: 'late', nonce: 'nonce' }); });
  expect(m.api.deleteAccountWithApple).not.toHaveBeenCalled(); expect(m.clear).not.toHaveBeenCalled();
});


it('a completed deletion from the previous account does not clear the new session', async () => {
  let finish;
  m.api.deleteAccount.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  const view = render(<MemoryRouter><EliminarCuenta /></MemoryRouter>);
  fireEvent.change(await screen.findByLabelText('Contraseña actual'), { target: { value: 'old-fixture-password' } });
  fireEvent.click(screen.getByRole('button', { name: 'Eliminar mi cuenta' }));
  auth.userId = 'second'; view.rerender(<MemoryRouter><EliminarCuenta /></MemoryRouter>);
  await screen.findByLabelText('Contraseña actual');
  await act(async () => finish({}));
  expect(m.clear).not.toHaveBeenCalled(); expect(m.navigate).not.toHaveBeenCalled();
  const input = screen.getByLabelText('Contraseña actual');
  expect(input).toHaveValue('');
  fireEvent.change(input, { target: { value: 'new-fixture-password' } });
  expect(input).toHaveValue('new-fixture-password');
  expect(screen.getByRole('button', { name: 'Eliminar mi cuenta' })).toBeEnabled();
});
it('a rejected deletion from the previous account does not show an error in the new one', async () => {
  let reject;
  m.api.deleteAccount.mockImplementationOnce(() => new Promise((_, fail) => { reject = fail; }));
  const view = render(<MemoryRouter><EliminarCuenta /></MemoryRouter>);
  fireEvent.change(await screen.findByLabelText('Contraseña actual'), { target: { value: 'old-fixture-password' } });
  fireEvent.click(screen.getByRole('button', { name: 'Eliminar mi cuenta' }));
  auth.userId = 'second'; view.rerender(<MemoryRouter><EliminarCuenta /></MemoryRouter>);
  await screen.findByLabelText('Contraseña actual');
  await act(async () => reject(new Error('late rejection')));
  expect(screen.queryByText('No se pudo eliminar la cuenta. Inténtalo de nuevo.')).not.toBeInTheDocument();
  expect(m.clear).not.toHaveBeenCalled();
});
it('ignores verification methods loaded for the previous account', async () => {
  let finish;
  m.api.getAuthIdentities.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }))
    .mockResolvedValue(methods('GOOGLE'));
  const view = render(<MemoryRouter><EliminarCuenta /></MemoryRouter>);
  await waitFor(() => expect(m.api.getAuthIdentities).toHaveBeenCalledTimes(1));
  auth.userId = 'second'; view.rerender(<MemoryRouter><EliminarCuenta /></MemoryRouter>);
  await screen.findByRole('button', { name: 'Verificar Google' });
  await act(async () => finish(methods('LOCAL')));
  expect(screen.queryByLabelText('Contraseña actual')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Verificar Google' })).toBeEnabled();
});
