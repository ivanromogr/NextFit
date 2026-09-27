import React, { createContext, useContext, useState, useEffect } from "react";
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

  // 1. Recuperar sesión al cargar la App (Equivalente a tu useEffect de web)
  useEffect(() => {
    const loadSession = async () => {
      try {
        const session = await getAuthSession();
        if (session) {
          const response = await refreshMobileSession();
          const restored = await saveAuthSession(response.data);
          setUser(restored);
          setRole(restored.role);
        }
      } catch (error) {
        console.error("Error al recuperar sesión:", error);
        await clearAuthSession();
      } finally {
        setLoading(false);
      }
    };
    loadSession();
    return setSessionInvalidationHandler(() => {
      setUser(null);
      setRole(null);
    });
  }, []);

  /**
   * Login: Guarda credenciales de forma persistente
   */
  const login = async (loginResponse) => {
    try {
      const session = await saveAuthSession(loginResponse);
      setUser(session);
      setRole(session.role);
      return session;
    } catch (error) {
      console.error("Error al guardar sesión:", error);
    }
  };

  const applyEmailChange = async (response) => {
    const session = response.refreshToken ? await saveAuthSession(response) : await updateAuthSession(response);
    setUser(session); setRole(session.role); return session;
  };

  /**
   * Logout: Limpia sesión
   */
  const logout = async () => {
    try {
      await logoutMobileSession();
      await clearAuthSession();
      setUser(null);
      setRole(null);
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
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
        clearLocalSession: async () => { await clearAuthSession(); setUser(null); setRole(null); },
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
