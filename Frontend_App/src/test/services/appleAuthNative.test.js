import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateAppleNonce, isAppleSignInAvailable, startAppleSignIn } from '../../services/appleAuthNative';

describe('appleAuthNative', () => {
  const originalPlatform = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.EXPO_PUBLIC_APPLE_AUTH_ENABLED = 'true';
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
    AppleAuthentication.isAvailableAsync.mockResolvedValue(true);
    global.crypto = { getRandomValues: (bytes) => bytes.forEach((_, index) => { bytes[index] = index + 1; }) };
  });

  afterEach(() => Object.defineProperty(Platform, 'OS', { configurable: true, value: originalPlatform }));

  it('solo está disponible en iOS cuando la flag y el SDK lo permiten', async () => {
    await expect(isAppleSignInAvailable()).resolves.toBe(true);
    AppleAuthentication.isAvailableAsync.mockResolvedValue(false);
    await expect(isAppleSignInAvailable()).resolves.toBe(false);
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
    await expect(isAppleSignInAvailable()).resolves.toBe(false);
    process.env.EXPO_PUBLIC_APPLE_AUTH_ENABLED = 'false';
    await expect(isAppleSignInAvailable()).resolves.toBe(false);
  });

  it('genera nonce no vacío y lo envía a Apple junto a scopes mínimos', async () => {
    AppleAuthentication.signInAsync.mockResolvedValue({ identityToken: 'apple-token', fullName: { givenName: 'Ada', familyName: 'Lovelace' }, email: 'ada@privaterelay.appleid.com' });
    const result = await startAppleSignIn();
    expect(result).toEqual({ identityToken: 'apple-token', nonce: expect.any(String), user: { name: { firstName: 'Ada', lastName: 'Lovelace' }, email: 'ada@privaterelay.appleid.com' } });
    expect(result.nonce).not.toHaveLength(0);
    expect(AppleAuthentication.signInAsync).toHaveBeenCalledWith({ requestedScopes: [0, 1], nonce: result.nonce });
    expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });

  it('genera nonces distintos', () => {
    let next = 0;
    global.crypto = { getRandomValues: (bytes) => bytes.forEach((_, index) => { bytes[index] = ++next + index; }) };
    expect(generateAppleNonce()).not.toBe(generateAppleNonce());
  });

  it('rechaza identityToken ausente y cancelación de forma controlada', async () => {
    AppleAuthentication.signInAsync.mockResolvedValue({ identityToken: null });
    await expect(startAppleSignIn()).rejects.toThrow('APPLE_IDENTITY_TOKEN_MISSING');
    AppleAuthentication.signInAsync.mockRejectedValue({ code: 'ERR_REQUEST_CANCELED' });
    await expect(startAppleSignIn()).rejects.toThrow('APPLE_AUTH_CANCELLED');
  });
});
