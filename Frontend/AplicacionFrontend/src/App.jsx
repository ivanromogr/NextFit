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
import MenuCliente from "./pages/cliente/MenuCliente";
import ExplorarEjercicios from "./pages/cliente/ExplorarEjercicios";
import CrearEntrenamiento from "./components/functional/CrearEntrenamiento";
import GenerarRutinaIA from "./pages/cliente/GenerarRutinaIA";
import SesionEntrenamiento from "./pages/cliente/SesionEntrenamiento";
import EditarRutina from "./pages/cliente/EditarRutina";
import EditarPerfil from "./pages/cliente/EditarPerfil";
import ProgresoCliente from "./pages/cliente/ProgresoCliente";
// --- ZONA ENTRENADOR ---
import MenuEntrenador from "./pages/entrenador/MenuEntrenador";
import RutinasDeCliente from "./pages/entrenador/RutinasDeCliente";
import EditarPerfilEntrenador from "./pages/entrenador/EditarPerfilEntrenador";

// 👇 NUEVO: Importamos el proveedor de notificaciones
import { ToastProvider } from "./context/ToastContext";

function App() {
  return (
    // 👇 Envolvemos TODO dentro del Provider para que los avisos funcionen en cualquier página
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          {/* Redirección inicial */}
          <Route path="/" element={<Navigate to="/auth/login" replace />} />

          {/* --- AUTENTICACIÓN --- */}
          <Route
            path="/auth/login"
            element={
              <AuthLayout>
                <Login />
              </AuthLayout>
            }
          />
          <Route
            path="/login"
            element={
              <AuthLayout>
                <Login />
              </AuthLayout>
            }
          />
          <Route
            path="/register"
            element={
              <AuthLayout>
                <Register />
              </AuthLayout>
            }
          />
          <Route
            path="/registro"
            element={
              <AuthLayout>
                <Register />
              </AuthLayout>
            }
          />

          {/* --- ONBOARDING --- */}
          <Route
            path="/cliente/onboarding"
            element={
              <AuthLayout>
                <ClienteOnboarding />
              </AuthLayout>
            }
          />
          <Route
            path="/entrenador/onboarding"
            element={
              <AuthLayout>
                <EntrenadorOnboarding />
              </AuthLayout>
            }
          />

          {/* --- CLIENTE (layout + rutas anidadas) --- */}
          <Route
            path="/cliente"
            element={
              <ProtectedRoute role="cliente">
                <ClienteLayout />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<MenuCliente />} />
            <Route path="ejercicios" element={<ExplorarEjercicios />} />
            <Route path="explorar" element={<ExplorarEjercicios />} />
            <Route path="crear-rutina" element={<CrearEntrenamiento />} />
            <Route path="generar-ia" element={<GenerarRutinaIA />} />
            <Route path="editar-rutina/:rutinaId" element={<EditarRutina />} />
            <Route path="perfil" element={<EditarPerfil />} />
            <Route path="sesion/:rutinaId" element={<SesionEntrenamiento />} />
            <Route path="progreso" element={<ProgresoCliente />} />
          </Route>

          {/* --- ENTRENADOR (layout + rutas anidadas) --- */}
          <Route
            path="/entrenador"
            element={
              <ProtectedRoute role="entrenador">
                <EntrenadorLayout />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<MenuEntrenador />} />
            <Route path="perfil" element={<EditarPerfilEntrenador />} />
            <Route
              path="cliente/:clienteId/rutinas"
              element={<RutinasDeCliente />}
            />
            <Route
              path="cliente/:clienteId/crear-rutina"
              element={<CrearEntrenamiento />}
            />
            <Route
              path="cliente/:clienteId/editar-rutina/:rutinaId"
              element={<EditarRutina />}
            />
          </Route>

          {/* Ruta 404 */}
          <Route path="*" element={<Navigate to="/auth/login" replace />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}

export default App;