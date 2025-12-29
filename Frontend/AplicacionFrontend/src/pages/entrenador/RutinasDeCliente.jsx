import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
// 1. CAMBIO AQUÍ: Importamos la función correcta
import { obtenerRutinasAsignadasPorEntrenador, getCliente, eliminarRutina } from "../../api/endpoints"; 
import { Dumbbell, Plus, ChevronLeft, Edit, Trash2, Calendar, User } from "lucide-react";

export default function RutinasDeCliente() {
  const { clienteId } = useParams();
  const navigate = useNavigate();
  
  const [rutinas, setRutinas] = useState([]);
  const [cliente, setCliente] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarDatos();
  }, [clienteId]);

  const cargarDatos = async () => {
    try {
      const datosCliente = await getCliente(clienteId);
      setCliente(datosCliente);
      
      // 2. CAMBIO AQUÍ: Usamos la función que filtra (Solo creador="ENTRENADOR")
      const datosRutinas = await obtenerRutinasAsignadasPorEntrenador(clienteId);
      setRutinas(datosRutinas);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCrearNueva = () => {
      localStorage.setItem("clienteObjetivoId", clienteId);
      navigate("/cliente/crear-rutina");
  };

  const handleEditar = (rutinaId) => {
      localStorage.setItem("clienteObjetivoId", clienteId); 
      navigate(`/cliente/editar-rutina/${rutinaId}`);
  };

  const handleEliminar = async (rutinaId) => {
      if(window.confirm("¿Seguro que quieres borrar esta rutina del cliente?")) {
          await eliminarRutina(rutinaId);
          cargarDatos(); 
      }
  };

  // --- TUS ESTILOS ---
  const styles = {
    container: { minHeight: '100vh', background: '#09090b', padding: '40px', color: 'white', fontFamily: 'sans-serif' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', borderBottom: '1px solid #27272a', paddingBottom: '20px' },
    title: { fontSize: '2rem', fontWeight: '900', textTransform: 'uppercase', margin: 0 },
    subTitle: { color: '#a1a1aa', marginTop: '5px' },
    
    backBtn: { background: 'transparent', border: '1px solid #3f3f46', color: '#a1a1aa', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' },
    newBtn: { background: '#FACC15', color: 'black', border: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', textTransform:'uppercase' },

    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '25px' },
    
    card: { background: '#121214', border: '1px solid #27272a', borderRadius: '16px', padding: '25px', display: 'flex', flexDirection: 'column', gap: '15px', position:'relative', transition: 'transform 0.2s' },
    cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
    pill: { background: 'rgba(250, 204, 21, 0.1)', color: '#FACC15', padding: '4px 10px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase' },
    
    cardTitle: { fontSize: '1.4rem', fontWeight: '800', margin: '10px 0 5px 0', textTransform: 'uppercase' },
    cardInfo: { color: '#a1a1aa', fontSize: '0.9rem' },

    actions: { display: 'flex', gap: '10px', marginTop: 'auto', paddingTop: '15px', borderTop: '1px solid #222' },
    actionBtn: { flex: 1, padding: '10px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', fontSize: '0.9rem' },
  };

  if(loading) return <div style={{background:'#09090b', height:'100vh', color:'white', display:'flex', justifyContent:'center', alignItems:'center'}}>Cargando planes...</div>;

  return (
    <div style={styles.container}>
        <div style={styles.header}>
            <div>
                <button style={styles.backBtn} onClick={() => navigate('/entrenador/dashboard')}>
                    <ChevronLeft size={20}/> VOLVER AL PANEL
                </button>
                <div style={{marginTop:'20px', display:'flex', alignItems:'center', gap:'15px'}}>
                    <div style={{background:'#27272a', padding:'15px', borderRadius:'50%'}}>
                        <User size={30} color="#FACC15"/>
                    </div>
                    <div>
                        <h1 style={styles.title}>{cliente?.nombre} {cliente?.apellido}</h1>
                        <div style={styles.subTitle}>Gestionando planes asignados</div>
                    </div>
                </div>
            </div>
            <button style={styles.newBtn} onClick={handleCrearNueva}>
                <Plus size={20}/> NUEVA RUTINA
            </button>
        </div>

        <div style={styles.grid}>
            {rutinas.map(rutina => (
                <div key={rutina.id} style={styles.card}>
                    <div style={styles.cardHeader}>
                        <span style={styles.pill}>{rutina.objetivo}</span>
                        <Dumbbell size={20} color="#555"/>
                    </div>
                    
                    <div>
                        <h3 style={styles.cardTitle}>{rutina.nombre}</h3>
                        <p style={styles.cardInfo}>{rutina.nivel} • {rutina.detalles?.length || 0} Ejercicios</p>
                    </div>

                    <div style={styles.actions}>
                        <button 
                            style={{...styles.actionBtn, background:'#27272a', color:'white'}}
                            onClick={() => handleEditar(rutina.id)}
                        >
                            <Edit size={16}/> EDITAR
                        </button>
                        <button 
                            style={{...styles.actionBtn, background:'rgba(239, 68, 68, 0.1)', color:'#ef4444'}}
                            onClick={() => handleEliminar(rutina.id)}
                        >
                            <Trash2 size={16}/> ELIMINAR
                        </button>
                    </div>
                </div>
            ))}

            {rutinas.length === 0 && (
                <div style={{gridColumn:'1/-1', textAlign:'center', color:'#555', padding:'50px', border:'2px dashed #27272a', borderRadius:'20px'}}>
                    <Calendar size={48} style={{marginBottom:15, opacity:0.5}}/>
                    <p>No has asignado ninguna rutina a este atleta.</p>
                    <p style={{fontSize:'0.8rem', color:'#777'}}>(Las rutinas personales del cliente no son visibles aquí)</p>
                    <button style={{marginTop:20, color:'#FACC15', background:'transparent', border:'none', cursor:'pointer', fontWeight:'bold'}} onClick={handleCrearNueva}>
                        CREAR LA PRIMERA AHORA
                    </button>
                </div>
            )}
        </div>
    </div>
  );
}