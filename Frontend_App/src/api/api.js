import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL, BASE_URL } from '../config/environment';

// 🌍 Usar URL según el ambiente (dev o prod)
console.log('[API CONFIG] 🔧 Conectando a:', API_URL);

export const api = axios.create({
    baseURL: API_URL,
    timeout: 15000, 
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
            
            // 🔍 DEBUG: Log de la petición
            console.log('[API REQUEST] 📤', {
                method: config.method.toUpperCase(),
                url: config.url,
                fullUrl: `${config.baseURL}${config.url}`,
                hasToken: !!token,
            });
        } catch (error) {
            console.error("[API ERROR] ❌ Error obteniendo token:", error);
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// 🔍 DEBUG: Interceptor de respuestas
api.interceptors.response.use(
    (response) => {
        console.log('[API RESPONSE] ✅', {
            status: response.status,
            url: response.config.url,
            dataLength: Array.isArray(response.data) ? response.data.length : 'object',
        });
        return response;
    },
    (error) => {
        console.error('[API ERROR] ❌', {
            status: error.response?.status,
            url: error.config?.url,
            fullUrl: `${error.config?.baseURL}${error.config?.url}`,
            message: error.message,
            errorMessage: error.response?.data?.message,
        });
        return Promise.reject(error);
    }
);

export default api;