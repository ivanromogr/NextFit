import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
    LayoutGrid,
    Calendar,
    BarChart2,
    Search,
    Settings,
    User
} from 'lucide-react-native';

// ✅ Importamos las pantallas reales
import DashboardClienteScreen from '../screens/DashboardScreen';
import CalendarioClienteScreen from '../screens/Cliente/CalendarioClienteScreen';
import PerfilScreen from '../screens/Cliente/EditarPerfilCliente';
// ✅ Importamos la nueva pantalla de Progreso
import ProgresoClienteScreen from '../screens/Cliente/ProgresoClienteScreen';

const Tab = createBottomTabNavigator();

export default function ClienteTabNavigator() {
    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: '#0c0c0e', // El color oscuro de tu sidebar
                    borderTopColor: '#1f1f22',
                    height: 65,
                    paddingBottom: 10,
                    paddingTop: 8, // Un poco de espacio extra arriba de los iconos
                },
                tabBarActiveTintColor: '#FACC15', // Tu amarillo NextFit
                tabBarInactiveTintColor: '#a1a1aa', // Tu gris web
            }}
        >
            <Tab.Screen
                name="Inicio" // Le ponemos "Inicio" como nombre principal
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
            {/* ✅ Pestaña de Progreso conectada a la pantalla real */}
            <Tab.Screen
                name="Progreso"
                component={ProgresoClienteScreen} 
                options={{
                    tabBarIcon: ({ color }) => <BarChart2 color={color} size={24} />,
                }}
            />
            <Tab.Screen
                name="Entrenadores"
                component={DashboardClienteScreen} // 🚧 Provisional hasta que la creemos
                options={{
                    tabBarIcon: ({ color }) => <Search color={color} size={24} />,
                }}
            />

            {/* ✅ Esta es la clave: Se debe llamar "Perfil" para que el botón del Dashboard la encuentre */}
            <Tab.Screen
                name="Perfil"
                component={PerfilScreen} // Aquí cargamos la pantalla con el botón de Cerrar Sesión
                options={{
                    tabBarLabel: 'Perfil',
                    tabBarIcon: ({ color }) => <Settings color={color} size={24} />,
                }}
            />
        </Tab.Navigator>
    );
}