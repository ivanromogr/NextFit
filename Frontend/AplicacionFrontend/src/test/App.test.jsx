import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import App from "../App";
import '@testing-library/jest-dom';
import { refreshWebSession } from '../api/endpoints';

// 1. MOCK GLOBAL DE LA API (Para evitar Network Error)
vi.mock("../api/endpoints", () => ({
  refreshWebSession: vi.fn(),
  logoutSession: vi.fn().mockResolvedValue({}),
  obtenerResumenDashboard: vi.fn(() => Promise.resolve({ data: {} })),
  // Añade aquí cualquier otro endpoint que el Dashboard llame al cargar
}));

vi.mock("../pages/cliente/DashboardCliente", () => ({ default: () => <h1>Dashboard de prueba</h1> }));

describe("Integración de Rutas en App.jsx", () => {
  const sessionStorageMock = (() => {
    let store = {};
    return {
      getItem: vi.fn((key) => store[key] || null),
      setItem: vi.fn((key, value) => { store[key] = value.toString(); }),
      removeItem: vi.fn((key) => { delete store[key]; }),
      clear: vi.fn(() => { store = {}; }),
    };
  })();

  beforeEach(() => {
    vi.stubGlobal("sessionStorage", sessionStorageMock);
    sessionStorageMock.clear();
    vi.clearAllMocks();
    refreshWebSession.mockRejectedValue(new Error("No refresh session"));
    window.history.pushState({}, "Home", "/");
  });

  it("redirecciona de la raíz (/) al login automáticamente", async () => {
    render(<App />);
    
    await waitFor(() => {
      // Ajustado a tu HTML real: el botón dice "INICIAR SESIÓN"
      expect(screen.getByText(/INICIAR SESIÓN/i)).toBeInTheDocument();
    });
    expect(window.location.pathname).toBe("/auth/login");
  });

  it("permite el acceso a la página de registro", async () => {
    window.history.pushState({}, "Register", "/register");
    render(<App />);

    await waitFor(() => {
      // Ajustado a tu HTML real: el título es "ÚNETE AL TEAM"
      expect(screen.getByText(/ÚNETE AL/i)).toBeInTheDocument();
    });
  });

  it("redirecciona al login si un usuario no autenticado intenta entrar al dashboard", async () => {
    window.history.pushState({}, "Dashboard", "/cliente/dashboard");
    render(<App />);

    await waitFor(() => {
      expect(window.location.pathname).toBe("/auth/login");
    });
  });

  it("permite acceso al dashboard de cliente con una sesión JWT válida", async () => {
    const sessionData = JSON.stringify({ id: "1", email: "cliente@nextfit.test", role: "CLIENTE", accessToken: "token", expiresAt: Date.now() + 60_000 });
    sessionStorageMock.setItem("auth_session", sessionData);
    refreshWebSession.mockResolvedValue({ data: { accessToken: "fresh-token", user: { id: "1", email: "cliente@nextfit.test", role: "CLIENTE" } } });
    
    window.history.pushState({}, "Dashboard", "/cliente/dashboard");
    render(<App />);

    expect(await screen.findByRole("heading", { name: "Dashboard de prueba" })).toBeInTheDocument();
    expect(window.location.pathname).toBe("/cliente/dashboard");
  });

  it("redirecciona a login ante una ruta inexistente", async () => {
    window.history.pushState({}, "404", "/ruta-fantasma");
    render(<App />);

    await waitFor(() => {
      expect(window.location.pathname).toBe("/auth/login");
    });
  });
});
