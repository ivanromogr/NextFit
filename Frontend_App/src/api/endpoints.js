import axios from "axios";
import api from "./api";
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ✅ Exportamos 'api' para uso global (Chat, WebSocket, etc.)
export { api };

const BASE_URL_NATIVA = "http://192.168.1.30:8080";

// ==========================================
// 💡 HELPER PROFESIONAL DE IMÁGENES
// ==========================================
export const getImageUrl = (path) => {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  return `${BASE_URL_NATIVA}${path.startsWith('/') ? '' : '/'}${path}`;
};


// ==========================================
// 1. AUTENTICACIÓN Y REGISTRO
// ==========================================
export const loginForm = async ({ email, password }) => {
  const params = new URLSearchParams();
  params.append("username", email);    
  params.append("password", password); 
  
  return axios.post(`${BASE_URL_NATIVA}/login`, params, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" }
  });
};

export const registerUser = async (payload) => api.post("/register", payload);

// ==========================================
// 2. CLIENTE: PERFIL Y ONBOARDING
// ==========================================
export const getCliente = async (id) => {
  const response = await api.get(`/clientes/${id}`);
  return response.data;
};

export const actualizarCliente = async (id, payload) => {
  const response = await api.put(`/clientes/${id}`, payload);
  return response.data;
};

export const completarOnboardingCliente = async (payload) => {
  const response = await api.post("/clientes/onboarding", payload);
  return response.data;
};

// ==========================================
// 3. MARKETPLACE Y ENTRENADORES
// ==========================================
export const getEntrenador = async (id) => {
  if (!id) throw new Error("ID no encontrado en getEntrenador");
  
  const url = `/entrenador/${id}`;
  const response = await api.get(url);
  const entrenadorData = response.data.entrenador || response.data;
  if (response.data.numeroClientes !== undefined) {
      entrenadorData.numeroClientes = response.data.numeroClientes;
  }
  return entrenadorData;
};

export const getReviewsEntrenador = async (entrenadorId) => {
  const url = `/entrenador/${entrenadorId}/reviews`;
  return api.get(url);
};

export const ficharEntrenador = async (entrenadorId) => {
  const response = await api.post(`/clientes/fichar`, { entrenadorId });
  return response.data;
};

export const postReview = async (payload) => {
  return api.post(`/entrenador/${payload.entrenadorId}/resena`, {
      estrellas: payload.rating, 
      comentario: payload.comentario
  });
};

export const actualizarEntrenador = async (id, payload) => {
  const response = await api.put(`/entrenador/${id}`, payload);
  return response.data;
};

export const completarOnboardingEntrenador = async (payload) => {
  const response = await api.post("/entrenador/onboarding", payload);
  return response.data;
};

// ==========================================
// 4. RUTINAS Y EJERCICIOS
// ==========================================
export const obtenerEjercicios = async () => {
  const response = await api.get("/ejercicios");
  return response.data;
};
export const obtenerEjerciciosConHistorial = async (clienteId, entrenadorId = null) => {
  try {
    const config = entrenadorId ? { params: { entrenadorId } } : {};
    const response = await api.get(`/stats/ejercicios/${clienteId}`, config);
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    return []; // Si no ha hecho ejercicios, array vacío
  }
};

export const obtenerRutinasCliente = async (idCliente) => {
  try {
    const response = await api.get(`/rutinas/cliente/${idCliente}`);
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    return []; 
  }
};

export const generarRutinaAuto = (payload) => api.post("/rutinas/auto", payload);
export const guardarRutinaManual = (payload) => api.post("/rutinas/manual", payload);
export const eliminarRutina = (id) => api.delete(`/rutinas/${id}`);
export const actualizarRutina = (id, payload) => api.put(`/rutinas/${id}`, payload);

// ✅ AÑADIDO: Rutinas filtradas por el entrenador (Para el calendario)
export const obtenerRutinasAsignadasPorEntrenador = async (idCliente, entrenadorId) => {
  try {
      const response = await api.get(`/rutinas/cliente/${idCliente}/entrenador`, {
          params: { entrenadorId } // Pasamos el ID del coach logueado
      });
      return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
      console.error("Error obteniendo rutinas asignadas:", error);
      return []; 
  }
};

// ==========================================
// 5. CALENDARIO Y SESIONES
// ==========================================
export const obtenerEventosCalendario = async (clienteId, inicio, fin, entrenadorId = null) => {
  let url = `/calendario/${clienteId}?inicio=${inicio}&fin=${fin}`;
  if (entrenadorId) {
      url += `&entrenadorId=${entrenadorId}`;
  }
  const res = await api.get(url);
  return res.data;
};

export const programarRutina = (clienteId, rutinaId, fecha, entrenadorId) => 
  api.post(`/calendario/${clienteId}`, { 
      rutinaId: rutinaId, 
      fecha: fecha,
      entrenadorId: entrenadorId 
  });

