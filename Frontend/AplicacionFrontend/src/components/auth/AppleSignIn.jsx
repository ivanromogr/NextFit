import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authenticateWithApple } from "../../api/endpoints";
import { useAuth } from "../../context/AuthContext";
import { appleConfig, startAppleSignIn } from "../../services/appleAuthWeb";

const linkRequiredMessage = "Ya existe una cuenta de NextFit asociada a este correo. Inicia sesión con tu método actual y podrás vincular Apple desde la configuración de tu cuenta.";

const profileFromApple = (user) => ({
  nombre: user?.name?.firstName || "",
  apellido: user?.name?.lastName || "",
});

export default function AppleSignIn() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!appleConfig().appleAuthEnabled) return null;

  const handleAppleSignIn = async () => {
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      const { identityToken, nonce, user } = await startAppleSignIn();
      const { data } = await authenticateWithApple(identityToken, nonce);

      if (data?.accessToken && data?.user) {
        const session = login(data);
        navigate(session.role === "ENTRENADOR" ? "/entrenador/dashboard" : "/cliente/dashboard");
      } else if (data?.status === "LINK_REQUIRED") {
        setError(linkRequiredMessage);
      } else if (data?.status === "ONBOARDING_REQUIRED" && data.pendingToken) {
        navigate("/auth/apple/onboarding", {
          state: { pendingToken: data.pendingToken, profile: profileFromApple(user) },
        });
      } else {
        setError("No se ha podido iniciar sesión con Apple.");
      }
    } catch (err) {
      if (!/cancel/i.test(err?.message || "")) {
        setError(err.response?.data?.code === "SOCIAL_EMAIL_REQUIRED"
          ? "Apple no ha proporcionado un correo verificable para completar el registro. Intenta de nuevo con una cuenta de Apple que comparta el correo o utiliza otro método de registro."
          : "No se ha podido iniciar sesión con Apple.");
      }
    } finally {
      setLoading(false);
    }
  };

  return <div className="apple-sign-in">
    <button type="button" className="apple-sign-in-button" disabled={loading} onClick={handleAppleSignIn}>
      {loading ? "Conectando con Apple..." : "Continuar con Apple"}
    </button>
    {error && <div className="auth-error" role="alert">{error}</div>}
  </div>;
}
