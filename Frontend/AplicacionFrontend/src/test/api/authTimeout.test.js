// @vitest-environment node
import { createServer } from 'node:http';
import { once } from 'node:events';
import { expect, it } from 'vitest';
import { api, loginForm, refreshWebSession, requestPasswordReset } from '../../api/endpoints';

it('limita lecturas y escrituras generales sin repetirlas tras agotar la espera', async () => {
  let respond = false;
  const requests = [];
  const server = createServer((request, response) => {
    requests.push(`${request.method} ${request.url}`);
    request.resume();
    if (respond) {
      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.end('{"message":"accepted"}');
    }
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const previous = api.defaults.baseURL;
  api.defaults.baseURL = `http://127.0.0.1:${server.address().port}`;
  try {
    expect(api.defaults.timeout).toBe(30000);
    const results = await Promise.allSettled([
      api.get('/api/exercises'),
      requestPasswordReset('timeout@example.invalid'),
    ]);
    for (const result of results) {
      expect(result.status).toBe('rejected');
      expect(result.reason).toMatchObject({ code: 'ECONNABORTED' });
    }
    expect(requests.sort()).toEqual(['GET /api/exercises', 'POST /api/auth/password/forgot']);
    respond = true;
    await expect(requestPasswordReset('timeout@example.invalid')).resolves.toMatchObject({ status: 200 });
    expect(requests).toHaveLength(3);
  } finally {
    api.defaults.baseURL = previous;
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
}, 40000);

it('cancela login y refresh sin respuesta y libera refresh para reintentar', async () => {
  let respond = false;
  let requests = 0;
  const server = createServer((request, response) => {
    requests += 1;
    request.resume();
    if (respond) {
      response.writeHead(401, { 'Content-Type': 'application/json' });
      response.end('{"code":"MISSING_TOKEN"}');
    }
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const previous = api.defaults.baseURL;
  api.defaults.baseURL = `http://127.0.0.1:${server.address().port}`;
  try {
    await expect(loginForm({ email: 'timeout@example.invalid', password: 'fictional' }))
      .rejects.toMatchObject({ code: 'ECONNABORTED' });
    const refresh = refreshWebSession();
    expect(refreshWebSession()).toBe(refresh);
    await expect(refresh).rejects.toMatchObject({ code: 'ECONNABORTED' });
    respond = true;
    await expect(refreshWebSession()).rejects.toMatchObject({ response: { status: 401 } });
    expect(requests).toBe(3);
  } finally {
    api.defaults.baseURL = previous;
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
}, 40000);
