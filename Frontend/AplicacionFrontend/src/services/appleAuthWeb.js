const SDK_URL = "https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js";
let loading;

export const appleConfig = () => ({
  appleAuthEnabled: import.meta.env.VITE_APPLE_AUTH_ENABLED === "true",
  appleClientId: import.meta.env.VITE_APPLE_CLIENT_ID || "",
  appleRedirectUri: import.meta.env.VITE_APPLE_REDIRECT_URI || "",
});

export const randomAppleValue = () => {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
export const generateAppleNonce = randomAppleValue;
export const generateAppleState = randomAppleValue;

export const loadAppleSdk = () => {
  if (window.AppleID?.auth) return Promise.resolve(window.AppleID);
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-nextfit-apple-sdk]');
    const script = existing || Object.assign(document.createElement("script"), { src: SDK_URL, async: true, defer: true });
    script.dataset.nextfitAppleSdk = "true";
    script.onload = () => window.AppleID?.auth ? resolve(window.AppleID) : reject(new Error("Apple SDK unavailable"));
    script.onerror = () => reject(new Error("Apple SDK failed to load"));
    if (!existing) document.head.appendChild(script);
  }).catch(error => { loading = undefined; throw error; });
  return loading;
};

export const startAppleSignIn = async () => {
  const { appleAuthEnabled, appleClientId, appleRedirectUri } = appleConfig();
  if (!appleAuthEnabled) throw new Error("Apple authentication is disabled");
  if (!appleClientId || !appleRedirectUri) throw new Error("Apple authentication is not configured");
  const nonce = generateAppleNonce(), state = generateAppleState(), AppleID = await loadAppleSdk();
  AppleID.auth.init({ clientId: appleClientId, scope: "name email", redirectURI: appleRedirectUri, state, nonce, usePopup: true });
  const response = await AppleID.auth.signIn();
  if (response?.state && response.state !== state) throw new Error("Apple state mismatch");
  const identityToken = response?.authorization?.id_token;
  if (!identityToken) throw new Error("Apple identity token missing");
  return { identityToken, nonce, user: response.user };
};
