export const AUTH_SESSION_KEY = "auth_session";
const ROLES = new Set(["CLIENTE", "ENTRENADOR"]);

const isValidSession = (session) => (
  session
  && typeof session.id === "string"
  && typeof session.email === "string"
  && ROLES.has(session.role)
);
let accessToken = null;
let sessionVersion = 0;
export const getSessionVersion = () => sessionVersion;
export const beginAuthSession = () => {
  sessionVersion += 1;
  if (typeof window !== "undefined") window.dispatchEvent(new Event("nextfit:auth-changing"));
  return sessionVersion;
};

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

export function saveAuthSession({ accessToken: nextAccessToken, user }, expectedVersion) {
  if (expectedVersion !== undefined && expectedVersion !== sessionVersion) return null;
  const session = {
    id: user?.id,
    email: user?.email,
    role: user?.role,
  };
  if (!isValidSession(session)) throw new Error("Respuesta de autenticación inválida");
  if (expectedVersion === undefined) beginAuthSession();
  accessToken = nextAccessToken;
  sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
  return session;
}

export function getAccessToken() {
  return accessToken;
}

export function clearAuthSession(expectedVersion) {
  if (expectedVersion !== undefined && expectedVersion !== sessionVersion) return false;
  sessionVersion += 1;
  accessToken = null;
  sessionStorage.removeItem(AUTH_SESSION_KEY);
  window.dispatchEvent(new Event("nextfit:auth-cleared"));
  return true;
}
