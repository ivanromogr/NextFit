// src/components/ui/GymInput.jsx
import React from 'react';

export default function GymInput({ 
  label, 
  type = "text", 
  value, 
  onChange, 
  placeholder, 
  icon: Icon, 
  suffix 
}) {
  return (
    <div style={{ marginBottom: '24px', width: '100%' }}>
      {label && (
        <label style={{ 
          display: 'block', 
          marginBottom: '10px', 
          color: '#a1a1aa', // Gris claro
          fontSize: '0.85rem', 
          fontWeight: '700',
          letterSpacing: '1px',
          textTransform: 'uppercase',
          fontFamily: 'Inter, sans-serif'
        }}>
          {label}
        </label>
      )}
      
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        {/* Icono Izquierdo */}
        {Icon && (
          <div style={{ 
            position: 'absolute', 
            left: '16px', 
            color: '#FACC15', // Amarillo
            zIndex: 10,
            display: 'flex'
          }}>
            <Icon size={20} />
          </div>
        )}

        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          style={{
            width: '100%',
            padding: '16px',
            paddingLeft: Icon ? '48px' : '16px',
            paddingRight: suffix ? '50px' : '16px', // Espacio para "KG" o "CM"
            backgroundColor: '#18181b', // Fondo gris oscuro
            border: '1px solid #3f3f46',
            borderRadius: '12px',
            color: '#ffffff',
            fontSize: '1.1rem',
            outline: 'none',
            transition: 'all 0.3s ease',
            fontFamily: 'Inter, sans-serif'
          }}
          onFocus={(e) => {
            e.target.style.borderColor = '#FACC15';
            e.target.style.backgroundColor = '#000'; // Se oscurece al enfocar
            e.target.style.boxShadow = '0 0 0 1px #FACC15';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = '#3f3f46';
            e.target.style.backgroundColor = '#18181b';
            e.target.style.boxShadow = 'none';
          }}
        />
        
        {/* Sufijo (KG, CM) */}
        {suffix && (
          <div style={{ 
            position: 'absolute', 
            right: '16px', 
            color: '#FACC15', 
            fontWeight: '800', 
            fontSize: '0.9rem',
            pointerEvents: 'none'
          }}>
            {suffix}
          </div>
        )}
      </div>
    </div>
  );
}