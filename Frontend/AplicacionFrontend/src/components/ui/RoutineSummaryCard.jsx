import React from 'react';
import { Calendar, PlayCircle, BarChart } from 'lucide-react';

const RoutineSummaryCard = ({ rutina, onStart }) => {
  if (!rutina) return null;

  return (
    <div style={{ 
      backgroundColor: '#161616', 
      borderRadius: '16px', 
      overflow: 'hidden', 
      border: '1px solid #333', 
      boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
      marginBottom: '20px'
    }}>
      
      {/* Cabecera */}
      <div style={{ 
        background: 'linear-gradient(90deg, #FACC15, #EAB308)', 
        padding: '18px 25px', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center' 
      }}>
        <div style={{display:'flex', flexDirection:'column'}}>
          <h3 style={{ margin: 0, color: 'black', fontSize: '1.6rem', fontWeight: 'bold', fontFamily: 'Teko, sans-serif', lineHeight:'1' }}>
            {rutina.nombre}
          </h3>
          <div style={{display:'flex', gap:'10px', marginTop:'5px'}}>
             <span style={{ fontSize: '0.8rem', color: '#1a1a1a', fontWeight: '800', textTransform: 'uppercase', padding: '3px 8px', background: 'rgba(255,255,255,0.4)', borderRadius: '6px' }}>
                {rutina.objetivo}
             </span>
             {rutina.nivel && (
                 <span style={{ fontSize: '0.8rem', color: '#1a1a1a', fontWeight: '800', textTransform: 'uppercase', padding: '3px 8px', background: 'rgba(255,255,255,0.2)', borderRadius: '6px' }}>
                    {rutina.nivel}
                 </span>
             )}
          </div>
        </div>
        <div style={{background:'rgba(0,0,0,0.1)', padding:'10px', borderRadius:'50%'}}>
            <Calendar color="black" size={24} />
        </div>
      </div>

      {/* Contenido */}
      <div style={{ padding: '25px' }}>
        <p style={{ color: '#aaa', fontSize: '1rem', marginBottom: '25px', lineHeight: '1.6' }}>
          {rutina.descripcion || "Plan de entrenamiento personalizado."}
        </p>
        
        {/* Resumen Ejercicios */}
        {rutina.detalles && rutina.detalles.length > 0 && (
          <div style={{ marginBottom: '25px', background: '#111', padding: '20px', borderRadius: '12px', border:'1px solid #222' }}>
            <div style={{display:'flex', alignItems:'center', gap:'8px', marginBottom: '15px'}}>
                <BarChart size={16} color="#FACC15"/>
                <p style={{ color: 'white', fontWeight: 'bold', margin:0, fontSize: '0.9rem', textTransform:'uppercase', letterSpacing:'1px' }}>
                RESUMEN DE SESIÓN ({rutina.detalles.length} Ejercicios)
                </p>
            </div>
            
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px'}}>
                {rutina.detalles.slice(0, 4).map((detalle, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', paddingBottom:'5px', borderBottom:'1px dashed #333' }}>
                    <span style={{ color: '#ccc' }}>{detalle.ejercicio ? detalle.ejercicio.nombre : "Ejercicio"}</span>
                    <span style={{ color: '#FACC15', fontWeight:'bold' }}>{detalle.series} x {detalle.repeticiones}</span>
                </div>
                ))}
            </div>
            
            {rutina.detalles.length > 4 && (
              <div style={{ textAlign: 'center', marginTop: '10px', fontSize: '0.85rem', color: '#666', fontStyle:'italic' }}>
                ...y {rutina.detalles.length - 4} ejercicios más.
              </div>
            )}
          </div>
        )}

        <button 
          onClick={() => onStart(rutina.id)}
          style={{ 
            width: '100%', padding: '16px', borderRadius: '10px', 
            border: 'none', background: '#2a2a2a', color: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
            cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1rem',
            letterSpacing:'1px', transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {e.currentTarget.style.background = '#333'; e.currentTarget.style.transform = 'translateY(-2px)'}}
          onMouseLeave={(e) => {e.currentTarget.style.background = '#2a2a2a'; e.currentTarget.style.transform = 'translateY(0)'}}
        >
          <PlayCircle size={24} color="#FACC15" />
          EMPEZAR AHORA
        </button>
      </div>
    </div>
  );
};

export default RoutineSummaryCard;