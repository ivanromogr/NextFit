import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import logoNextFit from "../../assets/logo-nextfit.png"; 

import {
  LogOut,
  LayoutGrid,
  Calendar,
  BarChart2,
  Settings,
  MessageCircle,
  Search,
  X // 👈 IMPORTAMOS EL ICONO DE CERRAR
} from "lucide-react";

export default function ClienteSidebar({ isOpen, onClose }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 767);
  const [closeButtonHover, setCloseButtonHover] = useState(false);
  
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 767);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const styles = {
    sidebar: {
      width: "250px",
      background: "#0c0c0e",
      borderRight: "1px solid #1f1f22",
      padding: "28px 18px",
      display: "flex",
      flexDirection: "column",
      position: isMobile ? "fixed" : "sticky",
      top: 0,
      left: isMobile ? 0 : "auto",
      height: "100vh",
      zIndex: isMobile ? 1000 : "auto",
      transform: isMobile ? (isOpen ? 'translateX(0)' : 'translateX(-100%)') : 'none',
      transition: isMobile ? 'transform 0.3s ease-in-out' : 'none',
      boxShadow: isMobile && isOpen ? '2px 0 10px rgba(0,0,0,0.3)' : 'none',
    },
    closeButton: {
      display: isMobile ? 'block' : 'none',
      position: 'absolute',
      top: '16px',
      right: '16px',
      background: closeButtonHover ? 'rgba(250, 204, 21, 0.1)' : 'transparent',
      border: 'none',
      color: closeButtonHover ? '#FACC15' : '#a1a1aa',
      cursor: 'pointer',
      padding: '8px',
      borderRadius: '8px',
      transition: 'all 0.15s ease',
    },
    overlay: {
      display: (isMobile && isOpen) ? 'block' : 'none',
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      zIndex: 999,
    },
    logoContainer: { 
      marginBottom: "36px", 
      paddingLeft: "6px",
      position: 'relative'
    },
    logoImage: {
      width: "150px", 
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

  // Lógica de rutas
  const isDashboard = location.pathname === "/cliente/dashboard";
  const isCalendario = location.pathname.startsWith("/cliente/calendario");
  const isProgreso = location.pathname.startsWith("/cliente/progreso");
  const isChat = location.pathname.startsWith("/cliente/chat") || location.pathname.startsWith("/cliente/mensajes");
  // 👇 DETECTAMOS SI ESTAMOS EN EL BUSCADOR
  const isBuscador = location.pathname.startsWith("/cliente/entrenadores");
  const isAjustes = location.pathname.startsWith("/cliente/perfil") || location.pathname.startsWith("/cliente/ajustes");

  return (
    <>
      {/* Overlay para móviles */}
      <div 
        style={styles.overlay} 
        onClick={onClose}
        aria-hidden="true"
      />
      
      <aside style={styles.sidebar}>
        {/* Botón de cerrar para móviles */}
        <button
          style={styles.closeButton}
          onClick={onClose}
          onMouseEnter={() => setCloseButtonHover(true)}
          onMouseLeave={() => setCloseButtonHover(false)}
          aria-label="Cerrar menú"
        >
          <X size={24} />
        </button>

        <div style={styles.logoContainer}>
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
          <LayoutGrid size={20} /> Menú Principal
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
          style={styles.navItem(isChat)}
          onClick={() => navigate("/cliente/chat")}
        >
          <MessageCircle size={20} /> Mensajes
        </button>

        {/* 👇 NUEVO BOTÓN PARA EL MARKETPLACE */}
        <button
          style={styles.navItem(isBuscador)}
          onClick={() => navigate("/cliente/entrenadores")}
        >
          <Search size={20} /> Buscar Entrenador
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
            logout();
            navigate("/auth/login");
          }}
        >
          <LogOut size={20} /> Cerrar Sesión
        </button>
      </aside>
    </>
  );
}
