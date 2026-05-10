import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  obtenerRutinasAsignadasPorEntrenador,
  getCliente,
  eliminarRutina,
  obtenerPlantillasEntrenador, // NUEVA FUNCIÓN
  clonarPlantilla              // NUEVA FUNCIÓN
} from "../../api/endpoints";
import { useAuth } from "../../context/AuthContext"; // Para obtener tu ID de entrenador
import { useToast } from "../../context/ToastContext"; // Para notificaciones

import { 
    Dumbbell, Plus, ChevronLeft, Edit, Trash2, Calendar, 
    User, TrendingUp, Download, Copy, X, Activity, AlertCircle 
} from "lucide-react";

import GymButton from "../../components/ui/GymButton";
import ActionCard from "../../components/ui/ActionCard";

export default function RutinasDeCliente() {
  const { clienteId } = useParams();
  const navigate = useNavigate();
  const { userId: entrenadorId } = useAuth();
  const toast = useToast();

  // Estados principales
  const [rutinas, setRutinas] = useState([]);
  const [cliente, setCliente] = useState(null);
  const [loading, setLoading] = useState(true);

  // Estados del Modal de Plantillas
  const [showPlantillasModal, setShowPlantillasModal] = useState(false);
  const [plantillas, setPlantillas] = useState([]); 
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    if (!clienteId) {
      console.warn('clienteId ausente en la ruta, abortando carga.');
      setLoading(false);
      return;
    }
    cargarDatos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clienteId]);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      // Podemos cargar el cliente y sus rutinas a la vez para que sea más rápido
      const [datosCliente, datosRutinas] = await Promise.all([
          getCliente(clienteId),
          obtenerRutinasAsignadasPorEntrenador(clienteId, entrenadorId)
      ]);
      setCliente(datosCliente);
      setRutinas(datosRutinas || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // --- NAVEGACIÓN ---
  const handleCrearNueva = () => {
    localStorage.setItem("clienteObjetivoId", clienteId);
    navigate(`/entrenador/cliente/${clienteId}/crear-rutina`);
  };

  const handleEditar = (rutinaId) => {
    localStorage.setItem("clienteObjetivoId", clienteId);
    navigate(`/entrenador/cliente/${clienteId}/editar-rutina/${rutinaId}`);
  };

  const handleVerCalendario = () => navigate(`/entrenador/cliente/${clienteId}/calendario`);
  const handleVerProgreso = () => navigate(`/entrenador/cliente/${clienteId}/progreso`);

  const handleEliminar = async (rutinaId) => {
    if (window.confirm("¿Seguro que quieres borrar esta rutina del cliente?")) {
      await eliminarRutina(rutinaId);
      toast.success("Rutina eliminada correctamente");
      cargarDatos();
    }
  };

  // --- LÓGICA DE PLANTILLAS MAESTRAS ---
  const abrirModalPlantillas = async () => {
      if (!entrenadorId) {
          toast.error("No se ha podido identificar al entrenador.");
          return;
      }
      setShowPlantillasModal(true);
      try {
          // Llama al backend para traer tus plantillas reales
          const misPlantillas = await obtenerPlantillasEntrenador(entrenadorId);
          setPlantillas(misPlantillas || []);
      } catch (error) {
          toast.error("Error al cargar tus plantillas");
      }
  };

  const handleImportarPlantilla = async (plantillaId) => {
      setIsImporting(true);
      try {
          // Ejecutamos la clonación mágica en el backend
          await clonarPlantilla(plantillaId, clienteId); 
          
          toast.success("¡Plantilla clonada con éxito!");
          setShowPlantillasModal(false);
          cargarDatos(); // Recargar la lista para ver la nueva rutina
      } catch (error) {
          toast.error("Hubo un error al clonar la plantilla.");
      } finally {
          setIsImporting(false);
      }
  };

  const handleCrearPlantilla = () => {
      setShowPlantillasModal(false);
      navigate("/entrenador/plantillas/crear");
  };

  // --- ESTILOS ---
  const styles = {
    container: { minHeight: "100vh", background: "#050505", padding: "40px", color: "white", fontFamily: "'Inter', sans-serif" },
    header: { display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "40px", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "25px", gap: "20px" },
    headerActions: { display: "flex", gap: "12px", alignItems: "center", flexWrap: 'wrap' },
    title: { fontSize: "2rem", fontWeight: 900, textTransform: "uppercase", margin: 0, letterSpacing: '-0.5px' },
    subTitle: { color: "rgba(255,255,255,0.5)", marginTop: "6px", fontSize: "0.95rem" },

    grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "25px" },

    card: { background: "linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "20px", padding: "25px", display: "flex", flexDirection: "column", gap: "15px", position: "relative", transition: "all 0.3s", backdropFilter: "blur(10px)" },
    cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" },
    pill: { background: "rgba(250, 204, 21, 0.1)", color: "#FACC15", padding: "6px 12px", borderRadius: "8px", fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: '0.5px' },

    cardTitle: { fontSize: "1.4rem", fontWeight: 900, margin: "10px 0 5px 0", textTransform: "uppercase" },
    cardInfo: { color: "rgba(255,255,255,0.5)", fontSize: "0.95rem" },

    actions: { display: "flex", gap: "10px", marginTop: "auto", paddingTop: "20px", borderTop: "1px dashed rgba(255,255,255,0.1)" },
    actionBtn: { flex: 1, padding: "12px", borderRadius: "12px", border: "none", cursor: "pointer", fontWeight: 800, display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", fontSize: "0.9rem", transition: 'all 0.2s' },

    // Modal Styles
    modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 },
    modalCard: { background: '#09090b', padding: '40px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)', width: '500px', maxWidth: '90%', boxShadow: '0 25px 50px rgba(0,0,0,0.5)', position: 'relative' },
    closeBtn: { position: 'absolute', top: '25px', right: '25px', background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }
  };

  if (loading) return <div style={{ background: "#050505", height: "100vh", color: "#FACC15", display: "flex", justifyContent: "center", alignItems: "center" }}><Activity className="animate-pulse" size={40}/></div>;

  return (
    <div style={styles.container}>
      {/* --- HEADER --- */}
      <div style={styles.header}>
        <div style={{ flex: 1 }}>
          <button 
              onClick={() => navigate("/entrenador/dashboard")}
              style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontWeight: 700, padding: 0, marginBottom: '20px' }}
          >
              <ChevronLeft size={18} /> Volver al Panel
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.10)", padding: "15px", borderRadius: "20px" }}>
              {cliente?.fotoPerfil ? <img src={cliente.fotoPerfil} alt="Atleta" style={{width: 35, height: 35, borderRadius: '50%', objectFit: 'cover'}}/> : <User size={35} color="#FACC15" />}
            </div>
            <div>
              <h1 style={styles.title}>{cliente?.nombre} {cliente?.apellido}</h1>
              <div style={styles.subTitle}>Gestionando su biblioteca de entrenamiento</div>
            </div>
          </div>
        </div>

        {/* --- BOTONES DE ACCIÓN PRINCIPALES --- */}
        <div style={styles.headerActions}>
            <GymButton variant="secondary" onClick={handleVerProgreso}><TrendingUp size={18} /> Progreso</GymButton>
            <GymButton variant="secondary" onClick={handleVerCalendario}><Calendar size={18} /> Calendario</GymButton>
            
            {/* BOTÓN MÁGICO DE IMPORTAR PLANTILLA */}
            <button 
                style={{ background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', padding: '10px 20px', borderRadius: '12px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s' }}
                onClick={abrirModalPlantillas}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
            >
                <Download size={18} /> Importar Plantilla
            </button>
            
            <GymButton onClick={handleCrearNueva}><Plus size={18} /> Crear de Cero</GymButton>
        </div>
      </div>

      {/* --- GRID DE RUTINAS --- */}
      <div style={styles.grid}>
        {rutinas.map((rutina) => (
          <div 
            key={rutina.id} 
            style={styles.card}
            onMouseEnter={e => {e.currentTarget.style.borderColor='rgba(250,204,21,0.3)'; e.currentTarget.style.transform='translateY(-3px)'}}
            onMouseLeave={e => {e.currentTarget.style.borderColor='rgba(255,255,255,0.05)'; e.currentTarget.style.transform='translateY(0)'}}
          >
            <div style={styles.cardHeader}>
              <span style={styles.pill}>{rutina.objetivo || 'General'}</span>
              <Dumbbell size={20} color="rgba(255,255,255,0.2)" />
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

        {rutinas.length === 0 && (
          <div style={{ gridColumn: "1/-1" }}>
            <ActionCard
              title="Biblioteca Vacía"
              description="Este atleta aún no tiene entrenamientos asignados. Crea una rutina desde cero o importa una de tus Plantillas Maestras."
              icon={Calendar}
              variant="highlight"
              onClick={handleCrearNueva}
            />
          </div>
        )}
      </div>

      {/* --- MODAL DE PLANTILLAS MAESTRAS --- */}
      {showPlantillasModal && (
        <div style={styles.modalOverlay} onClick={() => setShowPlantillasModal(false)}>
            <div style={styles.modalCard} onClick={e => e.stopPropagation()}>
                <button style={styles.closeBtn} onClick={() => setShowPlantillasModal(false)}><X size={18}/></button>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '10px' }}>
                    <div style={{ background: 'rgba(250, 204, 21, 0.1)', padding: '12px', borderRadius: '14px' }}>
                        <Copy size={24} color="#FACC15" />
                    </div>
                    <h3 style={{ margin: 0, color: 'white', fontSize: '1.6rem', fontWeight: 900 }}>Mis Plantillas</h3>
                </div>
                <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '30px', fontSize: '0.95rem', lineHeight: 1.5 }}>Selecciona una plantilla de tu biblioteca para clonarla automáticamente en el perfil de este atleta.</p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '400px', overflowY: 'auto', paddingRight: '5px' }}>
                    {plantillas.length > 0 ? (
                        plantillas.map((plan) => (
                            <div key={plan.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', padding: '16px', borderRadius: '16px', transition: 'all 0.2s' }}>
                                <div>
                                    <div style={{ color: 'white', fontWeight: 800, fontSize: '1.05rem' }}>{plan.nombre}</div>
                                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', marginTop: '4px' }}>
                                        {plan.nivel || 'General'} • {plan.objetivo || 'Sin objetivo'}
                                    </div>
                                </div>
                                <button 
                                    style={{ background: '#FACC15', color: 'black', border: 'none', padding: '10px 16px', borderRadius: '10px', fontWeight: 900, cursor: isImporting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px', opacity: isImporting ? 0.7 : 1 }}
                                    onClick={() => handleImportarPlantilla(plan.id)}
                                    disabled={isImporting}
                                >
                                    {isImporting ? <Activity size={16} className="animate-spin"/> : <Download size={16} />} 
                                    {isImporting ? 'Clonando...' : 'Importar'}
                                </button>
                            </div>
                        ))
                    ) : (
                        <div style={{textAlign:'center', padding:'40px 20px', background: 'rgba(255,255,255,0.02)', border:'1px dashed rgba(255,255,255,0.1)', borderRadius:'16px'}}>
                            <AlertCircle size={32} color="rgba(255,255,255,0.2)" style={{marginBottom:'15px'}}/>
                            <p style={{fontWeight: 800, color:'white', margin: '0 0 10px 0'}}>No tienes plantillas</p>
                            <p style={{fontSize:'0.9rem', color: 'rgba(255,255,255,0.5)', margin: 0}}>
                                Crea una rutina y guárdala como "Plantilla Maestra" para que aparezca aquí.
                            </p>
                        </div>
                    )}
                </div>
                
                <button 
                    style={{ width: '100%', marginTop: '25px', padding: '15px', background: 'transparent', border: '1px dashed rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.6)', borderRadius: '14px', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s' }}
                    onClick={handleCrearPlantilla}
                    onMouseEnter={e => {e.currentTarget.style.color='white'; e.currentTarget.style.borderColor='rgba(255,255,255,0.5)'}}
                    onMouseLeave={e => {e.currentTarget.style.color='rgba(255,255,255,0.6)'; e.currentTarget.style.borderColor='rgba(255,255,255,0.2)'}}
                >
                    + Crear nueva Plantilla desde cero
                </button>
            </div>
        </div>
      )}
    </div>
  );
}
