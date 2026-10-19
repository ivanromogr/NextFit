const { Platform } = require('react-native');
const sdk = require('@react-native-google-signin/google-signin');

const load = () => {
  let service;
  jest.isolateModules(() => { service = require('../../services/googleSignIn'); });
  return service;
};
const originalPlatform = Platform.OS;
const originalIosId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const originalWebId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
afterEach(() => {
  Platform.OS = originalPlatform;
  if (originalIosId === undefined) delete process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  else process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID = originalIosId;
  if (originalWebId === undefined) delete process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  else process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID = originalWebId;
});
beforeEach(() => { jest.clearAllMocks(); Platform.OS = 'android'; process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID = 'web-client.apps.googleusercontent.com'; });

describe('Google nativo: credencial para Android', () => {
  it('falla antes de abrir Google si falta el cliente web', async () => {
    delete process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
    await expect(load().getGoogleIdToken()).rejects.toThrow('GOOGLE_NOT_CONFIGURED');
    expect(sdk.GoogleSignin.signIn).not.toHaveBeenCalled();
  });
  it('configura el SDK sin acceso offline y devuelve el ID token del SDK actual', async () => {
    sdk.GoogleSignin.signIn.mockResolvedValue({ type: 'success', data: { idToken: 'opaque-id-token' } });
    const service = load();
    await expect(service.getGoogleIdToken()).resolves.toBe('opaque-id-token');
    await service.getGoogleIdToken();
    expect(sdk.GoogleSignin.configure).toHaveBeenCalledTimes(1);
    expect(sdk.GoogleSignin.configure).toHaveBeenCalledWith(expect.objectContaining({ webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID, offlineAccess: false }));
    expect(sdk.GoogleSignin.hasPlayServices).toHaveBeenCalledWith({ showPlayServicesUpdateDialog: true });
  });
  it('trata la cancelación como ausencia de credencial', async () => {
    sdk.GoogleSignin.signIn.mockResolvedValue({ type: 'cancelled' });
    await expect(load().getGoogleIdToken()).resolves.toBeNull();
  });
  it('rechaza respuestas sin ID token', async () => {
    sdk.GoogleSignin.signIn.mockResolvedValue({ type: 'success', data: {} });
    await expect(load().getGoogleIdToken()).rejects.toThrow('GOOGLE_NO_ID_TOKEN');
  });
  it('no abre el login si Google Play Services lanza un error', async () => {
    sdk.GoogleSignin.hasPlayServices.mockRejectedValueOnce(new Error('Play Services unavailable'));
    await expect(load().getGoogleIdToken()).rejects.toThrow('Play Services unavailable');
    expect(sdk.GoogleSignin.signIn).not.toHaveBeenCalled();
  });
});

 describe('Google iOS', () => {
  it('requires an iOS OAuth client before opening the native SDK', async () => {
    Platform.OS = 'ios';
    delete process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
    await expect(load().getGoogleIdToken()).rejects.toThrow('GOOGLE_NOT_CONFIGURED');
    expect(sdk.GoogleSignin.signIn).not.toHaveBeenCalled();
  });
  it('uses the iOS client without checking Android Play Services', async () => {
    Platform.OS = 'ios';
    process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID = 'ios-client.apps.googleusercontent.com';
    sdk.GoogleSignin.signIn.mockResolvedValue({ type: 'success', data: { idToken: 'ios-token' } });
    await expect(load().getGoogleIdToken()).resolves.toBe('ios-token');
    expect(sdk.GoogleSignin.hasPlayServices).not.toHaveBeenCalled();
    expect(sdk.GoogleSignin.configure).toHaveBeenCalledWith(expect.objectContaining({ iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID }));
  });
});
