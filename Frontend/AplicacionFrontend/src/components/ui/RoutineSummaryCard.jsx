import React from 'react';
import { Play, Clock, Dumbbell, Calendar } from 'lucide-react';

const RoutineSummaryCard = ({ rutina, onStart }) => {
  // Calculamos datos resumen
  const numEjercicios = rutina.detalles ? rutina.detalles.length : 0;
  // Estimación tonta: 3 mins por ejercicio + 5 calentamiento
  const duracionEst = 5 + (numEjercicios * 3); 
  
  // Estilos en línea para asegurar el diseño sin depender de Tailwind externo
  const styles = {
    card: {
      background: 'linear-gradient(145deg, #1e1e1e, #141414)', // Degradado sutil oscuro
      borderRadius: '16px',
      padding: '24px',
      border: '1px solid #333',
      boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
      marginBottom: '20px',
      position: 'relative',
      overflow: 'hidden',
      transition: 'transform 0.2s, box-shadow 0.2s',
      cursor: 'default'
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: '15px'
    },
    title: {
      color: 'white',
      fontSize: '1.8rem',
      fontFamily: 'Teko, sans-serif',
      textTransform: 'uppercase',
      lineHeight: 1,
      margin: 0
    },
    subtitle: {
      color: '#FACC15', // Amarillo
      fontSize: '0.85rem',
      fontWeight: 'bold',
      letterSpacing: '1px',
      textTransform: 'uppercase',
      marginTop: '4px',
      display: 'flex', alignItems: 'center', gap: '6px'
    },
    statsRow: {
      display: 'flex',
      gap: '15px',
      color: '#888',
      fontSize: '0.8rem',
      marginBottom: '20px'
    },
    statItem: { display: 'flex', alignItems: 'center', gap: '4px' },
    
    // ZONA DE EJERCICIOS VISUALES
    previewContainer: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      marginBottom: '20px',
      background: 'rgba(0,0,0,0.3)',
      padding: '10px',
      borderRadius: '12px'
    },
    avatarStack: {
      display: 'flex',
      paddingLeft: '10px' // Espacio para el solapamiento
    },
    avatar: (url) => ({
      width: '45px',
      height: '45px',
      borderRadius: '50%',
      border: '2px solid #1e1e1e',
      background: '#333',
      backgroundImage: `url(${url})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      marginLeft: '-10px', // Efecto solapado
      position: 'relative'
    }),
    countBadge: {
        fontSize: '0.8rem', color: '#ccc', marginLeft: '10px'
    },

    button: {
      width: '100%',
      background: '#FACC15',
      color: 'black',
      border: 'none',
      padding: '12px',
      borderRadius: '8px',
      fontWeight: 'bold',
      fontSize: '1rem',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      transition: 'filter 0.2s',
      fontFamily: 'sans-serif'
    }
  };

  return (
    <div 
      style={styles.card}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-5px)';
        e.currentTarget.style.boxShadow = '0 10px 30px rgba(250, 204, 21, 0.15)'; // Resplandor amarillo suave
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.5)';
      }}
    >
      {/* HEADER */}
      <div style={styles.header}>
        <div>
          <h3 style={styles.title}>{rutina.nombre}</h3>
          <div style={styles.subtitle}>
             <span style={{width:'8px', height:'8px', background:'#FACC15', borderRadius:'50%', display:'inline-block'}}></span>
             {rutina.objetivo || "Personalizado"}
          </div>
        </div>
        <div style={{background:'#333', padding:'5px 10px', borderRadius:'6px', color:'#aaa', fontSize:'0.7rem'}}>
           {rutina.nivel || "Nivel General"}
        </div>
      </div>

      {/* ESTADÍSTICAS */}
      <div style={styles.statsRow}>
        <div style={styles.statItem}><Dumbbell size={14}/> {numEjercicios} Ejercicios</div>
        <div style={styles.statItem}><Clock size={14}/> ~{duracionEst} Min</div>
        <div style={styles.statItem}><Calendar size={14}/> {new Date().toLocaleDateString()}</div>
      </div>

      {/* PREVISUALIZACIÓN DE EJERCICIOS (GIFS) */}
      <div style={styles.previewContainer}>
         {numEjercicios > 0 ? (
             <>
                <div style={styles.avatarStack}>
                    {/* Mostramos máximo 4 ejercicios para no saturar */}
                    {rutina.detalles.slice(0, 4).map((det, idx) => (
                        <div key={idx} style={styles.avatar(det.ejercicio.gifUrl || '')} title={det.ejercicio.nombre} />
                    ))}
                </div>
                {numEjercicios > 4 && (
                    <span style={styles.countBadge}>+{numEjercicios - 4} más</span>
                )}
                {numEjercicios <= 4 && (
                    <span style={styles.countBadge}>Lista de ejercicios</span>
                )}
             </>
         ) : (
             <span style={{color:'#666', fontSize:'0.8rem', fontStyle:'italic'}}>Sin ejercicios añadidos</span>
         )}
      </div>

      {/* BOTÓN START */}
      <button 
        style={styles.button}
        onClick={() => onStart(rutina.id)}
        onMouseEnter={(e) => e.target.style.filter = 'brightness(1.1)'}
        onMouseLeave={(e) => e.target.style.filter = 'brightness(1)'}
      >
        <Play size={18} fill="black" /> EMPEZAR SESIÓN
      </button>
    </div>
  );
};

export default RoutineSummaryCard;