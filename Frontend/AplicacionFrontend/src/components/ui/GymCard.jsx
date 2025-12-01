import React from 'react';

export default function GymCard({ title, icon: Icon, selected, onClick }) {
  const style = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    
    // Si está seleccionado: Borde Amarillo y Fondo Negro (para contraste)
    // Si NO: Borde transparente y fondo gris oscuro
    border: selected ? '2px solid #FACC15' : '1px solid #333',
    backgroundColor: selected ? 'rgba(0,0,0, 0.8)' : 'rgba(255,255,255, 0.05)',
    
    // El texto y el icono cambian a amarillo si está seleccionado
    color: selected ? '#FACC15' : '#a1a1aa',
    
    // Brillo si está seleccionado
    boxShadow: selected ? '0 0 15px rgba(250, 204, 21, 0.15)' : 'none'
  };

  return (
    <div style={style} onClick={onClick}>
      {Icon && <Icon size={24} />}
      <span style={{ fontWeight: selected ? '700' : '500', fontSize: '1rem', textTransform: 'uppercase' }}>
        {title}
      </span>
    </div>
  );
}