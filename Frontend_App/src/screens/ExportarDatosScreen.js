import React, { useRef, useState } from 'react';
import { exportAndShareUserData } from '../services/dataExport';
import AccountFormScreen, { FormMessage } from '../components/ui/AccountFormScreen';
import GymButton from '../components/ui/GymButton';

export default function ExportarDatosScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const submitting = useRef(false);
  const exportData = async () => {
    if (submitting.current) return;
    submitting.current = true;
    setLoading(true);
    setError('');
    try {
      await exportAndShareUserData();
    } catch (requestError) {
      setError(requestError.message === 'SHARING_UNAVAILABLE'
        ? 'Compartir archivos no está disponible en este dispositivo.'
        : 'No se pudieron exportar tus datos. Inténtalo de nuevo.');
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  };
  return (
    <AccountFormScreen title="Exportar mis datos" description="Crea una copia JSON temporal de los datos asociados a tu cuenta. Se abrirá la ventana del dispositivo para que elijas dónde guardarla o compartirla." backLabel="Volver a ajustes" onBack={navigation ? () => navigation.goBack() : undefined}>
      <FormMessage>{error}</FormMessage>
      <GymButton fullWidth loading={loading} onPress={exportData}>Exportar mis datos</GymButton>
    </AccountFormScreen>
  );
}
