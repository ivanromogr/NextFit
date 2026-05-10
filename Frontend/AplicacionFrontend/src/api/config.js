const RENDER_BASE_URL = "https://nextfit-pa8i.onrender.com";
const envApiUrl = import.meta.env.VITE_API_URL?.trim();
const envWsUrl = import.meta.env.VITE_WS_URL?.trim();
const isLocalUrl = (url) => url && /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.)/.test(url);
const trimTrailingSlash = (url) => url.replace(/\/+$/, "");

export const API_BASE_URL =
  trimTrailingSlash(
    import.meta.env.PROD && isLocalUrl(envApiUrl)
      ? RENDER_BASE_URL
      : envApiUrl || RENDER_BASE_URL
  );

const wsEnvUrl = import.meta.env.PROD && isLocalUrl(envWsUrl)
    ? RENDER_BASE_URL
    : envWsUrl || API_BASE_URL;

const WS_BASE_URL = (() => {
    const url = new URL(wsEnvUrl);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    return trimTrailingSlash(url.toString());
})();

const SOCKJS_URL = `${API_BASE_URL}/ws`;

export { SOCKJS_URL, WS_BASE_URL };
