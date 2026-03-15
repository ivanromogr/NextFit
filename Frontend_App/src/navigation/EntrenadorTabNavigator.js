import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Platform, View, StyleSheet } from 'react-native';
import { Users, Calendar, Dumbbell, MessageCircle, User } from 'lucide-react-native';

// 👇 PANTALLAS REALES (Ya creadas)
import DashboardEntrenadorScreen from '../screens/Entrenador/DashboardEntrenadorScreen';
import EntrenadorPerfilScreen from '../screens/Entrenador/EntrenadorPerfilScreen';
import ChatsEntrenadorScreen from '../screens/Entrenador/ChatsEntrenadorScreen';
import AgendaEntrenadorScreen from '../screens/Entrenador/AgendaEntrenadorScreen';
// 🚧 PANTALLAS PENDIENTES (Se cambiarán según las vayas creando)
// import AgendaEntrenadorScreen from '../screens/Entrenador/AgendaEntrenadorScreen';
// import PlantillasEntrenadorScreen from '../screens/Entrenador/PlantillasEntrenadorScreen';
// import ChatListaScreen from '../screens/Entrenador/ChatListaScreen';

const DummyScreen = () => <View style={{ flex: 1, backgroundColor: '#050505' }} />;

const Tab = createBottomTabNavigator();

export default function EntrenadorTabNavigator() {
    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false, 
                tabBarShowLabel: true,
                tabBarActiveTintColor: '#FACC15', 
                tabBarInactiveTintColor: '#71717a', 
                tabBarStyle: styles.tabBar,
                tabBarLabelStyle: styles.tabBarLabel,
                tabBarHideOnKeyboard: true, 
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
                component={AgendaEntrenadorScreen} 
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
                name="ChatsEntrenador" 
                component={ChatsEntrenadorScreen} 
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
        backgroundColor: '#0a0a0a', 
        borderTopWidth: 1,
        borderTopColor: '#1f1f22', 
        height: Platform.OS === 'ios' ? 85 : 65,
        paddingBottom: Platform.OS === 'ios' ? 25 : 10,
        paddingTop: 10,
        elevation: 0, 
        shadowOpacity: 0, 
    },
    tabBarLabel: {
        fontSize: 10,
        fontWeight: '700',
        marginTop: 2,
    },
    iconFocused: {
        backgroundColor: 'rgba(250, 204, 21, 0.1)',
        padding: 6,
        borderRadius: 12,
    }
});