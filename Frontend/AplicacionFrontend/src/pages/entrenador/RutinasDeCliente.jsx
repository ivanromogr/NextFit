import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  obtenerRutinasAsignadasPorEntrenador,
  getCliente,
  eliminarRutina,
} from "../../api/endpoints";
// 👇 IMPORTANTE: Añadimos TrendingUp a los iconos
import { Dumbbell, Plus, ChevronLeft, Edit, Trash2, Calendar, User, TrendingUp } from "lucide-react";

import GymButton from "../../components/ui/GymButton";
import ActionCard from "../../components/ui/ActionCard";

export default function RutinasDeCliente() {
  const { clienteId } = useParams();
  const navigate = useNavigate();

  const [rutinas, setRutinas] = useState([]);
  const [cliente, setCliente] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clienteId) {
      console.warn('clienteId ausente en la ruta, abortando carga de RutinasDeCliente.');
      setLoading(false);
      return;
    }
    cargarDatos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clienteId]);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const datosCliente = await getCliente(clienteId);
      setCliente(datosCliente);

      const datosRutinas = await obtenerRutinasAsignadasPorEntrenador(clienteId);
      setRutinas(datosRutinas || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCrearNueva = () => {
    localStorage.setItem("clienteObjetivoId", clienteId);
    navigate(`/entrenador/cliente/${clienteId}/crear-rutina`);
  };

  const handleEditar = (rutinaId) => {
    localStorage.setItem("clienteObjetivoId", clienteId);
    navigate(`/entrenador/cliente/${clienteId}/editar-rutina/${rutinaId}`);
  };

  // 👇 Navegación al Calendario
  const handleVerCalendario = () => {
    navigate(`/entrenador/cliente/${clienteId}/calendario`);
  };

  // 👇 NUEVO: Navegación al Progreso/Estadísticas
  const handleVerProgreso = () => {
    navigate(`/entrenador/cliente/${clienteId}/progreso`);
  };

  const handleEliminar = async (rutinaId) => {
    if (window.confirm("¿Seguro que quieres borrar esta rutina del cliente?")) {
      await eliminarRutina(rutinaId);
      cargarDatos();
    }
  };

  const styles = {
    container: {
      minHeight: "100vh",
      background: "#09090b",
      padding: "40px",
      color: "white",
      fontFamily: "'Inter', sans-serif",
    },
    header: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: "40px",
      borderBottom: "1px solid rgba(255,255,255,0.08)",
      paddingBottom: "20px",
      gap: "20px",
    },
    headerActions: {
        display: "flex",
        gap: "12px",
        alignItems: "center"
    },
    title: { fontSize: "2rem", fontWeight: "900", textTransform: "uppercase", margin: 0 },
    subTitle: { color: "rgba(255,255,255,0.55)", marginTop: "6px" },

    grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))", gap: "25px" },

    card: {
      background: "#121214",
      border: "1px solid rgba(255,255,255,0.10)",
      borderRadius: "16px",
      padding: "25px",
      display: "flex",
      flexDirection: "column",
      gap: "15px",
      position: "relative",
      transition: "transform 0.2s",
    },
    cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" },
    pill: {
      background: "rgba(250, 204, 21, 0.10)",
      color: "#FACC15",
      padding: "4px 10px",
      borderRadius: "999px",
      fontSize: "0.75rem",
      fontWeight: "800",
      textTransform: "uppercase",
    },

    cardTitle: { fontSize: "1.4rem", fontWeight: "800", margin: "10px 0 5px 0", textTransform: "uppercase" },
    cardInfo: { color: "rgba(255,255,255,0.60)", fontSize: "0.9rem" },

    actions: {
      display: "flex",
      gap: "10px",
      marginTop: "auto",
      paddingTop: "15px",
      borderTop: "1px solid rgba(255,255,255,0.08)",
    },
    actionBtn: {
      flex: 1,
      padding: "10px",
      borderRadius: "10px",
      border: "none",
      cursor: "pointer",
      fontWeight: 800,
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      gap: "6px",
      fontSize: "0.9rem",
    },
  };

  if (loading)
    return (
      <div
        style={{
          background: "#09090b",
          height: "100vh",
          color: "white",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        Cargando planes...
      </div>
    );

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={{ flex: 1 }}>
          <GymButton variant="secondary" onClick={() => navigate("/entrenador/dashboard")}>
            <ChevronLeft size={18} /> Volver
          </GymButton>

          <div style={{ marginTop: "20px", display: "flex", alignItems: "center", gap: "15px" }}>
            <div
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.10)",
                padding: "15px",
                borderRadius: "16px",
              }}
            >
              <User size={30} color="#FACC15" />
            </div>
            <div>
              <h1 style={styles.title}>
                {cliente?.nombre} {cliente?.apellido}
              </h1>
              <div style={styles.subTitle}>Gestionando planes asignados</div>
            </div>
          </div>
        </div>

        {/* 👇 AQUÍ ESTÁN LOS 3 BOTONES AHORA */}
        <div style={styles.headerActions}>
            <GymButton variant="secondary" onClick={handleVerProgreso}>
                <TrendingUp size={18} /> Progreso
            </GymButton>

            <GymButton variant="secondary" onClick={handleVerCalendario}>
                <Calendar size={18} /> Calendario
            </GymButton>
            
            <GymButton onClick={handleCrearNueva}>
                <Plus size={18} /> Nueva rutina
            </GymButton>
        </div>
      </div>

      <div style={styles.grid}>
        {rutinas.map((rutina) => (
          <div key={rutina.id} style={styles.card}>
            <div style={styles.cardHeader}>
              <span style={styles.pill}>{rutina.objetivo}</span>
              <Dumbbell size={20} color="rgba(255,255,255,0.35)" />
            </div>

            <div>
              <h3 style={styles.cardTitle}>{rutina.nombre}</h3>
              <p style={styles.cardInfo}>
                {rutina.nivel} • {rutina.detalles?.length || 0} ejercicios
              </p>
            </div>

            <div style={styles.actions}>
              <button
                style={{
                  ...styles.actionBtn,
                  background: "rgba(255,255,255,0.06)",
                  color: "white",
                  border: "1px solid rgba(255,255,255,0.10)",
                }}
                onClick={() => handleEditar(rutina.id)}
              >
                <Edit size={16} /> Editar
              </button>

              <button
                style={{
                  ...styles.actionBtn,
                  background: "rgba(239, 68, 68, 0.12)",
                  color: "#ef4444",
                  border: "1px solid rgba(239, 68, 68, 0.20)",
                }}
                onClick={() => handleEliminar(rutina.id)}
              >
                <Trash2 size={16} /> Eliminar
              </button>
            </div>
          </div>
        ))}

        {rutinas.length === 0 && (
          <div style={{ gridColumn: "1/-1" }}>
            <ActionCard
              title="Crea la primera rutina"
              description="Aún no has asignado ninguna rutina a este atleta. Crea una para empezar a planificar su progreso."
              icon={Calendar}
              variant="highlight"
              onClick={handleCrearNueva}
            />
          </div>
        )}
      </div>
    </div>
  );
}