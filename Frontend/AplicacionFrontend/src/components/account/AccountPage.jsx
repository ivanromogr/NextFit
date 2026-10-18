import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import "./account.css";

export default function AccountPage({ children }) {
  const { pathname } = useLocation();
  const role = pathname.startsWith("/entrenador/") ? "entrenador" : "cliente";
  const danger = pathname.endsWith("/eliminar-cuenta");
  return (
    <div className={`account-page${danger ? " account-page-danger" : ""}`}>
      <Link to={`/${role}/perfil`} className="account-back">
        <ArrowLeft size={18} aria-hidden="true" /> Volver a ajustes
      </Link>
      <div className="account-page-heading">
        <span className="account-eyebrow">
          <ShieldCheck size={16} aria-hidden="true" /> TU CUENTA
        </span>
        <p>Seguridad y privacidad</p>
      </div>
      <div className="account-panel">{children}</div>
      <p className="account-footnote">
        Tú decides cómo acceder y qué compartir.
      </p>
    </div>
  );
}
