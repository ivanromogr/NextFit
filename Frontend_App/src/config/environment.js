/**
 * 
 * - DESARROLLO: Apunta a la máquina local
 * - PRODUCCIÓN: Apunta al servidor desplegado
 */

const envBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();

if (!envBaseUrl) {
  throw new Error('EXPO_PUBLIC_API_BASE_URL debe definirse para iniciar NextFit móvil.');
}

const normalizedBaseUrl = envBaseUrl.replace(/\/$/, '');

const currentEnvironment = {
  BASE_URL: normalizedBaseUrl,
  API_URL: `${normalizedBaseUrl}/api`,
  NAME: __DEV__ ? 'DEVELOPMENT' : 'PRODUCTION',
};

const WS_URL = currentEnvironment.BASE_URL
  .replace(/^https/, 'wss')
  .replace(/^http/, 'ws') + '/ws/websocket';

console.log(`[ENVIRONMENT] 🌍 Modo: ${currentEnvironment.NAME}`);
console.log(`[ENVIRONMENT] 🔗 Base URL: ${currentEnvironment.BASE_URL}`);

export const { BASE_URL, API_URL, NAME } = currentEnvironment;
export { WS_URL };
export const ENV = currentEnvironment;
