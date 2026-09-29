import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { completeAppleOnboarding } from '../api/endpoints';
import { useAuth } from '../components/context/AuthContext';
import GymButton from '../components/ui/GymButton';
import GymInput from '../components/ui/GymInput';

const errorMessage = (code) => ({
  SOCIAL_EMAIL_REQUIRED: 'Apple no ha proporcionado un correo verificable para completar el registro. Intenta de nuevo o utiliza otro método de registro.',
  INVALID_PENDING_SOCIAL_AUTH: 'El proceso de registro ha caducado o ya no es válido. Vuelve a iniciar sesión con Apple.',
  SOCIAL_PROVIDER_MISMATCH: 'No se ha podido completar el registro con Apple. Vuelve a iniciar sesión.',
  EMAIL_ALREADY_IN_USE: 'Ya existe una cuenta de NextFit asociada a este correo. Inicia sesión con tu método actual.',
  APPLE_ACCOUNT_INACTIVE: 'No se ha podido completar el registro. Contacta con soporte si el problema continúa.',
  APPLE_AUTH_DISABLED: 'Inicio de sesión con Apple no disponible temporalmente.',
  INVALID_APPLE_TOKEN: 'No se ha podido verificar la autenticación con Apple. Inténtalo de nuevo.',
})[code] || 'No se ha podido completar el registro con Apple.';

export default function AppleOnboardingScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { login } = useAuth();
  const pendingToken = route.params?.pendingToken;
  const [form, setForm] = useState({ pendingToken: pendingToken || '', role: '', nombre: route.params?.nombre || '', apellido: route.params?.apellido || '', acceptTerms: false, acceptPrivacy: false, marketingConsent: false });
  const [loading, setLoading] = useState(false);

  if (!pendingToken) return <View style={styles.root}><Text style={styles.text}>El proceso de registro con Apple ha caducado.</Text><TouchableOpacity onPress={() => navigation.navigate('Login')}><Text style={styles.link}>Volver a iniciar sesión</Text></TouchableOpacity></View>;
  const set = (key, value) => setForm({ ...form, [key]: value });
  const submit = async () => {
    if (!form.role) return Alert.alert('Perfil requerido', 'Selecciona el perfil de tu cuenta.');
    if (!form.acceptTerms || !form.acceptPrivacy) return Alert.alert('Consentimiento requerido', 'Debes aceptar los Términos y la Política de privacidad.');
    setLoading(true);
    try {
      const { data } = await completeAppleOnboarding(form);
      await login(data);
    } catch (error) {
      const code = error?.response?.data?.code;
      Alert.alert('Apple', errorMessage(code));
      if (code === 'INVALID_PENDING_SOCIAL_AUTH') navigation.navigate('Login');
    } finally { setLoading(false); }
  };

  return <View style={styles.root}>
    <Text style={styles.title}>COMPLETA TU CUENTA</Text><Text style={styles.text}>Elige tu perfil para continuar.</Text>
    <View style={styles.roles}><TouchableOpacity accessibilityRole="button" onPress={() => set('role', 'CLIENTE')}><Text style={form.role === 'CLIENTE' ? styles.selected : styles.role}>ATLETA</Text></TouchableOpacity><TouchableOpacity accessibilityRole="button" onPress={() => set('role', 'ENTRENADOR')}><Text style={form.role === 'ENTRENADOR' ? styles.selected : styles.role}>COACH</Text></TouchableOpacity></View>
    <GymInput label="Nombre" value={form.nombre} onChangeText={value => set('nombre', value)} /><GymInput label="Apellido" value={form.apellido} onChangeText={value => set('apellido', value)} />
    <TouchableOpacity onPress={() => set('acceptTerms', !form.acceptTerms)}><Text style={styles.text}>{form.acceptTerms ? '☑' : '☐'} Acepto los Términos de uso</Text></TouchableOpacity><TouchableOpacity onPress={() => navigation.navigate('Terms')}><Text style={styles.link}>Ver Términos de uso</Text></TouchableOpacity>
    <TouchableOpacity onPress={() => set('acceptPrivacy', !form.acceptPrivacy)}><Text style={styles.text}>{form.acceptPrivacy ? '☑' : '☐'} Acepto la Política de privacidad</Text></TouchableOpacity><TouchableOpacity onPress={() => navigation.navigate('Privacy')}><Text style={styles.link}>Ver Política de privacidad</Text></TouchableOpacity>
    <TouchableOpacity onPress={() => set('marketingConsent', !form.marketingConsent)}><Text style={styles.text}>{form.marketingConsent ? '☑' : '☐'} Comunicaciones opcionales</Text></TouchableOpacity>
    <GymButton fullWidth loading={loading} onPress={submit}>CONTINUAR</GymButton>
  </View>;
}
const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: '#09090b', padding: 24, justifyContent: 'center', gap: 14 }, title: { color: '#fff', fontSize: 28, fontWeight: '800' }, text: { color: '#d4d4d8' }, link: { color: '#FACC15' }, roles: { flexDirection: 'row', gap: 16 }, role: { color: '#fff', borderWidth: 1, borderColor: '#52525b', padding: 12 }, selected: { color: '#111', backgroundColor: '#FACC15', padding: 12, fontWeight: '800' } });
