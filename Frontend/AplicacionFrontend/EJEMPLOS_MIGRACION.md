# 📚 EJEMPLOS DE MIGRACIÓN - De localStorage a sessionStorage + Context

## Patrón 1: Componente Simple

### ❌ ANTES (localStorage)
```jsx
import { useEffect, useState } from 'react';

export default function MiComponente() {
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    const id = localStorage.getItem("clienteId");
    setUserId(id);
  }, []);

  return <div>Usuario: {userId}</div>;
}
```

### ✅ DESPUÉS (Context)
```jsx
import { useAuth } from '../../context/AuthContext';

export default function MiComponente() {
  const { userId } = useAuth();
  
  return <div>Usuario: {userId}</div>;
}
```

**Ventajas:**
- ✅ Una línea en lugar de 5
- ✅ Automáticamente aislado por pestaña
- ✅ Sin necesidad de useEffect
- ✅ Reactivo a cambios de sesión

---

## Patrón 2: Cargar Datos del Usuario

### ❌ ANTES (localStorage)
```jsx
import { useEffect, useState } from 'react';
import { getCliente } from '../../api/endpoints';

export default function ProfileCard() {
  const [cliente, setCliente] = useState(null);

  useEffect(() => {
    const clienteId = localStorage.getItem("clienteId");
    if (clienteId) {
      getCliente(clienteId).then(setCliente);
    }
  }, []);

  return <div>{cliente?.nombre}</div>;
}
```

### ✅ DESPUÉS (Context)
```jsx
import { useEffect, useState } from 'react';
import { getCliente } from '../../api/endpoints';
import { useAuth } from '../../context/AuthContext';

export default function ProfileCard() {
  const { userId } = useAuth();
  const [cliente, setCliente] = useState(null);

  useEffect(() => {
    if (userId) {
      getCliente(userId).then(setCliente);
    }
  }, [userId]);

  return <div>{cliente?.nombre}</div>;
}
```

**Ventajas:**
- ✅ `userId` siempre está sincronizado
- ✅ Si userId cambia, useEffect se ejecuta automáticamente
- ✅ Cada pestaña cargar sus propios datos

---

## Patrón 3: Múltiples Roles (Cliente/Entrenador)

### ❌ ANTES (localStorage)
```jsx
export default function Dashboard() {
  const clienteId = localStorage.getItem("clienteId");
  const entrenadorId = localStorage.getItem("entrenadorId");

  if (clienteId) {
    return <DashboardCliente id={clienteId} />;
  } else if (entrenadorId) {
    return <DashboardEntrenador id={entrenadorId} />;
  }
  return <Navigate to="/login" />;
}
```

### ✅ DESPUÉS (Context)
```jsx
import { useAuth } from '../../context/AuthContext';

export default function Dashboard() {
  const { userId, role } = useAuth();

  if (!userId) {
    return <Navigate to="/login" />;
  }

  if (role === "cliente") {
    return <DashboardCliente id={userId} />;
  } else if (role === "entrenador") {
    return <DashboardEntrenador id={userId} />;
  }
  return <Navigate to="/login" />;
}
```

**Ventajas:**
- ✅ Código más limpio
- ✅ Role siempre sincronizado
- ✅ Detecta automáticamente cambios

---

## Patrón 4: Logout

### ❌ ANTES (localStorage)
```jsx
function handleLogout() {
  localStorage.removeItem("clienteId");
  localStorage.removeItem("entrenadorId");
  localStorage.removeItem("registration_userId");
  localStorage.removeItem("clienteObjetivoId");
  navigate("/login");
}
```

### ✅ DESPUÉS (Context)
```jsx
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

function LogoutButton() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return <button onClick={handleLogout}>Cerrar Sesión</button>;
}
```

**Ventajas:**
- ✅ Una llamada en lugar de 4
- ✅ Context se limpia automáticamente
- ✅ sessionStorage se limpia automáticamente

---

## Patrón 5: Guardar Datos Temporales (Objetivo de Cliente)

### ❌ ANTES (localStorage)
```jsx
// Guardar
function handleSelectCliente(clienteId) {
  localStorage.setItem("clienteObjetivoId", clienteId);
  navigate(`/entrenador/cliente/${clienteId}`);
}

// Usar
function RutinasDeCliente() {
  const clienteObjetivoId = localStorage.getItem("clienteObjetivoId");
  return <div>Viendo cliente: {clienteObjetivoId}</div>;
}
```

### ✅ DESPUÉS (sessionStorage + Context)
```jsx
// Opción A: Usar URL params (MEJOR)
function handleSelectCliente(clienteId) {
  navigate(`/entrenador/cliente/${clienteId}`);
}

function RutinasDeCliente() {
  const { clienteId } = useParams(); // Viene de la ruta
  return <div>Viendo cliente: {clienteId}</div>;
}

// Opción B: Usar sessionStorage directamente
function handleSelectCliente(clienteId) {
  sessionStorage.setItem("clienteObjetivoId", clienteId);
  navigate(`/entrenador/cliente/${clienteId}`);
}

function RutinasDeCliente() {
  const clienteObjetivoId = sessionStorage.getItem("clienteObjetivoId");
  return <div>Viendo cliente: {clienteObjetivoId}</div>;
}
```

