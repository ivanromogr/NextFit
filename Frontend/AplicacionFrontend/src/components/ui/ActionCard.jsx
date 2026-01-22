import React from 'react';
import { ChevronRight } from 'lucide-react';

const ActionCard = ({ title, description, icon: Icon, onClick, variant = 'default' }) => {
  const isHighlight = variant === 'highlight';

  const cardStyle = {
    background: isHighlight
      ? 'linear-gradient(135deg, rgba(250,204,21,0.10) 0%, rgba(255,255,255,0.03) 55%, rgba(255,255,255,0.02) 100%)'
      : 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)',
    border: `1px solid ${isHighlight ? 'rgba(250,204,21,0.55)' : 'rgba(255,255,255,0.10)'}`,
    boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
    padding: '22px',
    borderRadius: '18px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    transition: 'transform 0.15s ease, border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease',
    marginBottom: '14px',
    outline: 'none',
  };

  const handleKeyDown = (e) => {
    if (!onClick) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div
      style={cardStyle}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = isHighlight
          ? '0 14px 40px rgba(250,204,21,0.14)'
          : '0 14px 40px rgba(0,0,0,0.45)';
        if (!isHighlight) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.35)';
        e.currentTarget.style.borderColor = isHighlight ? 'rgba(250,204,21,0.55)' : 'rgba(255,255,255,0.10)';
      }}
      onFocus={(e) => {
        e.currentTarget.style.boxShadow = isHighlight
          ? '0 0 0 3px rgba(250,204,21,0.22), 0 14px 40px rgba(250,204,21,0.12)'
          : '0 0 0 3px rgba(250,204,21,0.18), 0 14px 40px rgba(0,0,0,0.45)';
        e.currentTarget.style.borderColor = 'rgba(250,204,21,0.55)';
      }}
      onBlur={(e) => {
        e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.35)';
        e.currentTarget.style.borderColor = isHighlight ? 'rgba(250,204,21,0.55)' : 'rgba(255,255,255,0.10)';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div
          style={{
            background: isHighlight ? 'rgba(250, 204, 21, 0.16)' : 'rgba(255, 255, 255, 0.06)',
            padding: '12px',
            borderRadius: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {Icon && <Icon size={26} color={isHighlight ? '#FACC15' : 'white'} />}
        </div>

        <div>
          <h3
            style={{
              margin: 0,
              color: 'white',
              fontSize: '1.1rem',
              fontWeight: 800,
              fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
              letterSpacing: '-0.2px',
            }}
          >
            {title}
          </h3>
          {description && (
            <p
              style={{
                margin: '6px 0 0 0',
                color: 'rgba(255,255,255,0.62)',
                fontSize: '0.92rem',
                lineHeight: 1.45,
              }}
            >
              {description}
            </p>
          )}
        </div>
      </div>

      <ChevronRight color={isHighlight ? '#FACC15' : 'rgba(255,255,255,0.28)'} />
    </div>
  );
};

export default ActionCard;
