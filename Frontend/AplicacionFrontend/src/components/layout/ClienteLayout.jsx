import React from "react";
import { Outlet } from "react-router-dom";
import ClienteSidebar from "./ClienteSidebar";

export default function ClienteLayout() {
  const styles = {
    wrapper: {
      display: "flex",
      minHeight: "100vh",
      background: "#09090b",
      fontFamily: "'Inter', sans-serif",
      color: "white",
    },
    main: {
      flex: 1,
      padding: "50px 80px",
      overflowY: "auto",
    },
  };

  return (
    <div style={styles.wrapper}>
      <ClienteSidebar />
      <main style={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
