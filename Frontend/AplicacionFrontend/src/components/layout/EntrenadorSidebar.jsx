import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import logoNextFit from "../../assets/logo-nextfit.png";

import {
  LogOut,
  LayoutGrid,
  Users,
  Calendar,
  MessageSquare,
  Settings,
} from "lucide-react";

export default function EntrenadorSidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const styles = {
    sidebar: {
      width: "250px",
      background: "#0c0c0e",
      borderRight: "1px solid #1f1f22",
      padding: "28px 18px",
      display: "flex",
      flexDirection: "column",
      position: "sticky",
      top: 0,
      height: "100vh",
    },
    logoContainer: { marginBottom: "36px", paddingLeft: "6px" },
    logoImage: {
      width: "200px",
      height: "auto",
      display: "block",
      filter: "drop-shadow(0 0 10px rgba(250, 204, 21, 0.2))",
    },
    navItem: (active) => ({
      display: "flex",
      alignItems: "center",
      gap: "12px",
      padding: "12px 14px",
      borderRadius: "14px",
      color: active ? "#FACC15" : "#a1a1aa",
      background: active ? "rgba(250, 204, 21, 0.12)" : "transparent",
      cursor: "pointer",
      fontSize: "0.95rem",
      fontWeight: active ? "700" : "500",
      transition: "all 0.15s ease",
      textDecoration: "none",
      border: active
        ? "1px solid rgba(250,204,21,0.14)"
        : "1px solid transparent",
    }),
  };

  const isDashboard = location.pathname === "/entrenador/dashboard";
  const isAtletas =
    location.pathname === "/entrenador/dashboard" ||
    location.pathname.startsWith("/entrenador/cliente/");
  const isAgenda = location.pathname.startsWith("/entrenador/agenda");
  const isChat = location.pathname.startsWith("/entrenador/chat");
  const isPerfil = location.pathname.startsWith("/entrenador/perfil");

  return (
    <aside style={styles.sidebar}>
      <div style={styles.logoContainer}>
        <img src={logoNextFit} alt="NEXTFIT" style={styles.logoImage} />
      </div>

      <nav style={{ display: "flex", flexDirection: "column", gap: "8px", flex: 1 }}>
        <button
          style={{ ...styles.navItem(isDashboard), border: "none", background: "transparent", textAlign: "left" }}
          onClick={() => navigate("/entrenador/dashboard")}
        >
          <LayoutGrid size={20} /> Dashboard
        </button>

        <button
          style={{ ...styles.navItem(isAtletas), border: "none", background: "transparent", textAlign: "left" }}
          onClick={() => navigate("/entrenador/dashboard")}
        >
          <Users size={20} /> Atletas
        </button>

        <button
          style={{ ...styles.navItem(isAgenda), border: "none", background: "transparent", textAlign: "left", opacity: 0.6 }}
          onClick={() => {}}
          title="Próximamente"
        >
          <Calendar size={20} /> Agenda
        </button>

        <button
          style={{ ...styles.navItem(isChat), border: "none", background: "transparent", textAlign: "left", opacity: 0.6 }}
          onClick={() => {}}
          title="Próximamente"
        >
          <MessageSquare size={20} /> Chat
        </button>

        <button
          style={{ ...styles.navItem(isPerfil), border: "none", background: "transparent", textAlign: "left" }}
          onClick={() => navigate("/entrenador/perfil")}
        >
          <Settings size={20} /> Configuración
        </button>
      </nav>

      <div
        style={{ ...styles.navItem(false), color: "#ef4444", marginTop: "auto" }}
        onClick={() => {
          localStorage.clear();
          navigate("/auth/login");
        }}
      >
        <LogOut size={20} /> Cerrar Sesión
      </div>
    </aside>
  );
}
