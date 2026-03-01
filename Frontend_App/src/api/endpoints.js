import axios from "axios";
import api from "./api";
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
// ✅ AQUÍ ESTÁ LA MAGIA: Exportamos 'api' para que el Chat y otras pantallas puedan usarlo
export { api };

// --- 1. CONFIGURACIÓN AXIOS (ya exportada desde api.js) ---
// El api ya está configurado en api.js con baseURL: "http://192.168.1.62:8080/api"

// --- 2. AUTENTICACIÓN (LOGIN) ---
export const loginForm = async ({ email, password }) => {
  const params = new URLSearchParams();
  params.append("username", email);    
  params.append("password", password); 
  
  if (!params.has("email")) params.append("email", email);

  // Nota: Para login usamos la raíz del servidor, no /api
  return axios.post("http://192.168.1.62:8080/login", params, {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded" 
    }
  });
};

// --- 3. REGISTRO ---
export const registerUser = async (payload) => {
  return api.post("/register", payload);
};

// --- 4. OBTENER DATOS DEL CLIENTE ---
export const getCliente = async (id) => {
  if (!id) throw new Error("ID no encontrado");
  const response = await api.get(`/clientes/${id}`);
  return response.data;
};

// --- ACTUALIZAR PERFIL CLIENTE ---
export const actualizarCliente = async (id, payload) => {
  const response = await api.put(`/clientes/${id}`, payload);
  return response.data;
};

// --- 5. ONBOARDING ---
export const completarOnboardingCliente = async (payload) => {
  const response = await api.post("/clientes/onboarding", payload);
  return response.data;
};

export const completarOnboardingEntrenador = async (payload) => {
  const response = await api.post("/entrenador/onboarding", payload);
  return response.data;
};

// --- 6. EJERCICIOS Y RUTINAS ---
export const obtenerEjercicios = async () => {
  const response = await api.get("/ejercicios");
  return response.data;
};

export const generarRutinaAuto = async (payload) => {
  const response = await api.post("/rutinas/auto", payload);
  return response.data;
};

export const guardarRutinaManual = async (payload) => {
  const response = await api.post("/rutinas/manual", payload);
  return response.data;
};

export const actualizarRutina = async (idRutina, payload) => {
  const response = await api.put(`/rutinas/${idRutina}`, payload);
  return response.data;
};

export const eliminarRutina = async (id) => {
  return api.delete(`/rutinas/${id}`);
};

// CLIENTE: Obtener TODAS las rutinas (Propias + Entrenador)
export const obtenerRutinasCliente = async (idCliente) => {
  try {
      const response = await api.get(`/rutinas/cliente/${idCliente}`);
      return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
      console.error("Error obteniendo rutinas:", error);
      return []; 
  }
};

// ENTRENADOR: Obtener SOLO las creadas por él para ese cliente
export const obtenerRutinasAsignadasPorEntrenador = async (idCliente) => {
  try {
      const response = await api.get(`/rutinas/cliente/${idCliente}/entrenador`);
      return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
      console.error("Error obteniendo rutinas entrenador:", error);
      return []; 
  }
};

// --- 7. ZONA ENTRENADOR ---

export const obtenerClientesEntrenador = async (idEntrenador) => {
  const response = await api.get(`/entrenador/${idEntrenador}/clientes`);
  return response.data;
};

export const ficharCliente = async (idEntrenador, emailCliente) => {
  return api.post(`/entrenador/${idEntrenador}/fichar`, { email: emailCliente });
};

// --- ENTRENADOR: Obtener y actualizar perfil ---
export const getEntrenador = async (id) => {
  if (!id) throw new Error("ID no encontrado");
  const response = await api.get(`/entrenador/${id}`);
  // El backend devuelve { entrenador: {...}, resenas: [...], valoracionMedia: 0 }
  // Extraemos solo la propiedad entrenador
  return response.data.entrenador || response.data;
};

export const actualizarEntrenador = async (id, payload) => {
  const response = await api.put(`/entrenador/${id}`, payload);
  return response.data;
};

// --- DASHBOARD ENTRENADOR (NUEVO) ---
export const obtenerDashboardResumen = async (entrenadorId) => {
    try {
        const response = await api.get(`/entrenador/${entrenadorId}/dashboard-resumen`);
        return response.data;
    } catch (error) {
        console.error("Error obteniendo dashboard:", error);
        return null;
    }
};

// --- 8. HISTORIAL DE ENTRENAMIENTO  ---

// Guardar una sesión finalizada
export const guardarSesionRealizada = async (payload) => {
  const response = await api.post("/sesiones", payload);
  return response.data;
};

// Ver historial
export const obtenerHistorialCliente = async (clienteId) => {
  const response = await api.get(`/sesiones/cliente/${clienteId}`);
  return Array.isArray(response.data) ? response.data : [];
};

// Obtener la última vez que se hizo una rutina específica
export const obtenerUltimaSesionRutina = async (clienteId, rutinaId) => {
    try {
        const response = await api.get(`/sesiones/ultima?clienteId=${clienteId}&rutinaId=${rutinaId}`);
        return response.data;
    } catch (error) {
        return null;
    }
};

// --- 9. ESTADÍSTICAS  ---

// Obtener KPIs globales
export const obtenerStatsGlobales = async (clienteId) => {
  try {
    const response = await api.get(`/stats/global/${clienteId}`);
    return response.data;
  } catch (error) {
    console.error("Error cargando stats globales:", error);
    return null;
  }
};

