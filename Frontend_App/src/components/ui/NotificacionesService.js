import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configuración básica para que la notificación suene y se muestre arriba
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const pedirPermisosNotificaciones = async () => {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  if (finalStatus !== 'granted') {
    console.log('Permiso de notificaciones denegado');
    return false;
  }
  return true;
};

// Función para programar el aviso de "Hoy toca entreno"
export const programarAvisoEntrenoHoy = async (nombreRutina) => {
  // Primero cancelamos las notificaciones anteriores para no duplicar
  await Notifications.cancelAllScheduledNotificationsAsync();

  // Programamos la nueva notificación para que suene, por ejemplo, en 5 segundos (para que la pruebes)
  // Cuando veas que funciona, lo cambiaremos a una hora fija (ej. 09:00 AM).
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "🔥 ¡Hora de mutar!",
      body: `Hoy te toca destrozar: ${nombreRutina}. ¡No hay excusas!`,
      sound: true,
    },
    trigger: { 
      seconds: 5 // 👈 Cambia esto más adelante a un horario real
    },
  });
};