export const eliminarEventoCalendario = async (eventoId) => {
  const response = await api.delete(`/calendario/${eventoId}`);
  return response.data;
};

export const toggleCompletadoEvento = async (eventoId) => {
  try {
      const response = await api.put(`/calendario/${eventoId}/toggle`);
      return response.data;
  } catch (error) {
      console.error("Error al cambiar estado del evento:", error);
      throw error;
  }
};

export const guardarSesionRealizada = async (payload) => {
  const response = await api.post("/sesiones", payload);
  return response.data;
};

export const obtenerUltimaSesionRutina = async (clienteId, rutinaId) => {
  try {
    const response = await api.get(`/sesiones/ultima?clienteId=${clienteId}&rutinaId=${rutinaId}`);
    return response.data;
  } catch (error) {
    return null; 
  }
};

// ==========================================
// 6. ESTADÍSTICAS Y PROGRESO
// ==========================================
export const obtenerStatsGlobales = async (clienteId, entrenadorId = null) => {
  try {
    const config = entrenadorId ? { params: { entrenadorId } } : {};
    const response = await api.get(`/stats/global/${clienteId}`, config);
    return response.data;
  } catch (error) {
    return null; // Si da 404, devolvemos null para que la app no crashee
  }
};

export const obtenerProgresoEjercicio = async (clienteId, ejercicioId, entrenadorId = null) => {
  try {
    const config = entrenadorId ? { params: { entrenadorId } } : {};
    const response = await api.get(`/stats/ejercicio/${clienteId}/${ejercicioId}`, config);
    return response.status === 204 ? null : response.data;
  } catch (error) {
    return null;
  }
};

export const obtenerPRs = async (clienteId, entrenadorId = null) => {
  try {
    const config = entrenadorId ? { params: { entrenadorId } } : {};
    const response = await api.get(`/stats/prs/${clienteId}`, config);
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    return []; // Si no hay PRs, devolvemos array vacío
  }
};

export const obtenerResumenDashboard = async (clienteId) => {
    try {
        const response = await api.get(`/dashboard/resumen/${clienteId}`);
        return response.data;
    } catch (error) {
        return null;
    }
};

// ==========================================
// 7. CHAT
// ==========================================
export const obtenerContactosChat = async (usuarioId) => {
  const response = await api.get(`/chat/contactos?usuarioId=${usuarioId}`);
  return Array.isArray(response.data) ? response.data : [];
};

export const buscarUsuarioPorEmail = async (email) => {
    const response = await api.get(`/clientes/buscar?email=${email}`);
    return response.data;
};

export const obtenerHistorialChat = async (usuario1, usuario2) => {
  const response = await api.get(`/chat/historial?usuario1=${usuario1}&usuario2=${usuario2}`);
  return Array.isArray(response.data) ? response.data : [];
};

// ==========================================
// 8. MULTIMEDIA (UPLOAD)
// ==========================================
export const subirArchivoAdjunto = async (formData) => {
  try {
    const response = await api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Accept': 'application/json',
      },
      transformRequest: (data, headers) => {
        return formData; 
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error al subir archivo a /api/upload:", error.response?.data || error.message);
    throw error;
  }
};

// ==========================================
// 9. PANEL ENTRENADOR (DASHBOARD Y GESTIÓN)
// ==========================================
export const obtenerClientesEntrenador = async (entrenadorId) => {
  try {
    const response = await api.get(`/entrenador/${entrenadorId}/clientes`);
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error("Error en obtenerClientesEntrenador:", error);
    return [];
  }
};

export const obtenerDashboardResumen = async (entrenadorId) => {
  try {
    const response = await api.get(`/entrenador/${entrenadorId}/dashboard-resumen`);
    return response.data;
  } catch (error) {
    console.error("Error en obtenerDashboardResumen:", error);
    return null;
  }
};

export const ficharCliente = async (entrenadorId, emailCliente) => {
  try {
      if (!entrenadorId) throw new Error("ID de entrenador no disponible");
      const response = await api.post(`/entrenador/${entrenadorId}/fichar`, { 
          email: emailCliente 
      });
      return response.data;
  } catch (error) {
      console.error("❌ Error en ficharCliente:", error.response?.status, error.response?.data);
      throw error;
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

export const clonarPlantilla = async (plantillaId, clienteId) => {
  try {
      const response = await api.post(`/rutinas/clonar/${plantillaId}/cliente/${clienteId}`);
      return response.data;
  } catch (error) {
      console.error("Error al clonar plantilla:", error);
      throw error;
  }
};

// DESVINCULAR ATLETA DEL ENTRENADOR

  export const desvincularAtleta = async (idEntrenador, idCliente) => {
    try {
        const response = await api.post(`/entrenador/${idEntrenador}/desvincular/${idCliente}`);
        return response.data;
    } catch (error) {
        console.error("Error en desvincularAtleta:", error.response?.data || error.message);
        throw error;
    }
};