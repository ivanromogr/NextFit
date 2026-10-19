import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { getSessions, logoutAllSessions, revokeSession } from '../api/endpoints';
import { useAuth } from '../components/context/AuthContext';
import GymButton from '../components/ui/GymButton';
import { FormMessage } from '../components/ui/AccountFormScreen';

const date = (value) => value ? new Date(value).toLocaleString() : 'No disponible';
export default function SesionesActivasScreen({ navigation }) {
  const [sessions, setSessions] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const fetching = useRef(false);
  const submitting = useRef(false);
  const confirming = useRef(false);
  const { clearLocalSession } = useAuth();

  const load = useCallback(async () => {
    if (fetching.current) return;
    fetching.current = true;
    setLoading(true);
    setError('');
    try {
      const response = await getSessions();
      setSessions(Array.isArray(response.data) ? response.data : []);
    } catch {
      setError('No se pudieron cargar las sesiones activas.');
    } finally {
      fetching.current = false;
      setLoading(false);
    }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const revoke = async (id) => {
    if (submitting.current) return;
    submitting.current = true;
    setBusy(id);
    setError('');
    try {
      await revokeSession(id);
      setSessions((current) => current.filter((session) => session.familyId !== id));
      await load();
    } catch {
      setError('No se pudo cerrar esa sesión. Inténtalo de nuevo.');
    } finally {
      submitting.current = false;
      setBusy(null);
    }
  };
  const closeAll = async () => {
    if (submitting.current) return;
    submitting.current = true;
    confirming.current = false;
    setBusy('all');
    setError('');
    try {
      await logoutAllSessions();
      await clearLocalSession();
    } catch {
      setError('No se pudieron cerrar todas las sesiones. Inténtalo de nuevo.');
    } finally {
      submitting.current = false;
      setBusy(null);
    }
  };
  const logoutAll = () => {
    if (submitting.current || confirming.current) return;
    confirming.current = true;
    Alert.alert('Cerrar todas las sesiones', 'Tendrás que iniciar sesión de nuevo.', [
      { text: 'Cancelar', style: 'cancel', onPress: () => { confirming.current = false; } },
      { text: 'Cerrar todas', style: 'destructive', onPress: closeAll },
    ], { cancelable: true, onDismiss: () => { confirming.current = false; } });
  };

  return (
    <SafeAreaView style={styles.screen}>
      <FlatList
        style={styles.list}
        contentContainerStyle={styles.content}
        data={sessions}
        keyExtractor={(item) => item.familyId}
        ListHeaderComponent={<>
          {navigation ? <TouchableOpacity accessibilityRole="button" style={styles.back} onPress={() => navigation.goBack()}><Text style={styles.link}>Volver a ajustes</Text></TouchableOpacity> : null}
          <Text accessibilityRole="header" style={styles.title}>Sesiones activas</Text>
          <Text style={styles.description}>Revisa dónde has iniciado sesión y cierra los accesos que ya no uses.</Text>
          <FormMessage>{error}</FormMessage>
          <GymButton variant="secondary" loading={loading} disabled={busy !== null} onPress={load}>Actualizar</GymButton>
        </>}
        ListEmptyComponent={loading ? <ActivityIndicator accessibilityLabel="Cargando sesiones" color="#FACC15" /> : !error ? <Text style={styles.description}>No hay sesiones activas.</Text> : null}
        renderItem={({ item }) => <View style={styles.card}>
          <Text style={styles.sessionTitle}>{item.clientType === 'MOBILE' ? 'Móvil' : 'Web'}</Text>
          <Text style={styles.details}>Inicio: {date(item.createdAt)}</Text>
          <Text style={styles.details}>Expira: {date(item.expiresAt)}</Text>
          <GymButton variant="secondary" loading={busy === item.familyId} disabled={busy !== null || loading} onPress={() => revoke(item.familyId)}>Cerrar sesión</GymButton>
        </View>}
        ListFooterComponent={<GymButton variant="danger" loading={busy === 'all'} disabled={busy !== null} onPress={logoutAll}>Cerrar todas las sesiones</GymButton>}
      />
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#09090b' },
  list: { width: '100%', maxWidth: 600, alignSelf: 'center' },
  content: { flexGrow: 1, padding: 20, gap: 16 },
  back: { minHeight: 44, justifyContent: 'center', marginBottom: 16 },
  link: { color: '#FACC15', fontSize: 15 },
  title: { color: '#fff', fontSize: 26, fontWeight: '800', marginBottom: 12 },
  description: { color: '#a1a1aa', fontSize: 15, lineHeight: 23, marginBottom: 16 },
  card: { padding: 20, backgroundColor: '#18181b', borderWidth: 1, borderColor: '#27272a', borderRadius: 20 },
  sessionTitle: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 12 },
  details: { color: '#a1a1aa', fontSize: 14, lineHeight: 22 },
});
