import React, { useRef, useState } from 'react';
import { requestPasswordReset } from '../api/endpoints';
import GymButton from '../components/ui/GymButton';
import GymInput from '../components/ui/GymInput';
import AccountFormScreen, { FormMessage } from '../components/ui/AccountFormScreen';

const neutralMessage = 'Si existe una cuenta asociada a ese correo, recibirás instrucciones para restablecer tu contraseña.';
export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const submitting = useRef(false);

  const submit = async () => {
    if (submitting.current || sent) return;
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) return setError('Introduce tu correo electrónico.');
    submitting.current = true;
    setLoading(true);
    setError('');
    try {
      await requestPasswordReset(normalizedEmail);
      setSent(true);
    } catch {
      setError('No se pudo procesar la solicitud. Inténtalo de nuevo más tarde.');
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  };

  return (
    <AccountFormScreen title="Recupera tu contraseña" description="Te enviaremos instrucciones para recuperar el acceso a tu cuenta." backLabel="Volver a iniciar sesión" onBack={() => navigation.navigate('Login')}>
      {sent ? <FormMessage success>{neutralMessage}</FormMessage> : <>
        <GymInput label="Correo electrónico" value={email} onChangeText={setEmail} placeholder="usuario@email.com" keyboardType="email-address" autoComplete="email" autoCorrect={false} editable={!loading} returnKeyType="send" onSubmitEditing={submit} />
        <FormMessage>{error}</FormMessage>
        <GymButton fullWidth loading={loading} onPress={submit}>ENVIAR INSTRUCCIONES</GymButton>
      </>}
    </AccountFormScreen>
  );
}
