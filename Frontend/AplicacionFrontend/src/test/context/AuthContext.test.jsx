import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { AuthProvider, useAuth } from "../../context/AuthContext";

import { refreshWebSession, logoutSession } from "../../api/endpoints";
import { clearAuthSession, getAccessToken } from "../../utils/authSession";
vi.mock("../../api/endpoints", () => ({ refreshWebSession: vi.fn(), logoutSession: vi.fn() }));

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
    clearAuthSession();
    vi.clearAllMocks();
    refreshWebSession.mockRejectedValue(new Error("No refresh session"));
    logoutSession.mockResolvedValue({ status: 204 });
  });

  // Helper para renderizar el hook dentro del provider
  const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;

  it("termina la comprobación inicial sin autenticar cuando no hay cookie válida", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toBeNull();
    expect(result.current.role).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it("confirma los metadatos persistidos mediante refresh y conserva el token solo en memoria", async () => {
    const mockSession = { id: "123", email: "cliente@nextfit.test", role: "CLIENTE", accessToken: "token", expiresAt: Date.now() + 60_000 };
    sessionStorageMock.setItem("auth_session", JSON.stringify(mockSession));
    refreshWebSession.mockResolvedValue({ data: { accessToken: "fresh-token", user: { id: "123", email: "cliente@nextfit.test", role: "CLIENTE" } } });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toEqual(expect.objectContaining({ id: "123", role: "CLIENTE" }));
    expect(getAccessToken()).toBe("fresh-token");
    expect(JSON.parse(sessionStorageMock.getItem("auth_session"))).not.toHaveProperty("accessToken");
    expect(result.current.role).toBe("CLIENTE");
  });

  it("debe limpiar sessionStorage si los datos están corruptos", () => {
    sessionStorageMock.setItem("auth_session", "invalid-json{");
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    renderHook(() => useAuth(), { wrapper });

    expect(sessionStorageMock.removeItem).toHaveBeenCalledWith("auth_session");
    consoleSpy.mockRestore();
  });

  it("la función login guarda metadatos y actualiza el estado", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => {
      result.current.login({ accessToken: "token", expiresIn: 60, user: { id: "user-1", email: "coach@nextfit.test", role: "ENTRENADOR" } });
    });

    expect(result.current.user.id).toBe("user-1");
    expect(result.current.role).toBe("ENTRENADOR");
    expect(sessionStorageMock.setItem).toHaveBeenCalledWith(
      "auth_session",
      expect.stringContaining("user-1")
    );
  });

  it("la función logout revoca la sesión y limpia los metadatos", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    // Primero logueamos
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => {
      result.current.login({ accessToken: "token", expiresIn: 60, user: { id: "user-1", email: "cliente@nextfit.test", role: "CLIENTE" } });
    });

    // Luego deslogueamos
    await act(async () => {
      await result.current.logout();
    });
    expect(logoutSession).toHaveBeenCalledTimes(1);

    expect(result.current.user).toBeNull();
    expect(result.current.role).toBeNull();
    expect(sessionStorageMock.removeItem).toHaveBeenCalledWith("auth_session");
  });

  it("isAuthenticated debe devolver true si hay usuario y false si no", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.isAuthenticated()).toBe(false);

    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => {
      result.current.login({ accessToken: "token", expiresIn: 60, user: { id: "1", email: "cliente@nextfit.test", role: "CLIENTE" } });
    });

    expect(result.current.isAuthenticated()).toBe(true);
  });

  it("fuera de AuthProvider debe comportarse como usuario no autenticado", () => {
    const { result } = renderHook(() => useAuth());

    expect(result.current.user).toBeNull();
    expect(result.current.userId).toBeNull();
    expect(result.current.isAuthenticated()).toBe(false);
  });

  it("descarta metadatos antiguos cuando el servidor rechaza el refresh", async () => {
    sessionStorageMock.setItem("auth_session", JSON.stringify({ id: "1", email: "x@nextfit.test", role: "CLIENTE", accessToken: "token", expiresAt: Date.now() - 1 }));
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.isAuthenticated()).toBe(false);
    expect(sessionStorageMock.removeItem).toHaveBeenCalledWith("auth_session");
  });

  const payload = id => ({ accessToken: 'access-' + id, user: { id, email: id + '@example.invalid', role: 'CLIENTE' } });
  const pending = () => {
    let resolve, reject;
    const promise = new Promise((done, fail) => { resolve = done; reject = fail; });
    return { promise, resolve, reject };
  };

  it.each(['success', 'failure'])('un bootstrap antiguo %s no sustituye ni borra un login posterior', async outcome => {
    const request = pending();
    refreshWebSession.mockReturnValue(request.promise);
    const { result } = renderHook(() => useAuth(), { wrapper });
    act(() => { result.current.login(payload('new')); });
    await act(async () => {
      if (outcome === 'success') request.resolve({ data: payload('old') });
      else request.reject(new Error('old refresh failed'));
    });
    expect(result.current.user.id).toBe('new');
    expect(getAccessToken()).toBe('access-new');
  });

  it('un bootstrap pendiente no restaura la cuenta tras limpiar la sesión', async () => {
    const request = pending();
    refreshWebSession.mockReturnValue(request.promise);
    const { result } = renderHook(() => useAuth(), { wrapper });
    act(() => { result.current.clearLocalSession(); });
    await act(async () => { request.resolve({ data: payload('old') }); });
    expect(result.current.user).toBeNull();
    expect(getAccessToken()).toBeNull();
  });

  it('descarta la restauración después de desmontar el proveedor', async () => {
    const request = pending();
    refreshWebSession.mockReturnValue(request.promise);
    const { unmount } = renderHook(() => useAuth(), { wrapper });
    unmount();
    await act(async () => { request.resolve({ data: payload('old') }); });
    expect(getAccessToken()).toBeNull();
  });

  it('limpia localmente si falla el logout remoto', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => { result.current.login(payload('old')); });
    logoutSession.mockRejectedValue(new Error('offline'));
    await act(async () => { await result.current.logout(); });
    expect(result.current.user).toBeNull();
    expect(getAccessToken()).toBeNull();
  });

  it('un logout remoto atrasado no borra un login posterior', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => { result.current.login(payload('old')); });
    const request = pending();
    logoutSession.mockReturnValue(request.promise);
    let loggingOut;
    act(() => { loggingOut = result.current.logout(); });
    act(() => { result.current.login(payload('new')); });
    await act(async () => { request.resolve(); await loggingOut; });
    expect(result.current.user.id).toBe('new');
    expect(getAccessToken()).toBe('access-new');
  });
});