// Obtener datos para la gráfica de un ejercicio
export const obtenerProgresoEjercicio = async (clienteId, ejercicioId) => {
  try {
    const response = await api.get(`/stats/ejercicio/${clienteId}/${ejercicioId}`);
    return response.status === 204 ? null : response.data;
  } catch (error) {
    console.error("Error cargando progreso ejercicio:", error);
    return null;
  }
};

// Obtener lista de Récords Personales
export const obtenerPRs = async (clienteId) => {
    try {
        const response = await api.get(`/stats/prs/${clienteId}`);
        return response.data;
    } catch (error) {
        console.error("Error cargando PRs:", error);
        return [];
    }
};

// CALENDARIO
export const obtenerEventosCalendario = async (clienteId, inicio, fin) => {
    try {
        const res = await api.get(`/calendario/${clienteId}?inicio=${inicio}&fin=${fin}`);
        return res.data;
    } catch (error) {
        console.error("Error obteniendo calendario:", error);
        return [];
    }
};

export const programarRutina = async (clienteId, rutinaId, fecha) => {
    await api.post(`/calendario/${clienteId}`, { rutinaId, fecha });
};

export const eliminarEventoCalendario = async (eventoId) => {
    await api.delete(`/calendario/${eventoId}`);
};

export const guardarSesion = async (payload) => {
    const response = await api.post('/sesiones', payload); 
    return response.data;
};

export const toggleCompletadoEvento = async (eventoId) => {
    await api.put(`/calendario/${eventoId}/toggle`);
};

export const moverEventoCalendario = async (eventoId, nuevaFecha) => {
    await api.put(`/calendario/${eventoId}/mover`, { nuevaFecha });
};

export const obtenerResumenDashboard = async (clienteId) => {
    const response = await api.get(`/dashboard/resumen/${clienteId}`);
    return response.data;
};

export const obtenerDetalleSesion = async (eventoId) => {
    const response = await api.get(`/sesiones/evento/${eventoId}`);
    return response.data;
};

// Obtener lista de ejercicios con historial para un cliente
export const obtenerEjerciciosConHistorial = async (clienteId) => {
    try {
        const response = await api.get(`/stats/ejercicios/${clienteId}`);
        return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
        console.error("Error obteniendo ejercicios con historial:", error);
        return [];
    }
};

export const obtenerPlantillasEntrenador = async (entrenadorId) => {
  try {
      const response = await api.get(`/rutinas/plantillas/${entrenadorId}`);
      return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
      console.error("Error obteniendo plantillas:", error);
      return [];
  }
};

// 2. Clonar una plantilla a un cliente
export const clonarPlantilla = async (plantillaId, clienteId) => {
  const response = await api.post(`/rutinas/clonar/${plantillaId}/cliente/${clienteId}`);
  return response.data;
};

// Obtener datos de progreso de un ejercicio específico
export const obtenerDatosProgreso = async (clienteId, ejercicioId) => {
    try {
        const response = await api.get(`/stats/progreso/${clienteId}/${ejercicioId}`);
        return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
        console.error("Error obteniendo datos de progreso:", error);
        return [];
    }
};
// --- 10. CHAT ---
export const obtenerContactosChat = async (usuarioId) => {
    try {
      console.log("🔥 Pidiendo contactos para el ID:", usuarioId);
        const response = await api.get(`/chat/contactos?usuarioId=${usuarioId}`);
        return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
        console.error("Error obteniendo contactos de chat:", error);
        return [];
    }
};

export const buscarUsuarioPorEmail = async (email) => {
    const response = await api.get(`/clientes/buscar?email=${email}`);
    return response.data;
};

export const obtenerHistorialChat = async (usuario1, usuario2) => {
    try {
        const response = await api.get(`/chat/historial?usuario1=${usuario1}&usuario2=${usuario2}`);
        return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
        console.error("Error obteniendo historial de chat:", error);
        return [];
    }
};


// --- 11. SUBIDA DE ARCHIVOS (MULTIMEDIA) ---
export const subirArchivoAdjunto = async (archivo) => {
    // 1. Preparamos el archivo
    const formData = new FormData();
    const fileUri = Platform.OS === 'ios' ? archivo.uri.replace('file://', '') : archivo.uri;

    formData.append("file", {
        uri: fileUri,
        name: archivo.fileName || archivo.uri.split('/').pop() || 'imagen.jpg',
        type: archivo.type === 'video' ? 'video/mp4' : 'image/jpeg'
    });

    try {
        // 2. Cogemos tu token a mano porque no estamos usando Axios
        const token = await AsyncStorage.getItem('token'); 

        // 3. Hacemos la llamada con FETCH NATIVO directo a tu PC
        const response = await fetch('http://192.168.1.62:8080/api/upload', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${token}` 
                // FETCH es inteligente y pone el Content-Type y el boundary él solo
            },
            body: formData
        });

        // 4. Comprobamos si el servidor nos da el OK
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ Error del servidor: ${response.status} - ${errorText}`);
            throw new Error(`Error ${response.status} al subir archivo`);
        }

        // 5. Devolvemos la URL que nos da Spring Boot
        const data = await response.json();
        return data;

    } catch (error) {
        console.error("❌ Fallo crítico en subida nativa:", error);
        throw error;
    }
};