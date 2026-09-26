import axios from 'axios';
import { API_URL, BASE_URL } from '../config/environment';
import { clearAuthSession, getAccessToken, getRefreshToken, saveAuthSession } from '../components/context/authSession';

console.log('[API CONFIG] 🔧 Conectando a:', API_URL);

export const api = axios.create({
    baseURL: API_URL,
    timeout: 45000, 
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Antes de que cualquier petición salga de la app, hacemos esto:
api.interceptors.request.use(
    async (config) => {
        try {
            const token = await getAccessToken();
            
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
    async (error) => {
        const config = error.config || {};
        const authRequest = config.url?.includes('/auth/refresh') || config.url?.includes('/auth/login') || config.url?.includes('/auth/logout');
        if (error.response?.status === 401 && !config.__refreshRetry && !authRequest) {
            config.__refreshRetry = true;
            try {
                const response = await refreshMobileSession();
                await saveAuthSession(response.data);
                config.headers = config.headers || {};
                config.headers.Authorization = `Bearer ${await getAccessToken()}`;
                return api(config);
            } catch {
                await clearAuthSession();
            }
        }
        const shouldRetry =
            !config.__retry &&
            (error.code === 'ECONNABORTED' || error.message?.includes('timeout') || !error.response);

        if (shouldRetry) {
            config.__retry = true;
            console.warn('[API RETRY] 🔁 Reintentando petición tras timeout/red lenta:', {
                url: config.url,
                fullUrl: `${config.baseURL}${config.url}`,
            });
            await sleep(2500);
            return api(config);
        }

        if (!config.silentError) {
            console.error('[API ERROR] ❌', {
                status: error.response?.status,
                url: error.config?.url,
                fullUrl: `${error.config?.baseURL}${error.config?.url}`,
                message: error.message,
                errorMessage: error.response?.data?.message,
            });
        }
        return Promise.reject(error);
    }
);

export default api;

let refreshInFlight = null;
export const refreshMobileSession = async () => {
    if (!refreshInFlight) {
        refreshInFlight = (async () => {
            const refreshToken = await getRefreshToken();
            if (!refreshToken) throw new Error('No refresh token');
            return api.post('/auth/refresh', { refreshToken }, { headers: { 'X-Client-Type': 'MOBILE' } });
        })().finally(() => { refreshInFlight = null; });
    }
    return refreshInFlight;
};
export const logoutMobileSession = async () => {
    const refreshToken = await getRefreshToken();
    if (refreshToken) await api.post('/auth/logout', { refreshToken }, { headers: { 'X-Client-Type': 'MOBILE' } });
};
