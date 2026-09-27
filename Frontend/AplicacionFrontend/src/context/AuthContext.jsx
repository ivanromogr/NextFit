/* eslint-disable react-refresh/only-export-components -- the hook is intentionally exported with its provider. */
import React, { createContext, useContext, useEffect, useState } from "react";
import { clearAuthSession, getAuthSession, saveAuthSession } from "../utils/authSession";
import { refreshWebSession, logoutSession } from "../api/endpoints";

const defaultAuthContext = { user: null, role: null, loading: false, login: () => {}, logout: () => {}, isAuthenticated: () => false, userId: null };
const AuthContext = createContext(defaultAuthContext);

/** Access token in memory; only safe identity metadata survives a reload. */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getAuthSession());
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState(() => getAuthSession()?.role ?? null);

  const applySession = (session) => {
    setUser(session);
    setRole(session?.role ?? null);
  };

  useEffect(() => {
    const handleSessionCleared = () => applySession(null);
    window.addEventListener("nextfit:auth-cleared", handleSessionCleared);
    const bootstrap = async () => {
      try { const response = await refreshWebSession(); applySession(saveAuthSession(response.data)); }
      catch { clearAuthSession(); }
      finally { setLoading(false); }
    };
    bootstrap();
    return () => window.removeEventListener("nextfit:auth-cleared", handleSessionCleared);
  }, []);

  const login = (loginResponse) => {
    const session = saveAuthSession(loginResponse);
    applySession(session);
    return session;
  };

  const logout = async () => {
    try { await logoutSession(); } catch { /* local cleanup still prevents client reuse */ }
    clearAuthSession();
    applySession(null);
  };

  const isAuthenticated = () => Boolean(user?.id);

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        loading,
        login,
        logout,
        clearLocalSession: () => { clearAuthSession(); applySession(null); },
        isAuthenticated,
        userId: user?.id ?? null,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
