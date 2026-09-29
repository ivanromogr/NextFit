import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let appleAuthWeb;

const appleScripts = () => document.querySelectorAll('script[src*="appleid.cdn-apple.com"]');

beforeEach(async () => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  delete window.AppleID;
  appleScripts().forEach(script => script.remove());
  appleAuthWeb = await import("./appleAuthWeb");
});

afterEach(() => {
  delete window.AppleID;
  appleScripts().forEach(script => script.remove());
  vi.unstubAllEnvs();
});

describe("appleAuthWeb", () => {
  it("genera nonce y state URL-safe distintos con Web Crypto", () => {
    const nonce = appleAuthWeb.generateAppleNonce();
    const state = appleAuthWeb.generateAppleState();

    expect(nonce).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(state).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(appleAuthWeb.generateAppleNonce()).not.toBe(nonce);
    expect(appleAuthWeb.generateAppleState()).not.toBe(state);
  });

  it("carga el SDK correctamente", async () => {
    const promise = appleAuthWeb.loadAppleSdk();
    const script = appleScripts()[0];
    const AppleID = { auth: {} };

    expect(appleScripts()).toHaveLength(1);
    window.AppleID = AppleID;
    script.onload();

    await expect(promise).resolves.toBe(AppleID);
  });

  it("mantiene la idempotencia ante cargas concurrentes", async () => {
    const first = appleAuthWeb.loadAppleSdk();
    const second = appleAuthWeb.loadAppleSdk();
    const script = appleScripts()[0];
    const AppleID = { auth: {} };

    expect(appleScripts()).toHaveLength(1);
    window.AppleID = AppleID;
    script.onload();

    await expect(Promise.all([first, second])).resolves.toEqual([AppleID, AppleID]);
  });

  it("reutiliza el SDK ya presente sin insertar script", async () => {
    const AppleID = { auth: {} };
    window.AppleID = AppleID;

    await expect(appleAuthWeb.loadAppleSdk()).resolves.toBe(AppleID);
    expect(appleScripts()).toHaveLength(0);
  });

  it("rechaza un error de carga sin escribir tokens en storage", async () => {
    const local = vi.spyOn(localStorage, "setItem");
    const session = vi.spyOn(sessionStorage, "setItem");
    const promise = appleAuthWeb.loadAppleSdk();

    appleScripts()[0].onerror();

    await expect(promise).rejects.toThrow("Apple SDK failed to load");
    expect(local).not.toHaveBeenCalled();
    expect(session).not.toHaveBeenCalled();
  });

  it("permite reintentar tras un error de carga", async () => {
    const first = appleAuthWeb.loadAppleSdk();
    const firstScript = appleScripts()[0];

    firstScript.onerror();
    await expect(first).rejects.toThrow("Apple SDK failed to load");
    firstScript.remove();

    const retry = appleAuthWeb.loadAppleSdk();
    const secondScript = appleScripts()[0];
    const AppleID = { auth: {} };

    expect(secondScript).not.toBe(firstScript);
    window.AppleID = AppleID;
    secondScript.onload();

    await expect(retry).resolves.toBe(AppleID);
  });

  it("no inicia Apple cuando está deshabilitado", async () => {
    await expect(appleAuthWeb.startAppleSignIn()).rejects.toThrow("disabled");
  });

  it("expone configuración válida cuando Apple está habilitado", () => {
    vi.stubEnv("VITE_APPLE_AUTH_ENABLED", "true");
    vi.stubEnv("VITE_APPLE_CLIENT_ID", "com.nextfit.web");
    vi.stubEnv("VITE_APPLE_REDIRECT_URI", "https://nextfit.example/auth/apple/callback");

    expect(appleAuthWeb.appleConfig()).toEqual({
      appleAuthEnabled: true,
      appleClientId: "com.nextfit.web",
      appleRedirectUri: "https://nextfit.example/auth/apple/callback",
    });
  });

  it("no inicia Apple con configuración incompleta", async () => {
    vi.stubEnv("VITE_APPLE_AUTH_ENABLED", "true");

    await expect(appleAuthWeb.startAppleSignIn()).rejects.toThrow("not configured");
  });

  it("inicia Apple y devuelve sólo datos efímeros de la respuesta", async () => {
    vi.stubEnv("VITE_APPLE_AUTH_ENABLED", "true");
    vi.stubEnv("VITE_APPLE_CLIENT_ID", "com.nextfit.web");
    vi.stubEnv("VITE_APPLE_REDIRECT_URI", "https://nextfit.example/auth/apple/callback");
    let initialization;
    const AppleID = {
      auth: {
        init: vi.fn(config => { initialization = config; }),
        signIn: vi.fn(async () => ({
          state: initialization.state,
          authorization: { id_token: "identity-token" },
          user: { name: { firstName: "Ada" } },
        })),
      },
    };
    window.AppleID = AppleID;

    const result = await appleAuthWeb.startAppleSignIn();

    expect(result).toEqual({
      identityToken: "identity-token",
      nonce: initialization.nonce,
      user: { name: { firstName: "Ada" } },
    });
    expect(AppleID.auth.init).toHaveBeenCalledWith(expect.objectContaining({
      clientId: "com.nextfit.web",
      redirectURI: "https://nextfit.example/auth/apple/callback",
      scope: "name email",
      usePopup: true,
    }));
  });

  it("rechaza una respuesta con state distinto", async () => {
    vi.stubEnv("VITE_APPLE_AUTH_ENABLED", "true");
    vi.stubEnv("VITE_APPLE_CLIENT_ID", "com.nextfit.web");
    vi.stubEnv("VITE_APPLE_REDIRECT_URI", "https://nextfit.example/auth/apple/callback");
    window.AppleID = {
      auth: {
        init: vi.fn(),
        signIn: vi.fn(async () => ({ state: "different", authorization: { id_token: "identity-token" } })),
      },
    };

    await expect(appleAuthWeb.startAppleSignIn()).rejects.toThrow("state mismatch");
  });

  it("rechaza una respuesta sin identity token", async () => {
    vi.stubEnv("VITE_APPLE_AUTH_ENABLED", "true");
    vi.stubEnv("VITE_APPLE_CLIENT_ID", "com.nextfit.web");
    vi.stubEnv("VITE_APPLE_REDIRECT_URI", "https://nextfit.example/auth/apple/callback");
    let initialization;
    window.AppleID = {
      auth: {
        init: vi.fn(config => { initialization = config; }),
        signIn: vi.fn(async () => ({ state: initialization.state, authorization: {} })),
      },
    };

    await expect(appleAuthWeb.startAppleSignIn()).rejects.toThrow("identity token missing");
  });

  it("propaga cancelación o error del SDK", async () => {
    vi.stubEnv("VITE_APPLE_AUTH_ENABLED", "true");
    vi.stubEnv("VITE_APPLE_CLIENT_ID", "com.nextfit.web");
    vi.stubEnv("VITE_APPLE_REDIRECT_URI", "https://nextfit.example/auth/apple/callback");
    window.AppleID = {
      auth: {
        init: vi.fn(),
        signIn: vi.fn(async () => { throw new Error("Apple sign-in cancelled"); }),
      },
    };

    await expect(appleAuthWeb.startAppleSignIn()).rejects.toThrow("Apple sign-in cancelled");
  });
});
