import React from 'react';
import { StyleSheet, Text } from 'react-native';
import AccountFormScreen from '../components/ui/AccountFormScreen';

export default function PrivacyScreen({ navigation }) {
  return <AccountFormScreen title="Política de privacidad" backLabel="Volver" onBack={navigation ? () => navigation.goBack() : undefined}>
    <Text style={styles.text}>Contenido provisional pendiente de revisión legal antes de producción.</Text>
  </AccountFormScreen>;
}
const styles = StyleSheet.create({ text: { color: '#d4d4d8', fontSize: 16, lineHeight: 24 } });
