import React, { useRef, useState } from 'react';
import { Alert } from 'react-native';
import { changePassword } from '../api/endpoints';
import { useAuth } from '../components/context/AuthContext';
import GymButton from '../components/ui/GymButton';
import GymInput from '../components/ui/GymInput';
import AccountFormScreen, { FormMessage } from '../components/ui/AccountFormScreen';

const messages = {
  INVALID_CURRENT_PASSWORD: 'La contraseña actual no es correcta.',
  INVALID_PASSWORD: 'La nueva contraseña no cumple los requisitos.',
  PASSWORD_POLICY_VIOLATION: 'La nueva contraseña no cumple los requisitos de seguridad.',
  NEW_PASSWORD_MUST_BE_DIFFERENT: 'La nueva contraseña debe ser diferente de la actual.',
};
export default function CambiarPasswordScreen({ navigation }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const submitting = useRef(false);
  const newPasswordRef = useRef(null);
  const confirmationRef = useRef(null);
  const { clearLocalSession } = useAuth();

  const submit = async () => {
    if (submitting.current) return;
    if (!currentPassword || !newPassword || !confirmPassword) return setError('Completa todos los campos.');
    if (newPassword.length < 8 || newPassword.length > 128) return setError('La nueva contraseña debe tener entre 8 y 128 caracteres.');
    if (newPassword !== confirmPassword) return setError('Las nuevas contraseñas no coinciden.');
    if (newPassword === currentPassword) return setError(messages.NEW_PASSWORD_MUST_BE_DIFFERENT);
    submitting.current = true;
    setLoading(true);
    setError('');
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      await clearLocalSession();
      Alert.alert('Contraseña actualizada correctamente. Inicia sesión de nuevo.');
    } catch (requestError) {
      setError(messages[requestError.response?.data?.code] || 'No se pudo actualizar la contraseña.');
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  };

  return (
    <AccountFormScreen title="Cambiar contraseña" description="Elige una contraseña de entre 8 y 128 caracteres. Al actualizarla tendrás que iniciar sesión de nuevo." backLabel="Volver a ajustes" onBack={navigation ? () => navigation.goBack() : undefined}>
      <GymInput label="Contraseña actual" placeholder="Contraseña actual" value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry autoComplete="current-password" editable={!loading} returnKeyType="next" submitBehavior="submit" onSubmitEditing={() => newPasswordRef.current?.focus()} />
      <GymInput ref={newPasswordRef} label="Nueva contraseña" placeholder="Nueva contraseña" value={newPassword} onChangeText={setNewPassword} secureTextEntry autoComplete="new-password" editable={!loading} returnKeyType="next" submitBehavior="submit" onSubmitEditing={() => confirmationRef.current?.focus()} />
      <GymInput ref={confirmationRef} label="Confirmar nueva contraseña" placeholder="Confirmar nueva contraseña" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry autoComplete="new-password" editable={!loading} returnKeyType="go" onSubmitEditing={submit} />
      <FormMessage>{error}</FormMessage>
      <GymButton fullWidth loading={loading} onPress={submit}>Actualizar contraseña</GymButton>
    </AccountFormScreen>
  );
}
