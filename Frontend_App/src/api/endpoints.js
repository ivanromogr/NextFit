import axios from "axios";
import api from "./api";
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ✅ Exportamos 'api' para uso global (Chat, WebSocket, etc.)
export { api };

const BASE_URL_NATIVA = "http://192.168.1.26:8080";

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
// 3. MARKETPLACE Y ENTRENADORES (CON RASTREADORES)
// ==========================================

export const getEntrenador = async (id) => {
  if (!id) throw new Error("ID no encontrado en getEntrenador");
  
  const url = `/entrenador/${id}`;
  console.log("📡 GET PERFIL LLAMANDO A:", api.defaults.baseURL + url);
  
  const response = await api.get(url);
  // ✅ Metemos el número de clientes dentro del objeto entrenador para usarlo en la pantalla
  const entrenadorData = response.data.entrenador || response.data;
  if (response.data.numeroClientes !== undefined) {
      entrenadorData.numeroClientes = response.data.numeroClientes;
  }
  
  return entrenadorData;
};

export const getReviewsEntrenador = async (entrenadorId) => {
  const url = `/entrenador/${entrenadorId}/reviews`;
  console.log("📡 GET REVIEWS LLAMANDO A:", api.defaults.baseURL + url);
  return api.get(url);
};

export const ficharEntrenador = async (entrenadorId) => {
  const response = await api.post(`/clientes/fichar`, { entrenadorId });
  return response.data;
};

// ✅ CORRECCIÓN: Se actualiza el payload a 'estrellas' en lugar de rating
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

// ==========================================
// 5. CALENDARIO Y SESIONES
// ==========================================

export const obtenerEventosCalendario = async (clienteId, inicio, fin) => {
  const res = await api.get(`/calendario/${clienteId}?inicio=${inicio}&fin=${fin}`);
  return res.data;
};

export const programarRutina = (clienteId, rutinaId, fecha) => 
  api.post(`/calendario/${clienteId}`, { rutinaId, fecha });

export const guardarSesionRealizada = async (payload) => {
  const response = await api.post("/sesiones", payload);
  return response.data;
};

// ==========================================
// 6. ESTADÍSTICAS Y PROGRESO
// ==========================================

export const obtenerStatsGlobales = async (clienteId) => {
  const response = await api.get(`/stats/global/${clienteId}`);
  return response.data;
};

export const obtenerProgresoEjercicio = async (clienteId, ejercicioId) => {
  const response = await api.get(`/stats/ejercicio/${clienteId}/${ejercicioId}`);
  return response.status === 204 ? null : response.data;
};

export const obtenerResumenDashboard = async (clienteId) => {
    try {
        const response = await api.get(`/dashboard/resumen/${clienteId}`);
        return response.data;
    } catch (error) {
        console.error("Error en obtenerResumenDashboard:", error);
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

export const subirArchivoAdjunto = async (archivo) => {
  const formData = new FormData();
  const fileUri = Platform.OS === 'ios' ? archivo.uri.replace('file://', '') : archivo.uri;

  formData.append("file", {
    uri: fileUri,
    name: archivo.fileName || archivo.uri.split('/').pop() || 'imagen.jpg',
    type: archivo.type === 'video' ? 'video/mp4' : 'image/jpeg'
  });

  const token = await AsyncStorage.getItem('token'); 
  const response = await fetch(`${BASE_URL_NATIVA}/api/upload`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}` 
    },
    body: formData
  });

  if (!response.ok) throw new Error("Fallo en la subida del archivo");
  return await response.json();
};