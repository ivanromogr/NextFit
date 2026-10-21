// @vitest-environment node
import { createServer } from 'node:http';
import { once } from 'node:events';
import { expect, it } from 'vitest';
import { api, loginForm, refreshWebSession } from '../../api/endpoints';

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
