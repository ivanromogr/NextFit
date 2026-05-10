import React, { createContext, useContext, useState, useEffect } from "react";

const defaultAuthContext = {
  user: null,
  role: null,
  loading: false,
  login: () => {},
  logout: () => {},
  isAuthenticated: () => false,
  userId: null,
};

const AuthContext = createContext(defaultAuthContext);

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
        if (parsedSession.role === "cliente") localStorage.setItem("clienteId", parsedSession.id);
        if (parsedSession.role === "entrenador") localStorage.setItem("entrenadorId", parsedSession.id);
      } catch (error) {
        console.error("Error al recuperar sesión:", error);
        sessionStorage.removeItem("auth_session");
      }
    } else {
      const legacyClienteId = localStorage.getItem("clienteId");
      const legacyEntrenadorId = localStorage.getItem("entrenadorId");
      const legacySession = legacyClienteId
        ? { id: legacyClienteId, role: "cliente", loginTime: new Date().toISOString() }
        : legacyEntrenadorId
          ? { id: legacyEntrenadorId, role: "entrenador", loginTime: new Date().toISOString() }
          : null;

      if (legacySession) {
        sessionStorage.setItem("auth_session", JSON.stringify(legacySession));
        setUser(legacySession);
        setRole(legacySession.role);
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
    if (userRole === "cliente") {
      localStorage.setItem("clienteId", userId);
      localStorage.removeItem("entrenadorId");
    }
    if (userRole === "entrenador") {
      localStorage.setItem("entrenadorId", userId);
      localStorage.removeItem("clienteId");
    }
    setUser(sessionData);
    setRole(userRole);
  };

  /**
   * Logout: Limpia sesión
   */
  const logout = () => {
    sessionStorage.removeItem("auth_session");
    sessionStorage.removeItem("registration_userId");
    localStorage.removeItem("clienteId");
    localStorage.removeItem("entrenadorId");
    localStorage.removeItem("registration_userId");
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
  return useContext(AuthContext);
}
