import axios from "axios";
import { API_BASE_URL } from "./config";
import { resolveExerciseImageUrl, resolveMediaUrl } from "../utils/media";
import { beginAuthSession, clearAuthSession, getAccessToken, getSessionVersion, saveAuthSession } from "../utils/authSession";

// --- 1. CONFIGURACIÓN AXIOS ---
export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

let refreshInFlight = null;
let recoveryInFlight = null;
const cookieRequests = new Set();
const sessionChanged = config => Object.assign(new Error("La sesión cambió durante la petición"), { code: "AUTH_SESSION_CHANGED", config });
const cancelCookieRequests = () => {
  for (const controller of cookieRequests) controller.abort();
  cookieRequests.clear();
};
if (typeof window !== "undefined") {
  window.addEventListener("nextfit:auth-cleared", cancelCookieRequests);
  window.addEventListener("nextfit:auth-changing", cancelCookieRequests);
}
const cookieRequest = (send, newAccount = false) => {
  if (newAccount) { beginAuthSession(); cancelCookieRequests(); }
  const controller = new AbortController();
  cookieRequests.add(controller);
  return send(controller.signal).finally(() => cookieRequests.delete(controller));
};
const cookiePost = (url, body, options, newAccount = false) => cookieRequest(
  signal => api.post(url, body, { timeout: 15000, ...options, signal }), newAccount,
);
const cookieDelete = options => cookieRequest(
  signal => api.delete("/api/auth/account", { timeout: 15000, ...options, signal }),
);
const recoverSession = version => {
  if (recoveryInFlight?.version === version) return recoveryInFlight.promise;
  if (version !== getSessionVersion()) return Promise.reject(sessionChanged());
  const entry = { version };
  entry.promise = refreshWebSession().then(response => {
    if (!saveAuthSession(response.data, version) || getSessionVersion() !== version) throw sessionChanged();
    return version;
  }).finally(() => { if (recoveryInFlight === entry) recoveryInFlight = null; });
  recoveryInFlight = entry;
  return entry.promise;
};

