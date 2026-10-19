import { Component, Suspense } from "react";

const containerStyle = {
  minHeight: "100dvh", display: "grid", placeItems: "center", padding: "24px",
  boxSizing: "border-box", background: "#09090b", color: "#fafafa", textAlign: "center",
};

export default class PageBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return (
        <main style={containerStyle}>
          <div role="alert" style={{ maxWidth: "420px" }}>
            <h1>No se ha podido abrir esta pantalla</h1>
            <p style={{ color: "#a1a1aa", lineHeight: 1.6 }}>
              Comprueba tu conexión y vuelve a cargar la página.
            </p>
            <button type="button" onClick={() => window.location.reload()} style={{
              minHeight: "48px", padding: "12px 24px", border: 0, borderRadius: "12px",
              background: "#facc15", color: "#09090b", fontWeight: 700, cursor: "pointer",
            }}>Volver a cargar</button>
            <p><a href="/auth/login" style={{ color: "#facc15" }}>Volver al inicio</a></p>
          </div>
        </main>
      );
    }

    return (
      <Suspense fallback={
        <div style={containerStyle}>
          <p role="status" aria-live="polite">Cargando pantalla…</p>
        </div>
      }>
        {this.props.children}
      </Suspense>
    );
  }
}
