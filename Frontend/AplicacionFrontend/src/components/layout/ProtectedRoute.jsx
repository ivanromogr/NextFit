import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function ProtectedRoute({ role, children }) {
  const { userId, role: userRole, loading } = useAuth();

  if (loading) {
    return <div>Cargando...</div>;
  }

  // No autenticado
  if (!userId) {
    return <Navigate to="/auth/login" replace />;
  }

  // Protegido por rol
  if (role === "entrenador" && userRole !== "ENTRENADOR") {
    return <Navigate to="/cliente/dashboard" replace />;
  }

  if (role === "cliente" && userRole !== "CLIENTE") {
    return <Navigate to="/entrenador/dashboard" replace />;
  }

  return children;
}
