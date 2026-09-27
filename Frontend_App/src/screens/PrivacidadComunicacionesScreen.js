import React, { useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { getConsents, updateMarketingConsent } from '../api/endpoints';

const date = (value) => value ? new Date(value).toLocaleString() : 'No disponible';
const renderConsent = (label, value) => value?.status === 'LEGACY_MISSING'
  ? `${label}: sin consentimiento histórico registrado`
  : `${label}: versión ${value?.version || 'No disponible'} · ${date(value?.acceptedAt)}`;

export default function PrivacidadComunicacionesScreen() {
  const [consents, setConsents] = useState(null);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => { getConsents().then(({ data }) => setConsents(data)).catch(() => setMessage('No se pudo cargar la configuración de privacidad.')); }, []);
  const toggle = async (accepted) => {
    setSaving(true); setMessage('');
    try { await updateMarketingConsent(accepted); setConsents((current) => ({ ...current, marketing: { ...(current?.marketing || {}), accepted } })); setMessage('Preferencia de marketing actualizada.'); }
    catch { setMessage('No se pudo actualizar la preferencia de marketing.'); }
    finally { setSaving(false); }
  };
  return <SafeAreaView style={styles.container}><ScrollView contentContainerStyle={styles.content}>
    <Text style={styles.title}>Privacidad y comunicaciones</Text>
    <Text style={styles.text}>{renderConsent('Términos de uso', consents?.terms)}</Text>
    <Text style={styles.text}>{renderConsent('Política de privacidad', consents?.privacy)}</Text>
    <View style={styles.row}><Text style={styles.text}>Comunicaciones de marketing</Text><Switch value={Boolean(consents?.marketing?.accepted)} disabled={!consents || saving} onValueChange={toggle} /></View>
    {consents?.marketing && <Text style={styles.text}>Marketing: {consents.marketing.accepted ? 'activado' : 'desactivado'}</Text>}
    {!!message && <Text accessibilityRole="alert" style={styles.message}>{message}</Text>}
  </ScrollView></SafeAreaView>;
}
const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: '#09090b' }, content: { padding: 24 }, title: { color: '#fff', fontSize: 28, fontWeight: '700', marginBottom: 20 }, text: { color: '#d4d4d8', fontSize: 16, lineHeight: 24, marginBottom: 14 }, row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, message: { color: '#FACC15', marginTop: 12 } });
