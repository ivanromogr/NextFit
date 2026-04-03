import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'http://192.168.1.46:8080/api'; 

export const api = axios.create({
    baseURL: API_URL,
    timeout: 10000, 
});

// ✅ LA BARRERA DE SEGURIDAD (Interceptor)
// Antes de que cualquier petición salga de la app, hacemos esto:
api.interceptors.request.use(
    async (config) => {
        try {
            // Leemos el token del almacenamiento del móvil
            // ⚠️ OJO: Si en tu AuthContext guardaste el token con otro nombre (ej: 'jwt' o 'userToken'), cámbialo aquí abajo:
            const token = await AsyncStorage.getItem('token'); 
            
            if (token) {
                // Si hay token, lo pegamos en la cabecera Authorization
                config.headers.Authorization = `Bearer ${token}`;
            }
        } catch (error) {
            console.error("Error obteniendo el token de AsyncStorage:", error);
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default api;