import axios from "axios";
import { API_BASE_URL } from "./config";
import { resolveExerciseImageUrl, resolveMediaUrl } from "../utils/media";
import { clearAuthSession, getAccessToken, saveAuthSession } from "../utils/authSession";

// --- 1. CONFIGURACIÓN AXIOS ---
export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor para inyectar el token automáticamente
api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config || {};
    const authUrl = original.url?.includes("/api/auth/");
    if (error.response?.status === 401 && !original.__refreshRetry && !authUrl) {
      original.__refreshRetry = true;
      try {
        const response = await refreshWebSession();
        saveAuthSession(response.data);
        original.headers = original.headers || {};
        original.headers.Authorization = `Bearer ${getAccessToken()}`;
        return api(original);
      } catch { clearAuthSession(); }
    }
    return Promise.reject(error);
  },
);

const normalizarPerfil = (data) => {
  if (!data || typeof data !== "object") return data;
  return {
    ...data,
    fotoPerfil: resolveMediaUrl(data.fotoPerfil),
    entrenador: data.entrenador
      ? {
          ...data.entrenador,
          fotoPerfil: resolveMediaUrl(data.entrenador.fotoPerfil),
        }
      : data.entrenador,
  };
};

const normalizarEjercicio = (ejercicio) => {
  if (!ejercicio || typeof ejercicio !== "object") return ejercicio;
  const imagenOriginalUrl = ejercicio.imagenOriginalUrl
    || ejercicio.imagenUrl
    || ejercicio.gifUrl
    || ejercicio.imagenPaso1
    || ejercicio.imagenPaso2
    || ejercicio.imagenPaso3
    || "";
  return {
    ...ejercicio,
    imagenOriginalUrl,
    imagenUrl: resolveExerciseImageUrl({ ...ejercicio, imagenOriginalUrl }),
  };
};

const normalizarRutina = (rutina) => {
  if (!rutina || typeof rutina !== "object") return rutina;
  return {
    ...rutina,
    detalles: Array.isArray(rutina.detalles)
      ? rutina.detalles.map((detalle) => ({
          ...detalle,
          ejercicio: normalizarEjercicio(detalle.ejercicio),
        }))
      : rutina.detalles,
  };
};

// --- 2. AUTENTICACIÓN (LOGIN) ---
export const loginForm = async ({ email, password }) => {
  return api.post("/api/auth/login", { email, password }, { withCredentials: true, headers: { "X-Client-Type": "WEB" } });
};

// --- 3. REGISTRO ---
export const registerUser = async (payload) => api.post("/api/register", payload, { withCredentials: true, headers: { "X-Client-Type": "WEB" } });
let refreshInFlight = null;
export const refreshWebSession = () => {
  if (!refreshInFlight) refreshInFlight = api.post("/api/auth/refresh", null, { withCredentials: true, headers: { "X-Client-Type": "WEB", "X-Requested-With": "XMLHttpRequest" } }).finally(() => { refreshInFlight = null; });
  return refreshInFlight;
};
export const logoutSession = () => api.post("/api/auth/logout", null, { withCredentials: true, headers: { "X-Client-Type": "WEB", "X-Requested-With": "XMLHttpRequest" } });

// --- 4. OBTENER DATOS DEL CLIENTE ---
export const getCliente = async (id) => {
  if (!id) throw new Error("ID no encontrado");
  const response = await api.get(`/api/clientes/${id}`);
  return normalizarPerfil(response.data);
};

// --- ACTUALIZAR PERFIL CLIENTE ---
export const actualizarCliente = async (id, payload) => {
  const response = await api.put(`/api/clientes/${id}`, payload);
  return response.data;
};

// --- 5. ONBOARDING ---
export const completarOnboardingCliente = async (payload) => {
  const response = await api.post("/api/clientes/onboarding", payload);
  return response.data;
};

export const completarOnboardingEntrenador = async (payload) => {
  const response = await api.post("/api/entrenador/onboarding", payload);
  return response.data;
};

// --- 6. EJERCICIOS Y RUTINAS ---
export const obtenerEjercicios = async () => {
  const response = await api.get("/api/ejercicios");
  return Array.isArray(response.data) ? response.data.map(normalizarEjercicio) : [];
};

export const generarRutinaAuto = async (payload) => {
  const response = await api.post("/api/rutinas/auto", payload);
  return response.data;
};

