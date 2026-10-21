/* eslint-disable react-refresh/only-export-components -- the hook is intentionally exported with its provider. */
import React, { createContext, useContext, useEffect, useState } from "react";
import { clearAuthSession, getAuthSession, getSessionVersion, saveAuthSession } from "../utils/authSession";
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
    let active = true;
    const version = getSessionVersion();
    const handleSessionCleared = () => { applySession(null); setLoading(false); };
    window.addEventListener("nextfit:auth-cleared", handleSessionCleared);
    const bootstrap = async () => {
      try {
        const response = await refreshWebSession();
        if (active && version === getSessionVersion()) applySession(saveAuthSession(response.data, version));
      }
      catch { if (active) clearAuthSession(version); }
      finally { if (active) setLoading(false); }
    };
    bootstrap();
    return () => { active = false; window.removeEventListener("nextfit:auth-cleared", handleSessionCleared); };
  }, []);

  const login = (loginResponse) => {
    const session = saveAuthSession(loginResponse);
    applySession(session);
    setLoading(false);
    return session;
  };

  const logout = async () => {
    const version = getSessionVersion();
    try { await logoutSession(); } catch { /* local cleanup still prevents client reuse */ }
    clearAuthSession(version);
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
