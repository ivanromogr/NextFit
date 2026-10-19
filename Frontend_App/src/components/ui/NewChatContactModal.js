import React, { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { buscarUsuarioPorEmail } from '../../api/endpoints';
import GymInput from './GymInput';
import GymButton from './GymButton';
import { FormMessage } from './AccountFormScreen';

export default function NewChatContactModal({ visible, onClose, onAdd, ownUserId }) {
  const [email, setEmail] = useState('');
  const [contact, setContact] = useState(null);
  const [alias, setAlias] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const version = useRef(0);
  const searching = useRef(false);
  const adding = useRef(false);

  useEffect(() => {
    if (!visible) {
      setEmail(''); setContact(null); setAlias(''); setError(''); setLoading(false);
      searching.current = false; adding.current = false;
    }
    return () => { version.current += 1; };
  }, [visible]);

  const close = () => { version.current += 1; onClose(); };
  const search = async () => {
    if (searching.current) return;
    const normalized = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) return setError('Introduce un correo electrónico válido.');
    const request = ++version.current;
    searching.current = true;
    setLoading(true); setError(''); setContact(null);
    try {
      const found = await buscarUsuarioPorEmail(normalized);
      if (request !== version.current) return;
      if (!found?.id) return setError('No se encontró un contacto con ese correo.');
      if (String(found.id) === String(ownUserId)) return setError('No puedes añadir tu propia cuenta como contacto.');
      setContact(found);
      setAlias([found.nombre, found.apellido].filter(Boolean).join(' '));
    } catch (requestError) {
      if (request === version.current) setError(requestError.response?.status === 404
        ? 'No se encontró un contacto con ese correo.'
        : 'No se pudo buscar el contacto. Comprueba la conexión e inténtalo de nuevo.');
    } finally {
      if (request === version.current) { searching.current = false; setLoading(false); }
    }
  };
  const add = () => {
    if (!contact || adding.current) return;
    adding.current = true;
    onAdd({ ...contact, alias: alias.trim() });
    close();
  };

  return <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
    <SafeAreaView style={styles.overlay}>
      <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.card} accessibilityViewIsModal>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
            <Text accessibilityRole="header" style={styles.title}>Nuevo contacto</Text>
            {!contact ? <>
              <GymInput label="Correo del contacto" placeholder="Email del usuario" value={email} onChangeText={(value) => { setEmail(value); setError(''); }} keyboardType="email-address" autoComplete="email" autoCorrect={false} editable={!loading} returnKeyType="search" onSubmitEditing={search} />
              <FormMessage>{error}</FormMessage>
              <GymButton fullWidth loading={loading} onPress={search}>Buscar</GymButton>
            </> : <>
              <Text style={styles.description}>Contacto encontrado. Puedes guardar un nombre para reconocerlo en tus chats.</Text>
              <GymInput label="Nombre del contacto" placeholder="Apodo (opcional)" value={alias} onChangeText={setAlias} maxLength={80} returnKeyType="done" onSubmitEditing={add} />
              <GymButton fullWidth onPress={add}>Añadir a mis chats</GymButton>
            </>}
            <GymButton fullWidth variant="secondary" onPress={close}>Cancelar</GymButton>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  </Modal>;
}
const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)' },
  keyboard: { flex: 1, justifyContent: 'center', padding: 20 },
  card: { width: '100%', maxWidth: 480, maxHeight: '100%', alignSelf: 'center', backgroundColor: '#18181b', borderRadius: 24, borderWidth: 1, borderColor: '#27272a' },
  content: { padding: 24 },
  title: { color: '#fff', fontSize: 24, fontWeight: '800', marginBottom: 24 },
  description: { color: '#a1a1aa', fontSize: 15, lineHeight: 23, marginBottom: 20 },
});
