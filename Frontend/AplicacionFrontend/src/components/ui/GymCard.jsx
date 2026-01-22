import React from 'react';

export default function GymCard({ title, icon: Icon, selected, onClick }) {
  const style = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '14px 16px',
    borderRadius: '14px',
    cursor: 'pointer',
    transition: 'transform 0.12s ease, border-color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease, color 0.2s ease',
    border: `1px solid ${selected ? 'rgba(250,204,21,0.55)' : 'rgba(255,255,255,0.10)'}`,
    background: selected ? 'rgba(250,204,21,0.08)' : 'rgba(255,255,255,0.03)',
    color: selected ? '#FACC15' : 'rgba(255,255,255,0.68)',
    boxShadow: selected ? '0 10px 25px rgba(250,204,21,0.10)' : 'none',
    outline: 'none',
    userSelect: 'none',
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
      style={style}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-1px)';
        e.currentTarget.style.borderColor = selected ? 'rgba(250,204,21,0.70)' : 'rgba(255,255,255,0.16)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.borderColor = selected ? 'rgba(250,204,21,0.55)' : 'rgba(255,255,255,0.10)';
      }}
      onFocus={(e) => {
        e.currentTarget.style.boxShadow = selected
          ? '0 0 0 3px rgba(250,204,21,0.22), 0 10px 25px rgba(250,204,21,0.10)'
          : '0 0 0 3px rgba(250,204,21,0.18)';
        e.currentTarget.style.borderColor = 'rgba(250,204,21,0.55)';
      }}
      onBlur={(e) => {
        e.currentTarget.style.boxShadow = selected ? '0 10px 25px rgba(250,204,21,0.10)' : 'none';
        e.currentTarget.style.borderColor = selected ? 'rgba(250,204,21,0.55)' : 'rgba(255,255,255,0.10)';
      }}
    >
      {Icon && <Icon size={22} />}
      <span style={{ fontWeight: selected ? 800 : 600, fontSize: '0.95rem', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
        {title}
      </span>
    </div>
  );
}
