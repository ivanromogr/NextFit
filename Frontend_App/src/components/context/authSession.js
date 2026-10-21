import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

export const AUTH_SESSION_KEY = 'auth_session';
export const REFRESH_TOKEN_KEY = 'nextfit_refresh';
const ROLES = new Set(['CLIENTE', 'ENTRENADOR']);
let onSessionInvalidated = null;
let accessToken = null;
let storageVersion = 0;
let pendingStorage = Promise.resolve();

function writeStorage(operation) {
  const result = pendingStorage.catch(() => {}).then(operation);
  pendingStorage = result;
  return result;
}

const isValidSession = (session) => (
  session
  && typeof session.id === 'string'
  && typeof session.email === 'string'
  && ROLES.has(session.role)
);

export async function getAuthSession() {
  const version = storageVersion;
  await pendingStorage;
  if (version !== storageVersion) return null;
  const value = await AsyncStorage.getItem(AUTH_SESSION_KEY);
  if (version !== storageVersion) return null;
  if (!value) return null;
  try {
    const session = JSON.parse(value);
    if (isValidSession(session)) return session;
  } catch {
    // Corrupted persistence is equivalent to an expired session.
  }
  await clearAuthSession();
  return null;
}

export async function saveAuthSession({ accessToken: nextAccessToken, refreshToken, user }) {
  const session = {
    id: user?.id,
    email: user?.email,
    role: user?.role,
  };
  if (!isValidSession(session)) throw new Error('Respuesta de autenticación inválida');
  if (typeof nextAccessToken !== 'string' || typeof refreshToken !== 'string') throw new Error('Respuesta de autenticación inválida');
  storageVersion += 1;
  accessToken = nextAccessToken;
  await writeStorage(async () => {
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
    await AsyncStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
  });
  return session;
}

export async function updateAuthSession({ accessToken: nextAccessToken, user }) {
  const session = { id: user?.id, email: user?.email, role: user?.role };
  if (!isValidSession(session) || typeof nextAccessToken !== 'string') throw new Error('Respuesta de autenticación inválida');
  storageVersion += 1;
  accessToken = nextAccessToken;
  await writeStorage(() => AsyncStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session)));
  return session;
}

export async function getAccessToken() {
  return accessToken;
}

export const getRefreshToken = async () => {
  await pendingStorage;
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
};

export async function clearAuthSession() {
  const version = ++storageVersion;
  accessToken = null;
  await writeStorage(async () => {
    await AsyncStorage.removeItem(AUTH_SESSION_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  });
  if (version === storageVersion) onSessionInvalidated?.();
}

export function setSessionInvalidationHandler(handler) {
  onSessionInvalidated = handler;
  return () => {
    if (onSessionInvalidated === handler) onSessionInvalidated = null;
  };
}
