import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { obtenerClientesEntrenador, ficharCliente } from "../../api/endpoints";

// Iconos
import {
  User,
  ChevronRight,
  Plus,
  X,
  CheckCircle,
  AlertCircle,
  Mail,
} from "lucide-react";

// ✅ Reutilizamos componentes UI
import GymButton from "../../components/ui/GymButton";
import GymInput from "../../components/ui/GymInput";

export default function MenuEntrenador() {
  const navigate = useNavigate();
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newClientEmail, setNewClientEmail] = useState("");
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });

  const entrenadorId = localStorage.getItem("entrenadorId");

  useEffect(() => {
    if (entrenadorId) cargarClientes();
    else navigate("/auth/login");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  const cargarClientes = async () => {
    try {
      setLoading(true);
      const data = await obtenerClientesEntrenador(entrenadorId);
      setClientes(data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 3000);
  };

  const handleFichar = async () => {
    if (!newClientEmail || !newClientEmail.includes("@")) {
      showToast("Introduce un email válido", "error");
      return;
    }
    try {
      await ficharCliente(entrenadorId, newClientEmail.trim());
      showToast("¡Cliente vinculado con éxito!", "success");
      setShowAddModal(false);
      setNewClientEmail("");
      cargarClientes();
    } catch (error) {
      const msg = error.response?.data || "No se encontró el usuario o ya está vinculado";
      showToast(msg, "error");
    }
  };

  const handleGestionar = (idCliente) => {
    localStorage.setItem("clienteObjetivoId", idCliente);
    navigate(`/entrenador/cliente/${idCliente}/rutinas`);
  };

  // --- ESTILOS (solo contenido) ---
  const styles = {
    toast: {
      position: "fixed",
      top: "30px",
      left: "50%",
      transform: toast.show ? "translate(-50%, 0)" : "translate(-50%, -20px)",
      opacity: toast.show ? 1 : 0,
      pointerEvents: toast.show ? "auto" : "none",
      zIndex: 9999,
      background: "#18181b",
      border: `1px solid ${toast.type === "success" ? "#10B981" : "#EF4444"}`,
      color: "white",
      padding: "12px 24px",
      borderRadius: "50px",
      display: "flex",
      alignItems: "center",
      gap: "12px",
      boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
      fontWeight: "600",
      fontSize: "0.95rem",
      transition: "all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
    },

    header: {
      marginBottom: "50px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: "20px",
    },
    title: {
      fontSize: "2.5rem",
      fontWeight: "900",
      margin: 0,
      textTransform: "uppercase",
      letterSpacing: "-0.5px",
      color: "white",
      lineHeight: "1",
    },
    subtitle: { color: "#71717a", marginTop: "10px", fontSize: "1.1rem" },

    addClientBtn: {
      background: "#FACC15",
      border: "none",
      borderRadius: "14px",
      padding: "14px 18px",
      fontWeight: "900",
      cursor: "pointer",
      display: "inline-flex",
      alignItems: "center",
      gap: "10px",
      textTransform: "uppercase",
      boxShadow: "0 4px 20px rgba(250, 204, 21, 0.2)",
      transition: "transform 0.15s ease, box-shadow 0.15s ease",
    },

    statsGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
      gap: "20px",
      marginBottom: "50px",
    },
    statCard: {
      background: "#121214",
      border: "1px solid #27272a",
      borderRadius: "16px",
      padding: "25px",
      display: "flex",
      flexDirection: "column",
      gap: "5px",
    },
    statLabel: { color: "#71717a", fontSize: "0.85rem", fontWeight: "800", textTransform: "uppercase" },
    statNumber: { color: "white", fontSize: "2rem", fontWeight: "900" },

    grid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
      gap: "20px",
      paddingBottom: "60px",
    },

    clientCard: {
      background: "#121214",
      border: "1px solid #27272a",
      borderRadius: "18px",
      padding: "22px",
      cursor: "pointer",
      transition: "all 0.2s",
    },
    clientHeader: { display: "flex", gap: "14px", alignItems: "center", marginBottom: "14px" },
    avatar: {
      width: "52px",
      height: "52px",
      borderRadius: "16px",
      background: "#18181b",
      border: "1px solid #27272a",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    clientName: { margin: 0, color: "white", fontWeight: "900", textTransform: "uppercase", fontSize: "1rem" },
    clientObj: { color: "#a1a1aa", fontSize: "0.9rem", marginTop: "4px" },

    manageBtn: {
      width: "100%",
      marginTop: "14px",
      padding: "12px",
      borderRadius: "12px",
      border: "1px solid #27272a",
      background: "#18181b",
      color: "white",
      fontWeight: "800",
      textTransform: "uppercase",
      cursor: "pointer",
      display: "inline-flex",
      justifyContent: "center",
      alignItems: "center",
      gap: "10px",
      transition: "background 0.2s",
    },

    modalOverlay: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.9)",
      backdropFilter: "blur(10px)",
      zIndex: 200,
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      padding: "16px",
    },
    modalCard: {
      background: "#0a0a0a",
      borderRadius: "24px",
      width: "100%",
      maxWidth: "520px",
      padding: "34px",
      position: "relative",
      border: "1px solid rgba(255,255,255,0.10)",
      boxShadow: "0 25px 80px rgba(0,0,0,1)",
    },
    modalTitle: {
      color: "white",
      fontSize: "1.7rem",
      fontWeight: "900",
      margin: "0 0 8px 0",
      textTransform: "uppercase",
      lineHeight: "1",
    },
    modalSub: { color: "#a1a1aa", margin: 0, fontSize: "0.95rem" },
    closeBtn: {
      position: "absolute",
      top: "18px",
      right: "18px",
      background: "transparent",
      border: "none",
      color: "#a1a1aa",
      cursor: "pointer",
      padding: "8px",
      borderRadius: "12px",
    },
  };

  return (
    <div>
      <div style={styles.toast}>
        {toast.type === "success" ? (
          <CheckCircle size={20} color="#10B981" />
        ) : (
          <AlertCircle size={20} color="#EF4444" />
        )}
        {toast.message}
      </div>

      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Panel de Entrenador</h1>
          <p style={styles.subtitle}>Gestiona el progreso y planes de tus atletas.</p>
        </div>

        <button
          type="button"
          style={styles.addClientBtn}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowAddModal(true);
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "scale(1.05)";
            e.currentTarget.style.boxShadow = "0 0 25px rgba(250, 204, 21, 0.4)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "scale(1)";
            e.currentTarget.style.boxShadow = "0 4px 20px rgba(250, 204, 21, 0.2)";
          }}
        >
          <Plus size={20} /> Nuevo Atleta
        </button>
      </header>

      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Total Atletas</div>
          <div style={styles.statNumber}>{clientes.length}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Planes Activos</div>
          <div style={{ ...styles.statNumber, color: "#FACC15" }}>12</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Sesiones Hoy</div>
          <div style={styles.statNumber}>5</div>
        </div>
      </div>

      <h3 style={{ color: "#52525b", fontSize: "0.85rem", marginBottom: "25px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "1px" }}>
        MIS ATLETAS ACTIVOS
      </h3>

      {loading ? (
        <div style={{ color: "#a1a1aa" }}>Cargando atletas...</div>
      ) : (
        <div style={styles.grid}>
          {clientes.map((cliente) => (
            <div
              key={cliente.id}
              style={styles.clientCard}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#FACC15";
                e.currentTarget.style.transform = "translateY(-5px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#27272a";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <div style={styles.clientHeader}>
                <div style={styles.avatar}>
                  {cliente.fotoPerfil ? (
                    <img
                      src={cliente.fotoPerfil}
                      alt="perfil"
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <User size={28} color="#71717a" />
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <h4 style={styles.clientName}>
                    {cliente.nombre} {cliente.apellido}
                  </h4>
                  <div style={styles.clientObj}>
                    {cliente.objetivo || "Sin objetivo definido"}
                  </div>
                </div>
              </div>

              <button
                type="button"
                style={styles.manageBtn}
                onClick={() => handleGestionar(cliente.id)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "white";
                  e.currentTarget.style.color = "black";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#18181b";
                  e.currentTarget.style.color = "white";
                }}
              >
                Gestionar <ChevronRight size={18} />
              </button>
            </div>
          ))}

          {clientes.length === 0 && (
            <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "40px", color: "#52525b", border: "1px dashed #27272a", borderRadius: "20px" }}>
              <p>No tienes atletas vinculados todavía.</p>
            </div>
          )}
        </div>
      )}

      {/* Modal: Fichar cliente */}
      {showAddModal && (
        <div style={styles.modalOverlay} onClick={() => setShowAddModal(false)}>
          <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <button type="button" style={styles.closeBtn} onClick={() => setShowAddModal(false)}>
              <X size={22} />
            </button>

            <h3 style={styles.modalTitle}>Vincular nuevo atleta</h3>
            <p style={styles.modalSub}>Introduce el email del cliente para vincularlo a tu cuenta.</p>

            <div style={{ marginTop: "18px" }}>
              <GymInput
                icon={Mail}
                placeholder="Email del atleta"
                value={newClientEmail}
                onChange={(e) => setNewClientEmail(e.target.value)}
              />
            </div>

            <div style={{ marginTop: "18px" }}>
              <GymButton onClick={handleFichar} fullWidth>
                Vincular atleta
              </GymButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
