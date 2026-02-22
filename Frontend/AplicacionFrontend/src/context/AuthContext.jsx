import React, { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext(null);

/**
 * AuthProvider: Gestiona la sesión del usuario a nivel de pestaña
 * - Usa sessionStorage (no se comparte entre pestañas)
 * - Mantiene el estado en memoria
 * - Se resetea automáticamente al cerrar la pestaña
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState(null);

  // 1. Recuperar sesión al cargar la pestaña
  useEffect(() => {
    const sessionData = sessionStorage.getItem("auth_session");
    if (sessionData) {
      try {
        const parsedSession = JSON.parse(sessionData);
        setUser(parsedSession);
        setRole(parsedSession.role);
      } catch (error) {
        console.error("Error al recuperar sesión:", error);
        sessionStorage.removeItem("auth_session");
      }
    }
    setLoading(false);
  }, []);

  /**
   * Login: Guarda credenciales en sessionStorage (exclusivo de pestaña)
   */
  const login = (userId, userRole) => {
    const sessionData = {
      id: userId,
      role: userRole,
      loginTime: new Date().toISOString(),
    };
    
    sessionStorage.setItem("auth_session", JSON.stringify(sessionData));
    setUser(sessionData);
    setRole(userRole);
  };

  /**
   * Logout: Limpia sesión
   */
  const logout = () => {
    sessionStorage.removeItem("auth_session");
    setUser(null);
    setRole(null);
  };

  /**
   * IsAuthenticated: Verifica si el usuario tiene sesión activa
   */
  const isAuthenticated = () => !!user && !!user.id;

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        loading,
        login,
        logout,
        isAuthenticated,
        userId: user?.id,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook: useAuth
 * Uso en componentes: const { user, login, logout, isAuthenticated } = useAuth();
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe usarse dentro de AuthProvider");
  }
  return context;
}
