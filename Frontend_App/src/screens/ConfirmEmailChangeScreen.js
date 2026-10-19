import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { confirmEmailChange } from '../api/endpoints';
import { useAuth } from '../components/context/AuthContext';
import AccountFormScreen, { FormMessage } from '../components/ui/AccountFormScreen';
import GymButton from '../components/ui/GymButton';

const messages = {
  loading: 'Confirmando cambio de correo…',
  success: 'Tu correo se ha confirmado correctamente.',
  occupied: 'Ese correo ya está asociado a otra cuenta.',
  invalid: 'El enlace de confirmación no es válido o ha caducado.',
  error: 'No se pudo confirmar el cambio de correo. Comprueba la conexión e inténtalo de nuevo.',
  signInRequired: 'Tu correo se ha confirmado, pero no se pudo iniciar sesión. Accede con tu nuevo correo y contraseña.',
};
export default function ConfirmEmailChangeScreen({ route, navigation }) {
  const { login } = useAuth();
  const loginRef = useRef(login);
  loginRef.current = login;
  const request = useRef(null);
  const [state, setState] = useState('loading');
  const [attempt, setAttempt] = useState(0);
  const token = route?.params?.token;

  useEffect(() => {
    if (!token) { setState('invalid'); return; }
    let active = true;
    setState('loading');
    // A session update can change login's identity. Never consume the link again
    // just because the auth provider rerenders; reuse this attempt's promise.
    if (request.current?.token !== token || request.current?.attempt !== attempt) {
      request.current = { token, attempt, promise: confirmEmailChange(token) };
    }
    request.current.promise.then(async ({ data }) => {
      if (!active) return;
      try {
        await loginRef.current(data);
        if (active) setState('success');
      } catch {
        if (active) setState('signInRequired');
      }
    }, (error) => {
      if (!active) return;
      setState(error.response?.data?.code === 'EMAIL_ALREADY_IN_USE' ? 'occupied'
        : error.response?.status === 400 ? 'invalid' : 'error');
    });
    return () => { active = false; };
  }, [token, attempt]);

  return (
    <AccountFormScreen title="Confirmar cambio de correo" backLabel={state === 'loading' ? undefined : 'Ir a iniciar sesión'} onBack={state === 'loading' ? undefined : () => navigation.navigate('Login')}>
      {state === 'loading' ? <ActivityIndicator accessibilityLabel="Confirmando correo" color="#FACC15" /> : null}
      <FormMessage success={state === 'loading' || state === 'success'}>{messages[state]}</FormMessage>
      {state === 'error' ? <GymButton variant="secondary" onPress={() => setAttempt((current) => current + 1)}>Reintentar</GymButton> : null}
    </AccountFormScreen>
  );
}
