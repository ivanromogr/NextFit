import React from 'react';

export default function GymButton({ children, onClick, loading, fullWidth, disabled, type = 'button' }) {
  
  // Estilos base
  const baseStyle = {
    width: fullWidth ? '100%' : 'auto',
    padding: '18px',
    border: 'none',
    borderRadius: '12px',
    fontSize: '1.1rem',
    fontFamily: 'Inter, sans-serif',
    fontWeight: '800',
    letterSpacing: '1px',
    textTransform: 'uppercase',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    transition: 'all 0.3s ease',
    // Si está disabled, quitamos eventos de ratón
    pointerEvents: disabled ? 'none' : 'auto', 
  };

  // Estilos cuando está ACTIVO (Amarillo Neón)
  const activeStyle = {
    background: 'linear-gradient(135deg, #FACC15 0%, #EAB308 100%)',
    color: '#000000',
    cursor: 'pointer',
    boxShadow: '0 0 20px rgba(234, 179, 8, 0.4)', // Glow amarillo
  };

  // Estilos cuando está BLOQUEADO (Gris Apagado)
  const disabledStyle = {
    background: '#27272a', // Gris muy oscuro
    color: '#525252',      // Texto gris apagado
    cursor: 'not-allowed',
    boxShadow: 'none',     // Sin brillo
    border: '1px solid #333'
  };

  // Elegimos qué estilo aplicar
  const currentStyle = {
    ...baseStyle,
    ...(disabled || loading ? disabledStyle : activeStyle)
  };

  return (
    <button 
      type={type}
      onClick={!disabled ? onClick : undefined} // Aseguramos que no haga click
      disabled={disabled || loading}
      style={currentStyle}
      // Efecto de pulsar solo si está activo
      onMouseDown={(e) => !disabled && (e.currentTarget.style.transform = 'scale(0.98)')}
      onMouseUp={(e) => !disabled && (e.currentTarget.style.transform = 'scale(1)')}
    >
      {loading ? (
        <>PROCESANDO...</>
      ) : (
        children
      )}
    </button>
  );
}