/**
 * sessionStorageUtils.js
 * 
 * Helper para usar sessionStorage (exclusivo de pestaña) en lugar de localStorage
 * sessionStorage se limpia automáticamente al cerrar la pestaña
 * 
 * Uso:
 *   import { getSessionId, setSessionId } from '../../utils/sessionStorageUtils';
 *   
 *   const id = getSessionId('clienteId');
 *   setSessionId('clienteId', id);
 */

// Clave para almacenar la sesión completa
const SESSION_KEY = "auth_session";

/**
 * Obtener el ID del cliente
 */
export function getClienteId() {
  const session = getSession();
  return session?.id || null;
}

/**
 * Obtener el ID del entrenador
 */
export function getEntrenadorId() {
  const session = getSession();
  return session?.role === "ENTRENADOR" ? session?.id : null;
}

/**
 * Obtener el rol del usuario actual
 */
export function getUserRole() {
  const session = getSession();
  return session?.role || null;
}

/**
 * Obtener el ID del usuario registrado (para onboarding)
 */
export function getRegistrationUserId() {
  return sessionStorage.getItem("registration_userId");
}

/**
 * Establecer el ID para registro
 */
export function setRegistrationUserId(id) {
  sessionStorage.setItem("registration_userId", id);
}

/**
 * Obtener la sesión completa del usuario
 */
export function getSession() {
  const sessionData = sessionStorage.getItem(SESSION_KEY);
  if (sessionData) {
    try {
      return JSON.parse(sessionData);
    } catch (error) {
      console.error("Error al parsear sesión:", error);
      return null;
    }
  }
  return null;
}

/**
 * Verificar si el usuario está autenticado
 */
export function isAuthenticated() {
  const session = getSession();
  return !!session?.id;
}

/**
 * Limpiar toda la sesión
 */
export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem("registration_userId");
  sessionStorage.removeItem("clienteObjetivoId"); // Por si se usa en modo entrenador
}

/**
 * Obtener valor específico de sesión (compatible con localStorage para migración)
 */
export function getSessionItem(key) {
  if (key === "clienteId") return getClienteId();
  if (key === "entrenadorId") return getEntrenadorId();
  if (key === "registration_userId") return getRegistrationUserId();
  if (key === "clienteObjetivoId") return sessionStorage.getItem("clienteObjetivoId");
  return sessionStorage.getItem(key);
}

/**
 * Establecer valor específico en sesión
 */
export function setSessionItem(key, value) {
  if (!value) {
    sessionStorage.removeItem(key);
    return;
  }
  sessionStorage.setItem(key, value);
}
