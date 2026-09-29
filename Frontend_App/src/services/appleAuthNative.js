import 'react-native-get-random-values';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';

const enabled = () => process.env.EXPO_PUBLIC_APPLE_AUTH_ENABLED === 'true';

export const generateAppleNonce = () => {
  const bytes = new Uint8Array(32);
  global.crypto?.getRandomValues(bytes);
  if (!bytes.some(Boolean)) throw new Error('APPLE_CRYPTO_UNAVAILABLE');
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
};

export const isAppleSignInAvailable = async () => {
  if (!enabled() || Platform.OS !== 'ios') return false;
  return AppleAuthentication.isAvailableAsync();
};

export const isAppleSignInCancel = (error) => error?.code === 'ERR_REQUEST_CANCELED';

export const startAppleSignIn = async () => {
  if (!enabled()) throw new Error('APPLE_AUTH_DISABLED');
  if (Platform.OS !== 'ios' || !(await AppleAuthentication.isAvailableAsync())) throw new Error('APPLE_AUTH_UNAVAILABLE');

  const nonce = generateAppleNonce();
  let credential;
  try {
    credential = await AppleAuthentication.signInAsync({
      requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
      nonce,
    });
  } catch (error) {
    if (isAppleSignInCancel(error)) throw new Error('APPLE_AUTH_CANCELLED');
    throw new Error('APPLE_AUTH_FAILED');
  }

  if (!credential?.identityToken) throw new Error('APPLE_IDENTITY_TOKEN_MISSING');
  return {
    identityToken: credential.identityToken,
    nonce,
    user: {
      name: credential.fullName ? { firstName: credential.fullName.givenName || '', lastName: credential.fullName.familyName || '' } : undefined,
      email: credential.email || undefined,
    },
  };
};
