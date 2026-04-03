export const API_BASE_URL = import.meta.env.VITE_API_URL;

// Dynamically set WS_BASE_URL to match the current page's protocol
const wsEnvUrl = import.meta.env.VITE_WS_URL;
let WS_BASE_URL;
if (wsEnvUrl) {
    const url = new URL(wsEnvUrl);
    url.protocol = window.location.protocol;
    WS_BASE_URL = url.toString();
} else {
    WS_BASE_URL = `${window.location.protocol}//${window.location.host}`;
}

export { WS_BASE_URL };