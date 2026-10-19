import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const actions = [
  ['MetodosAcceso', 'Métodos de acceso', 'Consulta cómo accedes a tu cuenta.'],
  ['CambiarPassword', 'Cambiar contraseña', 'Actualiza tu contraseña de acceso.'],
  ['CambiarEmail', 'Cambiar correo', 'Confirma una nueva dirección de correo.'],
  ['SesionesActivas', 'Sesiones activas', 'Revisa y cierra los accesos que ya no uses.'],
  ['PrivacidadComunicaciones', 'Privacidad y comunicaciones', 'Elige qué comunicaciones quieres recibir.'],
  ['ExportarDatos', 'Exportar mis datos', 'Obtén una copia de tu información.'],
  ['EliminarCuenta', 'Eliminar cuenta', 'Cierra tu cuenta de NextFit.'],
];
export default function AccountSettingsSection({ navigation }) {
  return <View style={styles.section}>
    <Text accessibilityRole="header" style={styles.heading}>Seguridad y cuenta</Text>
    {actions.map(([route, title, description]) => {
      const danger = route === 'EliminarCuenta';
      return <TouchableOpacity key={route} accessibilityRole="button" accessibilityLabel={title} onPress={() => navigation.navigate(route)} style={[styles.action, danger && styles.danger]}>
        <View style={styles.text}>
          <Text style={[styles.title, danger && styles.dangerText]}>{title}</Text>
          <Text style={styles.description}>{description}</Text>
        </View>
        <Text accessible={false} style={[styles.arrow, danger && styles.dangerText]}>›</Text>
      </TouchableOpacity>;
    })}
  </View>;
}
const styles = StyleSheet.create({
  section: { width: '100%', gap: 12 },
  heading: { color: '#fff', fontSize: 18, fontWeight: '800', marginBottom: 4 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, padding: 16, backgroundColor: '#18181b', borderWidth: 1, borderColor: '#27272a', borderRadius: 16 },
  text: { flex: 1, minWidth: 0 },
  title: { color: '#fff', fontSize: 16, fontWeight: '700' },
  description: { color: '#a1a1aa', fontSize: 14, lineHeight: 21, marginTop: 5 },
  arrow: { color: '#FACC15', fontSize: 26 },
  danger: { borderColor: '#7f1d1d', marginTop: 8 },
  dangerText: { color: '#f87171' },
});