export const guardarRutinaManual = async (payload) => {
  const response = await api.post("/api/rutinas/manual", payload);
  return response.data;
};

export const actualizarRutina = async (idRutina, payload) => {
  const response = await api.put(`/api/rutinas/${idRutina}`, payload);
  return response.data;
};

export const eliminarRutina = async (id) => {
  return api.delete(`/api/rutinas/${id}`);
};

const pendingRutinasCliente = new Map();
const pendingRutinasEntrenador = new Map();

// CLIENTE: Obtener TODAS las rutinas (Propias + Entrenador)
export const obtenerRutinasCliente = async (idCliente, options = {}) => {
  if (!idCliente) return [];

  const key = String(idCliente);
  if (pendingRutinasCliente.has(key)) return pendingRutinasCliente.get(key);

  const request = api.get(`/api/rutinas/cliente/${idCliente}`)
    .then((response) => {
      return Array.isArray(response.data) ? response.data.map(normalizarRutina) : [];
    })
    .catch((error) => {
      console.warn("No se pudieron cargar las rutinas del cliente:", error?.response?.status || error?.message);
      if (options.throwOnError) throw error;
      return [];
    })
    .finally(() => {
      pendingRutinasCliente.delete(key);
    });

  pendingRutinasCliente.set(key, request);
  return request;
};

// ENTRENADOR: Obtener SOLO las creadas por él para ese cliente
export const obtenerRutinasAsignadasPorEntrenador = async (idCliente, entrenadorId) => {
  if (!idCliente) return [];

  const key = `${idCliente}:${entrenadorId || "all"}`;
  if (pendingRutinasEntrenador.has(key)) return pendingRutinasEntrenador.get(key);

  let url = `/api/rutinas/cliente/${idCliente}/entrenador`;
  if (entrenadorId) {
    url += `?entrenadorId=${entrenadorId}`;
  }

  const request = api.get(url)
    .then((response) => {
      return Array.isArray(response.data) ? response.data.map(normalizarRutina) : [];
    })
    .catch((error) => {
      console.warn("No se pudieron cargar las rutinas del entrenador:", error?.response?.status || error?.message);
      return [];
    })
    .finally(() => {
      pendingRutinasEntrenador.delete(key);
    });

  pendingRutinasEntrenador.set(key, request);
  return request;
};

// --- 7. ZONA ENTRENADOR ---
export const obtenerClientesEntrenador = async (idEntrenador) => {
  const response = await api.get(`/api/entrenador/${idEntrenador}/clientes`);
  return response.data;
};

export const ficharCliente = async (idEntrenador, emailCliente) => {
  return api.post(`/api/entrenador/${idEntrenador}/fichar`, { email: emailCliente });
};

// --- ENTRENADOR: Obtener y actualizar perfil ---
export const getEntrenador = async (id) => {
  if (!id) throw new Error("ID no encontrado");
  const response = await api.get(`/api/entrenador/${id}`);
  return normalizarPerfil(response.data.entrenador || response.data);
};

export const actualizarEntrenador = async (id, payload) => {
  const response = await api.put(`/api/entrenador/${id}`, payload);
  return response.data;
};

// --- DASHBOARD ENTRENADOR ---
export const obtenerDashboardResumen = async (entrenadorId) => {
  try {
    const response = await api.get(`/api/entrenador/${entrenadorId}/dashboard-resumen`);
    return response.data;
  } catch (error) {
    console.error("Error obteniendo dashboard:", error);
    return null;
  }
};

// --- 8. HISTORIAL DE ENTRENAMIENTO ---
export const guardarSesionRealizada = async (payload) => {
  const response = await api.post("/api/sesiones", payload);
  return response.data;
};

export const obtenerHistorialCliente = async (clienteId) => {
  const response = await api.get(`/api/sesiones/cliente/${clienteId}`);
  return Array.isArray(response.data) ? response.data : [];
};

export const obtenerUltimaSesionRutina = async (clienteId, rutinaId) => {
  try {
    const response = await api.get(`/api/sesiones/ultima?clienteId=${clienteId}&rutinaId=${rutinaId}`);
    return response.data;
  } catch {
    return null;
  }
};

