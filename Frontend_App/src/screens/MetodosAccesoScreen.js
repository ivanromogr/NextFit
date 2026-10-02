import React, { useEffect, useState } from 'react';
import { Alert, Button, Platform, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../components/context/AuthContext';
import { getGoogleIdToken, isGoogleCancel } from '../services/googleSignIn';
import { isAppleSignInAvailable, isAppleSignInCancel, startAppleSignIn } from '../services/appleAuthNative';
import {
  getAuthIdentities,
  linkGoogleIdentity,
  linkAppleIdentity,
  reauthWithPassword,
  reauthWithGoogle,
  reauthWithApple,
  unlinkGoogleIdentity,
  unlinkAppleIdentity,
} from '../api/endpoints';

const label = { LOCAL: 'Correo y contraseña', GOOGLE: 'Google', APPLE: 'Apple' };
const code = error => error?.response?.data?.code;
const msg = error => {
  if (code(error) === 'SOCIAL_IDENTITY_ALREADY_LINKED') return 'Esta cuenta ya está vinculada a otra cuenta de NextFit.';
  if (code(error) === 'INVALID_REAUTH_TOKEN') return 'La confirmación ha caducado. Vuelve a verificar tu identidad.';
  if (code(error) === 'CANNOT_UNLINK_LAST_IDENTITY') return 'No puedes eliminar tu único método de acceso.';
  return 'No se pudo completar la operación.';
};

export default function MetodosAccesoScreen() {
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const [reauthTarget, setReauthTarget] = useState(null);
  const [reauthMethods, setReauthMethods] = useState([]);
  const [password, setPassword] = useState('');
  const [passwordSelected, setPasswordSelected] = useState(false);
  const { clearLocalSession } = useAuth();
  const navigation = useNavigation();
  const active = provider => items.some(identity => identity.provider === provider && identity.active);
  const count = items.filter(identity => identity.active).length;

  const load = async () => {
    try {
      const response = await getAuthIdentities();
      setItems(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      Alert.alert('Métodos de acceso', msg(error));
    }
  };

  useEffect(() => { load(); }, []);

  const closeReauthSelector = () => {
    setReauthTarget(null);
    setReauthMethods([]);
    setPassword('');
    setPasswordSelected(false);
  };

  const getAvailableReauthMethods = async targetProvider => {
    const methods = [];
    if (active('LOCAL')) methods.push('LOCAL');
    if (targetProvider === 'APPLE' && active('GOOGLE')) methods.push('GOOGLE');
    if (targetProvider === 'GOOGLE' && active('APPLE') && Platform.OS === 'ios' && await isAppleSignInAvailable()) methods.push('APPLE');
    return methods;
  };

  const performUnlink = async (targetProvider, reauthToken) => {
    if (targetProvider === 'GOOGLE') await unlinkGoogleIdentity(reauthToken);
    else await unlinkAppleIdentity(reauthToken);
    await clearLocalSession();
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  const handleReauthFailure = async error => {
    Alert.alert('Métodos de acceso', msg(error));
    if (['CANNOT_UNLINK_LAST_IDENTITY', 'IDENTITY_NOT_LINKED'].includes(code(error))) await load();
  };

  const usePassword = async () => {
    if (!password) return Alert.alert('Métodos de acceso', 'Introduce tu contraseña actual.');
    const value = password;
    setPassword('');
    setBusy(true);
    try {
      const response = await reauthWithPassword(value, reauthTarget);
      await performUnlink(reauthTarget, response.data.reauthToken);
      closeReauthSelector();
    } catch (error) {
      await handleReauthFailure(error);
    } finally {
      setBusy(false);
    }
  };

  const useGoogle = async () => {
    setBusy(true);
    try {
      const credential = await getGoogleIdToken();
      if (!credential) return;
      const response = await reauthWithGoogle(credential, reauthTarget);
      await performUnlink(reauthTarget, response.data.reauthToken);
      closeReauthSelector();
    } catch (error) {
      if (!isGoogleCancel(error)) await handleReauthFailure(error);
    } finally {
      setBusy(false);
    }
  };

  const useApple = async () => {
    setBusy(true);
    try {
      const { identityToken, nonce } = await startAppleSignIn();
      const response = await reauthWithApple(identityToken, nonce, reauthTarget);
      await performUnlink(reauthTarget, response.data.reauthToken);
      closeReauthSelector();
    } catch (error) {
      if (error?.message !== 'APPLE_AUTH_CANCELLED' && !isAppleSignInCancel(error)) await handleReauthFailure(error);
    } finally {
      setBusy(false);
    }
  };

  const openReauthSelector = async targetProvider => {
    if (count <= 1) return Alert.alert('Métodos de acceso', 'No puedes eliminar tu único método de acceso.');
    setBusy(true);
    try {
      const methods = await getAvailableReauthMethods(targetProvider);
      if (!methods.length) return Alert.alert('Métodos de acceso', 'No hay otro método de verificación disponible en este dispositivo.');
      setReauthTarget(targetProvider);
      setReauthMethods(methods);
      setPassword('');
      setPasswordSelected(false);
    } catch (error) {
      Alert.alert('Métodos de acceso', msg(error));
    } finally {
      setBusy(false);
    }
  };

  const confirmUnlink = targetProvider => Alert.alert(
    `¿Desvincular ${label[targetProvider]}?`,
    'Tendrás que confirmar tu identidad con otro método.',
    [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Continuar', style: 'destructive', onPress: () => openReauthSelector(targetProvider) },
    ],
  );

  const linkGoogle = async () => {
    setBusy(true);
    try {
      const credential = await getGoogleIdToken();
      if (credential) {
        await linkGoogleIdentity(credential);
        await load();
      }
    } catch (error) {
      if (!isGoogleCancel(error)) Alert.alert('Google', msg(error));
    } finally {
      setBusy(false);
    }
  };

  const linkApple = async () => {
    setBusy(true);
    try {
      const { identityToken, nonce } = await startAppleSignIn();
      await linkAppleIdentity(identityToken, nonce);
      await load();
    } catch (error) {
      if (error?.message !== 'APPLE_AUTH_CANCELLED' && !isAppleSignInCancel(error)) Alert.alert('Apple', msg(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View>
      <Text>Métodos de acceso</Text>
      {['LOCAL', 'GOOGLE', 'APPLE'].map(provider => (
        <View key={provider}>
          <Text>{label[provider]} — {active(provider) ? 'Vinculado' : provider === 'LOCAL' ? 'No configurado' : provider === 'APPLE' && Platform.OS !== 'ios' ? 'No disponible en este dispositivo' : 'No vinculado'}</Text>
          {provider === 'GOOGLE' && !active(provider) && <Button title="Vincular Google" disabled={busy} onPress={linkGoogle} />}
          {provider === 'APPLE' && !active(provider) && Platform.OS === 'ios' && <AppleAction busy={busy} onPress={linkApple} />}
          {provider !== 'LOCAL' && active(provider) && <Button title="Desvincular" disabled={busy || count <= 1} onPress={() => confirmUnlink(provider)} />}
        </View>
      ))}

      {reauthTarget && (
        <View accessibilityLabel="selector-de-reautenticacion">
          <Text>Confirma tu identidad</Text>
          {reauthMethods.includes('LOCAL') && !passwordSelected && <Button title="Usar contraseña" disabled={busy} onPress={() => setPasswordSelected(true)} />}
          {reauthMethods.includes('GOOGLE') && <Button title="Continuar con Google" disabled={busy} onPress={useGoogle} />}
          {reauthMethods.includes('APPLE') && <Button title="Continuar con Apple" disabled={busy} onPress={useApple} />}
          {passwordSelected && (
            <View>
              <TextInput secureTextEntry placeholder="Contraseña actual" value={password} onChangeText={setPassword} editable={!busy} />
              <Button title="Confirmar con contraseña" disabled={busy} onPress={usePassword} />
            </View>
          )}
          <Button title="Cancelar verificación" disabled={busy} onPress={closeReauthSelector} />
        </View>
      )}
    </View>
  );
}

function AppleAction({ busy, onPress }) {
  const [available, setAvailable] = useState(false);
  useEffect(() => { isAppleSignInAvailable().then(setAvailable); }, []);
  return available ? <Button title="Vincular Apple" disabled={busy} onPress={onPress} /> : <Text>Apple no disponible</Text>;
}
