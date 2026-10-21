import axios from 'axios';
import { API_URL, BASE_URL } from '../config/environment';
import { clearAuthSession, getAccessToken, getRefreshToken, getSessionVersion, saveAuthSession } from '../components/context/authSession';

console.log('[API CONFIG] 🔧 Conectando a:', API_URL);

export const api = axios.create({
    baseURL: API_URL,
    timeout: 45000, 
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const sessionChanged = config => Object.assign(new Error('La sesión cambió durante la petición'), {
    code: 'AUTH_SESSION_CHANGED', config,
});

// Antes de que cualquier petición salga de la app, hacemos esto:
api.interceptors.request.use(
    async (config) => {
        const version = config.__authSessionVersion ?? getSessionVersion();
        if (version !== getSessionVersion()) throw sessionChanged(config);
        config.__authSessionVersion = version;
        try {
            const token = await getAccessToken();
            if (version !== getSessionVersion()) throw sessionChanged(config);
            
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
            if (error.code === 'AUTH_SESSION_CHANGED') throw error;
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
        if (response.config.__authSessionVersion !== undefined
            && response.config.__authSessionVersion !== getSessionVersion()) {
            throw sessionChanged(response.config);
        }
        console.log('[API RESPONSE] ✅', {
            status: response.status,
            url: response.config.url,
            dataLength: Array.isArray(response.data) ? response.data.length : 'object',
        });
        return response;
    },
    async (error) => {
        const config = error.config || {};
        const version = config.__authSessionVersion ?? getSessionVersion();
        if (error.code === 'AUTH_SESSION_CHANGED'
            || (version !== getSessionVersion() && recoveryInFlight?.version !== version)) {
            return Promise.reject(error);
        }
        const authRequest = config.url?.includes('/auth/refresh') || config.url?.includes('/auth/login') || config.url?.includes('/auth/logout');
        if (error.response?.status === 401 && !config.__refreshRetry && !authRequest && !config.skipAuthRefresh) {
            config.__refreshRetry = true;
            try {
                const currentToken = await getAccessToken();
                if (version !== getSessionVersion()) throw sessionChanged(config);
                const alreadyRotated = currentToken && config.headers?.Authorization
                    && config.headers.Authorization !== `Bearer ${currentToken}`;
                const renewedVersion = alreadyRotated ? version : await recoverSession(version);
                if (renewedVersion !== getSessionVersion()) throw sessionChanged(config);
                config.headers = config.headers || {};
                const token = await getAccessToken();
                if (renewedVersion !== getSessionVersion()) throw sessionChanged(config);
                config.__authSessionVersion = renewedVersion;
                config.headers.Authorization = `Bearer ${token}`;
                return api(config);
            } catch {
                await clearAuthSession(version);
            }
        }
        const shouldRetry =
            ['get', 'head'].includes((config.method || '').toLowerCase()) &&
            !config.skipNetworkRetry && !config.__retry &&
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
let recoveryInFlight = null;
const recoverSession = version => {
    if (recoveryInFlight?.version === version) return recoveryInFlight.promise;
    if (version !== getSessionVersion()) return Promise.reject(sessionChanged());
    const entry = { version };
    entry.promise = (async () => {
        const response = await refreshMobileSession();
        const saved = await saveAuthSession(response.data, version);
        if (!saved || getSessionVersion() !== version) throw sessionChanged();
        return version;
    })().finally(() => { if (recoveryInFlight === entry) recoveryInFlight = null; });
    recoveryInFlight = entry;
    return entry.promise;
};

export const refreshMobileSession = async () => {
    const version = getSessionVersion();
    if (!refreshInFlight || refreshInFlight.version !== version) {
        const entry = { version };
        entry.promise = (async () => {
            const refreshToken = await getRefreshToken();
            if (version !== getSessionVersion()) throw sessionChanged();
            if (!refreshToken) throw new Error('No refresh token');
            return api.post('/auth/refresh', { refreshToken }, { __authSessionVersion: version, headers: { 'X-Client-Type': 'MOBILE' } });
        })().finally(() => { if (refreshInFlight === entry) refreshInFlight = null; });
        refreshInFlight = entry;
    }
    return refreshInFlight.promise;
};
export const logoutMobileSession = async () => {
    const refreshToken = await getRefreshToken();
    if (refreshToken) await api.post('/auth/logout', { refreshToken }, { headers: { 'X-Client-Type': 'MOBILE' } });
};
