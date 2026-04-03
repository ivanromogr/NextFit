# ✅ CHECKLIST DE VALIDACIÓN - Sistema Multi-Sesión

## Pre-Validación

- [ ] Git branch actualizada
- [ ] No hay cambios sin commitear
- [ ] Node.js running (npm start)
- [ ] Navegador limpio (sin extensiones que afecten localStorage)

---

## 1️⃣ Validar AuthContext

### Archivos Creados
- [ ] `src/context/AuthContext.jsx` existe
- [ ] Contiene `AuthProvider` y `useAuth`
- [ ] Maneja `sessionStorage` para persistencia

### Validación de Código
```javascript
// En DevTools Console, después de login:
// Debe devolver el usuario actual
React.useContext(window.AuthContext)
```

---

## 2️⃣ Validar sessionStorage vs localStorage

### Después de Login
- [ ] `sessionStorage.getItem("auth_session")` devuelve JSON
- [ ] `localStorage.getItem("clienteId")` es `null` ❌ NO debe existir
- [ ] `localStorage.getItem("entrenadorId")` es `null` ❌ NO debe existir

### Comando Test
```javascript
console.log("sessionStorage:", sessionStorage.getItem("auth_session"))
console.log("localStorage clienteId:", localStorage.getItem("clienteId"))
```

---

## 3️⃣ Validar App.jsx

### AuthProvider Wrapper
- [ ] App.jsx importa `AuthProvider`
- [ ] AuthProvider envuelve ToastProvider
- [ ] AuthProvider está antes de BrowserRouter

### Estructura Correcta
```jsx
<AuthProvider>
  <ToastProvider>
    <BrowserRouter>
      ...
    </BrowserRouter>
  </ToastProvider>
</AuthProvider>
```

---

## 4️⃣ Validar Componentes Actualizados

### Componentes Cliente
- [ ] MenuCliente.jsx usa `useAuth()`
- [ ] SesionEntrenamiento.jsx usa `useAuth()`
- [ ] CalendarioCliente.jsx usa `useAuth()`
- [ ] EditarPerfil.jsx usa `useAuth()`
- [ ] ProgresoCliente.jsx usa `useAuth()`
- [ ] DashboardCliente.jsx usa `useAuth()`
- [ ] ChatClientePage.jsx usa `useAuth()`

### Componentes Entrenador
- [ ] MenuEntrenador.jsx usa `useAuth()`
- [ ] ChatPage.jsx usa `useAuth()`
- [ ] GestionAtletas.jsx usa `useAuth()`
- [ ] EditarPerfilEntrenador.jsx usa `useAuth()`

### Componentes Generales
- [ ] ClienteSidebar.jsx usa `logout()`
- [ ] ProtectedRoute.jsx usa `useAuth()`
- [ ] Login.jsx usa `login()`

---

## 5️⃣ Test de Multi-Sesión

### Escenario 1: Dos Usuarios Diferentes

1. Abre Pestaña A
   - [ ] Login como ivan@gmail.com
   - [ ] sessionStorage tiene `auth_session` con ivan's ID

2. Abre Pestaña B
   - [ ] Login como juan@gmail.com
   - [ ] sessionStorage tiene `auth_session` con juan's ID

3. Verifica Aislamiento
   - [ ] Pestaña A Dashboard muestra: "Hola Ivan"
   - [ ] Pestaña B Dashboard muestra: "Hola Juan"
   - [ ] Los datos no se mezclan

### Escenario 2: Recarga de Página

1. Pestaña A logueada como Ivan
   - [ ] Recarga (Ctrl+R)
   - [ ] Sigue siendo Ivan
   - [ ] sessionStorage persiste

2. Pestaña B logueada como Juan
   - [ ] Recarga (Ctrl+R)
   - [ ] Sigue siendo Juan
   - [ ] No se ve afectada por la recarga de Pestaña A

### Escenario 3: Logout

1. Pestaña A
   - [ ] Click en "Cerrar Sesión"
   - [ ] sessionStorage se limpia
   - [ ] Redirige a /login
   - [ ] Pestaña B sin cambios (Juan sigue logueado)

2. Pestaña B
   - [ ] Sigue siendo Juan
   - [ ] No se afectó por el logout de Pestaña A

### Escenario 4: Cerrar Pestaña

1. Pestaña A
   - [ ] Cierra completamente
   - [ ] Pestaña B sin cambios

2. Pestaña B
   - [ ] Sigue funcionando normalmente
   - [ ] Juan sigue logueado

---

## 6️⃣ Validar Sin localStorage

