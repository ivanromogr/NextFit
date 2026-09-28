import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { requestPasswordReset } from '../api/endpoints';
import GymButton from '../components/ui/GymButton';
import GymInput from '../components/ui/GymInput';

const neutralMessage = 'Si existe una cuenta asociada a ese correo, recibirás instrucciones para restablecer tu contraseña.';
export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState(''); const [loading, setLoading] = useState(false); const [sent, setSent] = useState(false); const [error, setError] = useState('');
  const submit = async () => { setLoading(true); setError(''); try { await requestPasswordReset(email.trim()); setSent(true); } catch { setError('No se pudo procesar la solicitud. Inténtalo de nuevo más tarde.'); } finally { setLoading(false); } };
  return <ScrollView contentContainerStyle={styles.container}><View style={styles.card}><Text style={styles.title}>Recupera tu contraseña</Text>{sent ? <Text style={styles.success}>{neutralMessage}</Text> : <><GymInput label="Correo electrónico" value={email} onChangeText={setEmail} placeholder="usuario@email.com" keyboardType="email-address" /><Text style={styles.error}>{error}</Text><GymButton fullWidth loading={loading} onPress={submit}>ENVIAR INSTRUCCIONES</GymButton></>}<TouchableOpacity onPress={() => navigation.navigate('Login')}><Text style={styles.link}>Volver a iniciar sesión</Text></TouchableOpacity></View></ScrollView>;
}
const styles=StyleSheet.create({container:{flexGrow:1,justifyContent:'center',padding:20,backgroundColor:'#09090b'},card:{backgroundColor:'#18181b',borderRadius:24,padding:25},title:{color:'#fff',fontSize:24,fontWeight:'700',marginBottom:24},success:{color:'#d9f99d',lineHeight:22},error:{color:'#fca5a5',minHeight:20,marginBottom:4},link:{color:'#FACC15',textAlign:'center',marginTop:18}});
