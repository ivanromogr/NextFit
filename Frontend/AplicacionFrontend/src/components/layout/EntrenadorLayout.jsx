import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import EntrenadorSidebar from "./EntrenadorSidebar";

export default function EntrenadorLayout() {
  const isChat = useLocation().pathname.startsWith("/entrenador/chat");
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
    <div className={isChat ? "trainer-chat-layout" : undefined} style={styles.wrapper}>
      {isChat && <style>{`
        .trainer-chat-layout > main { min-width:0; }
        @media (max-width:900px) {
          .trainer-chat-layout { flex-direction:column; }
          .trainer-chat-layout > aside { width:100% !important; height:82px !important; padding:8px !important; box-sizing:border-box; flex-direction:row !important; gap:8px; border-right:0 !important; border-bottom:1px solid #27272a; z-index:20; }
          .trainer-chat-layout > aside > div { display:none; }
          .trainer-chat-layout > aside > nav { flex-direction:row !important; min-width:0; overflow-x:auto; gap:4px !important; }
          .trainer-chat-layout > aside > nav > button { flex-shrink:0; width:auto !important; flex-direction:column; gap:5px !important; padding:8px 10px !important; font-size:.7rem !important; white-space:nowrap; }
          .trainer-chat-layout > aside > button { width:44px !important; flex-shrink:0; font-size:0 !important; padding:10px !important; margin-top:0 !important; }
          .trainer-chat-layout > main { width:100%; padding:0 !important; }
          .trainer-chat-layout .trainer-chat-page { height:calc(100dvh - 82px) !important; }
        }
      `}</style>}
      <EntrenadorSidebar />
      <main style={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