// --- 9. ESTADÍSTICAS ---
export const obtenerStatsGlobales = async (clienteId, entrenadorId = null) => {
  try {
    let url = `/api/stats/global/${clienteId}`;
    if (entrenadorId) url += `?entrenadorId=${entrenadorId}`;
    const response = await api.get(url);
    return response.data;
  } catch (error) {
    console.error("Error cargando stats globales:", error);
    return null;
  }
};

export const obtenerProgresoEjercicio = async (clienteId, ejercicioId, entrenadorId = null) => {
  try {
    let url = `/api/stats/ejercicio/${clienteId}/${ejercicioId}`;
    if (entrenadorId) url += `?entrenadorId=${entrenadorId}`;
    const response = await api.get(url);
    return response.status === 204 ? null : response.data;
  } catch (error) {
    console.error("Error cargando progreso ejercicio:", error);
    return null;
  }
};

export const obtenerPRs = async (clienteId, entrenadorId = null) => {
  try {
    let url = `/api/stats/prs/${clienteId}`;
    if (entrenadorId) url += `?entrenadorId=${entrenadorId}`;
    const response = await api.get(url);
    return response.data;
  } catch (error) {
    console.error("Error cargando PRs:", error);
    return [];
  }
};

export const obtenerEventosCalendario = async (clienteId, inicio, fin, entrenadorId = null) => {
  try {
    let url = `/api/calendario/${clienteId}?inicio=${inicio}&fin=${fin}`;
    if (entrenadorId) {
      url += `&entrenadorId=${entrenadorId}`;
    }
    const res = await api.get(url);
    return res.data;
  } catch (error) {
    console.error("Error obteniendo calendario:", error);
    return [];
  }
};

export const programarRutina = async (clienteId, rutinaId, fecha, entrenadorId) => {
  await api.post(`/api/calendario/${clienteId}`, { rutinaId, fecha, entrenadorId });
};

export const eliminarEventoCalendario = async (eventoId) => {
  await api.delete(`/api/calendario/${eventoId}`);
};

export const guardarSesion = async (payload) => {
  const response = await api.post("/api/sesiones", payload);
  return response.data;
};

export const toggleCompletadoEvento = async (eventoId) => {
  await api.put(`/api/calendario/${eventoId}/toggle`);
};

export const moverEventoCalendario = async (eventoId, nuevaFecha) => {
  await api.put(`/api/calendario/${eventoId}/mover`, { nuevaFecha });
};

export const obtenerResumenDashboard = async (clienteId) => {
  const response = await api.get(`/api/dashboard/resumen/${clienteId}`);
  return response.data;
};

export const obtenerDetalleSesion = async (eventoId) => {
  const response = await api.get(`/api/sesiones/evento/${eventoId}`);
  return response.data;
};

export const obtenerEjerciciosConHistorial = async (clienteId, entrenadorId = null) => {
  try {
    let url = `/api/stats/ejercicios/${clienteId}`;
    if (entrenadorId) url += `?entrenadorId=${entrenadorId}`;
    const response = await api.get(url);
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error("Error obteniendo ejercicios con historial:", error);
    return [];
  }
};

export const obtenerPlantillasEntrenador = async (entrenadorId) => {
  try {
    const response = await api.get(`/api/rutinas/plantillas/${entrenadorId}`);
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error("Error obteniendo plantillas:", error);
    return [];
  }
};

export const clonarPlantilla = async (plantillaId, clienteId) => {
  const response = await api.post(`/api/rutinas/clonar/${plantillaId}/cliente/${clienteId}`);
  return response.data;
};

export const obtenerDatosProgreso = async (clienteId, ejercicioId, entrenadorId = null) => {
  try {
    let url = `/api/stats/progreso/${clienteId}/${ejercicioId}`;
    if (entrenadorId) url += `?entrenadorId=${entrenadorId}`;
    const response = await api.get(url);
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error("Error obteniendo datos de progreso:", error);
    return [];
  }
};

export const desvincularAtleta = async (idEntrenador, idCliente) => {
  const response = await api.post(`/api/entrenador/${idEntrenador}/desvincular/${idCliente}`);
  return response.data;
};

export const desvincularEntrenadorCliente = async (idCliente) => {
  const response = await api.post(`/api/clientes/${idCliente}/desvincular-entrenador`);
  return response.data;
};

export const obtenerContactosChat = async () => {
  const response = await api.get('/api/chat/contactos');
  return Array.isArray(response.data)
    ? response.data.map(normalizarPerfil)
    : [];
};
