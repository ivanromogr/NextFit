import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, beforeEach, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import AppleSignIn from "../../components/auth/AppleSignIn";
import AppleOnboarding from "../../pages/auth/AppleOnboarding";
import Login from "../../pages/auth/Login";
import Register from "../../pages/auth/Register";

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  login: vi.fn((session) => session.user),
  authenticateWithApple: vi.fn(),
  completeAppleOnboarding: vi.fn(),
  startAppleSignIn: vi.fn(),
  appleEnabled: true,
}));

vi.mock("react-router-dom", async () => ({
  ...(await vi.importActual("react-router-dom")),
  useNavigate: () => mocks.navigate,
}));
vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ login: mocks.login }) }));
vi.mock("../../api/endpoints", () => ({ authenticateWithApple: mocks.authenticateWithApple, completeAppleOnboarding: mocks.completeAppleOnboarding }));
vi.mock("../../services/appleAuthWeb", () => ({
  appleConfig: () => ({ appleAuthEnabled: mocks.appleEnabled }),
  startAppleSignIn: mocks.startAppleSignIn,
}));

const renderAppleSignIn = () => render(<MemoryRouter><AppleSignIn /></MemoryRouter>);
const renderOnboarding = (state = { pendingToken: "pending", profile: { nombre: "Ada", apellido: "Lovelace" } }) => render(
  <MemoryRouter initialEntries={[{ pathname: "/auth/apple/onboarding", state }]}><AppleOnboarding /></MemoryRouter>,
);

