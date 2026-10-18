import { createElement } from "react";
import { Link } from "react-router-dom";
import {
  KeyRound,
  Mail,
  MonitorSmartphone,
  Download,
  ShieldCheck,
  Fingerprint,
  ChevronRight,
  Trash2,
} from "lucide-react";
import "./account.css";

const actions = [
  [
    "identidades",
    "Métodos de acceso",
    "Vincula Google y gestiona cómo inicias sesión.",
    Fingerprint,
  ],
  [
    "password",
    "Cambiar contraseña",
    "Actualiza la contraseña de tu cuenta.",
    KeyRound,
  ],
  ["email", "Cambiar correo", "Confirma una nueva dirección de correo.", Mail],
  [
    "sesiones",
    "Sesiones activas",
    "Revisa tus dispositivos y cierra sus sesiones.",
    MonitorSmartphone,
  ],
  [
    "privacidad",
    "Privacidad y comunicaciones",
    "Elige qué comunicaciones quieres recibir.",
    ShieldCheck,
  ],
  [
    "exportar-datos",
    "Exportar mis datos",
    "Descarga una copia de tu información.",
    Download,
  ],
];

export default function AccountSecurityMenu({ role }) {
  const base = `/${role}/seguridad`;
  return (
    <section className="account-menu" aria-label="Seguridad y privacidad">
      <p className="account-menu-intro">
        Tu cuenta, bajo tu control. Gestiona el acceso, tus sesiones y tu
        privacidad.
      </p>
      <div className="account-menu-grid">
        {actions.map(([path, title, description, Icon]) => (
          <Link key={path} to={`${base}/${path}`} className="account-action">
            <span className="account-action-icon">
              {createElement(Icon, { size: 21, "aria-hidden": true })}
            </span>
            <span className="account-action-copy">
              <strong>{title}</strong>
              <span>{description}</span>
            </span>
            <ChevronRight
              size={18}
              className="account-action-arrow"
              aria-hidden="true"
            />
          </Link>
        ))}
      </div>
      <Link to={`${base}/eliminar-cuenta`} className="account-danger-link">
        <Trash2 size={18} aria-hidden="true" />
        <span>Eliminar cuenta</span>
        <ChevronRight size={16} aria-hidden="true" />
      </Link>
    </section>
  );
}
