import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
    LayoutGrid,
    Calendar,
    Search,
    MessageSquare,
    User,
    Settings
} from 'lucide-react-native';

// ✅ Importamos las pantallas reales
import DashboardClienteScreen from '../screens/DashboardScreen';
import CalendarioClienteScreen from '../screens/Cliente/CalendarioClienteScreen';
import PerfilScreen from '../screens/Cliente/EditarPerfilCliente';
import ProgresoClienteScreen from '../screens/Cliente/ProgresoClienteScreen';
import ChatClienteScreen from '../screens/Cliente/ChatClienteScreen';

// 🔥 LA CLAVE ESTÁ AQUÍ: Hemos cambiado 'Cliente' por 'Entrenador' porque ahí es donde lo moviste

import ExplorarEntrenadores from '../screens/Cliente/ExplorarEntrenadores';

const Tab = createBottomTabNavigator();

export default function ClienteTabNavigator() {
    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: '#0c0c0e',
                    borderTopColor: '#1f1f22',
                    height: 65,
                    paddingBottom: 10,
                    paddingTop: 8,
                },
                tabBarActiveTintColor: '#FACC15',
                tabBarInactiveTintColor: '#a1a1aa',
            }}
        >
            <Tab.Screen
                name="Inicio"
                component={DashboardClienteScreen}
                options={{
                    tabBarLabel: 'Inicio',
                    tabBarIcon: ({ color }) => <LayoutGrid color={color} size={24} />,
                }}
            />
            <Tab.Screen
                name="Calendario"
                component={CalendarioClienteScreen}
                options={{
                    tabBarIcon: ({ color }) => <Calendar color={color} size={24} />,
                }}
            />
            
            <Tab.Screen
                name="Chat"
                component={ChatClienteScreen}
                options={{
                    tabBarIcon: ({ color }) => <MessageSquare color={color} size={24} />,
                }}
            />

            {/* ✅ Ahora apuntará al archivo correcto en la carpeta Entrenador */}
            <Tab.Screen
                name="Entrenadores"
                component={ExplorarEntrenadores}
                options={{
                    tabBarLabel: 'Explorar',
                    tabBarIcon: ({ color }) => <Search color={color} size={24} />,
                }}
            />

            <Tab.Screen
                name="Perfil"
                component={PerfilScreen}
                options={{
                    tabBarLabel: 'Perfil',
                    tabBarIcon: ({ color }) => <User color={color} size={24} />,
                }}
            />
        </Tab.Navigator>
    );
}