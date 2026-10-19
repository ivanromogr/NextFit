import api from '../api/api';
import { obtenerClientesEntrenador, obtenerDashboardResumen, obtenerResumenDashboard, obtenerRutinasCliente, obtenerRutinasAsignadasPorEntrenador } from '../api/endpoints';
jest.mock('../api/api', () => ({ __esModule: true, default: { get: jest.fn() } }));

beforeEach(() => jest.clearAllMocks());

test.each([obtenerClientesEntrenador, obtenerDashboardResumen, obtenerResumenDashboard, obtenerRutinasCliente, (id, options) => obtenerRutinasAsignadasPorEntrenador(id, 'coach-fixture', options)])('screen requests can distinguish a network failure from empty data', async (request) => {
  const error = new Error('network fixture');
  api.get.mockRejectedValueOnce(error);
  await expect(request('fixture', { throwOnError: true })).rejects.toBe(error);
});

test('a successful empty team remains valid empty data', async () => {
  api.get.mockResolvedValueOnce({ data: [] });
  await expect(obtenerClientesEntrenador('fixture', { throwOnError: true })).resolves.toEqual([]);
});
