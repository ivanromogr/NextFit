import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { authenticateWithApple } from '../../api/endpoints';
import { isAppleSignInAvailable, startAppleSignIn } from '../../services/appleAuthNative';

const linkRequired = 'Ya existe una cuenta de NextFit asociada a este correo. Inicia sesión con tu método actual y podrás vincular Apple desde la configuración de tu cuenta.';
const messageFor = (code) => ({
  SOCIAL_EMAIL_REQUIRED: 'Apple no ha proporcionado un correo verificable para completar el registro. Intenta de nuevo o utiliza otro método de registro.',
  APPLE_AUTH_DISABLED: 'Inicio de sesión con Apple no disponible temporalmente.',
  INVALID_APPLE_TOKEN: 'No se ha podido verificar la autenticación con Apple. Inténtalo de nuevo.',
  APPLE_ACCOUNT_INACTIVE: 'No se ha podido iniciar sesión con Apple. Contacta con soporte si el problema continúa.',
})[code] || 'No se ha podido iniciar sesión con Apple.';

export default function AppleSignInButton({ onAuthenticated, onOnboarding, onLinkRequired, onError }) {
  const [available, setAvailable] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    isAppleSignInAvailable().then(value => mounted && setAvailable(Boolean(value))).catch(() => mounted && setAvailable(false));
    return () => { mounted = false; };
  }, []);

  const handleAppleSignIn = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const { identityToken, nonce, user } = await startAppleSignIn();
      const { data } = await authenticateWithApple(identityToken, nonce);
      if (data?.accessToken && data?.user) await onAuthenticated?.(data);
      else if (data?.status === 'LINK_REQUIRED') onLinkRequired?.(linkRequired);
      else if (data?.status === 'ONBOARDING_REQUIRED' && data.pendingToken) {
        onOnboarding?.({ pendingToken: data.pendingToken, nombre: user?.name?.firstName || '', apellido: user?.name?.lastName || '' });
      } else onError?.(messageFor(data?.code));
    } catch (error) {
      if (error?.message !== 'APPLE_AUTH_CANCELLED') onError?.(messageFor(error?.response?.data?.code));
    } finally {
      setLoading(false);
    }
  };

  if (!available) return null;
  return <View style={styles.container} pointerEvents={loading ? 'none' : 'auto'}>
    <AppleAuthentication.AppleAuthenticationButton
      buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
      buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
      cornerRadius={10}
      style={styles.button}
      onPress={handleAppleSignIn}
    />
    {loading && <ActivityIndicator style={styles.loading} color="#FACC15" />}
  </View>;
}

const styles = StyleSheet.create({ container: { marginTop: 10, minHeight: 44 }, button: { width: '100%', height: 44 }, loading: { position: 'absolute', right: 12, top: 12 } });
