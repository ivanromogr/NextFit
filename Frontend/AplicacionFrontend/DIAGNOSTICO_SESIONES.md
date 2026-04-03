# 🔧 GUÍA DE DIAGNÓSTICO - Sistema Multi-Sesión

## ❌ Problema: "Veo el ID de otro usuario"

### Paso 1: Verifica que estés usando sessionStorage
```javascript
// En DevTools Console
sessionStorage.getItem("auth_session")

// Debería mostrar: {"id":"tu-id-aqui","role":"cliente"}
```

### Paso 2: Verifica que localStorage esté limpio
```javascript
// En DevTools Console
localStorage.getItem("clienteId")     // Debe ser null
localStorage.getItem("entrenadorId")  // Debe ser null
```

### Paso 3: Recarga y prueba de nuevo
1. Abre el DevTools (F12)
2. Ve a Application > Session Storage > tu dominio
3. Verifica que cada pestaña tiene su propio objeto

---

## ❌ Problema: "Recargo la página y pierdo la sesión"

### Paso 1: Verifica que sessionStorage persista durante la sesión
```javascript
// Antes de recargar
console.log(sessionStorage.getItem("auth_session"))

// Recarga (Ctrl+R o Cmd+R)

// Después de recargar
console.log(sessionStorage.getItem("auth_session")) // Debe ser igual
```

### Paso 2: Verifica que Context se reinicialice
```javascript
// Es normal que Context se reinicie, pero sessionStorage debe persistir
// El AuthProvider debe leer de sessionStorage automáticamente
```

### Paso 3: Si no funciona...
Edita `AuthContext.jsx` y verifica que el useEffect inicial se ejecute:
```jsx
useEffect(() => {
  const sessionData = sessionStorage.getItem("auth_session");
  if (sessionData) {
    const parsedSession = JSON.parse(sessionData);
    console.log("✅ Sesión recuperada:", parsedSession); // Debe aparecer
    setUser(parsedSession);
  }
  setLoading(false);
}, []);
```

---

## ❌ Problema: "useAuth() no funciona"

### Verificación 1: ¿Está envuelto con AuthProvider?
```jsx
// En App.jsx debe estar así:
<AuthProvider>
  <ToastProvider>
    <BrowserRouter>
      ...
```

**Si no está:** Agrega AuthProvider alrededor de ToastProvider

### Verificación 2: ¿Estoy en un componente dentro del árbol?
```jsx
// ✅ Esto funciona (dentro del árbol)
export default function MenuCliente() {
  const { userId } = useAuth(); // ✅ OK
}

// ❌ Esto NO funciona (fuera del árbol)
// En un archivo que no es un componente React
const userId = useAuth(); // ❌ ERROR
```

### Verificación 3: ¿Importé correctamente?
```jsx
// ✅ Correcto
import { useAuth } from '../../context/AuthContext';

// ❌ Incorrecto
import useAuth from '../../context/AuthContext'; // Falta las llaves
```

---

## ❌ Problema: "Login funciona pero luego vuelve a /login"

### Paso 1: Verifica el flujo de login
```jsx
// En Login.jsx, después del submit:
const { login } = useAuth();
login(id, role); // Debe llamarse

console.log("Login llamado"); // Debe aparecer
console.log(sessionStorage.getItem("auth_session")); // Debe tener datos
```

### Paso 2: Verifica que navigate() funciona
```javascript
// En DevTools, ejecuta:
window.location.pathname // Debe cambiar después de login
```

### Paso 3: Verifica ProtectedRoute
Si tienes ProtectedRoute, asegúrate de que usa useAuth:
```jsx
// ✅ Correcto
export default function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated()) return <Navigate to="/auth/login" />;
  return children;
}
```

---

## ❌ Problema: "2 pestañas y se ven diferentes estados"

### Este es el comportamiento CORRECTO ✅

**Cada pestaña debe:**
- Tener su propio sessionStorage
- Mostrar su propio usuario
- No interferir con otras pestañas

**Verifica:**
```javascript
// Pestaña A
console.log("Pestaña A:", sessionStorage.getItem("auth_session"))

// Pestaña B (abre DevTools en Pestaña B)
console.log("Pestaña B:", sessionStorage.getItem("auth_session"))

// Deben ser DIFERENTES ✅
```

---

## ❌ Problema: "sessionStorage se limpia sin razón"

### Causas comunes:

