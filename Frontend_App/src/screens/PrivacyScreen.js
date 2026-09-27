import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text } from 'react-native';

export default function PrivacyScreen() {
  return <SafeAreaView style={styles.container}><ScrollView contentContainerStyle={styles.content}>
    <Text style={styles.title}>Política de privacidad</Text>
    <Text style={styles.text}>Contenido provisional pendiente de revisión legal antes de producción.</Text>
  </ScrollView></SafeAreaView>;
}
const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: '#09090b' }, content: { padding: 24 }, title: { color: '#fff', fontSize: 28, fontWeight: '700', marginBottom: 16 }, text: { color: '#d4d4d8', fontSize: 16, lineHeight: 24 } });
