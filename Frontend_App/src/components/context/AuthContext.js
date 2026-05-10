import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from '@react-native-async-storage/async-storage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState(null);

  // 1. Recuperar sesión al cargar la App (Equivalente a tu useEffect de web)
  useEffect(() => {
    const loadSession = async () => {
      try {
        const sessionData = await AsyncStorage.getItem("auth_session");
        if (sessionData) {
          const parsedSession = JSON.parse(sessionData);
          setUser(parsedSession);
          setRole(parsedSession.role);
        }
      } catch (error) {
        console.error("Error al recuperar sesión:", error);
      } finally {
        setLoading(false);
      }
    };
    loadSession();
  }, []);

  /**
   * Login: Guarda credenciales de forma persistente
   */
  const login = async (userId, userRole, token = null) => {
    const sessionData = {
      id: userId,
      role: userRole,
      token,
      loginTime: new Date().toISOString(),
    };
    
    try {
      await AsyncStorage.setItem("auth_session", JSON.stringify(sessionData));
      if (token) {
        await AsyncStorage.setItem("token", token);
      }
      setUser(sessionData);
      setRole(userRole);
    } catch (error) {
      console.error("Error al guardar sesión:", error);
    }
  };

  /**
   * Logout: Limpia sesión
   */
  const logout = async () => {
    try {
      await AsyncStorage.removeItem("auth_session");
      await AsyncStorage.removeItem("token");
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
        logout,
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
