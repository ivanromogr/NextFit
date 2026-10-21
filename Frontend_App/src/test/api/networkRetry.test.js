import { api } from '../../api/api';

describe('reintentos de transporte móvil', () => {
  let previousAdapter;
  beforeEach(() => {
    previousAdapter = api.defaults.adapter;
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    api.defaults.adapter = previousAdapter;
    jest.restoreAllMocks();
  });

  function transport({ code = 'ECONNABORTED', status, failTwice = false } = {}) {
    let attempts = 0;
    api.defaults.adapter = jest.fn(async config => {
      attempts += 1;
      if (attempts === 1 || failTwice) {
        const error = new Error('Fixture transport failure');
        if (code) error.code = code;
        error.config = config;
        if (status) error.response = { status };
        throw error;
      }
      return { data: { fixture: true }, status: 200, headers: {}, config };
    });
    return () => attempts;
  }

  test.each([
    ['post', '/register'], ['post', '/auth/refresh'],
    ['post', '/sesiones'], ['put', '/auth/email'],
    ['patch', '/fixture'], ['delete', '/auth/account'],
  ])('%s %s no se repite después de perder la respuesta', async (method, url) => {
    const attempts = transport();
    await expect(api.request({ method, url })).rejects.toMatchObject({ code: 'ECONNABORTED' });
    expect(attempts()).toBe(1);
  });

  test('tampoco repite una escritura ante un error de red sin código', async () => {
    const attempts = transport({ code: null });
    await expect(api.post('/rutinas/manual', {})).rejects.toBeDefined();
    expect(attempts()).toBe(1);
  });

  test.each(['get', 'head'])('%s permite un único reintento de red', async method => {
    const attempts = transport();
    await expect(api.request({ method, url: '/fixture' })).resolves.toMatchObject({ status: 200 });
    expect(attempts()).toBe(2);
  });

  test('una lectura no entra en un bucle si el reintento también falla', async () => {
    const attempts = transport({ failTwice: true });
    await expect(api.get('/fixture')).rejects.toBeDefined();
    expect(attempts()).toBe(2);
  });

  test('una respuesta HTTP 503 no se reenvía automáticamente', async () => {
    const attempts = transport({ code: null, status: 503 });
    await expect(api.get('/fixture')).rejects.toMatchObject({ response: { status: 503 } });
    expect(attempts()).toBe(1);
  });

  test('respeta la exclusión explícita de reintento para consultas', async () => {
    const attempts = transport();
    await expect(api.get('/fixture', { skipNetworkRetry: true })).rejects.toBeDefined();
    expect(attempts()).toBe(1);
  });
});
