    import React from 'react';
import { View, StyleSheet, SafeAreaView, TouchableOpacity, Text } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../../components/context/AuthContext';
import ChatComponent from '../../components/functional/ChatComponent';

export default function PantallaChatIndividual() {
    const navigation = useNavigation();
    const route = useRoute();
    const { user } = useAuth(); // Sacamos el usuario logueado
    const { destinatarioId, nombreDestinatario } = route.params;

    return (
        <SafeAreaView style={styles.container}>
            {/* Cabecera del Chat */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <ChevronLeft color="#FACC15" size={28} />
                </TouchableOpacity>
                <View>
                    <Text style={styles.name}>{nombreDestinatario}</Text>
                    <Text style={styles.status}>En línea</Text>
                </View>
            </View>

            {/* El componente de chat que ya construimos */}
            <View style={{ flex: 1 }}>
                <ChatComponent 
                    usuarioId={user.id} 
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
    backBtn: { marginRight: 15 },
    name: { color: '#fff', fontSize: 18, fontWeight: '800' },
    status: { color: '#22c55e', fontSize: 12, fontWeight: '600' }
});