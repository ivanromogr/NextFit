import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../../components/context/AuthContext';
import ChatComponent from '../../components/functional/ChatComponent';
import AccountFormScreen, { FormMessage } from '../../components/ui/AccountFormScreen';

export default function PantallaChatIndividual() {
    const navigation = useNavigation();
    const route = useRoute();
    const { user, userId } = useAuth(); // Sacamos el usuario logueado
    const { destinatarioId, nombreDestinatario = 'Conversación' } = route.params || {};

    if (!destinatarioId || !(userId || user?.id)) return (
        <AccountFormScreen title="Conversación" backLabel="Volver a conversaciones" onBack={() => navigation.goBack()}>
            <FormMessage>No se pudo abrir esta conversación. Vuelve a la lista e inténtalo de nuevo.</FormMessage>
        </AccountFormScreen>
    );

    return (
        <SafeAreaView style={styles.container}>
            {/* Cabecera del Chat */}
            <View style={styles.header}>
                <TouchableOpacity accessibilityRole="button" accessibilityLabel="Volver a conversaciones" onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <ChevronLeft color="#FACC15" size={28} />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{nombreDestinatario}</Text>
                    <Text style={styles.status}>Conversación</Text>
                </View>
            </View>

            {/* El componente de chat que ya construimos */}
            <View style={{ flex: 1 }}>
                <ChatComponent 
                    usuarioId={userId || user?.id}
                    destinatarioId={destinatarioId} 
                    nombreDestinatario={nombreDestinatario} 
                />
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0c0c0e' },
    header: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        padding: 15, 
        borderBottomWidth: 1, 
        borderBottomColor: '#1f1f22',
        backgroundColor: '#0c0c0e'
    },
    backBtn: { marginRight: 15, minWidth: 44, minHeight: 44, justifyContent: 'center' },
    name: { color: '#fff', fontSize: 18, fontWeight: '800' },
    status: { color: '#a1a1aa', fontSize: 12, fontWeight: '600' }
});