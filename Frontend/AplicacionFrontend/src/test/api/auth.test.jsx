import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api, loginForm } from '../../api/endpoints';

describe('cliente HTTP de autenticación', () => {
  beforeEach(() => {
    sessionStorage.clear();
    window.history.pushState({}, '', '/auth/login');
  });
  it('envía el nuevo contrato JSON a /api/auth/login', async () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue({ status: 200 });
    await loginForm({ email: 'cliente@nextfit.test', password: 'secret' });
    expect(post).toHaveBeenCalledWith('/api/auth/login', { email: 'cliente@nextfit.test', password: 'secret' });
    post.mockRestore();
  });

  it('no habilita cookies de sesión legacy', () => {
    expect(api.defaults.withCredentials).not.toBe(true);
  });

  it('adjunta Bearer sólo cuando hay una sesión válida', async () => {
    sessionStorage.setItem('auth_session', JSON.stringify({ id: '1', email: 'x@nextfit.test', role: 'CLIENTE', accessToken: 'token', expiresAt: Date.now() + 60_000 }));
    const interceptor = api.interceptors.request.handlers.at(-1).fulfilled;
    expect(interceptor({ headers: {} })).toMatchObject({ headers: { Authorization: 'Bearer token' } });
  });

  it('un 401 limpia la sesión temporal y un 403 no la limpia', async () => {
    const rejected = api.interceptors.response.handlers.at(-1).rejected;
    const session = JSON.stringify({ id: '1', email: 'x@nextfit.test', role: 'CLIENTE', accessToken: 'token', expiresAt: Date.now() + 60_000 });
    sessionStorage.setItem('auth_session', session);
    await expect(rejected({ response: { status: 403 } })).rejects.toBeDefined();
    expect(sessionStorage.getItem('auth_session')).toBe(session);
    await expect(rejected({ response: { status: 401 } })).rejects.toBeDefined();
    expect(sessionStorage.getItem('auth_session')).toBeNull();
  });
});
