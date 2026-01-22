import React from "react";

export default function AuthLayout({ children }) {
  return (
    <div style={{ minHeight: "100vh" }}>
      {children}
    </div>
  );
}
