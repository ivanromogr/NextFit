import React, { useState } from 'react';
import { Alert, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { changePassword } from '../api/endpoints';
import { useAuth } from '../components/context/AuthContext';
const messages = { INVALID_CURRENT_PASSWORD: 'La contraseña actual no es correcta.', INVALID_PASSWORD: 'La nueva contraseña no cumple los requisitos.', NEW_PASSWORD_MUST_BE_DIFFERENT: 'La nueva contraseña debe ser diferente de la actual.' };
export default function CambiarPasswordScreen() {
  const [currentPassword, setCurrentPassword] = useState(''); const [newPassword, setNewPassword] = useState(''); const [confirmPassword, setConfirmPassword] = useState(''); const { clearLocalSession } = useAuth();
  const submit = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) return Alert.alert('Completa todos los campos.');
    if (newPassword.length < 8 || newPassword.length > 128) return Alert.alert('La nueva contraseña debe tener entre 8 y 128 caracteres.');
    if (newPassword !== confirmPassword) return Alert.alert('Las nuevas contraseñas no coinciden.');
    if (newPassword === currentPassword) return Alert.alert('La nueva contraseña debe ser diferente de la actual.');
    try { await changePassword(currentPassword, newPassword); await clearLocalSession(); Alert.alert('Contraseña actualizada correctamente. Inicia sesión de nuevo.'); }
    catch (error) { Alert.alert(messages[error.response?.data?.code] || 'No se pudo actualizar la contraseña.'); }
  };
  return <View><Text>Cambiar contraseña</Text><TextInput placeholder="Contraseña actual" value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry /><TextInput placeholder="Nueva contraseña" value={newPassword} onChangeText={setNewPassword} secureTextEntry /><TextInput placeholder="Confirmar nueva contraseña" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry /><TouchableOpacity onPress={submit}><Text>Actualizar contraseña</Text></TouchableOpacity></View>;
}
