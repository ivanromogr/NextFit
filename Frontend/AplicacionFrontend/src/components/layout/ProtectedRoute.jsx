import React from "react";
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ role, children }) {
  const entrenadorId = localStorage.getItem("entrenadorId");
  const clienteId = localStorage.getItem("clienteId");

  // No autenticado
  if (!entrenadorId && !clienteId) {
    return <Navigate to="/auth/login" replace />;
  }

  // Protegido por rol
  if (role === "entrenador" && !entrenadorId) {
    return <Navigate to="/cliente/dashboard" replace />;
  }

  if (role === "cliente" && !clienteId) {
    return <Navigate to="/entrenador/dashboard" replace />;
  }

  return children;
}
