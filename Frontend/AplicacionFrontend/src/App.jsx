import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// --- IMPORTACIONES DE AUTENTICACIÓN Y ONBOARDING ---
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ClienteOnboarding from "./pages/cliente/ClienteOnboarding";
import EntrenadorOnboarding from "./pages/auth/EntrenadorOnboarding";

// --- ZONA CLIENTE ---
import MenuCliente from "./pages/cliente/MenuCliente";
import ExplorarEjercicios from "./pages/cliente/ExplorarEjercicios";
import CrearEntrenamiento from "./components/functional/CrearEntrenamiento"; // Creador Manual
import GenerarRutinaIA from "./pages/cliente/GenerarRutinaIA";
import SesionEntrenamiento from "./pages/cliente/SesionEntrenamiento";
import EditarRutina from "./pages/cliente/EditarRutina";

// --- ZONA ENTRENADOR ---
import MenuEntrenador from "./pages/entrenador/MenuEntrenador";
import RutinasDeCliente from "./pages/entrenador/RutinasDeCliente"; // ✅ NUEVA RUTA IMPORTANTE

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Redirección inicial */}
        <Route path="/" element={<Navigate to="/auth/login" replace />} />
        
        {/* --- AUTENTICACIÓN --- */}
        <Route path="/auth/login" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/registro" element={<Register />} />

        {/* --- ONBOARDING --- */}
        <Route path="/cliente/onboarding" element={<ClienteOnboarding />} />
        <Route path="/entrenador/onboarding" element={<EntrenadorOnboarding />} />

        {/* --- RUTAS DEL CLIENTE --- */}
        <Route path="/cliente/dashboard" element={<MenuCliente />} />
        <Route path="/cliente/ejercicios" element={<ExplorarEjercicios />} />
        <Route path="/cliente/explorar" element={<ExplorarEjercicios />} />
        
        {/* Crear y Editar */}
        <Route path="/cliente/crear-rutina" element={<CrearEntrenamiento />} />
        <Route path="/cliente/generar-ia" element={<GenerarRutinaIA />} />
        <Route path="/cliente/editar-rutina/:rutinaId" element={<EditarRutina />} />
        
        {/* Entrenar */}
        <Route path="/cliente/sesion/:rutinaId" element={<SesionEntrenamiento />} />

        {/* --- RUTAS DEL ENTRENADOR --- */}
        <Route path="/entrenador/dashboard" element={<MenuEntrenador />} />
        
        {/* ✅ ESTA ES LA RUTA NUEVA PARA GESTIONAR ATLETAS */}
        <Route path="/entrenador/cliente/:clienteId/rutinas" element={<RutinasDeCliente />} />

        {/* Ruta 404 (Cualquier cosa desconocida lleva al login) */}
        <Route path="*" element={<Navigate to="/auth/login" replace />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;