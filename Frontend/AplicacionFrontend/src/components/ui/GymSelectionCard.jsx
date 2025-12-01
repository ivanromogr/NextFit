// src/components/ui/GymSelectionCard.jsx
import React from 'react';
import { Check } from "lucide-react";

export default function GymSelectionCard({ title, icon: Icon, selected, onClick }) {
  const style = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px',
    marginBottom: '12px',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    position: 'relative',
    overflow: 'hidden',
    
    // Estados visuales
    backgroundColor: selected ? '#FACC15' : '#18181b',
    border: selected ? '2px solid #FACC15' : '1px solid #333',
    color: selected ? '#000000' : '#ffffff',
    
    // Sombra brillante si está activo
    boxShadow: selected ? '0 0 20px rgba(250, 204, 21, 0.4)' : 'none',
    transform: selected ? 'scale(1.02)' : 'scale(1)'
  };

  return (
    <div style={style} onClick={onClick}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        {Icon && <Icon size={24} strokeWidth={selected ? 2.5 : 1.5} />}
        <span style={{ 
          fontWeight: selected ? '800' : '500', 
          fontSize: '1rem', 
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          {title}
        </span>
      </div>
      
      {/* Icono de Check solo si está seleccionado */}
      {selected && (
        <div style={{ 
          background: 'rgba(0,0,0,0.1)', 
          borderRadius: '50%', 
          padding: '4px' 
        }}>
          <Check size={20} strokeWidth={3} />
        </div>
      )}
    </div>
  );
}