import axios from "axios";

// --- 1. CONFIGURACIÓN AXIOS ---
export const api = axios.create({
  baseURL: "http://localhost:8080", // Tu puerto de Spring Boot
  withCredentials: true,            // IMPORTANTE: Permite mantener la sesión (cookies)
  headers: {
    "Content-Type": "application/json",
  },
});

// --- 2. AUTENTICACIÓN (LOGIN) ---
// Configurado para 'formLogin' de Spring Security (x-www-form-urlencoded)
export const loginForm = async ({ email, password }) => {
  
  // Usamos URLSearchParams para simular un formulario HTML clásico.
  // Esto es OBLIGATORIO porque tu SecurityConfig usa .formLogin()
  const params = new URLSearchParams();
  params.append("username", email);    // Spring Security busca 'username' por defecto
  params.append("password", password); 
  
  // Enviamos también 'email' por si tu lógica personalizada lo busca así
  if (!params.has("email")) params.append("email", email);

  // Enviamos la petición sobrescribiendo el tipo de contenido
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

// IA: Generar rutina automática
export const generarRutinaAuto = async (payload) => {
  const response = await api.post("/api/rutinas/auto", payload);
  return response.data;
};

// Manual: Guardar rutina diseñada a mano
export const guardarRutinaManual = async (payload) => {
  const response = await api.post("/api/rutinas/manual", payload);
  return response.data;
};

// Actualizar una rutina existente
export const actualizarRutina = async (idRutina, payload) => {
  // Payload debe tener: { nombre, objetivo, nivel, detalles: [...] }
  const response = await api.put(`/api/rutinas/${idRutina}`, payload);
  return response.data;
};

export const eliminarRutina = async (id) => {
  return api.delete(`/api/rutinas/${id}`);
};

// Obtener las rutinas de un cliente (CON PROTECCIÓN ANTI-ERRORES)
export const obtenerRutinasCliente = async (idCliente) => {
  try {
      const response = await api.get(`/api/rutinas/cliente/${idCliente}`);
      // Si la respuesta es válida y es un array, la devolvemos. Si no, devolvemos array vacío.
      return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
      console.error("Error obteniendo rutinas:", error);
      return []; // En caso de error de red, devolvemos lista vacía para que no se rompa la UI
  }
};