1. **Llamaste a localStorage.clear()**
   - ❌ localStorage.clear() limpia todo (incluyendo sessionStorage a veces)
   - ✅ Usa sessionStorage.clear() o sessionStorage.removeItem(key)

2. **El navegador está en Incognito/Privado**
   - ⚠️ sessionStorage se limpia al cerrar el navegador
   - ✅ Comportamiento esperado en privado

3. **Las cookies están deshabilitadas**
   - ⚠️ Algunos navegadores deshabilitan sessionStorage con cookies
   - ✅ Habilita cookies

4. **Hay un bug en el código**
   - 🔍 Busca `sessionStorage.clear()` o `removeItem` en tu código
   - 🔍 Verifica que no haya un `useEffect` que lo limpie

---

## 🧪 Test Rápido de Diagnóstico

Copia esto en la Console de DevTools:

```javascript
console.log("🔍 DIAGNÓSTICO RÁPIDO:");
console.log("1. sessionStorage.getItem('auth_session'):", sessionStorage.getItem("auth_session"));
console.log("2. localStorage.getItem('clienteId'):", localStorage.getItem("clienteId"));
console.log("3. localStorage.getItem('entrenadorId'):", localStorage.getItem("entrenadorId"));
console.log("4. sessionStorage keys:", Object.keys(sessionStorage));
console.log("5. localStorage keys:", Object.keys(localStorage));

// Test de aislamiento
if (sessionStorage.getItem("auth_session") && !localStorage.getItem("clienteId")) {
  console.log("✅ Sistema funciona correctamente");
} else {
  console.log("⚠️ Posible problema detectado");
}
```

**Salida esperada:**
```
1. sessionStorage.getItem('auth_session'): {"id":"...", "role":"..."}
2. localStorage.getItem('clienteId'): null
3. localStorage.getItem('entrenadorId'): null
4. sessionStorage keys: ["auth_session", "registration_userId", ...]
5. localStorage keys: [otros datos no sensibles]
✅ Sistema funciona correctamente
```

---

## 📞 Checklist de Solución de Problemas

- [ ] ¿AuthProvider está en App.jsx?
- [ ] ¿Estoy usando useAuth() en componentes (no en archivos utils)?
- [ ] ¿sessionStorage.getItem("auth_session") devuelve datos?
- [ ] ¿Cada pestaña tiene su propio sessionStorage diferente?
- [ ] ¿Se limpia al cerrar la pestaña?
- [ ] ¿Persiste al recargar la misma pestaña?
- [ ] ¿No hay "clienteId" o "entrenadorId" en localStorage?

Si todos son SÍ → ✅ **SISTEMA FUNCIONA CORRECTAMENTE**

---

## 🆘 Si Nada Funciona

1. **Limpia todo:**
   ```javascript
   sessionStorage.clear();
   localStorage.clear();
   // Recarga la página
   ```

2. **Vacía el caché del navegador:**
   - DevTools → Network → Disable cache
   - Ctrl+Shift+Delete (Windows) o Cmd+Shift+Delete (Mac)

3. **Busca errores en la consola:**
   - F12 → Console
   - Busca mensajes rojos (errores)
   - Cópialos y adjúntalos si pides ayuda

4. **Revisa que AuthContext se cargue:**
   ```javascript
   // Debería aparecer "useAuth debe usarse dentro de AuthProvider"
   // si intentas usar useAuth fuera del árbol
   ```

---

## 📝 Registro de Cambios

Si necesitas rastrear qué cambió:

```javascript
// Agrega esto en Login.jsx para debugging
const handleSubmit = async (e) => {
  // ...
  const { login } = useAuth();
  login(id, role);
  
  console.log("✅ Login ejecutado");
  console.log("  - Usuario ID:", id);
  console.log("  - Role:", role);
  console.log("  - sessionStorage:", sessionStorage.getItem("auth_session"));
};
```

---

## 🎓 Recursos Útiles

- [MDN: sessionStorage](https://developer.mozilla.org/es/docs/Web/API/sessionStorage)
- [MDN: localStorage](https://developer.mozilla.org/es/docs/Web/API/localStorage)
- [React Context API](https://react.dev/reference/react/useContext)
- [DevTools Tutorial](https://developer.chrome.com/docs/devtools/)

---

¿Aún tienes problemas? 📬
- Revisa que todos los componentes tengan `import { useAuth }`
- Verifica que App.jsx esté correctamente envuelto
- Busca errores en la consola de DevTools