// Interceptor para inyectar el token automáticamente
api.interceptors.request.use((config) => {
  const version = config.__authSessionVersion ?? getSessionVersion();
  if (version !== getSessionVersion()) throw sessionChanged(config);
  config.__authSessionVersion = version;
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    if (response.config.__authSessionVersion !== undefined && response.config.__authSessionVersion !== getSessionVersion()) throw sessionChanged(response.config);
    return response;
  },
  async (error) => {
    const original = error.config || {};
    const version = original.__authSessionVersion ?? getSessionVersion();
    if (error.code === "ERR_CANCELED" || error.code === "AUTH_SESSION_CHANGED"
      || (version !== getSessionVersion() && recoveryInFlight?.version !== version)) return Promise.reject(error);
    const authUrl = original.url?.includes("/api/auth/");
    if (error.response?.status === 401 && !original.__refreshRetry && !authUrl) {
      original.__refreshRetry = true;
      try {
        const token = getAccessToken();
        const alreadyRotated = token && original.headers?.Authorization && original.headers.Authorization !== `Bearer ${token}`;
        const renewedVersion = alreadyRotated ? version : await recoverSession(version);
        if (renewedVersion !== getSessionVersion()) throw sessionChanged(original);
        original.__authSessionVersion = renewedVersion;
        original.headers = original.headers || {};
        original.headers.Authorization = `Bearer ${getAccessToken()}`;
        return api(original);
      } catch { clearAuthSession(version); }
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
  return cookiePost("/api/auth/login", { email, password }, { withCredentials: true, headers: { "X-Client-Type": "WEB" } }, true);
};
export const loginWithGoogle = (credential) => cookiePost("/api/auth/google", { credential }, { withCredentials: true, headers: { "X-Client-Type": "WEB" } }, true);
export const completeGoogleOnboarding = (payload) => cookiePost("/api/auth/google/onboarding", payload, { withCredentials: true, headers: { "X-Client-Type": "WEB" } }, true);
export const authenticateWithApple = (identityToken, nonce) => cookiePost("/api/auth/apple", { identityToken, nonce }, { withCredentials: true, headers: { "X-Client-Type": "WEB" } }, true);
export const completeAppleOnboarding = ({ pendingToken, role, nombre, apellido, acceptTerms, acceptPrivacy, marketingConsent }) => cookiePost("/api/auth/apple/onboarding", { pendingToken, role, nombre, apellido, acceptTerms, acceptPrivacy, marketingConsent }, { withCredentials: true, headers: { "X-Client-Type": "WEB" } }, true);
// These public endpoints deliberately do not retain the reset token. It is only
// sent from the reset form while the user is completing that request.
export const requestPasswordReset = (email) => api.post("/api/auth/password/forgot", { email });
export const resetPassword = (token, newPassword) => api.post("/api/auth/password/reset", { token, newPassword });

// --- 3. REGISTRO ---
export const registerUser = async (payload) => cookiePost("/api/register", payload, { withCredentials: true, headers: { "X-Client-Type": "WEB" } }, true);
export const refreshWebSession = () => {
  const version = getSessionVersion();
  if (!refreshInFlight || refreshInFlight.version !== version) {
    const entry = { version };
    entry.promise = cookiePost("/api/auth/refresh", null, { __authSessionVersion: version, withCredentials: true, headers: { "X-Client-Type": "WEB", "X-Requested-With": "XMLHttpRequest" } })
      .finally(() => { if (refreshInFlight === entry) refreshInFlight = null; });
    refreshInFlight = entry;
  }
  return refreshInFlight.promise;
};
export const logoutSession = () => {
  cancelCookieRequests();
  return cookiePost("/api/auth/logout", null, { withCredentials: true, headers: { "X-Client-Type": "WEB", "X-Requested-With": "XMLHttpRequest" } });
};
export const requestEmailChange = (currentPassword, newEmail) => api.put("/api/auth/email", { currentPassword, newEmail }, { withCredentials: true, headers: { "X-Client-Type": "WEB" } });
export const confirmEmailChange = (token) => cookiePost("/api/auth/email/confirm", { token }, { withCredentials: true, headers: { "X-Client-Type": "WEB" } });
export const changePassword = (currentPassword, newPassword) => api.put("/api/auth/password", { currentPassword, newPassword });
export const deleteAccount = (currentPassword) => cookieDelete({ data: { currentPassword }, withCredentials: true });
export const getSessions = () => api.get("/api/auth/sessions");
export const getAuthIdentities = () => api.get("/api/auth/identities");
export const linkGoogleIdentity = (credential) => api.post("/api/auth/identities/google/link", { credential });
export const linkAppleIdentity = (identityToken, nonce) => api.post("/api/auth/identities/apple/link", { identityToken, nonce });
export const reauthWithPassword = (password, targetProvider) => api.post("/api/auth/identities/reauth/password", { password, targetProvider });
export const reauthWithGoogle = (credential, targetProvider) => api.post("/api/auth/identities/reauth/google", { credential, targetProvider });
export const reauthWithApple = (identityToken, nonce, targetProvider) => api.post("/api/auth/identities/reauth/apple", { identityToken, nonce, targetProvider });
export const reauthCreateLocalWithGoogle = (credential) => api.post("/api/auth/identities/local/reauth/google", { credential });
export const reauthCreateLocalWithApple = (identityToken, nonce) => api.post("/api/auth/identities/local/reauth/apple", { identityToken, nonce });
export const createLocalIdentity = (reauthToken, password) => api.post("/api/auth/identities/local", { reauthToken, password });
export const unlinkGoogleIdentity = (reauthToken) => api.delete("/api/auth/identities/google", { data: { reauthToken } });
export const unlinkAppleIdentity = (reauthToken) => api.delete("/api/auth/identities/apple", { data: { reauthToken } });
export const revokeSession = (familyId) => api.delete(`/api/auth/sessions/${familyId}`);
export const logoutAllSessions = () => cookiePost("/api/auth/sessions/logout-all", null, { withCredentials: true, headers: { "X-Client-Type": "WEB", "X-Requested-With": "XMLHttpRequest" } });
export const getConsents = () => api.get("/api/auth/consents");
export const updateMarketingConsent = (accepted) => api.put("/api/auth/consents/marketing", { accepted });
export const assignProfileImage = (fileId) => api.put("/api/auth/profile-image", { fileId });
export const deleteProfileImage = () => api.delete("/api/auth/profile-image");

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
  const response = await api.get(`/api/entrenador/${entrenadorId}/dashboard-resumen`);
  return response.data;
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
  let url = `/api/stats/global/${clienteId}`;
  if (entrenadorId) url += `?entrenadorId=${entrenadorId}`;
  return (await api.get(url)).data;
};

export const obtenerProgresoEjercicio = async (clienteId, ejercicioId, entrenadorId = null) => {
  let url = `/api/stats/ejercicio/${clienteId}/${ejercicioId}`;
  if (entrenadorId) url += `?entrenadorId=${entrenadorId}`;
  const response = await api.get(url);
  return response.status === 204 ? null : response.data;
};

export const obtenerPRs = async (clienteId, entrenadorId = null) => {
  let url = `/api/stats/prs/${clienteId}`;
  if (entrenadorId) url += `?entrenadorId=${entrenadorId}`;
  return (await api.get(url)).data;
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
  let url = `/api/stats/ejercicios/${clienteId}`;
  if (entrenadorId) url += `?entrenadorId=${entrenadorId}`;
  const response = await api.get(url);
  if (!Array.isArray(response.data)) throw new Error('Invalid exercise history');
  return response.data;
};
export const obtenerPlantillasEntrenador = async (entrenadorId) => {
  const response = await api.get(`/api/rutinas/plantillas/${entrenadorId}`);
  if (!Array.isArray(response.data)) throw new Error('Invalid template list');
  return response.data;
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

export const deleteAccountWithGoogle = (credential) => cookieDelete({ data: { provider: 'GOOGLE', credential }, withCredentials: true });
export const deleteAccountWithApple = (identityToken, nonce) => cookieDelete({ data: { provider: 'APPLE', identityToken, nonce }, withCredentials: true });
