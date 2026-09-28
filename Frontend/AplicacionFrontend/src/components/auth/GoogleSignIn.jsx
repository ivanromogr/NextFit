import { useEffect, useRef, useState } from "react";

/** Official Google Identity Services button. The ID token is opaque to this app. */
export default function GoogleSignIn({ onCredential, disabled = false }) {
  const host = useRef(null); const [sdkError, setSdkError] = useState(false);
  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID;
    if (!clientId || !host.current) return;
    const render = () => {
      if (!window.google?.accounts?.id) { setSdkError(true); return; }
      window.google.accounts.id.initialize({ client_id: clientId, callback: (response) => response.credential && onCredential(response.credential), auto_select: false });
      window.google.accounts.id.renderButton(host.current, { theme: "outline", size: "large", text: "continue_with", width: host.current.clientWidth || 320, locale: "es" });
    };
    let script = document.querySelector('script[data-nextfit-gis]');
    if (window.google) render(); else { script ||= Object.assign(document.createElement("script"), { src: "https://accounts.google.com/gsi/client", async: true, defer: true }); script.dataset.nextfitGis = "true"; script.onload = render; script.onerror = () => setSdkError(true); if (!script.parentNode) document.head.appendChild(script); }
  }, [onCredential]);
  if (!import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID) return null;
  return <><div ref={host} style={{ width: "100%", opacity: disabled ? .6 : 1, pointerEvents: disabled ? "none" : "auto" }} aria-label="Continuar con Google" />{sdkError && <div className="auth-error">No se ha podido iniciar sesión con Google.</div>}</>;
}
