import React, { useRef, useState } from 'react';
import { requestEmailChange } from '../api/endpoints';
import AccountFormScreen, { FormMessage } from '../components/ui/AccountFormScreen';
import GymInput from '../components/ui/GymInput';
import GymButton from '../components/ui/GymButton';

const messages = {
  INVALID_CURRENT_PASSWORD: 'La contraseña actual no es correcta.',
  INVALID_EMAIL: 'Introduce un correo válido.',
  EMAIL_ALREADY_IN_USE: 'Ese correo ya está asociado a otra cuenta.',
};
export default function CambiarEmailScreen({ navigation }) {
  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const passwordRef = useRef(null);
  const submitting = useRef(false);
  const submit = async () => {
    if (submitting.current || sent) return;
    const normalizedEmail = newEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) return setError(messages.INVALID_EMAIL);
    if (!currentPassword) return setError('Introduce tu contraseña actual.');
    submitting.current = true;
    setLoading(true);
    setError('');
    try {
      await requestEmailChange(currentPassword, normalizedEmail);
      setCurrentPassword('');
      setSent(true);
    } catch (requestError) {
      setError(messages[requestError.response?.data?.code] || 'No se pudo solicitar el cambio de correo. Inténtalo de nuevo.');
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  };

  return (
    <AccountFormScreen title="Cambiar correo electrónico" description="Tu correo actual seguirá en uso hasta que confirmes el nuevo mediante el enlace que te enviaremos." backLabel="Volver a ajustes" onBack={navigation ? () => navigation.goBack() : undefined}>
      {sent ? <FormMessage success>Revisa tu nuevo correo. Te hemos enviado un enlace para confirmar el cambio.</FormMessage> : <>
        <GymInput label="Nuevo correo electrónico" placeholder="Nuevo correo electrónico" value={newEmail} onChangeText={setNewEmail} keyboardType="email-address" autoComplete="email" autoCorrect={false} editable={!loading} returnKeyType="next" submitBehavior="submit" onSubmitEditing={() => passwordRef.current?.focus()} />
        <GymInput ref={passwordRef} label="Contraseña actual" placeholder="Contraseña actual" value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry autoComplete="current-password" editable={!loading} returnKeyType="send" onSubmitEditing={submit} />
        <FormMessage>{error}</FormMessage>
        <GymButton fullWidth loading={loading} onPress={submit}>Cambiar correo</GymButton>
      </>}
    </AccountFormScreen>
  );
}