**Ventajas (Opción A - URL Params):**
- ✅ No necesita almacenamiento
- ✅ URL es compartible
- ✅ Aislado automáticamente
- ✅ Mejor para SEO

---

## Patrón 6: Proteger Rutas

### ❌ ANTES (localStorage)
```jsx
export default function ProtectedRoute({ children }) {
  const clienteId = localStorage.getItem("clienteId");
  const entrenadorId = localStorage.getItem("entrenadorId");

  if (!clienteId && !entrenadorId) {
    return <Navigate to="/login" />;
  }

  return children;
}
```

### ✅ DESPUÉS (Context)
```jsx
import { useAuth } from '../../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div>Cargando...</div>;
  }

  if (!isAuthenticated()) {
    return <Navigate to="/login" />;
  }

  return children;
}
```

**Ventajas:**
- ✅ Maneja el estado de carga
- ✅ Método isAuthenticated() explícito
- ✅ Más seguro

---

## Patrón 7: Componentes Reutilizables con Props

### ❌ ANTES (localStorage)
```jsx
// Componente asume que siempre hay localStorage
export default function ClienteStats() {
  const clienteId = localStorage.getItem("clienteId");
  // Si se usa en modo entrenador, ¡falla!
}
```

### ✅ DESPUÉS (Props + Context)
```jsx
// Acepta prop pero usa Context como fallback
export default function ClienteStats({ clienteIdProp }) {
  const { userId } = useAuth();
  const clienteId = clienteIdProp || userId;

  if (!clienteId) return <Navigate to="/login" />;

  return <div>Stats de {clienteId}</div>;
}

// Uso:
// Como cliente: <ClienteStats /> (usa Context)
// Como entrenador: <ClienteStats clienteIdProp={otherId} /> (usa prop)
```

**Ventajas:**
- ✅ Reutilizable en múltiples contextos
- ✅ Flexible (prop o Context)
- ✅ No asume localStorage

---

## Patrón 8: Sincronización Entre Componentes

### ❌ ANTES (localStorage)
```jsx
// Componente A
function UpdateUser() {
  function handleSave() {
    // Guarda en localStorage
    localStorage.setItem("clienteId", newId);
    // Componente B no se entera
  }
}

// Componente B (no se actualiza)
function Header() {
  const [id, setId] = useState(localStorage.getItem("clienteId"));
  // No detecta cambios en localStorage
}
```

### ✅ DESPUÉS (Context)
```jsx
// Componente A
function UpdateUser() {
  const { login } = useAuth();
  function handleSave() {
    login(newId, role); // Actualiza Context
    // Automáticamente todas los componentes se actualizan
  }
}

// Componente B (se actualiza automáticamente)
function Header() {
  const { userId } = useAuth(); // Se sincroniza automáticamente
  return <div>{userId}</div>;
}
```

**Ventajas:**
- ✅ Sincronización automática
- ✅ Componentes reactivos
- ✅ Sin necesidad de polling o listeners

---

## Checklist de Migración

Si migras un componente, verifica:

- [ ] ¿Importé `useAuth` correctamente?
- [ ] ¿El componente está dentro del árbol de AuthProvider?
- [ ] ¿Reemplacé `localStorage.getItem()` con `useAuth()`?
- [ ] ¿Reemplacé `localStorage.setItem()` con `login()`?
- [ ] ¿Reemplacé `localStorage.removeItem()` con `logout()`?
- [ ] ¿Actualicé los useEffect para usar el nuevo `userId`?
- [ ] ¿Probé en 2 pestañas diferentes?
- [ ] ¿Verificé que funciona en cada pestaña independientemente?

---

## Ejemplos Adicionales

### Guardar Preferencias (que deben persistir)
```jsx
// ✅ Esto SÍ debe ir en localStorage (no es dato sensible)
sessionStorage.setItem("theme", "dark");
sessionStorage.setItem("language", "es");
sessionStorage.setItem("uiPreferences", JSON.stringify({ sidebarCollapsed: true }));

// ❌ Esto NO debe ir en localStorage
localStorage.setItem("clienteId", id); // ❌ Usa Context
```

### Mantener Sesión Entre Recargas
```jsx
// ✅ CORRECTO: sessionStorage persiste durante la sesión
// Al recargar, AuthContext lee de sessionStorage automáticamente

// ❌ INCORRECTO: localStorage haría que se mezclen usuarios
// En 2 pestañas ambas compartirían los datos

// Si necesitas persistencia de verdad (más de 1 sesión):
// Usa JWT + Refresh Tokens (más seguro que localStorage)
```

---

## Resumen Rápido

| Situación | Solución |
|-----------|----------|
| Leer ID del usuario | `const { userId } = useAuth();` |
| Leer rol del usuario | `const { role } = useAuth();` |
| Login | `const { login } = useAuth(); login(id, role);` |
| Logout | `const { logout } = useAuth(); logout();` |
| Verificar autenticación | `const { isAuthenticated } = useAuth();` |
| Datos temporales | `sessionStorage.setItem()` |
| Preferencias de UI | `localStorage.setItem()` (no sensibles) |
| Proteger ruta | `<ProtectedRoute>` con Context |
| Componente reutilizable | Aceptar prop + fallback a Context |

---

¿Preguntas? Revisa los archivos de documentación en el proyecto.
