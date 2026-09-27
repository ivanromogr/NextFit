import React, { useCallback, useState } from 'react';
import { Alert, FlatList, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getSessions, logoutAllSessions, revokeSession } from '../api/endpoints';
import { useAuth } from '../components/context/AuthContext';

const date = (value) => value ? new Date(value).toLocaleString() : 'No disponible';
export default function SesionesActivasScreen() {
  const [sessions, setSessions] = useState([]); const [error, setError] = useState('');
  const { clearLocalSession } = useAuth();
  const load = async () => { try { const response = await getSessions(); setSessions(Array.isArray(response.data) ? response.data : []); } catch { setError('No se pudieron cargar las sesiones activas'); } };
  useFocusEffect(useCallback(() => { load(); }, []));
  const revoke = async (id) => { try { await revokeSession(id); await load(); } catch { setError('No se pudo cerrar esa sesión'); } };
  const logoutAll = () => Alert.alert('Cerrar todas las sesiones', 'Tendrás que iniciar sesión de nuevo.', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Cerrar todas', style: 'destructive', onPress: async () => { try { await logoutAllSessions(); await clearLocalSession(); } catch { setError('No se pudieron cerrar todas las sesiones'); } } }]);
  return <View><Text>Sesiones activas</Text>{error ? <Text>{error}</Text> : null}<FlatList data={sessions} keyExtractor={(item) => item.familyId} renderItem={({ item }) => <View><Text>{item.clientType === 'MOBILE' ? 'Móvil' : 'Web'}</Text><Text>Inicio: {date(item.createdAt)}</Text><Text>Expira: {date(item.expiresAt)}</Text><TouchableOpacity onPress={() => revoke(item.familyId)}><Text>Cerrar sesión</Text></TouchableOpacity></View>} /><TouchableOpacity onPress={logoutAll}><Text>Cerrar todas las sesiones</Text></TouchableOpacity></View>;
}
