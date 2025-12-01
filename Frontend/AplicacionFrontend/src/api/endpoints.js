import axios from "axios";

// Configuración base de Axios
export const api = axios.create({
  baseURL: "http://localhost:8080", // Tu puerto de Spring Boot
  withCredentials: true,
});

// --- AUTENTICACIÓN (LOGIN) ---
export const loginForm = async ({ email, password }) => {
  const params = new URLSearchParams();
  params.append("username", email);
  params.append("password", password);

  return api.post("/login", params, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
};

// --- REGISTRO DE USUARIOS ---
export const registerUser = async (payload) => {
  console.log("🔁 Llamando a /api/register con:", payload);

  const resp = await fetch("http://localhost:8080/api/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  return resp;
};

// --- ONBOARDING CLIENTE ---
export const completarOnboardingCliente = async (payload) => {
  console.log("🔁 Enviando perfil de cliente:", payload);

  const resp = await fetch("http://localhost:8080/api/cliente/onboarding", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    const msg = await resp.text();
    throw new Error(msg || "Error al completar el perfil del cliente");
  }
  return await resp.json();
};

// --- ONBOARDING ENTRENADOR ---
export const completarOnboardingEntrenador = async (payload) => {
  console.log("🔁 Enviando perfil de entrenador:", payload);

  const resp = await fetch("http://localhost:8080/api/entrenador/onboarding", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    const msg = await resp.text();
    throw new Error(msg || "Error al completar el perfil de entrenador");
  }
  return await resp.json();
};

// --- 👇 NUEVO: OBTENER EJERCICIOS ---
export const obtenerEjercicios = async () => {
  const resp = await fetch("http://localhost:8080/api/ejercicios");
  if (!resp.ok) throw new Error("Error al cargar ejercicios");
  return await resp.json();
};