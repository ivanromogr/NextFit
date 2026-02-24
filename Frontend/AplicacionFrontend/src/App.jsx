import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Layouts / Guards
import AuthLayout from "./components/layout/AuthLayout";
import ProtectedRoute from "./components/layout/ProtectedRoute";

// Layouts App
import ClienteLayout from "./components/layout/ClienteLayout";
import EntrenadorLayout from "./components/layout/EntrenadorLayout";

// --- IMPORTACIONES DE AUTENTICACIÓN Y ONBOARDING ---
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ClienteOnboarding from "./pages/cliente/ClienteOnboarding";
import EntrenadorOnboarding from "./pages/entrenador/EntrenadorOnboarding";

// --- ZONA CLIENTE ---
import DashboardCliente from "./pages/cliente/DashboardCliente"; 
import MenuCliente from "./pages/cliente/MenuCliente";          
import CrearHub from "./pages/cliente/CrearHub";                
import ExplorarEjercicios from "./pages/cliente/ExplorarEjercicios";
import CrearEntrenamiento from "./components/functional/CrearEntrenamiento";
import GenerarRutinaIA from "./pages/cliente/GenerarRutinaIA";
import SesionEntrenamiento from "./pages/cliente/SesionEntrenamiento";
import EditarRutina from "./pages/cliente/EditarRutina";
import EditarPerfil from "./pages/cliente/EditarPerfil";
import ProgresoCliente from "./pages/cliente/ProgresoCliente";
import CalendarioCliente from "./pages/cliente/CalendarioCliente"; 
import ChatClientePage from "./pages/cliente/ChatClientePage";
import ExplorarEntrenadores from "./pages/cliente/ExplorarEntrenadores";
import PerfilPublicoEntrenador from "./pages/cliente/PerfilPublicoEntrenador";

// --- ZONA ENTRENADOR ---
import VistaCalendarioEntrenador from "./pages/entrenador/VistaCalendarioEntrenador";
import MenuEntrenador from "./pages/entrenador/MenuEntrenador";
import RutinasDeCliente from "./pages/entrenador/RutinasDeCliente";
import EditarPerfilEntrenador from "./pages/entrenador/EditarPerfilEntrenador";
import VistaProgresoEntrenador from "./pages/entrenador/VistaProgresoEntrenador";
import GestionAtletas from "./pages/entrenador/GestionAtletas";
import ChatPage from "./pages/entrenador/ChatPage"; 
// 👇 NUEVA IMPORTACIÓN DE LA AGENDA GLOBAL
import AgendaEntrenador from "./pages/entrenador/AgendaEntrenador"; 
import PlantillasEntrenador from "./pages/entrenador/PlantillasEntrenador";

// Contextos
import { ToastProvider } from "./context/ToastContext";
import { AuthProvider } from "./context/AuthContext";

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            {/* Redirección inicial */}
            <Route path="/" element={<Navigate to="/auth/login" replace />} />

            {/* --- RUTAS DE AUTENTICACIÓN --- */}
            <Route path="/auth/login" element={<AuthLayout><Login /></AuthLayout>} />
            <Route path="/login" element={<Navigate to="/auth/login" replace />} />
            <Route path="/register" element={<AuthLayout><Register /></AuthLayout>} />
            <Route path="/registro" element={<Navigate to="/register" replace />} />

            {/* --- ONBOARDING --- */}
            <Route path="/cliente/onboarding" element={<AuthLayout><ClienteOnboarding /></AuthLayout>} />
            <Route path="/entrenador/onboarding" element={<AuthLayout><EntrenadorOnboarding /></AuthLayout>} />

            {/* --- RUTAS PROTEGIDAS: CLIENTE --- */}
            <Route
              path="/cliente"
              element={
                <ProtectedRoute role="cliente">
                  <ClienteLayout />
                </ProtectedRoute>
              }
            >
              <Route path="dashboard" element={<DashboardCliente />} />  
              <Route path="rutinas" element={<MenuCliente />} />         
              <Route path="nuevo" element={<CrearHub />} />               
              <Route path="ejercicios" element={<ExplorarEjercicios />} />
              <Route path="explorar" element={<ExplorarEjercicios />} />
              <Route path="crear-rutina" element={<CrearEntrenamiento />} />
              <Route path="generar-ia" element={<GenerarRutinaIA />} />
              <Route path="editar-rutina/:rutinaId" element={<EditarRutina />} />
              <Route path="perfil" element={<EditarPerfil />} />
              <Route path="sesion/:rutinaId" element={<SesionEntrenamiento />} />
              <Route path="progreso" element={<ProgresoCliente />} />
              <Route path="calendario" element={<CalendarioCliente />} />
              <Route path="chat" element={<ChatClientePage />} />
              <Route path="entrenadores" element={<ExplorarEntrenadores />} />
              <Route path="entrenador-perfil/:id" element={<PerfilPublicoEntrenador />} />
            </Route>

            {/* --- RUTAS PROTEGIDAS: ENTRENADOR --- */}
            <Route
              path="/entrenador"
              element={
                <ProtectedRoute role="entrenador">
                  <EntrenadorLayout />
                </ProtectedRoute>
              }
            >
              <Route path="dashboard" element={<MenuEntrenador />} />
              {/* 👇 NUEVA RUTA DE LA AGENDA GLOBAL */}
              <Route path="agenda" element={<AgendaEntrenador />} />
              <Route path="chat" element={<ChatPage />} />
              <Route path="atletas" element={<GestionAtletas />} />
              <Route path="perfil" element={<EditarPerfilEntrenador />} />
              <Route path="cliente/:clienteId/progreso" element={<VistaProgresoEntrenador />} />
              <Route path="cliente/:clienteId/calendario" element={<VistaCalendarioEntrenador />} />  
              <Route path="cliente/:clienteId/rutinas" element={<RutinasDeCliente />} />
              <Route path="cliente/:clienteId/crear-rutina" element={<CrearEntrenamiento />} />
              <Route path="cliente/:clienteId/editar-rutina/:rutinaId" element={<EditarRutina />} />
              <Route path="plantillas" element={<PlantillasEntrenador />} />
              <Route path="plantillas/crear" element={<CrearEntrenamiento isTemplate={true} />} />
              <Route path="plantillas/editar/:rutinaId" element={<EditarRutina isTemplate={true} />} />

            </Route>

            {/* Fallback para rutas no encontradas */}
            <Route path="*" element={<Navigate to="/auth/login" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;