import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { resetPassword } from '../api/endpoints';
import GymButton from '../components/ui/GymButton';
import GymInput from '../components/ui/GymInput';
const invalidMessage='El enlace de recuperación no es válido o ha caducado.';
export default function ResetPasswordScreen({ navigation, route }) {
  const [token, setToken] = useState(() => route.params?.token || ''); const [password,setPassword]=useState(''); const [confirmation,setConfirmation]=useState(''); const [loading,setLoading]=useState(false); const [error,setError]=useState(''); const [done,setDone]=useState(false);
  const submit=async()=>{ if(password.length<8||password.length>128)return setError('La contraseña debe tener entre 8 y 128 caracteres.'); if(password!==confirmation)return setError('Las contraseñas no coinciden.'); setLoading(true);setError('');try{await resetPassword(token,password);setToken('');setPassword('');setConfirmation('');setDone(true);}catch(requestError){setError(requestError.response?.status===400?invalidMessage:'No se pudo restablecer la contraseña. Inténtalo de nuevo más tarde.');}finally{setLoading(false);}};
  if(!token&&!done)return <Invalid navigation={navigation}/>;
  return <ScrollView contentContainerStyle={styles.container}><View style={styles.card}><Text style={styles.title}>{done?'Contraseña restablecida':'Nueva contraseña'}</Text>{done?<><Text style={styles.success}>Tu contraseña se ha restablecido. Inicia sesión con tu nueva contraseña.</Text><TouchableOpacity onPress={()=>navigation.navigate('Login')}><Text style={styles.link}>Ir a iniciar sesión</Text></TouchableOpacity></>:<><GymInput label="Nueva contraseña" value={password} onChangeText={setPassword} secureTextEntry /><GymInput label="Confirmar contraseña" value={confirmation} onChangeText={setConfirmation} secureTextEntry /><Text style={styles.error}>{error}</Text><GymButton fullWidth loading={loading} onPress={submit}>RESTABLECER CONTRASEÑA</GymButton></>}</View></ScrollView>;
}
function Invalid({navigation}){return <View style={styles.container}><View style={styles.card}><Text style={styles.error}>{invalidMessage}</Text><TouchableOpacity onPress={()=>navigation.navigate('ForgotPassword')}><Text style={styles.link}>Solicitar un nuevo enlace</Text></TouchableOpacity></View></View>}
const styles=StyleSheet.create({container:{flex:1,justifyContent:'center',padding:20,backgroundColor:'#09090b'},card:{backgroundColor:'#18181b',borderRadius:24,padding:25},title:{color:'#fff',fontSize:24,fontWeight:'700',marginBottom:24},success:{color:'#d9f99d',lineHeight:22},error:{color:'#fca5a5',minHeight:20,marginBottom:8},link:{color:'#FACC15',textAlign:'center',marginTop:18}});
