import { exportAndShareUserData } from '../services/dataExport';
import { getDataExport } from '../api/endpoints';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

jest.mock('../api/endpoints', () => ({ getDataExport: jest.fn() }));
jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: 'file:///cache/',
  EncodingType: { UTF8: 'utf8' },
  writeAsStringAsync: jest.fn(),
  deleteAsync: jest.fn(),
}));
jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(), shareAsync: jest.fn() }));

describe('exportAndShareUserData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Sharing.isAvailableAsync.mockResolvedValue(true);
    FileSystem.deleteAsync.mockResolvedValue();
  });

  it('solicita, escribe en cache, comparte y elimina el fichero temporal', async () => {
    getDataExport.mockResolvedValue({ data: { accountType: 'CLIENTE' } });
    await exportAndShareUserData();
    expect(getDataExport).toHaveBeenCalledTimes(1);
    expect(FileSystem.writeAsStringAsync).toHaveBeenCalledWith(expect.stringMatching(/^file:\/\/\/cache\/nextfit-data-.*\.json$/), '{"accountType":"CLIENTE"}', { encoding: 'utf8' });
    expect(Sharing.shareAsync).toHaveBeenCalledWith(expect.stringMatching(/^file:\/\/\/cache\/nextfit-data-.*\.json$/), expect.objectContaining({ mimeType: 'application/json' }));
    expect(FileSystem.deleteAsync).toHaveBeenCalledWith(expect.any(String), { idempotent: true });
  });

  it('limpia el fichero incluso cuando falla la API', async () => {
    getDataExport.mockRejectedValue(new Error('network'));
    await expect(exportAndShareUserData()).rejects.toThrow('network');
    expect(Sharing.shareAsync).not.toHaveBeenCalled();
    expect(FileSystem.deleteAsync).toHaveBeenCalledWith(expect.any(String), { idempotent: true });
  });

  it('informa de forma controlada si compartir no está disponible', async () => {
    Sharing.isAvailableAsync.mockResolvedValue(false);
    await expect(exportAndShareUserData()).rejects.toThrow('SHARING_UNAVAILABLE');
    expect(getDataExport).not.toHaveBeenCalled();
    expect(FileSystem.writeAsStringAsync).not.toHaveBeenCalled();
  });
});
