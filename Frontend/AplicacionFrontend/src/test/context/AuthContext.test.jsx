import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { AuthProvider, useAuth } from "../../context/AuthContext";

describe("AuthContext (AuthProvider & useAuth)", () => {
  // Mock manual de sessionStorage
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
  });

  // Helper para renderizar el hook dentro del provider
  const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;

  it("debe inicializarse con valores nulos y loading en false", () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.user).toBeNull();
    expect(result.current.role).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it("debe recuperar la sesión de sessionStorage al cargar", () => {
    const mockSession = { id: "123", role: "CLIENTE", loginTime: "2026-01-01" };
    sessionStorageMock.setItem("auth_session", JSON.stringify(mockSession));

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.user).toEqual(expect.objectContaining({ id: "123", role: "CLIENTE" }));
    expect(result.current.role).toBe("CLIENTE");
  });

  it("debe limpiar sessionStorage si los datos están corruptos", () => {
    sessionStorageMock.setItem("auth_session", "invalid-json{");
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    renderHook(() => useAuth(), { wrapper });

    expect(sessionStorageMock.removeItem).toHaveBeenCalledWith("auth_session");
    consoleSpy.mockRestore();
  });

  it("la función login debe guardar datos en sessionStorage y actualizar el estado", () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    act(() => {
      result.current.login("user-1", "ENTRENADOR");
    });

    expect(result.current.user.id).toBe("user-1");
    expect(result.current.role).toBe("ENTRENADOR");
    expect(sessionStorageMock.setItem).toHaveBeenCalledWith(
      "auth_session",
      expect.stringContaining("user-1")
    );
  });

  it("la función logout debe limpiar el estado y sessionStorage", () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    // Primero logueamos
    act(() => {
      result.current.login("user-1", "CLIENTE");
    });

    // Luego deslogueamos
    act(() => {
      result.current.logout();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.role).toBeNull();
    expect(sessionStorageMock.removeItem).toHaveBeenCalledWith("auth_session");
  });

  it("isAuthenticated debe devolver true si hay usuario y false si no", () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.isAuthenticated()).toBe(false);

    act(() => {
      result.current.login("1", "CLIENTE");
    });

    expect(result.current.isAuthenticated()).toBe(true);
  });

  it("fuera de AuthProvider debe comportarse como usuario no autenticado", () => {
    const { result } = renderHook(() => useAuth());

    expect(result.current.user).toBeNull();
    expect(result.current.userId).toBeNull();
    expect(result.current.isAuthenticated()).toBe(false);
  });
});
