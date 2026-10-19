import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Platform, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AccountFormScreen, { FormMessage } from '../components/ui/AccountFormScreen';
import GymInput from '../components/ui/GymInput';
import GymButton from '../components/ui/GymButton';
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
  reauthCreateLocalWithGoogle,
  reauthCreateLocalWithApple,
  createLocalIdentity,
  unlinkGoogleIdentity,
  unlinkAppleIdentity,
} from '../api/endpoints';

const label = { LOCAL: 'Correo y contraseña', GOOGLE: 'Google', APPLE: 'Apple' };
const code = error => error?.response?.data?.code;
const msg = error => {
  if (code(error) === 'SOCIAL_IDENTITY_ALREADY_LINKED') return 'Esta cuenta ya está vinculada a otra cuenta de NextFit.';
  if (code(error) === 'INVALID_REAUTH_TOKEN') return 'La confirmación ha caducado. Vuelve a verificar tu identidad.';
  if (code(error) === 'CANNOT_UNLINK_LAST_IDENTITY') return 'No puedes eliminar tu único método de acceso.';
  if (code(error) === 'LOCAL_EMAIL_NOT_VERIFIED') return 'Antes de crear una contraseña debes verificar tu correo electrónico.';
  if (code(error) === 'LOCAL_EMAIL_REQUIRED') return 'Antes de crear una contraseña debes completar y verificar tu correo electrónico.';
  if (code(error) === 'PASSWORD_POLICY_VIOLATION') return 'La contraseña debe cumplir la política de seguridad.';
  if (code(error) === 'ACCOUNT_INACTIVE') return 'Tu cuenta no está activa.';
  return 'No se pudo completar la operación.';
};

