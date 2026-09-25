import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { obtenerPlantillasEntrenador, eliminarRutina } from "../../api/endpoints";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";

import { 
    BookOpen, Plus, Edit, Trash2, Dumbbell, Activity, Copy
} from "lucide-react";

import GymButton from "../../components/ui/GymButton";

export default function PlantillasEntrenador() {
  const navigate = useNavigate();
  const { userId: entrenadorId } = useAuth();
  const toast = useToast();

  const [plantillas, setPlantillas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (entrenadorId) {
      cargarPlantillas();
    }
  }, [entrenadorId]);

  const cargarPlantillas = async () => {
    try {
      setLoading(true);
      const data = await obtenerPlantillasEntrenador(entrenadorId);
      setPlantillas(data || []);
    } catch {
      toast.error("Error al cargar la biblioteca de plantillas.");
    } finally {
      setLoading(false);
    }
  };

  const handleCrearNueva = () => {
    // Viajamos al creador, pero le pasamos un parámetro especial para que sepa que es plantilla
    navigate(`/entrenador/plantillas/crear`);
  };

  const handleEditar = (plantillaId) => {
    navigate(`/entrenador/plantillas/editar/${plantillaId}`);
  };

  const handleEliminar = async (plantillaId) => {
    if (window.confirm("¿Seguro que quieres borrar esta plantilla maestra? No afectará a los clientes que ya la tengan copiada.")) {
      try {
        await eliminarRutina(plantillaId);
        toast.success("Plantilla eliminada");
        cargarPlantillas();
      } catch {
        toast.error("Error al eliminar la plantilla");
      }
    }
  };

  const styles = {
    container: { minHeight: "100vh", background: "#050505", padding: "40px", color: "white", fontFamily: "'Inter', sans-serif" },
    header: { display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "40px", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "25px", gap: "20px", flexWrap: 'wrap' },
    titleBox: { display: 'flex', alignItems: 'center', gap: '20px' },
    iconWrap: { background: "rgba(250, 204, 21, 0.1)", border: "1px solid rgba(250, 204, 21, 0.2)", padding: "15px", borderRadius: "20px" },
    title: { fontSize: "2rem", fontWeight: 900, textTransform: "uppercase", margin: 0, letterSpacing: '-0.5px' },
    subTitle: { color: "rgba(255,255,255,0.5)", marginTop: "6px", fontSize: "0.95rem" },

    grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "25px" },

    card: { background: "linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "20px", padding: "25px", display: "flex", flexDirection: "column", gap: "15px", position: "relative", transition: "all 0.3s", backdropFilter: "blur(10px)" },
    cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" },
    pill: { background: "rgba(255, 255, 255, 0.1)", color: "white", padding: "6px 12px", borderRadius: "8px", fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: '0.5px' },

    cardTitle: { fontSize: "1.4rem", fontWeight: 900, margin: "10px 0 5px 0", textTransform: "uppercase" },
    cardInfo: { color: "rgba(255,255,255,0.5)", fontSize: "0.95rem" },

    actions: { display: "flex", gap: "10px", marginTop: "auto", paddingTop: "20px", borderTop: "1px dashed rgba(255,255,255,0.1)" },
    actionBtn: { flex: 1, padding: "12px", borderRadius: "12px", border: "none", cursor: "pointer", fontWeight: 800, display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", fontSize: "0.9rem", transition: 'all 0.2s' },
  };

  if (loading) return <div style={{ background: "#050505", height: "100vh", color: "#FACC15", display: "flex", justifyContent: "center", alignItems: "center" }}><Activity className="animate-pulse" size={40}/></div>;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.titleBox}>
          <div style={styles.iconWrap}>
            <Copy size={35} color="#FACC15" />
          </div>
          <div>
            <h1 style={styles.title}>Biblioteca de Plantillas</h1>
            <div style={styles.subTitle}>Crea rutinas maestras y asígnalas a tus atletas en 1 clic.</div>
          </div>
        </div>

        <GymButton onClick={handleCrearNueva} style={{ padding: '12px 24px' }}>
          <Plus size={20} /> Crear Nueva Plantilla
        </GymButton>
      </div>

      <div style={styles.grid}>
        {plantillas.map((rutina) => (
          <div 
            key={rutina.id} 
            style={styles.card}
            onMouseEnter={e => {e.currentTarget.style.borderColor='rgba(250,204,21,0.3)'; e.currentTarget.style.transform='translateY(-3px)'}}
            onMouseLeave={e => {e.currentTarget.style.borderColor='rgba(255,255,255,0.05)'; e.currentTarget.style.transform='translateY(0)'}}
          >
            <div style={styles.cardHeader}>
              <span style={styles.pill}>{rutina.objetivo || 'General'}</span>
              <BookOpen size={20} color="rgba(255,255,255,0.2)" />
            </div>

            <div>
              <h3 style={styles.cardTitle}>{rutina.nombre}</h3>
              <p style={styles.cardInfo}>
                {rutina.nivel || 'Multinivel'} • <span style={{color:'white', fontWeight: 700}}>{rutina.detalles?.length || 0}</span> ejercicios
              </p>
            </div>

            <div style={styles.actions}>
              <button
                style={{ ...styles.actionBtn, background: "rgba(255,255,255,0.05)", color: "white" }}
                onClick={() => handleEditar(rutina.id)}
                onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.1)'}
                onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,0.05)'}
              >
                <Edit size={16} /> Editar
              </button>
              <button
                style={{ ...styles.actionBtn, background: "rgba(239, 68, 68, 0.1)", color: "#ef4444" }}
                onClick={() => handleEliminar(rutina.id)}
                onMouseEnter={e => e.currentTarget.style.background='rgba(239, 68, 68, 0.2)'}
                onMouseLeave={e => e.currentTarget.style.background='rgba(239, 68, 68, 0.1)'}
              >
                <Trash2 size={16} /> Eliminar
              </button>
            </div>
          </div>
        ))}

        {plantillas.length === 0 && (
          <div style={{ gridColumn: "1/-1", textAlign: 'center', padding: '60px 20px', background: 'rgba(255,255,255,0.01)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '24px' }}>
            <Copy size={48} color="rgba(255,255,255,0.1)" style={{marginBottom: '20px'}}/>
            <h3 style={{margin: '0 0 10px 0', fontSize: '1.4rem', color: 'rgba(255,255,255,0.7)', fontWeight: 800}}>Tu biblioteca está vacía</h3>
            <p style={{margin: '0 0 25px 0', fontSize: '1rem', color: 'rgba(255,255,255,0.4)', maxWidth: '500px', marginInline: 'auto'}}>
              Las plantillas te permiten diseñar rutinas una sola vez (ej. "Fuerza Base - Nivel 1") y asignárselas a múltiples clientes al instante.
            </p>
            <GymButton onClick={handleCrearNueva}><Plus size={20}/> Crear mi primera Plantilla</GymButton>
          </div>
        )}
      </div>
    </div>
  );
}
