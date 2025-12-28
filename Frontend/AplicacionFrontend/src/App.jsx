import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// --- IMPORTACIONES DE PÁGINAS ---
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ClienteOnboarding from "./pages/cliente/ClienteOnboarding";
import EntrenadorOnboarding from "./pages/auth/EntrenadorOnboarding";
import ExplorarEjercicios from "./pages/cliente/ExplorarEjercicios";
import MenuCliente from "./pages/cliente/MenuCliente";
import EditarRutina from "./pages/cliente/EditarRutina";

// --- IMPORTACIÓN DE FUNCIONALIDADES ---
import CrearEntrenamiento from "./components/functional/CrearEntrenamiento";
import GenerarRutinaIA from "./pages/cliente/GenerarRutinaIA";
import SesionEntrenamiento from "./pages/cliente/SesionEntrenamiento"; // <--- ✅ IMPORTANTE: Nuevo import

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

        {/* --- ONBOARDING (Configuración inicial) --- */}
        <Route path="/cliente/onboarding" element={<ClienteOnboarding />} />
        <Route path="/entrenador/onboarding" element={<EntrenadorOnboarding />} />

        {/* --- ZONA CLIENTE --- */}
        
        {/* Dashboard Principal */}
        <Route path="/cliente/dashboard" element={<MenuCliente />} />
        
        {/* Buscador de Ejercicios */}
        <Route path="/cliente/ejercicios" element={<ExplorarEjercicios />} />
        <Route path="/cliente/explorar" element={<ExplorarEjercicios />} />

        {/* Creador Manual de Rutinas */}
        <Route path="/cliente/crear-rutina" element={<CrearEntrenamiento />} />

        {/* Generador Automático IA */}
        <Route path="/cliente/generar-ia" element={<GenerarRutinaIA />} />

        {/* ✅ RUTA NUEVA: Ejecución de Sesión (Cronómetro) */}
        {/* El :rutinaId es dinámico para saber qué rutina cargar */}
        <Route path="/cliente/sesion/:rutinaId" element={<SesionEntrenamiento />} />


        {/* --- ZONA ENTRENADOR --- */}
        <Route path="/entrenador/dashboard" element={<h1>Panel Entrenador (En construcción)</h1>} />

        {/* Ruta 404 por si ponen algo raro */}
        <Route path="*" element={<Navigate to="/auth/login" replace />} />

        <Route path="/cliente/editar-rutina/:rutinaId" element={<EditarRutina />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;