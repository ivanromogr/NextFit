/**
 * 🌍 CONFIGURACIÓN POR AMBIENTE
 * 
 * - DESARROLLO: Apunta a la máquina local
 * - PRODUCCIÓN: Apunta al servidor desplegado
 */

const isDevelopment = __DEV__;

const ENVIRONMENTS = {
  development: {
    BASE_URL: 'http://192.168.1.47:8080',
    API_URL: 'http://192.168.1.47:8080/api',
    NAME: 'DEVELOPMENT',
  },
  production: {
    BASE_URL: 'https://nextfit-pa8i.onrender.com',
    API_URL: 'https://nextfit-pa8i.onrender.com/api',
    NAME: 'PRODUCTION',
  },
};

const currentEnvironment = isDevelopment
  ? ENVIRONMENTS.development
  : ENVIRONMENTS.production;

console.log(`[ENVIRONMENT] 🌍 Modo: ${currentEnvironment.NAME}`);
console.log(`[ENVIRONMENT] 🔗 Base URL: ${currentEnvironment.BASE_URL}`);

export const { BASE_URL, API_URL, NAME } = currentEnvironment;
export const ENV = currentEnvironment;