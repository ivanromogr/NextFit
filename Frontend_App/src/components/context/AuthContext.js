import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import {
  clearAuthSession,
  getAuthSession,
  saveAuthSession,
  updateAuthSession,
  setSessionInvalidationHandler,
} from './authSession';
import { refreshMobileSession, logoutMobileSession } from '../../api/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState(null);
  const generation = useRef(0);

  // 1. Recuperar sesión al cargar la App (Equivalente a tu useEffect de web)
  useEffect(() => {
    let active = true;
    const version = generation.current;
    const current = () => active && version === generation.current;
    const unsubscribe = setSessionInvalidationHandler(() => {
      generation.current += 1;
      setUser(null);
      setRole(null);
      setLoading(false);
    });
    const loadSession = async () => {
      try {
        const session = await getAuthSession();
        if (!current()) return;
        if (session) {
          const response = await refreshMobileSession();
          if (!current()) return;
          const restored = await saveAuthSession(response.data);
          if (current()) {
            setUser(restored);
            setRole(restored.role);
          }
        }
      } catch (error) {
        console.error("Error al recuperar sesión:", error);
        if (current()) await clearAuthSession();
      } finally {
        if (active) setLoading(false);
      }
    };
    loadSession();
    return () => { active = false; generation.current += 1; unsubscribe(); };
  }, []);

  /**
   * Login: Guarda credenciales de forma persistente
   */
  const login = async (loginResponse) => {
    const version = ++generation.current;
    try {
      const session = await saveAuthSession(loginResponse);
      if (version === generation.current) {
        setUser(session);
        setRole(session.role);
        setLoading(false);
      }
      return session;
    } catch (error) {
      console.error("Error al guardar sesión:", error);
    }
  };

  const applyEmailChange = async (response) => {
    const version = ++generation.current;
    const session = response.refreshToken ? await saveAuthSession(response) : await updateAuthSession(response);
    if (version === generation.current) { setUser(session); setRole(session.role); }
    return session;
  };

  /**
   * Logout: Limpia sesión
   */
  const logout = async () => {
    const version = ++generation.current;
    try {
      await logoutMobileSession();
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    } finally {
      if (version === generation.current) await clearAuthSession();
    }
  };

  const isAuthenticated = () => !!user && !!user.id;

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        loading,
        login,
        applyEmailChange,
        logout,
        clearLocalSession: async () => { generation.current += 1; await clearAuthSession(); },
        isAuthenticated,
        userId: user?.id,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe usarse dentro de AuthProvider");
  }
  return context;
}
