const RENDER_BASE_URL = "https://nextfit-pa8i.onrender.com";
const envApiUrl = import.meta.env.VITE_API_URL;
const envWsUrl = import.meta.env.VITE_WS_URL;
const isLocalUrl = (url) => url && /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.)/.test(url);

export const API_BASE_URL =
  import.meta.env.PROD && isLocalUrl(envApiUrl)
    ? RENDER_BASE_URL
    : envApiUrl || RENDER_BASE_URL;

// Dynamically set WS_BASE_URL to match the current page's protocol
const wsEnvUrl = import.meta.env.PROD && isLocalUrl(envWsUrl)
    ? RENDER_BASE_URL
    : envWsUrl;
let WS_BASE_URL;
if (wsEnvUrl) {
    const url = new URL(wsEnvUrl);
    url.protocol = window.location.protocol;
    WS_BASE_URL = url.toString();
} else {
    WS_BASE_URL = `${window.location.protocol}//${window.location.host}`;
}

export { WS_BASE_URL };
