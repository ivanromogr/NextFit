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