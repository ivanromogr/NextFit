import React, { useEffect, useRef, useState } from 'react';
import { Alert, Text } from 'react-native';
import { deleteAccount, deleteAccountWithGoogle, deleteAccountWithApple, getAuthIdentities } from '../api/endpoints';
import { useAuth } from '../components/context/AuthContext';
import { getGoogleIdToken, isGoogleCancel } from '../services/googleSignIn';
import { isAppleSignInAvailable, startAppleSignIn } from '../services/appleAuthNative';
import AccountFormScreen, { FormMessage } from '../components/ui/AccountFormScreen';
import GymInput from '../components/ui/GymInput';
import GymButton from '../components/ui/GymButton';

export default function EliminarCuentaScreen({ navigation }) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMethods, setLoadingMethods] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [identities, setIdentities] = useState([]);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [retry, setRetry] = useState(0);
  const [error, setError] = useState('');
  const confirming = useRef(false);
  const submitting = useRef(false);
  const completed = useRef(false);
  const mounted = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const { clearLocalSession } = useAuth();
  useEffect(() => {
    let active = true;
    setLoadingMethods(true); setLoadError(false);
    getAuthIdentities().then(({ data }) => {
      if (active) {
        if (!Array.isArray(data) || !data.some(i => i.active && ['LOCAL', 'GOOGLE', 'APPLE'].includes(i.provider))) throw new Error('NO_METHOD');
        setIdentities(data);
      }
    }).catch(() => { if (active) setLoadError(true); })
      .finally(() => { if (active) setLoadingMethods(false); });
    isAppleSignInAvailable().then(value => { if (active) setAppleAvailable(value); }).catch(() => {});
    return () => { active = false; };
  }, [retry]);
  const has = provider => identities.some(i => i.active && i.provider === provider);
  const remove = async provider => {
    if (!mounted.current || submitting.current || completed.current) return;
    submitting.current = true; confirming.current = false;
    setLoading(true); setError('');
    try {
      if (provider === 'GOOGLE') {
        const credential = await getGoogleIdToken();
        if (!mounted.current || !credential) return;
        await deleteAccountWithGoogle(credential);
      } else if (provider === 'APPLE') {
        const { identityToken, nonce } = await startAppleSignIn();
        if (!mounted.current) return;
        await deleteAccountWithApple(identityToken, nonce);
      } else await deleteAccount(password);
      completed.current = true; setPassword('');
      await clearLocalSession();
    } catch (requestError) {
      if (completed.current) setError('Tu cuenta ya está desactivada. Cierra y vuelve a abrir la aplicación.');
      else if (!isGoogleCancel(requestError) && requestError?.message !== 'APPLE_AUTH_CANCELLED')
        setError(requestError.response?.data?.code === 'INVALID_CURRENT_PASSWORD'
          ? 'La contraseña actual no es correcta.'
          : requestError.response?.data?.code === 'INVALID_REAUTH_TOKEN'
            ? 'Confirma tu identidad con una cuenta que esté vinculada a NextFit.'
            : 'No se pudo eliminar la cuenta. Inténtalo de nuevo.');
    } finally { submitting.current = false; setLoading(false); }
  };
  const submit = (provider = 'LOCAL') => {
    if (submitting.current || confirming.current || completed.current || loadingMethods || loadError) return;
    if (provider === 'LOCAL' && !password) return setError('Introduce tu contraseña actual.');
    confirming.current = true;
    Alert.alert('Eliminar cuenta', 'Se desactivará tu cuenta y se cerrarán todas tus sesiones. ¿Quieres continuar?', [
      { text: 'Cancelar', style: 'cancel', onPress: () => { confirming.current = false; } },
      { text: 'Eliminar', style: 'destructive', onPress: () => remove(provider) },
    ], { cancelable: true, onDismiss: () => { confirming.current = false; } });
  };
  const disabled = loading || completed.current;
  return <AccountFormScreen title="Eliminar cuenta" description="Se desactivará tu cuenta y se cerrarán todas tus sesiones. Los registros históricos no se borran automáticamente." backLabel="Volver a ajustes" onBack={navigation ? () => navigation.goBack() : undefined}>
    {loadingMethods && <FormMessage>Cargando métodos de verificación…</FormMessage>}
    {loadError && <><FormMessage>No se pudieron cargar tus métodos de acceso.</FormMessage><GymButton fullWidth onPress={() => setRetry(n => n + 1)}>Reintentar</GymButton></>}
    {!loadingMethods && !loadError && <>
      {has('LOCAL') && <>
        <GymInput label="Contraseña actual" placeholder="Contraseña actual" value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" editable={!disabled} returnKeyType="done" onSubmitEditing={() => submit()} />
        <GymButton fullWidth variant="danger" loading={loading} disabled={disabled} onPress={() => submit()}>Eliminar mi cuenta</GymButton>
      </>}
      {has('GOOGLE') && <GymButton fullWidth variant="danger" disabled={disabled} onPress={() => submit('GOOGLE')}>Confirmar con Google y eliminar cuenta</GymButton>}
      {has('APPLE') && (appleAvailable
        ? <GymButton fullWidth variant="danger" disabled={disabled} onPress={() => submit('APPLE')}>Confirmar con Apple y eliminar cuenta</GymButton>
        : <FormMessage>Apple no está disponible en este dispositivo.</FormMessage>)}
    </>}
    {loading && <Text accessibilityRole="text" accessibilityLiveRegion="polite" style={{ color: '#a1a1aa' }}>Verificando y eliminando cuenta…</Text>}
    <FormMessage>{error}</FormMessage>
  </AccountFormScreen>;
}