describe("Apple web UI", () => {
  beforeEach(() => {
    mocks.appleEnabled = true;
    vi.clearAllMocks();
  });

  it("muestra u oculta el botón según la feature flag", () => {
    mocks.appleEnabled = false;
    const { rerender } = renderAppleSignIn();
    expect(screen.queryByRole("button", { name: /continuar con apple/i })).not.toBeInTheDocument();
    mocks.appleEnabled = true;
    rerender(<MemoryRouter><AppleSignIn /></MemoryRouter>);
    expect(screen.getByRole("button", { name: /continuar con apple/i })).toBeInTheDocument();
  });

  it("integra el botón condicionado en Login y Register", () => {
    mocks.appleEnabled = false;
    const loginView = render(<MemoryRouter><Login /></MemoryRouter>);
    expect(screen.queryByRole("button", { name: /continuar con apple/i })).not.toBeInTheDocument();
    loginView.unmount();

    mocks.appleEnabled = true;
    const registerView = render(<MemoryRouter><Register /></MemoryRouter>);
    expect(screen.getByRole("button", { name: /continuar con apple/i })).toBeInTheDocument();
    registerView.unmount();
  });

  it("instala la sesión y navega tras AUTHENTICATED", async () => {
    mocks.startAppleSignIn.mockResolvedValue({ identityToken: "apple-token", nonce: "nonce" });
    mocks.authenticateWithApple.mockResolvedValue({ data: { accessToken: "jwt", user: { id: "1", role: "CLIENTE" } } });
    renderAppleSignIn();
    fireEvent.click(screen.getByRole("button", { name: /continuar con apple/i }));
    await waitFor(() => expect(mocks.authenticateWithApple).toHaveBeenCalledWith("apple-token", "nonce"));
    expect(mocks.login).toHaveBeenCalledWith({ accessToken: "jwt", user: { id: "1", role: "CLIENTE" } });
    expect(mocks.navigate).toHaveBeenCalledWith("/cliente/dashboard");
  });

  it("muestra LINK_REQUIRED sin crear sesión", async () => {
    mocks.startAppleSignIn.mockResolvedValue({ identityToken: "apple-token", nonce: "nonce" });
    mocks.authenticateWithApple.mockResolvedValue({ data: { status: "LINK_REQUIRED" } });
    renderAppleSignIn();
    fireEvent.click(screen.getByRole("button", { name: /continuar con apple/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/ya existe una cuenta/i);
    expect(mocks.login).not.toHaveBeenCalled();
  });

  it("transporta sólo pendingToken y metadata visual al onboarding", async () => {
    mocks.startAppleSignIn.mockResolvedValue({ identityToken: "apple-token", nonce: "nonce", user: { name: { firstName: "Ada", lastName: "Lovelace" } } });
    mocks.authenticateWithApple.mockResolvedValue({ data: { status: "ONBOARDING_REQUIRED", pendingToken: "pending" } });
    renderAppleSignIn();
    fireEvent.click(screen.getByRole("button", { name: /continuar con apple/i }));
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith("/auth/apple/onboarding", {
      state: { pendingToken: "pending", profile: { nombre: "Ada", apellido: "Lovelace" } },
    }));
    expect(mocks.navigate.mock.calls[0][1].state).not.toHaveProperty("identityToken");
  });

  it("trata la cancelación como no fatal y restablece el botón", async () => {
    mocks.startAppleSignIn.mockRejectedValue(new Error("Apple sign-in cancelled"));
    renderAppleSignIn();
    fireEvent.click(screen.getByRole("button", { name: /continuar con apple/i }));
    await waitFor(() => expect(screen.getByRole("button", { name: /continuar con apple/i })).not.toBeDisabled());
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(mocks.login).not.toHaveBeenCalled();
  });

  it("valida role y consentimientos antes del envío", () => {
    renderOnboarding();
    fireEvent.click(screen.getByRole("button", { name: /continuar/i }));
    expect(screen.getByRole("alert")).toHaveTextContent(/selecciona el perfil/i);
    fireEvent.click(screen.getByRole("button", { name: /atleta/i }));
    fireEvent.click(screen.getByRole("button", { name: /continuar/i }));
    expect(screen.getByRole("alert")).toHaveTextContent(/debes aceptar/i);
  });

  it("envía el payload Apple mínimo y maneja éxito y errores sociales", async () => {
    mocks.completeAppleOnboarding.mockRejectedValueOnce({ response: { data: { code: "SOCIAL_EMAIL_REQUIRED" } } });
    renderOnboarding();
    fireEvent.click(screen.getByRole("button", { name: /atleta/i }));
    fireEvent.click(screen.getByLabelText(/términos/i));
    fireEvent.click(screen.getByLabelText(/política/i));
    fireEvent.click(screen.getByRole("button", { name: /continuar/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/correo verificable/i);
    expect(mocks.completeAppleOnboarding).toHaveBeenCalledWith({
      pendingToken: "pending", role: "CLIENTE", nombre: "Ada", apellido: "Lovelace",
      acceptTerms: true, acceptPrivacy: true, marketingConsent: false,
    });
  });

  it("instala sesión y navega según el role tras completar onboarding", async () => {
    mocks.completeAppleOnboarding.mockResolvedValue({ data: { accessToken: "jwt", user: { id: "2", role: "ENTRENADOR" } } });
    renderOnboarding();
    fireEvent.click(screen.getByRole("button", { name: /coach/i }));
    fireEvent.click(screen.getByLabelText(/términos/i));
    fireEvent.click(screen.getByLabelText(/política/i));
    fireEvent.click(screen.getByRole("button", { name: /continuar/i }));
    await waitFor(() => expect(mocks.login).toHaveBeenCalledWith({ accessToken: "jwt", user: { id: "2", role: "ENTRENADOR" } }));
    expect(mocks.navigate).toHaveBeenCalledWith("/entrenador/onboarding", { replace: true });
  });

  it.each([
    ["INVALID_PENDING_SOCIAL_AUTH", /sesión de registro ha caducado/i],
    ["EMAIL_ALREADY_IN_USE", /ya existe una cuenta/i],
  ])("muestra un error seguro para %s", async (code, message) => {
    mocks.completeAppleOnboarding.mockRejectedValueOnce({ response: { data: { code } } });
    renderOnboarding();
    fireEvent.click(screen.getByRole("button", { name: /atleta/i }));
    fireEvent.click(screen.getByLabelText(/términos/i));
    fireEvent.click(screen.getByLabelText(/política/i));
    fireEvent.click(screen.getByRole("button", { name: /continuar/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(message);
  });
});