### Búsqueda de localStorage
```bash
# En terminal, desde el directorio Frontend
grep -r "localStorage.getItem" src/ | grep -v node_modules | grep -v ".map"

# Resultado esperado:
# Solo líneas no críticas como:
# - token handling (si existe)
# - UI preferences (tema, idioma)
# 
# NO DEBE haber:
# - clienteId
# - entrenadorId
# - registration_userId
```

---

## 7️⃣ Validar Context Correctamente

### useAuth() debe estar disponible
```jsx
// ✅ Esto funciona (dentro del árbol de AuthProvider)
function MiComponente() {
  const { userId } = useAuth();
}

// ❌ Esto falla (fuera del árbol)
const userId = useAuth(); // ERROR: must be inside AuthProvider
```

- [ ] Todos los usos de useAuth() están dentro del árbol
- [ ] No hay useAuth() en archivos que no son componentes React

---

## 8️⃣ Validación Visual

### Login Page
- [ ] Se puede loguear
- [ ] No hay errores en consola
- [ ] Redirige al dashboard correcto

### Dashboard
- [ ] Muestra datos del usuario correcto
- [ ] Los contactos son los correctos
- [ ] Los chats no se mezclan

### Sidebar
- [ ] Muestra el usuario correcto
- [ ] "Cerrar Sesión" limpia la sesión

### Chat
- [ ] Mensajes del usuario correcto
- [ ] No se ven chats de otros usuarios

---

## 9️⃣ DevTools Console Tests

### Test 1: Session Recovery
```javascript
// Debe devolver el usuario actual
const session = JSON.parse(sessionStorage.getItem("auth_session"));
console.log("✅ Usuario actual:", session.id, session.role);
```

### Test 2: Multi-Tab Simulation
```javascript
// Debe ser diferente en cada pestaña
console.log("🔑 Mi sessionStorage:", sessionStorage.getItem("auth_session"));
// En otra pestaña, debería ser diferente
```

### Test 3: localStorage Cleanup
```javascript
// Debe ser null (o no existir)
const problematic = localStorage.getItem("clienteId");
if (problematic === null) {
  console.log("✅ localStorage limpio de datos sensibles");
} else {
  console.log("❌ ERROR: Encontrado clienteId en localStorage!");
}
```

---

## 🔟 Performance Check

### Memory Usage
- [ ] No hay memory leaks al cambiar de página
- [ ] sessionStorage no crece infinitamente
- [ ] useAuth() no causa renders innecesarios

### DevTools → Performance
- [ ] Logout rápido (sin lag)
- [ ] Login rápido (sin lag)
- [ ] Navegación suave

---

## 1️⃣1️⃣ Errores Comunes a Verificar

- [ ] ❌ "useAuth must be inside AuthProvider" - Revisar App.jsx
- [ ] ❌ "localStorage.getItem is not a function" - localStorage typo
- [ ] ❌ "userId is undefined" - useAuth() no disponible en contexto
- [ ] ❌ "Sesión se limpia al recargar" - Verificar AuthContext useEffect
- [ ] ❌ "Dos pestañas muestran el mismo usuario" - Verificar sessionStorage

---

## 1️⃣2️⃣ Documentación Validada

- [ ] `SOLUCION_MULTISESION.md` leído
- [ ] `RESUMEN_CAMBIOS.md` entendido
- [ ] `DIAGNOSTICO_SESIONES.md` marcado para referencia
- [ ] `EJEMPLOS_MIGRACION.md` útil para futuros cambios
- [ ] `TEST_SESIONES.js` ejecutado sin errores

---

## ✨ Checklist Final

- [ ] Código compilado sin errores
- [ ] No hay warnings en Console
- [ ] Multi-sesión funciona perfectamente
- [ ] Logout limpia correctamente
- [ ] Cada pestaña aislada
- [ ] sessionStorage usado correctamente
- [ ] localStorage sin datos sensibles
- [ ] AuthContext disponible en toda la app
- [ ] Documentación completa

---

## 🚀 Deployment Check

Antes de mergear a main:

- [ ] `npm run build` sin errores
- [ ] `npm run lint` sin errores
- [ ] Tests de multi-sesión pasan
- [ ] DevTools Console sin warnings
- [ ] Probado en Chrome, Firefox, Safari (si es posible)
- [ ] Probado en mobile (incognito mode)

---

## 📝 Notas Post-Implementación

```
Fecha: [Completar]
Validado por: [Tu nombre]
Ambiente: [Dev / Staging / Prod]

Notas especiales:
[Espacio para notas]

Problemas encontrados:
[Espacio para problemas]

Soluciones aplicadas:
[Espacio para soluciones]
```

---

**¡Si todo está checkado, la solución está completamente implementada y validada!** ✅🎉
