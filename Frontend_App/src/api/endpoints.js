import api from "./api";
import { BASE_URL } from '../config/environment';

export { api };

console.log('[ENDPOINTS CONFIG] 🔧 BASE_URL =', BASE_URL);

// ==========================================
// ==========================================
export const getImageUrl = (path) => {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  return `${BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
};


// ==========================================
// 1. AUTENTICACIÓN Y REGISTRO
// ==========================================
export const loginForm = async ({ email, password }) => {
  return api.post('/auth/login', { email, password }, { headers: { 'X-Client-Type': 'MOBILE' } });
};
export const loginWithGoogle = (credential) => api.post('/auth/google', { credential }, { headers: { 'X-Client-Type': 'MOBILE' } });
export const completeGoogleOnboarding = (payload) => api.post('/auth/google/onboarding', payload, { headers: { 'X-Client-Type': 'MOBILE' } });
export const authenticateWithApple = (identityToken, nonce) => api.post('/auth/apple', { identityToken, nonce }, { headers: { 'X-Client-Type': 'MOBILE' } });
export const completeAppleOnboarding = ({ pendingToken, role, nombre, apellido, acceptTerms, acceptPrivacy, marketingConsent }) => api.post('/auth/apple/onboarding', { pendingToken, role, nombre, apellido, acceptTerms, acceptPrivacy, marketingConsent }, { headers: { 'X-Client-Type': 'MOBILE' } });
export const requestPasswordReset = (email) => api.post('/auth/password/forgot', { email }, { headers: { 'X-Client-Type': 'MOBILE' } });
export const resetPassword = (token, newPassword) => api.post('/auth/password/reset', { token, newPassword }, { headers: { 'X-Client-Type': 'MOBILE' } });

export const registerUser = async (payload) => api.post("/register", payload, { headers: { 'X-Client-Type': 'MOBILE' } });
export const getConsents = () => api.get('/auth/consents');
export const updateMarketingConsent = (accepted) => api.put('/auth/consents/marketing', { accepted });
export const requestEmailChange = (currentPassword, newEmail) => api.put('/auth/email', { currentPassword, newEmail }, { headers: { 'X-Client-Type': 'MOBILE' } });
export const confirmEmailChange = (token) => api.post('/auth/email/confirm', { token }, { headers: { 'X-Client-Type': 'MOBILE' } });
export const changePassword = (currentPassword, newPassword) => api.put('/auth/password', { currentPassword, newPassword });
export const deleteAccount = (currentPassword) => api.delete('/auth/account', { data: { currentPassword } });
export const getSessions = () => api.get('/auth/sessions');
export const getAuthIdentities = () => api.get('/auth/identities');
export const linkGoogleIdentity = credential => api.post('/auth/identities/google/link', { credential });
export const linkAppleIdentity = (identityToken, nonce) => api.post('/auth/identities/apple/link', { identityToken, nonce });
export const reauthWithPassword = (password, targetProvider) => api.post('/auth/identities/reauth/password', { password, targetProvider });
export const reauthWithGoogle = (credential, targetProvider) => api.post('/auth/identities/reauth/google', { credential, targetProvider });
export const reauthWithApple = (identityToken, nonce, targetProvider) => api.post('/auth/identities/reauth/apple', { identityToken, nonce, targetProvider });
export const unlinkGoogleIdentity = reauthToken => api.delete('/auth/identities/google', { data: { reauthToken } });
export const unlinkAppleIdentity = reauthToken => api.delete('/auth/identities/apple', { data: { reauthToken } });
export const revokeSession = (familyId) => api.delete(`/auth/sessions/${familyId}`);
export const logoutAllSessions = () => api.post('/auth/sessions/logout-all', null, { headers: { 'X-Client-Type': 'MOBILE' } });
export const getDataExport = () => api.get('/auth/data-export');
export const assignProfileImage = (fileId) => api.put('/auth/profile-image', { fileId });
export const deleteProfileImage = () => api.delete('/auth/profile-image');

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
  try {
    console.log('[obtenerEjercicios] 📥 Iniciando carga de ejercicios...');
    const response = await api.get("/ejercicios");
    
    console.log('[obtenerEjercicios] ✅ Ejercicios recibidos:', {
      cantidad: response.data?.length || 0,
      tipoData: Array.isArray(response.data) ? 'array' : typeof response.data,
      status: response.status,
    });
    
    return response.data;
  } catch (error) {
    console.error('[obtenerEjercicios] ❌ ERROR al obtener ejercicios:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: error.config?.url,
      fullUrl: `${error.config?.baseURL}${error.config?.url}`,
      message: error.message,
      errorData: error.response?.data,
    });
    
    throw error;
  }
};
export const obtenerEjerciciosConHistorial = async (clienteId, entrenadorId = null) => {
  try {
    const config = entrenadorId ? { params: { entrenadorId } } : {};
    const response = await api.get(`/stats/ejercicios/${clienteId}`, config);
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error('[obtenerEjerciciosConHistorial] ❌ Error:', error.message);
    return []; // Si no ha hecho ejercicios, array vacío
  }
};

export const obtenerRutinasCliente = async (idCliente) => {
  try {
    const response = await api.get(`/rutinas/cliente/${idCliente}`, { silentError: true });
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.warn('[obtenerRutinasCliente] No se pudieron cargar rutinas:', error.response?.status || error.message);
    return []; 
  }
};

export const generarRutinaAuto = (payload) => api.post("/rutinas/auto", payload);
export const guardarRutinaManual = (payload) => api.post("/rutinas/manual", payload);
export const eliminarRutina = (id) => api.delete(`/rutinas/${id}`);
export const actualizarRutina = (id, payload) => api.put(`/rutinas/${id}`, payload);

export const obtenerRutinasAsignadasPorEntrenador = async (idCliente, entrenadorId) => {
  try {
      const response = await api.get(`/rutinas/cliente/${idCliente}/entrenador`, {
          params: { entrenadorId }, // Pasamos el ID del coach logueado
          silentError: true
      });
      return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
      console.warn("No se pudieron cargar rutinas asignadas:", error.response?.status || error.message);
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
export const obtenerContactosChat = async () => {
  const response = await api.get('/chat/contactos');
  return Array.isArray(response.data) ? response.data : [];
};

export const buscarUsuarioPorEmail = async (email) => {
    const response = await api.get(`/clientes/buscar?email=${email}`);
    return response.data;
};

export const obtenerHistorialChat = async (_usuarioActual, otroUsuarioId) => {
  const response = await api.get(`/chat/historial?otroUsuarioId=${otroUsuarioId}`);
  return Array.isArray(response.data) ? response.data : [];
};

// ==========================================
// 8. MULTIMEDIA (UPLOAD)
// ==========================================
export const subirArchivoAdjunto = async (formData, purpose = 'PROFILE_IMAGE') => {
  try {
    if (!formData?._parts?.some?.(([key]) => key === 'purpose')) formData.append('purpose', purpose);
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
