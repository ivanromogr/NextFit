import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { getDataExport } from '../api/endpoints';

export const exportAndShareUserData = async () => {
  if (!await Sharing.isAvailableAsync()) {
    throw new Error('SHARING_UNAVAILABLE');
  }
  const filename = `nextfit-data-${new Date().toISOString().slice(0, 10)}.json`;
  const uri = `${FileSystem.cacheDirectory}${filename}`;
  try {
    const response = await getDataExport();
    await FileSystem.writeAsStringAsync(uri, JSON.stringify(response.data), {
      encoding: FileSystem.EncodingType.UTF8,
    });
    await Sharing.shareAsync(uri, { mimeType: 'application/json', dialogTitle: 'Exportar mis datos' });
  } finally {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  }
};
