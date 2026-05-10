import React, { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import ClienteSidebar from "./ClienteSidebar";

export default function ClienteLayout() {
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) {
        setSidebarOpen(true); // En desktop siempre abierto
      } else {
        setSidebarOpen(false); // En móvil cerrado por defecto
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const styles = {
    wrapper: {
      display: "flex",
      minHeight: "100vh",
      background: "#09090b",
      fontFamily: "'Inter', sans-serif",
      color: "white",
      position: "relative",
    },
    main: {
      flex: 1,
      minWidth: 0,
      minHeight: "100vh",
      background: "#050505",
    },
    mobileMenuButton: {
      display: isMobile ? "block" : "none",
      position: "fixed",
      top: "var(--spacing-md)",
      left: "var(--spacing-md)",
      zIndex: 1001,
      background: "var(--panel)",
      border: "1px solid var(--border)",
      borderRadius: "var(--radius-md)",
      padding: "var(--spacing-sm)",
      cursor: "pointer",
      color: "var(--text)",
    },
  };

  return (
    <div style={styles.wrapper}>
      {/* Botón menú móvil */}
      <button
        style={styles.mobileMenuButton}
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label="Toggle menu"
      >
        ☰
      </button>

      {/* Sidebar */}
      <ClienteSidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
      />

      {/* Contenido principal */}
      <main style={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
