import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Client } from '@stomp/stompjs';
import { Plus, Search, User } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { getAccessToken } from '../context/authSession';
import { getCliente, obtenerClientesEntrenador, obtenerContactosChat } from '../../api/endpoints';
import { WS_URL } from '../../config/environment';
import { contactName, filterChatContacts, mergeChatContacts } from '../../utils/chatContacts';
import NewChatContactModal from '../ui/NewChatContactModal';
import GymButton from '../ui/GymButton';
import { FormMessage } from '../ui/AccountFormScreen';

export default function ChatContactsScreen({ role }) {
  const { userId } = useAuth();
  const navigation = useNavigation();
  const [contacts, setContacts] = useState([]);
  const [teamIds, setTeamIds] = useState(new Set());
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cacheError, setCacheError] = useState('');
  const [cacheReady, setCacheReady] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [unread, setUnread] = useState(new Set());
  const opened = useRef(null);
  const contactsRef = useRef(contacts);
  contactsRef.current = contacts;
  const requestVersion = useRef(0);
  const inFlight = useRef(null);
  const owner = useRef(null);
  const loadedCache = useRef(null);
  const cacheKey = role === 'ENTRENADOR' ? `contactos_chat_entrenador_${userId}` : `contactos_chat_${userId}`;

  useEffect(() => {
    let active = true;
    owner.current = cacheKey;
    loadedCache.current = null;
    setContacts([]);
    setTeamIds(new Set());
    setUnread(new Set());
    opened.current = null;
    setQuery('');
    setShowModal(false);
    setCacheReady(false);
    setCacheError('');
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(cacheKey);
        const saved = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(saved)) throw new Error('INVALID_CONTACT_CACHE');
        if (active) setContacts((current) => mergeChatContacts(saved, current));
      } catch {
        if (active) setCacheError('No se pudieron recuperar los contactos guardados en este dispositivo.');
      } finally {
        if (active) { loadedCache.current = cacheKey; setCacheReady(true); }
      }
    })();
    return () => { active = false; };
  }, [cacheKey]);

  useEffect(() => {
    if (!cacheReady || !userId || loadedCache.current !== cacheKey) return;
    let active = true;
    AsyncStorage.setItem(cacheKey, JSON.stringify(contacts)).catch(() => {
      if (active) setCacheError('No se pudieron guardar los contactos en este dispositivo.');
    });
    return () => { active = false; };
  }, [contacts, cacheKey, cacheReady, userId]);

  const load = useCallback(async (showLoading = true) => {
    if (!userId || inFlight.current === cacheKey) return;
    const request = ++requestVersion.current;
    inFlight.current = cacheKey;
    if (showLoading) setLoading(true);
    setError('');
    try {
      const [team, history] = await Promise.all([
        role === 'ENTRENADOR' ? obtenerClientesEntrenador(userId, { throwOnError: true }) : getCliente(userId),
        obtenerContactosChat(),
      ]);
      if (request !== requestVersion.current) return;
      const assigned = role === 'ENTRENADOR' ? team.map((item) => item.cliente || item) : team?.entrenador ? [team.entrenador] : [];
      setTeamIds(new Set(assigned.map((item) => String(item.id))));
      setContacts((current) => mergeChatContacts(current, assigned, history).filter((item) => String(item.id) !== String(userId)));
    } catch {
      if (request === requestVersion.current) setError('No se pudieron cargar los contactos. Comprueba la conexión e inténtalo de nuevo.');
    } finally {
      if (request === requestVersion.current) { inFlight.current = null; setLoading(false); }
    }
  }, [userId, role, cacheKey]);

  useFocusEffect(useCallback(() => {
    if (opened.current) {
      const id = opened.current;
      setUnread((current) => { const next = new Set(current); next.delete(id); return next; });
      opened.current = null;
    }
    load();
  }, [load]));

  useEffect(() => {
    if (!userId) return;
    let active = true;
    const client = new Client({
      brokerURL: WS_URL,
      beforeConnect: async () => { client.connectHeaders = { Authorization: `Bearer ${await getAccessToken() || ''}` }; },
      onConnect: () => {
        if (!active) return;
        client.subscribe('/user/queue/mensajes', (payload) => {
          if (!active) return;
          let message;
          try { message = JSON.parse(payload.body); } catch { return; }
          if (!message || typeof message !== 'object') return;
          if (message.type || !message.remitenteId || String(message.remitenteId) === String(userId)) return;
          const sender = String(message.remitenteId);
          if (opened.current !== sender) setUnread((current) => new Set(current).add(sender));
          if (!contactsRef.current.some((item) => String(item.id) === sender)) load(false);
        });
      },
    });
    client.activate();
    return () => { active = false; client.deactivate(); };
  }, [userId, load]);

  useEffect(() => () => { requestVersion.current += 1; inFlight.current = null; }, []);

  const open = (contact) => {
    const id = String(contact.id);
    opened.current = id;
    setUnread((current) => { const next = new Set(current); next.delete(id); return next; });
    navigation.navigate('PantallaChatIndividual', { destinatarioId: contact.id, nombreDestinatario: contactName(contact), fotoDestinatario: contact.fotoPerfil });
  };
  const visibleContacts = filterChatContacts((owner.current === cacheKey ? contacts : []).filter((item) => String(item.id) !== String(userId)), query);

  return <SafeAreaView style={styles.screen}>
    <View style={styles.header}>
      <Text accessibilityRole="header" style={styles.title}>Mensajes</Text>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Nuevo contacto" style={styles.add} onPress={() => setShowModal(true)}><Plus size={24} color="#09090b" /></TouchableOpacity>
    </View>
    <View style={styles.search}>
      <Search size={20} color="#a1a1aa" />
      <TextInput accessibilityLabel="Buscar conversaciones" style={styles.input} value={query} onChangeText={setQuery} placeholder="Buscar chats..." placeholderTextColor="#71717a" autoCorrect={false} returnKeyType="search" />
    </View>
    <FlatList
      data={visibleContacts}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={styles.list}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      ListHeaderComponent={<>
        <FormMessage>{cacheError}</FormMessage>
        <FormMessage>{error}</FormMessage>
        {error ? <GymButton variant="secondary" loading={loading} onPress={() => load()}>Reintentar</GymButton> : null}
        {loading ? <ActivityIndicator accessibilityLabel="Cargando contactos" color="#FACC15" style={styles.spinner} /> : null}
      </>}
      ListEmptyComponent={!loading && !error ? <Text style={styles.empty}>{query.trim() ? 'No hay conversaciones que coincidan con tu búsqueda.' : 'Aún no tienes contactos. Pulsa + para empezar un chat.'}</Text> : null}
      renderItem={({ item }) => {
        const hasUnread = unread.has(String(item.id));
        return <TouchableOpacity accessibilityRole="button" accessibilityLabel={`${contactName(item)}${hasUnread ? ', nuevos mensajes' : ''}`} style={styles.contact} onPress={() => open(item)}>
          {item.fotoPerfil ? <Image source={{ uri: item.fotoPerfil }} style={styles.avatar} /> : <View style={[styles.avatar, styles.placeholder]}><User size={24} color="#FACC15" /></View>}
          <View style={styles.contactText}>
            <Text style={styles.name}>{contactName(item)}</Text>
            <Text style={styles.subtitle}>{hasUnread ? 'Nuevos mensajes' : teamIds.has(String(item.id)) ? role === 'ENTRENADOR' ? 'Atleta de tu equipo' : 'Tu entrenador' : 'Contacto de NextFit'}</Text>
          </View>
        </TouchableOpacity>;
      }}
    />
    <NewChatContactModal visible={showModal && owner.current === cacheKey} ownUserId={userId} onClose={() => setShowModal(false)} onAdd={(contact) => { setContacts((current) => mergeChatContacts(current, [contact])); open(contact); }} />
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#09090b' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 16, justifyContent: 'space-between', padding: 20 },
  title: { color: '#fff', fontSize: 30, fontWeight: '800', flexShrink: 1 },
  add: { minWidth: 44, minHeight: 44, borderRadius: 22, backgroundColor: '#FACC15', alignItems: 'center', justifyContent: 'center' },
  search: { marginHorizontal: 20, marginBottom: 12, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#27272a', borderRadius: 14, backgroundColor: '#18181b' },
  input: { flex: 1, minWidth: 0, minHeight: 52, paddingVertical: 14, color: '#fff', fontSize: 16 },
  list: { paddingHorizontal: 20, paddingBottom: 20, flexGrow: 1 },
  spinner: { marginVertical: 16 },
  empty: { color: '#a1a1aa', fontSize: 16, lineHeight: 24, paddingVertical: 24, textAlign: 'center' },
  contact: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, marginBottom: 10, backgroundColor: '#18181b', borderRadius: 16, minHeight: 76 },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  placeholder: { backgroundColor: '#27272a', alignItems: 'center', justifyContent: 'center' },
  contactText: { flex: 1, minWidth: 0 },
  name: { color: '#fff', fontSize: 17, fontWeight: '700' },
  subtitle: { color: '#a1a1aa', fontSize: 14, marginTop: 5 },
});
