import { lazy } from "react";
import PageBoundary from "./components/layout/PageBoundary";
const ModerationPage = lazy(() => import("./pages/moderation/ModerationPage"));
import AccountPage from "./components/account/AccountPage";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Layouts / Guards
import AuthLayout from "./components/layout/AuthLayout";
import ProtectedRoute from "./components/layout/ProtectedRoute";

// Layouts App
import ClienteLayout from "./components/layout/ClienteLayout";
import EntrenadorLayout from "./components/layout/EntrenadorLayout";

// --- IMPORTACIONES DE AUTENTICACIÓN Y ONBOARDING ---
import Login from "./pages/auth/Login";
const GoogleOnboarding = lazy(() => import("./pages/auth/GoogleOnboarding"));
const AppleOnboarding = lazy(() => import("./pages/auth/AppleOnboarding"));
const ForgotPassword = lazy(() => import("./pages/auth/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/auth/ResetPassword"));
const ConfirmEmailChange = lazy(() => import("./pages/auth/ConfirmEmailChange"));
const Register = lazy(() => import("./pages/auth/Register"));
const CambiarEmail = lazy(() => import("./pages/auth/CambiarEmail"));
const CambiarPassword = lazy(() => import("./pages/auth/CambiarPassword"));
const EliminarCuenta = lazy(() => import("./pages/auth/EliminarCuenta"));
const SesionesActivas = lazy(() => import("./pages/auth/SesionesActivas"));
const Terms = lazy(() => import("./pages/auth/Terms"));
const Privacy = lazy(() => import("./pages/auth/Privacy"));
const ExportarDatos = lazy(() => import("./pages/auth/ExportarDatos"));
const PrivacidadComunicaciones = lazy(() => import("./pages/auth/PrivacidadComunicaciones"));
const MetodosAcceso = lazy(() => import("./pages/auth/MetodosAcceso"));
const ClienteOnboarding = lazy(() => import("./pages/cliente/ClienteOnboarding"));
const EntrenadorOnboarding = lazy(() => import("./pages/entrenador/EntrenadorOnboarding"));

// --- ZONA CLIENTE ---
const DashboardCliente = lazy(() => import("./pages/cliente/DashboardCliente"));
const MenuCliente = lazy(() => import("./pages/cliente/MenuCliente"));
const CrearHub = lazy(() => import("./pages/cliente/CrearHub"));
const ExplorarEjercicios = lazy(() => import("./pages/cliente/ExplorarEjercicios"));
const CrearEntrenamiento = lazy(() => import("./components/functional/CrearEntrenamiento"));
const GenerarRutinaIA = lazy(() => import("./pages/cliente/GenerarRutinaIA"));
const SesionEntrenamiento = lazy(() => import("./pages/cliente/SesionEntrenamiento"));
const EditarRutina = lazy(() => import("./pages/cliente/EditarRutina"));
const EditarPerfil = lazy(() => import("./pages/cliente/EditarPerfil"));
const ProgresoCliente = lazy(() => import("./pages/cliente/ProgresoCliente"));
const CalendarioCliente = lazy(() => import("./pages/cliente/CalendarioCliente"));
const ChatClientePage = lazy(() => import("./pages/cliente/ChatClientePage"));
const ExplorarEntrenadores = lazy(() => import("./pages/cliente/ExplorarEntrenadores"));
const PerfilPublicoEntrenador = lazy(() => import("./pages/cliente/PerfilPublicoEntrenador"));

// --- ZONA ENTRENADOR ---
const VistaCalendarioEntrenador = lazy(() => import("./pages/entrenador/VistaCalendarioEntrenador"));
const MenuEntrenador = lazy(() => import("./pages/entrenador/MenuEntrenador"));
const RutinasDeCliente = lazy(() => import("./pages/entrenador/RutinasDeCliente"));
const EditarPerfilEntrenador = lazy(() => import("./pages/entrenador/EditarPerfilEntrenador"));
const VistaProgresoEntrenador = lazy(() => import("./pages/entrenador/VistaProgresoEntrenador"));
const GestionAtletas = lazy(() => import("./pages/entrenador/GestionAtletas"));
const ChatPage = lazy(() => import("./pages/entrenador/ChatPage"));
// 👇 NUEVA IMPORTACIÓN DE LA AGENDA GLOBAL
const AgendaEntrenador = lazy(() => import("./pages/entrenador/AgendaEntrenador"));
const PlantillasEntrenador = lazy(() => import("./pages/entrenador/PlantillasEntrenador"));

