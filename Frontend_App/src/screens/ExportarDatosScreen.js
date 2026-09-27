import React, { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { exportAndShareUserData } from '../services/dataExport';

export default function ExportarDatosScreen() {
  const [loading, setLoading] = useState(false);
  const exportData = async () => {
    setLoading(true);
    try {
      await exportAndShareUserData();
    } catch (error) {
      Alert.alert('Exportar mis datos', error.message === 'SHARING_UNAVAILABLE'
        ? 'Compartir archivos no está disponible en este dispositivo.'
        : 'No se pudieron exportar tus datos. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };
  return <View style={styles.container}>
    <Text style={styles.title}>Exportar mis datos</Text>
    <Text style={styles.description}>Crea una copia JSON temporal de los datos asociados a tu cuenta y compártela donde prefieras.</Text>
    <TouchableOpacity accessibilityRole="button" style={[styles.button, loading && styles.disabled]} onPress={exportData} disabled={loading}>
      {loading ? <ActivityIndicator color="#111" /> : <Text style={styles.buttonText}>Exportar mis datos</Text>}
    </TouchableOpacity>
  </View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050505', padding: 24, justifyContent: 'center' },
  title: { color: 'white', fontSize: 24, fontWeight: '800', marginBottom: 12 },
  description: { color: '#aaa', fontSize: 15, lineHeight: 22, marginBottom: 24 },
  button: { alignItems: 'center', backgroundColor: '#FACC15', borderRadius: 12, padding: 16 },
  disabled: { opacity: 0.55 },
  buttonText: { color: '#111', fontWeight: '800', fontSize: 15 },
});
