import { afterEach, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

it('usa el origen web para HTTP pero conserva WebSocket en el backend configurado', async () => {
  vi.stubEnv('VITE_API_SAME_ORIGIN', 'true');
  vi.stubEnv('VITE_API_URL', 'https://nextfit-pa8i.onrender.com');
  vi.stubEnv('VITE_WS_URL', 'https://nextfit-pa8i.onrender.com');
  vi.resetModules();
  const config = await import('../../api/config');
  expect(config.API_BASE_URL).toBe(window.location.origin);
  expect(config.WS_BASE_URL).toBe('wss://nextfit-pa8i.onrender.com');
  expect(config.SOCKJS_URL).toBe('https://nextfit-pa8i.onrender.com/ws');
});

it('conserva el backend explícito cuando no se activa el proxy', async () => {
  vi.stubEnv('VITE_API_SAME_ORIGIN', 'false');
  vi.stubEnv('VITE_API_URL', 'https://nextfit-pa8i.onrender.com/');
  vi.stubEnv('VITE_WS_URL', 'https://nextfit-pa8i.onrender.com');
  vi.resetModules();
  const config = await import('../../api/config');
  expect(config.API_BASE_URL).toBe('https://nextfit-pa8i.onrender.com');
});
