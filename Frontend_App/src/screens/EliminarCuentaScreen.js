import React, { useRef, useState } from 'react';
import { Alert } from 'react-native';
import { deleteAccount } from '../api/endpoints';
import { useAuth } from '../components/context/AuthContext';
import AccountFormScreen, { FormMessage } from '../components/ui/AccountFormScreen';
import GymInput from '../components/ui/GymInput';
import GymButton from '../components/ui/GymButton';

export default function EliminarCuentaScreen({ navigation }) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const confirming = useRef(false);
  const submitting = useRef(false);
  const { clearLocalSession } = useAuth();

  const remove = async () => {
    if (submitting.current) return;
    submitting.current = true;
    confirming.current = false;
    setLoading(true);
    setError('');
    try {
      await deleteAccount(password);
      setPassword('');
      await clearLocalSession();
    } catch (requestError) {
      setError(requestError.response?.data?.code === 'INVALID_CURRENT_PASSWORD'
        ? 'La contraseña actual no es correcta.' : 'No se pudo eliminar la cuenta. Inténtalo de nuevo.');
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  };

  const submit = () => {
    if (submitting.current || confirming.current) return;
    if (!password) return setError('Introduce tu contraseña actual.');
    confirming.current = true;
    Alert.alert('Eliminar cuenta', 'Se cerrarán todas las sesiones y perderás el acceso a tu cuenta. ¿Quieres continuar?', [
      { text: 'Cancelar', style: 'cancel', onPress: () => { confirming.current = false; } },
      { text: 'Eliminar', style: 'destructive', onPress: remove },
    ], { cancelable: true, onDismiss: () => { confirming.current = false; } });
  };

  return (
    <AccountFormScreen title="Eliminar cuenta" description="Se cerrarán todas las sesiones y perderás el acceso. Confirma tu contraseña actual para continuar." backLabel="Volver a ajustes" onBack={navigation ? () => navigation.goBack() : undefined}>
      <GymInput label="Contraseña actual" placeholder="Contraseña actual" value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" editable={!loading} returnKeyType="done" onSubmitEditing={submit} />
      <FormMessage>{error}</FormMessage>
      <GymButton fullWidth variant="danger" loading={loading} onPress={submit}>Eliminar mi cuenta</GymButton>
    </AccountFormScreen>
  );
}
