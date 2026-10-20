import { useEffect, useReducer, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { confirmEmailChange } from '../../api/endpoints';
import { useAuth } from '../../context/AuthContext';

export default function ConfirmEmailChange() {
  const [params] = useSearchParams();
  const { login, loading } = useAuth();
  const token = params.get('token') || '';
  if (loading) return <p role="status">Comprobando tu sesión…</p>;
  return <Confirmation key={token} token={token} login={login} />;
}

function Confirmation({ token, login }) {
  const [state, setState] = useState(token ? 'loading' : 'invalid');
  const [revision, retry] = useReducer(value => value + 1, 0);
  const request = useRef(null);
  const loginRef = useRef(login);
  useEffect(() => { loginRef.current = login; }, [login]);
  useEffect(() => {
    if (!token) return;
    let active = true;
    // Reuse the pending request during StrictMode's effect replay. Only an
    // explicit retry creates a new request; context renders do not consume links.
    if (!request.current || request.current.revision !== revision) {
      request.current = { revision, promise: Promise.resolve().then(() => confirmEmailChange(token)) };
    }
    request.current.promise.then(response => {
      if (!active) return;
      loginRef.current(response.data);
      setState('success');
    }).catch(error => {
      if (!active) return;
      const code = error.response?.data?.code;
      setState(code === 'EMAIL_ALREADY_IN_USE' ? 'occupied'
        : error.response?.status === 400 ? 'invalid' : 'unavailable');
    });
    return () => { active = false; };
  }, [token, revision]);

  if (state === 'loading') return <p role="status">Confirmando cambio de correo…</p>;
  if (state === 'success') return <p role="status">Tu correo se ha confirmado correctamente.</p>;
  if (state === 'unavailable') return <div role="alert">
    <p>No se pudo confirmar el correo. Comprueba tu conexión y vuelve a intentarlo.</p>
    <button type="button" onClick={() => { setState('loading'); retry(); }}>Reintentar confirmación</button>
  </div>;
  return <><p role="alert">{state === 'occupied' ? 'Ese correo ya está asociado a otra cuenta.'
    : 'El enlace de confirmación no es válido o ha caducado.'}</p>
    <Link to="/auth/login">Ir a iniciar sesión</Link></>;
}
