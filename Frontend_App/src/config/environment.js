/**
 * 🌍 CONFIGURACIÓN POR AMBIENTE
 * 
 * - DESARROLLO: Apunta a la máquina local
 * - PRODUCCIÓN: Apunta al servidor desplegado
 */

const DEFAULT_BASE_URL = 'https://nextfit-pa8i.onrender.com';
const envBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || DEFAULT_BASE_URL;
const normalizedBaseUrl = envBaseUrl.replace(/\/$/, '');

const ENVIRONMENTS = {
  development: {
    BASE_URL: normalizedBaseUrl,
    API_URL: `${normalizedBaseUrl}/api`,
    NAME: 'DEVELOPMENT',
  },
  production: {
    BASE_URL: normalizedBaseUrl,
    API_URL: `${normalizedBaseUrl}/api`,
    NAME: 'PRODUCTION',
  },
};

const currentEnvironment = __DEV__
  ? ENVIRONMENTS.development
  : ENVIRONMENTS.production;

const WS_URL = currentEnvironment.BASE_URL
  .replace(/^https/, 'wss')
  .replace(/^http/, 'ws') + '/ws';

console.log(`[ENVIRONMENT] 🌍 Modo: ${currentEnvironment.NAME}`);
console.log(`[ENVIRONMENT] 🔗 Base URL: ${currentEnvironment.BASE_URL}`);

export const { BASE_URL, API_URL, NAME } = currentEnvironment;
export { WS_URL };
export const ENV = currentEnvironment;
