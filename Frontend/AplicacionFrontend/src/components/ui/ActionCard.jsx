import React from 'react';
import { ChevronRight } from 'lucide-react';

const ActionCard = ({ title, description, icon: Icon, onClick, variant = 'default' }) => {
  
  const isHighlight = variant === 'highlight';
  
  const cardStyle = {
    background: isHighlight 
      ? 'linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%)' 
      : 'linear-gradient(135deg, #1a1a1a 0%, #111 100%)',
    border: isHighlight ? '1px solid #FACC15' : '1px solid #333',
    boxShadow: isHighlight ? '0 4px 20px rgba(250, 204, 21, 0.1)' : 'none',
    padding: '25px',
    borderRadius: '16px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    transition: 'all 0.2s ease',
    marginBottom: '15px' // Espacio por si se apilan
  };

  return (
    <div 
      style={cardStyle} 
      onClick={onClick}
      onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          if(!isHighlight) e.currentTarget.style.borderColor = '#555';
      }}
      onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          if(!isHighlight) e.currentTarget.style.borderColor = isHighlight ? '#FACC15' : '#333';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
        <div style={{ 
          background: isHighlight ? 'rgba(250, 204, 21, 0.15)' : 'rgba(255, 255, 255, 0.05)', 
          padding: '14px', 
          borderRadius: '12px',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          {Icon && <Icon size={28} color={isHighlight ? '#FACC15' : 'white'} />}
        </div>

        <div>
          <h3 style={{ margin: 0, color: 'white', fontSize: '1.2rem', fontWeight: 'bold', fontFamily: 'sans-serif' }}>
            {title}
          </h3>
          {description && (
            <p style={{ margin: '6px 0 0 0', color: '#888', fontSize: '0.9rem', lineHeight:'1.4' }}>
              {description}
            </p>
          )}
        </div>
      </div>

      <ChevronRight color={isHighlight ? '#FACC15' : '#444'} />
    </div>
  );
};

export default ActionCard;