// Contextos
import { ToastProvider } from "./context/ToastContext";
import { AuthProvider } from "./context/AuthContext";

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <PageBoundary>
          <Routes>
            {/* Redirección inicial */}
            <Route path="/" element={<Navigate to="/auth/login" replace />} />

            {/* --- RUTAS DE AUTENTICACIÓN --- */}
            <Route path="/auth/login" element={<AuthLayout><Login /></AuthLayout>} />
            <Route path="/auth/google/onboarding" element={<AuthLayout><GoogleOnboarding /></AuthLayout>} />
            <Route path="/auth/apple/onboarding" element={<AuthLayout><AppleOnboarding /></AuthLayout>} />
            <Route path="/login" element={<Navigate to="/auth/login" replace />} />
            <Route path="/forgot-password" element={<AuthLayout><ForgotPassword /></AuthLayout>} />
            <Route path="/reset-password" element={<AuthLayout><ResetPassword /></AuthLayout>} />
            <Route path="/confirm-email-change" element={<AuthLayout><ConfirmEmailChange /></AuthLayout>} />
            <Route path="/register" element={<AuthLayout><Register /></AuthLayout>} />
            <Route path="/registro" element={<Navigate to="/register" replace />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />

            <Route path="/moderacion" element={<ProtectedRoute><ModerationPage /></ProtectedRoute>} />

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
              <Route path="seguridad/email" element={<AccountPage><CambiarEmail /></AccountPage>} />
              <Route path="seguridad/password" element={<AccountPage><CambiarPassword /></AccountPage>} />
              <Route path="seguridad/eliminar-cuenta" element={<AccountPage><EliminarCuenta /></AccountPage>} />
              <Route path="seguridad/sesiones" element={<AccountPage><SesionesActivas /></AccountPage>} />
              <Route path="seguridad/exportar-datos" element={<AccountPage><ExportarDatos /></AccountPage>} />
              <Route path="seguridad/privacidad" element={<AccountPage><PrivacidadComunicaciones /></AccountPage>} />
              <Route path="seguridad/identidades" element={<AccountPage><MetodosAcceso /></AccountPage>} />
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
              <Route path="seguridad/email" element={<AccountPage><CambiarEmail /></AccountPage>} />
              <Route path="seguridad/password" element={<AccountPage><CambiarPassword /></AccountPage>} />
              <Route path="seguridad/eliminar-cuenta" element={<AccountPage><EliminarCuenta /></AccountPage>} />
              <Route path="seguridad/sesiones" element={<AccountPage><SesionesActivas /></AccountPage>} />
              <Route path="seguridad/exportar-datos" element={<AccountPage><ExportarDatos /></AccountPage>} />
              <Route path="seguridad/privacidad" element={<AccountPage><PrivacidadComunicaciones /></AccountPage>} />
              <Route path="seguridad/identidades" element={<AccountPage><MetodosAcceso /></AccountPage>} />
              <Route path="cliente/:clienteId/progreso" element={<VistaProgresoEntrenador />} />
              <Route path="cliente/:clienteId/calendario" element={<VistaCalendarioEntrenador />} />  
              <Route path="cliente/:clienteId/rutinas" element={<RutinasDeCliente />} />
              <Route path="cliente/:clienteId/crear-rutina" element={<CrearEntrenamiento />} />
              <Route path="cliente/:clienteId/editar-rutina/:rutinaId" element={<EditarRutina />} />
              <Route path="plantillas" element={<PlantillasEntrenador />} />
              <Route path="plantillas/crear" element={<CrearEntrenamiento isTemplate={true} />} />
              <Route path="plantillas/editar/:rutinaId" element={<EditarRutina isTemplate={true} />} />
              <Route path="/entrenador/cliente/:clienteId/sesion/:rutinaId" element={<SesionEntrenamiento />} />  

            </Route>

            {/* Fallback para rutas no encontradas */}
            <Route path="*" element={<Navigate to="/auth/login" replace />} />
          </Routes>
          </PageBoundary>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
