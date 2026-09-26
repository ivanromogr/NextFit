export const AUTH_SESSION_KEY = "auth_session";
const ROLES = new Set(["CLIENTE", "ENTRENADOR"]);

const isValidSession = (session) => (
  session
  && typeof session.id === "string"
  && typeof session.email === "string"
  && ROLES.has(session.role)
);
let accessToken = null;

export function getAuthSession() {
  const value = sessionStorage.getItem(AUTH_SESSION_KEY);
  if (!value) return null;
  try {
    const session = JSON.parse(value);
    if (isValidSession(session)) return session;
  } catch {
    // Treat corrupted persisted data as an expired session.
  }
  clearAuthSession();
  return null;
}

export function saveAuthSession({ accessToken: nextAccessToken, user }) {
  const session = {
    id: user?.id,
    email: user?.email,
    role: user?.role,
  };
  if (!isValidSession(session)) throw new Error("Respuesta de autenticación inválida");
  accessToken = nextAccessToken;
  sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
  return session;
}

export function getAccessToken() {
  return accessToken;
}

export function clearAuthSession() {
  accessToken = null;
  sessionStorage.removeItem(AUTH_SESSION_KEY);
  window.dispatchEvent(new Event("nextfit:auth-cleared"));
}