export default function MetodosAccesoScreen() {
  const [items, setItems] = useState([]);
  const [busy, setBusyState] = useState(false);
  const busyRef = useRef(false);
  const setBusy = (value) => { busyRef.current = value; setBusyState(value); };
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reauthTarget, setReauthTarget] = useState(null);
  const [reauthMethods, setReauthMethods] = useState([]);
  const [password, setPassword] = useState('');
  const [passwordSelected, setPasswordSelected] = useState(false);
  const [createMethods, setCreateMethods] = useState([]);
  const [createStep, setCreateStep] = useState(null);
  const [createToken, setCreateToken] = useState('');
  const confirmationRef = useRef(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const { clearLocalSession } = useAuth();
  const navigation = useNavigation();
  const active = provider => items.some(identity => identity.provider === provider && identity.active);
  const count = items.filter(identity => identity.active).length;

  const load = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const response = await getAuthIdentities();
      setItems(Array.isArray(response.data) ? response.data : []);
    } catch {
      setLoadError('No se pudieron cargar los métodos de acceso.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const closeReauthSelector = () => {
    setReauthTarget(null);
    setReauthMethods([]);
    setPassword('');
    setPasswordSelected(false);
  };
  const closeCreate = () => { setCreateMethods([]); setCreateStep(null); setCreateToken(''); setNewPassword(''); setConfirmPassword(''); };
  const getCreateMethods = async () => {
    const methods = [];
    if (active('GOOGLE')) methods.push('GOOGLE');
    if (active('APPLE') && Platform.OS === 'ios' && await isAppleSignInAvailable()) methods.push('APPLE');
    return methods;
  };
  const openCreate = async () => {
    if (busyRef.current || loading || loadError) return;
    setBusy(true);
    try { const methods = await getCreateMethods(); if (!methods.length) return Alert.alert('Métodos de acceso', 'No hay un método de verificación disponible en este dispositivo.'); setCreateMethods(methods); setCreateStep(methods.length === 1 ? methods[0] : 'SELECT'); }
    catch (error) { Alert.alert('Métodos de acceso', msg(error)); } finally { setBusy(false); }
  };
  const finishCreateReauth = response => { setCreateToken(response.data.reauthToken); setCreateStep('PASSWORD'); };
  const createWithGoogle = async () => {
    if (busyRef.current || loading || loadError) return; setBusy(true); try { const credential = await getGoogleIdToken(); if (!credential) return; finishCreateReauth(await reauthCreateLocalWithGoogle(credential)); } catch (error) { if (!isGoogleCancel(error)) Alert.alert('Métodos de acceso', msg(error)); } finally { setBusy(false); } };
  const createWithApple = async () => {
    if (busyRef.current || loading || loadError) return; setBusy(true); try { const { identityToken, nonce } = await startAppleSignIn(); finishCreateReauth(await reauthCreateLocalWithApple(identityToken, nonce)); } catch (error) { if (error?.message !== 'APPLE_AUTH_CANCELLED' && !isAppleSignInCancel(error)) Alert.alert('Métodos de acceso', msg(error)); } finally { setBusy(false); } };
  const submitCreate = async () => {
    if (busyRef.current || loading || loadError) return;
    if (!newPassword || !confirmPassword) return Alert.alert('Métodos de acceso', 'Completa los dos campos de contraseña.');
    if (newPassword !== confirmPassword) return Alert.alert('Métodos de acceso', 'Las contraseñas no coinciden.');
    if (newPassword.length < 8 || newPassword.length > 128) return Alert.alert('Métodos de acceso', 'La contraseña debe tener entre 8 y 128 caracteres.');
    setBusy(true);
    try { await createLocalIdentity(createToken, newPassword); closeCreate(); await load(); Alert.alert('Métodos de acceso', 'Contraseña creada correctamente.'); }
    catch (error) { const value = code(error); Alert.alert('Métodos de acceso', msg(error)); if (value === 'LOCAL_IDENTITY_ALREADY_EXISTS') { closeCreate(); await load(); } else if (value === 'INVALID_REAUTH_TOKEN') { setCreateToken(''); setNewPassword(''); setConfirmPassword(''); setCreateStep('SELECT'); } }
    finally { setBusy(false); }
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
    if (busyRef.current || loading || loadError) return;
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
    if (busyRef.current || loading || loadError) return;
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
    if (busyRef.current || loading || loadError) return;
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
    if (busyRef.current || loading || loadError) return;
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
    if (busyRef.current || loading || loadError) return;
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
    if (busyRef.current || loading || loadError) return;
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
    <AccountFormScreen title="Métodos de acceso" description="Consulta y gestiona las formas de acceder a tu cuenta." backLabel="Volver a ajustes" onBack={navigation.goBack ? () => navigation.goBack() : undefined}>
      {loading ? <ActivityIndicator accessibilityLabel="Cargando métodos de acceso" color="#FACC15" /> : null}
      <FormMessage>{loadError}</FormMessage>
      {loadError ? <Action title="Reintentar" onPress={load} disabled={loading} /> : null}
      {!loading && !loadError && <>
      {['LOCAL', 'GOOGLE', 'APPLE'].map(provider => (
        <View key={provider} style={styles.provider}>
          <Text style={styles.providerTitle}>{label[provider]} — {active(provider) ? 'Vinculado' : provider === 'LOCAL' ? 'No configurado' : provider === 'APPLE' && Platform.OS !== 'ios' ? 'No disponible en este dispositivo' : 'No vinculado'}</Text>
          {provider === 'GOOGLE' && !active(provider) && <Action title="Vincular Google" disabled={busy} onPress={linkGoogle} />}
          {provider === 'APPLE' && !active(provider) && Platform.OS === 'ios' && <AppleAction busy={busy} onPress={linkApple} />}
          {provider !== 'LOCAL' && active(provider) && <Action title="Desvincular" disabled={busy || count <= 1} onPress={() => confirmUnlink(provider)} />}
        </View>
      ))}
      {!active('LOCAL') && <Action title="Crear contraseña" disabled={busy} onPress={openCreate} />}

      {createStep && (
        <View accessibilityLabel="crear-contrasena" style={styles.panel}>
          <Text style={styles.heading}>Crear contraseña</Text>
          {createStep === 'SELECT' && <Text style={styles.helper}>Confirma tu identidad</Text>}
          {createMethods.includes('GOOGLE') && createStep !== 'PASSWORD' && <Action title="Continuar con Google" disabled={busy} onPress={createWithGoogle} />}
          {createMethods.includes('APPLE') && createStep !== 'PASSWORD' && <Action title="Continuar con Apple" disabled={busy} onPress={createWithApple} />}
          {createStep === 'PASSWORD' && <View><GymInput label="Nueva contraseña" returnKeyType="next" submitBehavior="submit" onSubmitEditing={() => confirmationRef.current?.focus()} autoComplete="new-password" secureTextEntry placeholder="Nueva contraseña" value={newPassword} onChangeText={setNewPassword} editable={!busy} /><GymInput ref={confirmationRef} label="Confirmar contraseña" autoComplete="new-password" returnKeyType="go" onSubmitEditing={submitCreate} secureTextEntry placeholder="Confirmar contraseña" value={confirmPassword} onChangeText={setConfirmPassword} editable={!busy} /><Action title="Guardar contraseña" disabled={busy} onPress={submitCreate} /></View>}
          <Action title="Cancelar crear contraseña" disabled={busy} onPress={closeCreate} />
        </View>
      )}

      {reauthTarget && (
        <View accessibilityLabel="selector-de-reautenticacion" style={styles.panel}>
          <Text style={styles.helper}>Confirma tu identidad</Text>
          {reauthMethods.includes('LOCAL') && !passwordSelected && <Action title="Usar contraseña" disabled={busy} onPress={() => setPasswordSelected(true)} />}
          {reauthMethods.includes('GOOGLE') && <Action title="Continuar con Google" disabled={busy} onPress={useGoogle} />}
          {reauthMethods.includes('APPLE') && <Action title="Continuar con Apple" disabled={busy} onPress={useApple} />}
          {passwordSelected && (
            <View>
              <GymInput label="Contraseña actual" autoComplete="current-password" returnKeyType="go" onSubmitEditing={usePassword} secureTextEntry placeholder="Contraseña actual" value={password} onChangeText={setPassword} editable={!busy} />
              <Action title="Confirmar con contraseña" disabled={busy} onPress={usePassword} />
            </View>
          )}
          <Action title="Cancelar verificación" disabled={busy} onPress={closeReauthSelector} />
        </View>
      )}
      </>}
    </AccountFormScreen>
  );
}

function AppleAction({ busy, onPress }) {
  const [available, setAvailable] = useState(false);
  useEffect(() => { isAppleSignInAvailable().then(setAvailable); }, []);
  return available ? <Action title="Vincular Apple" disabled={busy} onPress={onPress} /> : <Text style={styles.helper}>Apple no disponible</Text>;
}


function Action({ title, ...props }) {
  return <GymButton variant="secondary" fullWidth {...props}><Text>{title}</Text></GymButton>;
}

const styles = StyleSheet.create({
  provider: { padding: 16, marginBottom: 16, backgroundColor: '#09090b', borderRadius: 16, borderWidth: 1, borderColor: '#27272a' },
  providerTitle: { color: '#fff', fontSize: 16, lineHeight: 24, fontWeight: '600', marginBottom: 8 },
  panel: { padding: 16, marginTop: 20, borderWidth: 1, borderColor: '#52525b', borderRadius: 16, backgroundColor: '#09090b' },
  heading: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 16 },
  helper: { color: '#a1a1aa', fontSize: 15, lineHeight: 23, marginBottom: 16 },
});
