import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import logoNextFit from "../../assets/logo-nextfit.png"; // Asegúrate de que la ruta es correcta

import {
  LogOut,
  LayoutGrid,
  Calendar,
  BarChart2,
  Settings,
} from "lucide-react";

export default function ClienteSidebar() {
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
      width: "150px", // Ajustado un poco el tamaño para que no sea enorme
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
      color: active ? "#FACC15" : "#a1a1aa", // Amarillo si activo, gris si no
      background: active ? "rgba(250, 204, 21, 0.12)" : "transparent", // Fondo amarillo suave si activo
      cursor: "pointer",
      fontSize: "0.95rem",
      fontWeight: active ? "700" : "500",
      transition: "all 0.15s ease",
      textDecoration: "none",
      border: active ? "1px solid rgba(250,204,21,0.14)" : "1px solid transparent",
      width: "100%",      // Asegura que el botón ocupe el ancho
      textAlign: "left",  // Alinea texto e icono a la izquierda
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

  // Lógica de rutas corregida
  const isDashboard = location.pathname === "/cliente/dashboard";
  // Ahora comprueba correctamente la ruta del calendario
  const isCalendario = location.pathname.startsWith("/cliente/calendario");
  const isProgreso = location.pathname.startsWith("/cliente/progreso");
  const isAjustes = location.pathname.startsWith("/cliente/perfil") || location.pathname.startsWith("/cliente/ajustes");

  return (
    <aside style={styles.sidebar}>
      <div style={styles.logoContainer}>
        {/* Si no carga la imagen, muestra texto alternativo */}
        {logoNextFit ? (
            <img src={logoNextFit} alt="NEXTFIT" style={styles.logoImage} />
        ) : (
            <h2 style={{color:'white', fontStyle:'italic'}}>NEXT<span style={{color:'#FACC15'}}>FIT</span></h2>
        )}
      </div>

      <nav style={{ display: "flex", flexDirection: "column", gap: "8px", flex: 1 }}>
        <button
          style={styles.navItem(isDashboard)}
          onClick={() => navigate("/cliente/dashboard")}
        >
          <LayoutGrid size={20} /> Dashboard
        </button>

        <button
          style={styles.navItem(isCalendario)}
          onClick={() => navigate("/cliente/calendario")}
        >
          <Calendar size={20} /> Calendario
        </button>

        <button
          style={styles.navItem(isProgreso)}
          onClick={() => navigate("/cliente/progreso")}
        >
          <BarChart2 size={20} /> Progreso
        </button>

        <button
          style={styles.navItem(isAjustes)}
          onClick={() => navigate("/cliente/perfil")}
        >
          <Settings size={20} /> Ajustes
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