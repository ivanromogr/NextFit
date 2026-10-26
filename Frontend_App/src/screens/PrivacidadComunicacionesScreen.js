import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Switch, Text, View } from 'react-native';
import { getConsents, updateMarketingConsent } from '../api/endpoints';
import AccountFormScreen, { FormMessage } from '../components/ui/AccountFormScreen';
import GymButton from '../components/ui/GymButton';
import { useAuth } from '../components/context/AuthContext';

const date = (value) => value && Number.isFinite(new Date(value).getTime()) ? new Date(value).toLocaleString() : 'No disponible';
const valid = data => data && [data.terms, data.privacy, data.marketing]
  .every(consent => consent && (consent.status === 'LEGACY_MISSING' || typeof consent.accepted === 'boolean'));
const renderConsent = (label, value) => value?.status === 'LEGACY_MISSING'
  ? `${label}: sin consentimiento histórico registrado`
  : `${label}: versión ${value?.version || 'No disponible'} · ${date(value?.acceptedAt)}`;

export default function PrivacidadComunicacionesScreen({ navigation }) {
  const { userId } = useAuth();
  return <ConsentPreferences key={userId || 'anonymous'} userId={userId} navigation={navigation} />;
}

function ConsentPreferences({ userId, navigation }) {
  const [consents, setConsents] = useState(null);
  const [loading, setLoading] = useState(Boolean(userId));
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const fetching = useRef(false);
  const submitting = useRef(false);
  const active = useRef(false);
  const load = useCallback(async () => {
    if (!userId || !active.current || fetching.current) return;
    fetching.current = true;
    setLoading(true);
    setError('');
    try {
      const { data } = await getConsents();
      if (!valid(data)) throw new Error('Invalid consent response');
      if (active.current) setConsents(data);
    } catch {
      if (active.current) setError('No se pudo cargar la configuración de privacidad.');
    } finally {
      fetching.current = false;
      if (active.current) setLoading(false);
    }
  }, [userId]);
  useEffect(() => {
    active.current = true;
    load();
    return () => { active.current = false; };
  }, [load]);

  const toggle = async (accepted) => {
    if (!userId || !active.current || !consents || submitting.current) return;
    submitting.current = true;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await updateMarketingConsent(accepted);
      if (!active.current) return;
      setConsents((current) => ({ ...current, marketing: { ...(current.marketing || {}), accepted } }));
      setMessage('Preferencia de marketing actualizada.');
    } catch {
      if (active.current) setError('No se pudo actualizar la preferencia de marketing.');
    } finally {
      submitting.current = false;
      if (active.current) setSaving(false);
    }
  };

  return (
    <AccountFormScreen title="Privacidad y comunicaciones" description="Consulta tus consentimientos y elige si quieres recibir comunicaciones de NextFit." backLabel="Volver a ajustes" onBack={navigation ? () => navigation.goBack() : undefined}>
      {loading ? <ActivityIndicator accessibilityLabel="Cargando privacidad" color="#FACC15" /> : null}
      {consents ? <>
        <Text style={styles.text}>{renderConsent('Términos de uso', consents.terms)}</Text>
        <Text style={styles.text}>{renderConsent('Política de privacidad', consents.privacy)}</Text>
        <View style={styles.row}>
          <Text style={[styles.text, styles.switchLabel]}>Comunicaciones de marketing</Text>
          <Switch accessibilityLabel="Comunicaciones de marketing" value={Boolean(consents.marketing?.accepted)} disabled={saving} onValueChange={toggle} trackColor={{ false: '#52525b', true: '#a16207' }} thumbColor={consents.marketing?.accepted ? '#FACC15' : '#e4e4e7'} />
        </View>
        <Text style={styles.text}>Marketing: {consents.marketing?.accepted ? 'activado' : 'desactivado'}</Text>
        {saving ? <Text accessibilityLiveRegion="polite" style={styles.text}>Guardando preferencia…</Text> : null}
      </> : null}
      <FormMessage>{error}</FormMessage>
      <FormMessage success>{message}</FormMessage>
      {userId && !consents && !loading ? <GymButton variant="secondary" onPress={load}>Reintentar</GymButton> : null}
      <GymButton variant="secondary" onPress={() => navigation?.navigate('Terms')}>Leer términos de uso</GymButton>
      <GymButton variant="secondary" onPress={() => navigation?.navigate('Privacy')}>Leer política de privacidad</GymButton>
    </AccountFormScreen>
  );
}
const styles = StyleSheet.create({
  text: { color: '#d4d4d8', fontSize: 16, lineHeight: 24, marginBottom: 14 },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 48, gap: 12 },
  switchLabel: { flex: 1, flexShrink: 1, marginBottom: 0 },
});
