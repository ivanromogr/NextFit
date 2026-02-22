import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { obtenerRutinasCliente, eliminarRutina } from "../../api/endpoints";
import { useAuth } from "../../context/AuthContext";

// Iconos
import {
  Dumbbell,
  Sparkles,
  Play,
  MoreHorizontal,
  ArrowRight,
  Edit,
  Trash2,
  AlertTriangle,
  Crown,
  X,
} from "lucide-react";

export default function MenuCliente() {
  const navigate = useNavigate();
  const { userId } = useAuth();
  const [rutinas, setRutinas] = useState([]);
  const [loading, setLoading] = useState(true);

  const [activeMenu, setActiveMenu] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [rutinaToDelete, setRutinaToDelete] = useState(null);

  // ✅ Modal para ver días del plan IA
  const [showIAPlanModal, setShowIAPlanModal] = useState(false);
  const [iaPlanSelected, setIaPlanSelected] = useState(null);

  useEffect(() => {
    if (userId) cargarRutinas(userId);
    else navigate("/auth/login");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    const handleClickOutside = () => setActiveMenu(null);
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  const cargarRutinas = async (id) => {
    try {
      setLoading(true);
      const data = await obtenerRutinasCliente(id);
      setRutinas(data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const toggleMenu = (e, id) => {
    e.stopPropagation();
    setActiveMenu(activeMenu === id ? null : id);
  };

  const handleDeleteClick = (e, rutina) => {
    e.stopPropagation();
    setRutinaToDelete(rutina);
    setShowDeleteModal(true);
    setActiveMenu(null);
  };

  const confirmDelete = async () => {
    if (!rutinaToDelete) return;
    try {
      await eliminarRutina(rutinaToDelete.id);
      setRutinas(rutinas.filter((r) => r.id !== rutinaToDelete.id));
      setShowDeleteModal(false);
      setRutinaToDelete(null);
    } catch (error) {
      alert("No se pudo eliminar.");
    }
  };

  // ✅ helpers IA
  const getIAPlanKey = (rutina) => {
    const nombre = (rutina?.nombre || "").trim();
    if (nombre.toLowerCase().startsWith("día")) {
      const parts = nombre.split(" - ");
      if (parts.length >= 2) return parts.slice(1).join(" - ").trim();
    }
    return `${rutina?.objetivo || "PLAN"}|${rutina?.nivel || ""}`.trim();
  };

  const parseDiaNumero = (rutina) => {
    const nombre = (rutina?.nombre || "").toLowerCase();
    const match = nombre.match(/día\s*(\d+)/i);
    return match ? parseInt(match[1], 10) : 9999;
  };

  // ✅ FILTRADO
  const rutinasEntrenador = rutinas.filter((r) => r.creador === "ENTRENADOR");
  const rutinasIA = rutinas.filter((r) => r.creador === "IA");
  const rutinasPropiasNoIA = rutinas.filter(
    (r) => r.creador !== "ENTRENADOR" && r.creador !== "IA"
  );

  // ✅ AGRUPACIÓN IA
  const iaPlanGroups = useMemo(() => {
    const map = new Map();
    for (const r of rutinasIA) {
      const key = getIAPlanKey(r);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(r);
    }
    for (const [k, arr] of map.entries()) {
      arr.sort((a, b) => parseDiaNumero(a) - parseDiaNumero(b));
      map.set(k, arr);
    }
    return Array.from(map.entries()).map(([key, items]) => ({
      key,
      items,
      objetivo: items?.[0]?.objetivo || "IA",
      nivel: items?.[0]?.nivel || "",
    }));
  }, [rutinasIA]);

  const openIAPlan = (group) => {
    setIaPlanSelected(group);
    setShowIAPlanModal(true);
  };

  const styles = {
    main: { padding: "50px 80px", color: "white" },
    header: { marginBottom: "50px" },
    title: { fontSize: "2.5rem", fontWeight: "900", margin: 0, textTransform: "uppercase", letterSpacing: "-1px", lineHeight: "1" },
    subtitle: { color: "#71717a", marginTop: "10px", fontSize: "1.1rem" },
    sectionLabel: { fontSize: "0.85rem", fontWeight: "700", color: "#71717a", textTransform: "uppercase", letterSpacing: "2px", marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px" },
    divider: { flex: 1, height: "1px", background: "#27272a" },
    gridCoach: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "30px", marginBottom: "50px" },
    gridPersonal: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 460px))", gap: "25px", paddingBottom: "50px", justifyContent: "start" },
    coachCard: { background: "linear-gradient(145deg, #121214 0%, #0c0c0e 100%)", border: "1px solid rgba(250, 204, 21, 0.3)", borderRadius: "24px", padding: "35px", position: "relative", overflow: "hidden", boxShadow: "0 10px 40px -10px rgba(250, 204, 21, 0.1)", transition: "transform 0.3s ease, box-shadow 0.3s ease", cursor: "pointer" },
    coachBadge: { position: "absolute", top: "25px", right: "25px", background: "rgba(250, 204, 21, 0.15)", color: "#FACC15", padding: "6px 12px", borderRadius: "50px", fontSize: "0.75rem", fontWeight: "800", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "6px" },
    coachTitle: { fontSize: "1.8rem", fontWeight: "800", color: "white", margin: "10px 0 5px 0", textTransform: "uppercase" },
    coachSub: { color: "#a1a1aa", fontSize: "0.95rem" },
    btnStartCoach: { marginTop: "25px", width: "100%", padding: "16px", borderRadius: "14px", background: "#FACC15", color: "black", fontWeight: "800", border: "none", cursor: "pointer", fontSize: "0.95rem", textTransform: "uppercase", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", boxShadow: "0 4px 15px rgba(250, 204, 21, 0.2)" },
    personalCard: { background: "#121214", border: "1px solid #27272a", borderRadius: "20px", padding: "25px", display: "flex", flexDirection: "column", gap: "20px", transition: "all 0.2s", cursor: "pointer", position: "relative" },
    pill: { background: "#27272a", color: "#e4e4e7", padding: "4px 10px", borderRadius: "6px", fontSize: "0.7rem", fontWeight: "700", textTransform: "uppercase" },
    previewText: { color: "#52525b", fontSize: "0.85rem", lineHeight: "1.5", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", minHeight: "2.5em" },
    btnStartPersonal: { marginTop: "auto", width: "100%", padding: "12px", borderRadius: "10px", background: "#18181b", color: "white", fontWeight: "700", border: "1px solid #27272a", cursor: "pointer", fontSize: "0.85rem", textTransform: "uppercase", transition: "background 0.2s" },
    menuBtn: { color: "#52525b", padding: "8px", borderRadius: "50%", cursor: "pointer" },
    dropdown: { position: "absolute", top: "40px", right: "10px", background: "#18181b", border: "1px solid #27272a", borderRadius: "12px", padding: "6px", zIndex: 10, width: "150px", boxShadow: "0 10px 30px rgba(0,0,0,0.5)" },
    dropdownItem: { display: "flex", alignItems: "center", gap: "10px", padding: "10px", fontSize: "0.85rem", color: "#e4e4e7", borderRadius: "8px", cursor: "pointer" },
    iaCard: { background: "linear-gradient(145deg, rgba(250,204,21,0.10) 0%, #121214 60%)", border: "1px solid rgba(250, 204, 21, 0.25)", borderRadius: "20px", padding: "26px", display: "flex", flexDirection: "column", gap: "14px", cursor: "pointer", transition: "all 0.2s", position: "relative", maxWidth: "520px" },
    iaTopRow: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" },
    iaPill: { background: "rgba(250,204,21,0.15)", color: "#FACC15", padding: "6px 10px", borderRadius: "10px", fontSize: "0.72rem", fontWeight: "900", textTransform: "uppercase", letterSpacing: "1px", display: "inline-flex", alignItems: "center", gap: "8px" },
    iaTitle: { margin: 0, fontSize: "1.25rem", fontWeight: "900", textTransform: "uppercase" },
    iaSub: { margin: 0, color: "#a1a1aa", fontSize: "0.95rem" },
    iaBtn: { marginTop: "10px", width: "100%", padding: "12px", borderRadius: "12px", background: "#FACC15", color: "black", fontWeight: "900", border: "none", cursor: "pointer", textTransform: "uppercase", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" },
    iaStatsRow: { display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "6px" },
    iaStat: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "10px 12px", display: "flex", flexDirection: "column", gap: "2px", minWidth: "120px" },
    iaStatLabel: { color: "#a1a1aa", fontSize: "0.72rem", fontWeight: "800", textTransform: "uppercase", letterSpacing: "1px" },
    iaStatValue: { color: "white", fontSize: "0.95rem", fontWeight: "900", textTransform: "uppercase" },
    iaBarWrap: { marginTop: "10px", height: "8px", background: "rgba(255,255,255,0.06)", borderRadius: "999px", overflow: "hidden", border: "1px solid rgba(255,255,255,0.06)" },
    iaBar: { height: "100%", background: "#FACC15", boxShadow: "0 0 12px rgba(250,204,21,0.45)" },
    modalOverlay: { position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)", zIndex: 100, display: "flex", justifyContent: "center", alignItems: "center", padding: "16px" },
    modalCard: { background: "#09090b", padding: "30px", borderRadius: "24px", border: "1px solid #27272a", width: "100%", maxWidth: "520px", textAlign: "left", position: "relative" },
    modalBtnDelete: { flex: 1, background: "#ef4444", color: "white", padding: "14px", borderRadius: "12px", fontWeight: "bold", border: "none", cursor: "pointer" },
    modalBtnCancel: { flex: 1, background: "transparent", color: "#a1a1aa", padding: "14px", borderRadius: "12px", fontWeight: "bold", border: "1px solid #27272a", cursor: "pointer" },
    iaList: { display: "grid", gap: "10px", marginTop: "16px" },
    iaRow: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", padding: "12px", border: "1px solid #27272a", borderRadius: "14px", background: "#121214" },
    iaRowLeft: { display: "flex", flexDirection: "column", gap: "2px" },
    iaRowTitle: { fontWeight: "900", textTransform: "uppercase", fontSize: "0.95rem" },
    iaRowSub: { color: "#a1a1aa", fontSize: "0.85rem" },
    iaRowBtn: { padding: "10px 12px", borderRadius: "12px", background: "#18181b", border: "1px solid #27272a", color: "white", fontWeight: "800", cursor: "pointer", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "8px" },
    modalClose: { position: "absolute", top: "14px", right: "14px", background: "transparent", border: "none", color: "#a1a1aa", cursor: "pointer", padding: "10px", borderRadius: "12px" },
  };

  return (
    <div style={styles.main}>
      <header style={styles.header}>
        <h1 style={styles.title}>Mis Entrenamientos</h1>
        <p style={styles.subtitle}>Tu biblioteca de rutinas.</p>
      </header>

      {/* --- 1. ZONA COACH --- */}
      {rutinasEntrenador.length > 0 && (
        <div style={{ marginBottom: "60px" }}>
          <div style={styles.sectionLabel}>
            <Crown size={16} color="#FACC15" /> Asignado por tu Coach{" "}
            <div style={styles.divider}></div>
          </div>

          <div style={styles.gridCoach}>
            {rutinasEntrenador.map((rutina) => (
              <div
                key={rutina.id}
                style={styles.coachCard}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-5px)";
                  e.currentTarget.style.boxShadow = "0 20px 50px -10px rgba(250, 204, 21, 0.15)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 10px 40px -10px rgba(250, 204, 21, 0.1)";
                }}
              >
                <div style={styles.coachBadge}>
                  <Sparkles size={12} /> PLAN OFICIAL
                </div>

                <div style={{ marginTop: "10px" }}>
                  <span style={{ color: "#FACC15", fontSize: "0.8rem", fontWeight: "bold", textTransform: "uppercase" }}>
                    {rutina.objetivo}
                  </span>
                  <h3 style={styles.coachTitle}>{rutina.nombre}</h3>
                  <p style={styles.coachSub}>
                    {rutina.detalles?.length || 0} Ejercicios • {rutina.nivel}
                  </p>
                </div>

                <button
                  style={styles.btnStartCoach}
                  onClick={() => navigate(`/cliente/sesion/${rutina.id}`)}
                >
                  <Play size={20} fill="black" /> EMPEZAR SESIÓN
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- 3. PERSONALES --- */}
      <div style={styles.sectionLabel}>
        <Dumbbell size={16} /> Mis Rutinas Personales <div style={styles.divider}></div>
      </div>

      <div style={styles.gridPersonal}>
        
        {/* ✅ Card GLOBAL por planes IA */}
        {iaPlanGroups.map((group) => {
          const daysCount = group.items.length;
          const preview = group.items?.[0]?.detalles?.map((d) => d.ejercicio.nombre).join(", ") || "Pulsa para ver los días del plan.";
          const totalEjercicios = group.items.reduce((acc, r) => acc + (r.detalles?.length || 0), 0);
          const nivelLabel = (group.nivel || "").toString().replaceAll("_", " ");
          const objetivoLabel = (group.objetivo || "IA").toString().replaceAll("_", " ");

          return (
            <div
              key={group.key}
              style={styles.iaCard}
              onClick={() => openIAPlan(group)}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "rgba(250,204,21,0.45)";
                e.currentTarget.style.transform = "translateY(-4px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(250,204,21,0.25)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <div style={styles.iaTopRow}>
                <div style={styles.iaPill}>
                  <Sparkles size={16} /> PLAN IA
                </div>
                <div style={{ color: "#FACC15", fontWeight: "900", textTransform: "uppercase", fontSize: "0.85rem" }}>
                  {daysCount} día{daysCount !== 1 ? "s" : ""}
                </div>
              </div>

              <h3 style={styles.iaTitle}>
                {group.key?.includes("|") ? `Plan ${objetivoLabel}` : group.key}
              </h3>

              <p style={styles.iaSub}>
                Objetivo:{" "}
                <span style={{ color: "white", fontWeight: "800" }}>{objetivoLabel}</span>
                {nivelLabel ? (
                  <>
                    {" "}
                    · Nivel:{" "}
                    <span style={{ color: "white", fontWeight: "800" }}>{nivelLabel}</span>
                  </>
                ) : null}
              </p>

              <div style={styles.iaStatsRow}>
                <div style={styles.iaStat}>
                  <div style={styles.iaStatLabel}>DÍAS</div>
                  <div style={styles.iaStatValue}>{daysCount}</div>
                </div>
                <div style={styles.iaStat}>
                  <div style={styles.iaStatLabel}>EJERCICIOS</div>
                  <div style={styles.iaStatValue}>{totalEjercicios}</div>
                </div>
                <div style={styles.iaStat}>
                  <div style={styles.iaStatLabel}>NIVEL</div>
                  <div style={styles.iaStatValue}>{nivelLabel || "—"}</div>
                </div>
              </div>

              <div style={styles.iaBarWrap}>
                <div
                  style={{
                    ...styles.iaBar,
                    width: `${Math.min(100, 20 + daysCount * 15)}%`,
                  }}
                />
              </div>

              <div style={styles.previewText}>{preview}</div>

              <button
                style={styles.iaBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  openIAPlan(group);
                }}
              >
                Ver días del plan <ArrowRight size={18} />
              </button>
            </div>
          );
        })}

        {/* ✅ Rutinas NO IA */}
        {rutinasPropiasNoIA.map((rutina) => (
          <div
            key={rutina.id}
            style={styles.personalCard}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#52525b")}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#27272a")}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <span style={styles.pill}>{rutina.objetivo}</span>

              <div style={{ position: "relative" }}>
                <div style={styles.menuBtn} onClick={(e) => toggleMenu(e, rutina.id)}>
                  <MoreHorizontal size={20} />
                </div>

                {activeMenu === rutina.id && (
                  <div style={styles.dropdown}>
                    <div
                      style={styles.dropdownItem}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/cliente/editar-rutina/${rutina.id}`);
                      }}
                    >
                      <Edit size={16} /> Editar
                    </div>

                    <div
                      style={{ ...styles.dropdownItem, color: "#ef4444" }}
                      onClick={(e) => handleDeleteClick(e, rutina)}
                    >
                      <Trash2 size={16} /> Eliminar
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3
                style={{
                  fontSize: "1.3rem",
                  fontWeight: "800",
                  color: "white",
                  margin: "0 0 5px 0",
                  textTransform: "uppercase",
                }}
              >
                {rutina.nombre}
              </h3>

              <div style={styles.previewText}>
                {rutina.detalles?.map((d) => d.ejercicio.nombre).join(", ")}
              </div>
            </div>

            <button
              style={styles.btnStartPersonal}
              onClick={() => navigate(`/cliente/sesion/${rutina.id}`)}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "white";
                e.currentTarget.style.color = "black";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#18181b";
                e.currentTarget.style.color = "white";
              }}
            >
              EMPEZAR
            </button>
          </div>
        ))}
      </div>

      {/* Modal Eliminar */}
      {showDeleteModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <div style={{ background: "rgba(239, 68, 68, 0.1)", padding: "20px", borderRadius: "50%", display: "inline-block", marginBottom: "20px" }}>
              <AlertTriangle size={40} color="#ef4444" />
            </div>
            <h3 style={{ color: "white", margin: 0, fontSize: "1.5rem" }}>¿ELIMINAR RUTINA?</h3>
            <p style={{ color: "#a1a1aa", margin: "15px 0 30px 0" }}>Esta acción es irreversible.</p>
            <div style={{ display: "flex", gap: "15px" }}>
              <button style={styles.modalBtnCancel} onClick={() => setShowDeleteModal(false)}>CANCELAR</button>
              <button style={styles.modalBtnDelete} onClick={confirmDelete}>ELIMINAR</button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ Modal Plan IA (lista de días) */}
      {showIAPlanModal && iaPlanSelected && (
        <div style={styles.modalOverlay} onClick={() => setShowIAPlanModal(false)}>
          <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <button style={styles.modalClose} onClick={() => setShowIAPlanModal(false)}>
              <X size={20} />
            </button>

            <h3 style={{ margin: 0, fontSize: "1.35rem", fontWeight: "900", textTransform: "uppercase" }}>
              {iaPlanSelected.key?.includes("|") ? `Plan ${iaPlanSelected.objetivo}` : iaPlanSelected.key}
            </h3>
            <p style={{ marginTop: "8px", marginBottom: "0", color: "#a1a1aa" }}>Selecciona el día que quieres entrenar.</p>

            <div style={styles.iaList}>
              {iaPlanSelected.items.map((rutinaDia) => (
                <div key={rutinaDia.id} style={styles.iaRow}>
                  <div style={styles.iaRowLeft}>
                    <div style={styles.iaRowTitle}>{rutinaDia.nombre}</div>
                    <div style={styles.iaRowSub}>{rutinaDia.detalles?.length || 0} ejercicios</div>
                  </div>
                  <button
                    style={styles.iaRowBtn}
                    onClick={() => navigate(`/cliente/sesion/${rutinaDia.id}`)}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "white"; e.currentTarget.style.color = "black"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "#18181b"; e.currentTarget.style.color = "white"; }}
                  >
                    <Play size={18} /> Empezar
                  </button>
                </div>
              ))}
            </div>

            <div style={{ marginTop: "16px" }}>
              <button style={{ ...styles.modalBtnCancel, width: "100%" }} onClick={() => setShowIAPlanModal(false)}>CERRAR</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}