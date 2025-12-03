import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Importaciones de páginas
import Login from "./pages/auth/Login.jsx";
import Register from "./pages/auth/Register.jsx";
import ClienteOnboarding from "./pages/cliente/ClienteOnboarding.jsx";
import EntrenadorOnboarding from "./pages/auth/EntrenadorOnboarding.jsx";
import ExplorarEjercicios from "./pages/cliente/ExplorarEjercicios.jsx";

// ✅ 1. IMPORTA TU NUEVO MENÚ AQUÍ
import MenuCliente from "./pages/cliente/MenuCliente.jsx"; 

import './index.css'

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/auth/login" replace />} />
        
        {/* Auth */}
        <Route path="/auth/login" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/registro" element={<Register />} />

        {/* Onboarding */}
        <Route path="/cliente/onboarding" element={<ClienteOnboarding />} />
        <Route path="/entrenador/onboarding" element={<EntrenadorOnboarding />} />

        {/* Ejercicios */}
        <Route path="/cliente/ejercicios" element={<ExplorarEjercicios />} />
        <Route path="/cliente/explorar" element={<ExplorarEjercicios />} />

        {/* ✅ 2. USA EL COMPONENTE AQUÍ (Quita el <h1>Panel Cliente</h1>) */}
        <Route path="/cliente/dashboard" element={<MenuCliente />} />

        <Route path="/entrenador/dashboard" element={<h1>Panel Entrenador</h1>} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);