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
  Copy // 👇 AQUÍ ESTÁ EL ICONO IMPORTADO
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
      width: "160px",
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
      border: active ? "1px solid rgba(250,204,21,0.14)" : "1px solid transparent",
      width: "100%",
      textAlign: "left",
      outline: "none"
    }),
    logoutBtn: {
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "12px 14px",
        borderRadius: "14px",
        color: "#ef4444",
        background: "transparent",
        cursor: "pointer",
        marginTop: "auto",
        border: "1px solid transparent",
        width: "100%",
        textAlign: "left",
        fontWeight: "600",
        fontSize: "0.95rem"
    }
  };

  // Lógica de rutas activas
  const isDashboard = location.pathname === "/entrenador/dashboard";
  const isAtletas = location.pathname === "/entrenador/atletas" || location.pathname.startsWith("/entrenador/cliente/");
  const isAgenda = location.pathname.startsWith("/entrenador/agenda");
  const isChat = location.pathname.startsWith("/entrenador/chat");
  const isPlantillas = location.pathname.startsWith("/entrenador/plantillas"); // 👇 NUEVA LÓGICA ACTIVA
  const isPerfil = location.pathname.startsWith("/entrenador/perfil");

  return (
    <aside style={styles.sidebar}>
      <div style={styles.logoContainer}>
        {logoNextFit ? (
             <img src={logoNextFit} alt="NEXTFIT" style={styles.logoImage} />
        ) : (
             <h2 style={{color:'white'}}>NEXT<span style={{color:'#FACC15'}}>FIT</span></h2>
        )}
      </div>

      <nav style={{ display: "flex", flexDirection: "column", gap: "8px", flex: 1 }}>
        <button
          style={styles.navItem(isDashboard)}
          onClick={() => navigate("/entrenador/dashboard")}
        >
          <LayoutGrid size={20} /> Inicio
        </button>

        <button
          style={styles.navItem(isAtletas)}
          onClick={() => navigate("/entrenador/atletas")}
        >
          <Users size={20} /> Mis Atletas
        </button>

        {/* 👇 AGENDA ACTIVADA */}
        <button
          style={styles.navItem(isAgenda)}
          onClick={() => navigate('/entrenador/agenda')}
        >
          <Calendar size={20} /> Agenda
        </button>

        <button
          style={styles.navItem(isChat)}
          onClick={() => navigate("/entrenador/chat")}
        >
          <MessageSquare size={20} /> Chat
        </button>

        {/* 👇 BOTÓN BIBLIOTECA ESTILIZADO */}
        <button 
          style={styles.navItem(isPlantillas)}
          onClick={() => navigate('/entrenador/plantillas')}
        >
           <Copy size={20} /> Biblioteca
        </button>

        <button
          style={styles.navItem(isPerfil)}
          onClick={() => navigate("/entrenador/perfil")}
        >
          <Settings size={20} /> Configuración
        </button>
      </nav>

      <button
        style={styles.logoutBtn}
        onClick={() => {
          localStorage.clear();
          navigate("/auth/login");
        }}
      >
        <LogOut size={20} /> Cerrar Sesión
      </button>
    </aside>
  );
}