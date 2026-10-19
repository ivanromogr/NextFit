import React, { useRef, useState } from 'react';
import { resetPassword } from '../api/endpoints';
import GymButton from '../components/ui/GymButton';
import GymInput from '../components/ui/GymInput';
import AccountFormScreen, { FormMessage } from '../components/ui/AccountFormScreen';

const invalidMessage = 'El enlace de recuperación no es válido o ha caducado.';
export default function ResetPasswordScreen({ navigation, route }) {
  const [token, setToken] = useState(() => route?.params?.token || '');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const submitting = useRef(false);
  const confirmationRef = useRef(null);

  const submit = async () => {
    if (submitting.current || done || invalid || !token) return;
    if (password.length < 8 || password.length > 128) return setError('La contraseña debe tener entre 8 y 128 caracteres.');
    if (password !== confirmation) return setError('Las contraseñas no coinciden.');
    submitting.current = true;
    setLoading(true);
    setError('');
    try {
      await resetPassword(token, password);
      setToken('');
      setPassword('');
      setConfirmation('');
      setDone(true);
    } catch (requestError) {
      if (requestError.response?.data?.code === 'INVALID_RESET_TOKEN') {
        setToken('');
        setPassword('');
        setConfirmation('');
        setInvalid(true);
      } else if (['INVALID_PASSWORD', 'PASSWORD_POLICY_VIOLATION'].includes(requestError.response?.data?.code)) {
        setError('La nueva contraseña no cumple los requisitos de seguridad. Elige otra contraseña.');
      } else {
        setError('No se pudo restablecer la contraseña. Inténtalo de nuevo más tarde.');
      }
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  };

  if ((!token || invalid) && !done) return (
    <AccountFormScreen title="Solicita un nuevo enlace" backLabel="Solicitar un nuevo enlace" onBack={() => navigation.navigate('ForgotPassword')}>
      <FormMessage>{invalidMessage}</FormMessage>
    </AccountFormScreen>
  );

  return (
    <AccountFormScreen title={done ? 'Contraseña restablecida' : 'Nueva contraseña'} description={done ? undefined : 'Usa entre 8 y 128 caracteres.'} backLabel={done ? 'Ir a iniciar sesión' : 'Volver a iniciar sesión'} onBack={() => navigation.navigate('Login')}>
      {done ? <FormMessage success>Tu contraseña se ha restablecido. Inicia sesión con tu nueva contraseña.</FormMessage> : <>
        <GymInput label="Nueva contraseña" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" editable={!loading} returnKeyType="next" submitBehavior="submit" onSubmitEditing={() => confirmationRef.current?.focus()} />
        <GymInput ref={confirmationRef} label="Confirmar contraseña" value={confirmation} onChangeText={setConfirmation} secureTextEntry autoComplete="new-password" editable={!loading} returnKeyType="go" onSubmitEditing={submit} />
        <FormMessage>{error}</FormMessage>
        <GymButton fullWidth loading={loading} onPress={submit}>RESTABLECER CONTRASEÑA</GymButton>
      </>}
    </AccountFormScreen>
  );
}
