import axios from "axios";

// --- 1. CONFIGURACIÓN AXIOS ---
export const api = axios.create({
  baseURL: "http://localhost:8080", 
  withCredentials: true,            
  headers: {
    "Content-Type": "application/json",
  },
});

// --- 2. AUTENTICACIÓN (LOGIN) ---
export const loginForm = async ({ email, password }) => {
  const params = new URLSearchParams();
  params.append("username", email);    
  params.append("password", password); 
  
  if (!params.has("email")) params.append("email", email);

  return api.post("/login", params, {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded" 
    }
  });
};

// --- 3. REGISTRO ---
export const registerUser = async (payload) => {
  return api.post("/api/register", payload);
};

// --- 4. OBTENER DATOS DEL CLIENTE ---
export const getCliente = async (id) => {
  if (!id) throw new Error("ID no encontrado");
  const response = await api.get(`/api/clientes/${id}`);
  return response.data;
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
  return response.data;
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

// CLIENTE: Obtener TODAS las rutinas (Propias + Entrenador)
export const obtenerRutinasCliente = async (idCliente) => {
  try {
      const response = await api.get(`/api/rutinas/cliente/${idCliente}`);
      return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
      console.error("Error obteniendo rutinas:", error);
      return []; 
  }
};

// ✅ NUEVO: ENTRENADOR: Obtener SOLO las creadas por él para ese cliente
// Esta función es necesaria para la vista "RutinasDeCliente.jsx" del entrenador
export const obtenerRutinasAsignadasPorEntrenador = async (idCliente) => {
  try {
      const response = await api.get(`/api/rutinas/cliente/${idCliente}/entrenador`);
      return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
      console.error("Error obteniendo rutinas entrenador:", error);
      return []; 
  }
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
  return response.data;
};

export const actualizarEntrenador = async (id, payload) => {
  const response = await api.put(`/api/entrenador/${id}`, payload);
  return response.data;
};

// --- 8. HISTORIAL DE ENTRENAMIENTO  ---

// Guardar una sesión finalizada
export const guardarSesionRealizada = async (payload) => {
  // payload debe coincidir con el DTO GuardarSesionRequest de Java
  const response = await api.post("/api/sesiones", payload);
  return response.data;
};

// Ver historial
export const obtenerHistorialCliente = async (clienteId) => {
  const response = await api.get(`/api/sesiones/cliente/${clienteId}`);
  return Array.isArray(response.data) ? response.data : [];
};

// Obtener la última vez que se hizo una rutina específica
export const obtenerUltimaSesionRutina = async (clienteId, rutinaId) => {
    try {
        const response = await api.get(`/api/sesiones/ultima?clienteId=${clienteId}&rutinaId=${rutinaId}`);
        return response.data;
    } catch (error) {
        return null;
    }
};
// --- 9. ESTADÍSTICAS  ---

// Obtener KPIs globales (Entrenos totales, Volumen histórico, etc.)
export const obtenerStatsGlobales = async (clienteId) => {
  try {
    const response = await api.get(`/api/stats/global/${clienteId}`);
    return response.data;
  } catch (error) {
    console.error("Error cargando stats globales:", error);
    return null;
  }
};

// Obtener datos para la gráfica de un ejercicio (1RM Estimado)
export const obtenerProgresoEjercicio = async (clienteId, ejercicioId) => {
  try {
    const response = await api.get(`/api/stats/ejercicio/${clienteId}/${ejercicioId}`);
    return response.status === 204 ? null : response.data;
  } catch (error) {
    console.error("Error cargando progreso ejercicio:", error);
    return null;
  }
};

// Obtener lista de Récords Personales
export const obtenerPRs = async (clienteId) => {
    try {
        const response = await api.get(`/api/stats/prs/${clienteId}`);
        return response.data;
    } catch (error) {
        console.error("Error cargando PRs:", error);
        return [];
    }
};

// CALENDARIO
export const obtenerEventosCalendario = async (clienteId, inicio, fin) => {
    try {
        const res = await api.get(`/api/calendario/${clienteId}?inicio=${inicio}&fin=${fin}`);
        return res.data;
    } catch (error) {
        console.error("Error obteniendo calendario:", error);
        return [];
    }
};

export const programarRutina = async (clienteId, rutinaId, fecha) => {
    await api.post(`/api/calendario/${clienteId}`, { rutinaId, fecha });
};

export const eliminarEventoCalendario = async (eventoId) => {
    await api.delete(`/api/calendario/${eventoId}`);
};

// 1. Guardar el entrenamiento realizado
export const guardarSesion = async (payload) => {
    // Esta ruta debe coincidir con tu Backend (GestorSesion)
    // Normalmente es POST /api/sesiones o POST /api/entrenamientos
    const response = await api.post('/api/sesiones', payload); 
    return response.data;
};

export const toggleCompletadoEvento = async (eventoId) => {
    // Llama al endpoint que creamos en Java para cambiar el estado
    await api.put(`/api/calendario/${eventoId}/toggle`);
};
export const moverEventoCalendario = async (eventoId, nuevaFecha) => {
    await api.put(`/api/calendario/${eventoId}/mover`, { nuevaFecha });
};

