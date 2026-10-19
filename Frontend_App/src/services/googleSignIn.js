import { Platform } from 'react-native';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';

let configured = false;
export function configureGoogleSignIn() {
  if (configured) return;
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  if (!webClientId || (Platform.OS === 'ios' && !iosClientId)) return;
  GoogleSignin.configure({ webClientId, iosClientId: iosClientId || undefined, offlineAccess: false });
  configured = true;
}
export async function getGoogleIdToken() {
  configureGoogleSignIn();
  if (!configured) throw new Error('GOOGLE_NOT_CONFIGURED');
  if (Platform.OS === 'android') {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  }
  const result = await GoogleSignin.signIn();
  if (result?.type === 'cancelled') return null;
  const idToken = result?.data?.idToken || result?.idToken;
  if (!idToken) throw new Error('GOOGLE_NO_ID_TOKEN');
  return idToken;
}
export function isGoogleCancel(error) {
  return error?.code === statusCodes.SIGN_IN_CANCELLED || error?.code === 'SIGN_IN_CANCELLED';
}
