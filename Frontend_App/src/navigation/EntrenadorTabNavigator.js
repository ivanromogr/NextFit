import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Platform, View, StyleSheet } from 'react-native';
import { Users, Calendar, Dumbbell, MessageCircle, User } from 'lucide-react-native';

// 👇 IMPORTA AQUÍ TUS PANTALLAS DE ENTRENADOR (Ajusta las rutas a tu proyecto)
import DashboardEntrenadorScreen from '../screens/Entrenador/DashboardEntrenadorScreen';
import EntrenadorPerfilScreen from '../screens/Entrenador/EntrenadorPerfilScreen';
// import AgendaEntrenadorScreen from '../screens/entrenador/AgendaEntrenadorScreen';
// import PlantillasEntrenadorScreen from '../screens/entrenador/PlantillasEntrenadorScreen';
// import ChatListaScreen from '../screens/entrenador/ChatListaScreen';
// import PerfilEntrenadorScreen from '../screens/entrenador/PerfilEntrenadorScreen';

// ⚠️ NOTA: He comentado las que aún no tengas creadas para que no te dé error. 
// Sustituye los componentes "DummyScreen" de abajo por tus pantallas reales cuando las tengas.
const DummyScreen = () => <View style={{ flex: 1, backgroundColor: '#050505' }} />;

const Tab = createBottomTabNavigator();

export default function EntrenadorTabNavigator() {
    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false, // Ocultamos el header feo por defecto
                tabBarShowLabel: true,
                tabBarActiveTintColor: '#FACC15', // Amarillo Premium cuando está seleccionado
                tabBarInactiveTintColor: '#71717a', // Gris cuando no está seleccionado
                tabBarStyle: styles.tabBar,
                tabBarLabelStyle: styles.tabBarLabel,
                tabBarHideOnKeyboard: true, // Se oculta si se abre el teclado (ideal para chats)
            }}
        >
            <Tab.Screen 
                name="InicioEntrenador" 
                component={DashboardEntrenadorScreen} 
                options={{
                    tabBarLabel: 'Equipo',
                    tabBarIcon: ({ color, focused }) => (
                        <View style={focused ? styles.iconFocused : null}>
                            <Users size={24} color={color} />
                        </View>
                    ),
                }} 
            />

            <Tab.Screen 
                name="AgendaEntrenador" 
                component={DummyScreen} // 👈 Cambia por tu AgendaEntrenadorScreen
                options={{
                    tabBarLabel: 'Agenda',
                    tabBarIcon: ({ color, focused }) => (
                        <View style={focused ? styles.iconFocused : null}>
                            <Calendar size={24} color={color} />
                        </View>
                    ),
                }} 
            />

            <Tab.Screen 
                name="PlantillasEntrenador" 
                component={DummyScreen} // 👈 Cambia por tu PlantillasEntrenadorScreen
                options={{
                    tabBarLabel: 'Plantillas',
                    tabBarIcon: ({ color, focused }) => (
                        <View style={focused ? styles.iconFocused : null}>
                            <Dumbbell size={24} color={color} />
                        </View>
                    ),
                }} 
            />

            <Tab.Screen 
                name="ChatsEntrenador" 
                component={DummyScreen} // 👈 Cambia por tu ChatListaScreen
                options={{
                    tabBarLabel: 'Chats',
                    tabBarIcon: ({ color, focused }) => (
                        <View style={focused ? styles.iconFocused : null}>
                            <MessageCircle size={24} color={color} />
                        </View>
                    ),
                }} 
            />

            <Tab.Screen 
                name="PerfilEntrenador" 
                component={EntrenadorPerfilScreen}
                options={{
                    tabBarLabel: 'Perfil',
                    tabBarIcon: ({ color, focused }) => (
                        <View style={focused ? styles.iconFocused : null}>
                            <User size={24} color={color} />
                        </View>
                    ),
                }} 
            />
        </Tab.Navigator>
    );
}

const styles = StyleSheet.create({
    tabBar: {
        backgroundColor: '#0a0a0a', // Fondo negro puro/oscuro
        borderTopWidth: 1,
        borderTopColor: '#1f1f22', // Borde sutil gris oscuro
        height: Platform.OS === 'ios' ? 85 : 65,
        paddingBottom: Platform.OS === 'ios' ? 25 : 10,
        paddingTop: 10,
        elevation: 0, // Quita la sombra en Android para un look más flat
        shadowOpacity: 0, // Quita la sombra en iOS
    },
    tabBarLabel: {
        fontSize: 10,
        fontWeight: '700',
        marginTop: 2,
    },
    // Efecto de resplandor sutil cuando el icono está activo
    iconFocused: {
        backgroundColor: 'rgba(250, 204, 21, 0.1)',
        padding: 6,
        borderRadius: 12,
    }
});