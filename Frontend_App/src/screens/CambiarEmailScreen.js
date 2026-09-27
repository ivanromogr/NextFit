import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { changeEmail } from '../api/endpoints';
import { useAuth } from '../components/context/AuthContext';
const messages = { INVALID_CURRENT_PASSWORD: 'Contraseña actual incorrecta', INVALID_EMAIL: 'Introduce un correo válido', EMAIL_ALREADY_IN_USE: 'Ese correo ya está asociado a otra cuenta' };
export default function CambiarEmailScreen() {
  const { applyEmailChange } = useAuth(); const [newEmail, setNewEmail] = useState(''); const [currentPassword, setCurrentPassword] = useState('');
  const submit = async () => { try { const response = await changeEmail(currentPassword, newEmail); await applyEmailChange(response.data); setCurrentPassword(''); setNewEmail(response.data.user.email); Alert.alert('Correo actualizado correctamente'); } catch (error) { Alert.alert(messages[error.response?.data?.code] || 'No se pudo cambiar el correo'); } };
  return <View><Text>Cambiar correo electrónico</Text><TextInput placeholder="Nuevo correo electrónico" value={newEmail} onChangeText={setNewEmail} autoCapitalize="none" keyboardType="email-address" /><TextInput placeholder="Contraseña actual" value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry /><TouchableOpacity onPress={submit}><Text>Cambiar correo</Text></TouchableOpacity></View>;
}
