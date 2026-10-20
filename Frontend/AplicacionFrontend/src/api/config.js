const envApiUrl = import.meta.env.VITE_API_URL?.trim();
const envWsUrl = import.meta.env.VITE_WS_URL?.trim();
const trimTrailingSlash = (url) => url.replace(/\/+$/, "");
const localDevUrl = typeof window === "undefined" ? "http://localhost:5173" : window.location.origin;

const requireProductionUrl = (value, variableName) => {
  if (!value && import.meta.env.PROD) {
    throw new Error(`${variableName} debe definirse para una build de producción.`);
  }
  return value;
};

export const API_BASE_URL = trimTrailingSlash(
  import.meta.env.VITE_API_SAME_ORIGIN === "true"
    ? localDevUrl
    : requireProductionUrl(envApiUrl, "VITE_API_URL") || localDevUrl
);

const wsEnvUrl = requireProductionUrl(envWsUrl, "VITE_WS_URL") || API_BASE_URL;

const WS_BASE_URL = (() => {
    const url = new URL(wsEnvUrl);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    return trimTrailingSlash(url.toString());
})();

const SOCKJS_URL = `${trimTrailingSlash(wsEnvUrl)}/ws`;

export { SOCKJS_URL, WS_BASE_URL };
