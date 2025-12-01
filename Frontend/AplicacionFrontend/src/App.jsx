import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// TUS PÁGINAS EXISTENTES
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ClienteOnboarding from "./pages/cliente/ClienteOnboarding";

// 👇 1. IMPORTA LA NUEVA PÁGINA DEL ENTRENADOR (Asegúrate de la ruta correcta)
import EntrenadorOnboarding from "./pages/auth/EntrenadorOnboarding"; 

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/auth/login" replace />} />
        
        {/* Auth */}
        <Route path="/auth/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Cliente */}
        <Route path="/cliente/onboarding" element={<ClienteOnboarding />} />
        
        {/* 👇 2. AÑADE ESTA LÍNEA PARA QUE REACT SEPA DÓNDE IR */}
        <Route path="/entrenador/onboarding" element={<EntrenadorOnboarding />} />

        {/* Dashboards */}
        <Route path="/cliente/dashboard" element={<h1>Panel Cliente</h1>} />
        <Route path="/entrenador/dashboard" element={<h1>Panel Entrenador</h1>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;