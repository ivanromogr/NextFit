import { useEffect, useState } from "react";
import { getConsents, updateMarketingConsent } from "../../api/endpoints";

const date = (value) => value ? new Date(value).toLocaleString() : "No disponible";
const missing = (consent) => consent?.status === "LEGACY_MISSING";

export default function PrivacidadComunicaciones() {
  const [consents, setConsents] = useState(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    getConsents().then((response) => setConsents(response.data))
      .catch(() => setMessage("No se pudo cargar la configuración de privacidad."));
  }, []);
  const toggleMarketing = async (event) => {
    const accepted = event.target.checked;
    setSaving(true); setMessage("");
    try {
      await updateMarketingConsent(accepted);
      setConsents((current) => ({ ...current, marketing: { ...(current?.marketing || {}), accepted, withdrawnAt: accepted ? "" : new Date().toISOString() } }));
      setMessage("Preferencia de marketing actualizada.");
    } catch { setMessage("No se pudo actualizar la preferencia de marketing."); }
    finally { setSaving(false); }
  };
  const item = (name, consent) => <li><strong>{name}:</strong> {missing(consent) ? "Sin consentimiento histórico registrado" : <>versión {consent?.version || "No disponible"}. Fecha: {date(consent?.acceptedAt)}</>}</li>;
  return <section aria-labelledby="privacy-communications-title">
    <h2 id="privacy-communications-title">Privacidad y comunicaciones</h2>
    <p>Los términos y la política se consultan aquí; sólo puedes modificar las comunicaciones de marketing.</p>
    {message && <p role="status">{message}</p>}
    <ul>{item("Términos de uso", consents?.terms)}{item("Política de privacidad", consents?.privacy)}</ul>
    <label>
      <input aria-label="Comunicaciones de marketing" type="checkbox" checked={Boolean(consents?.marketing?.accepted)} disabled={!consents || saving} onChange={toggleMarketing} />
      Recibir comunicaciones de marketing
    </label>
    {consents?.marketing && <p>Marketing: {consents.marketing.accepted ? "activado" : "desactivado"}.</p>}
  </section>;
}
