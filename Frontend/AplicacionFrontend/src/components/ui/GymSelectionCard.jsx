import React from 'react';
import { Check } from "lucide-react";

export default function GymSelectionCard({ title, icon: Icon, selected, onClick }) {
  const style = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 18px',
    marginBottom: '12px',
    borderRadius: '16px',
    cursor: 'pointer',
    transition: 'transform 0.12s ease, border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease',
    position: 'relative',
    overflow: 'hidden',
    background: selected ? 'rgba(250,204,21,0.10)' : 'rgba(255,255,255,0.03)',
    border: `1px solid ${selected ? 'rgba(250,204,21,0.55)' : 'rgba(255,255,255,0.10)'}`,
    color: selected ? '#FFFFFF' : '#FFFFFF',
    boxShadow: selected ? '0 12px 30px rgba(250,204,21,0.12)' : 'none',
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
      onClick={onClick}
      role="button"
      tabIndex={0}
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
          ? '0 0 0 3px rgba(250,204,21,0.22), 0 12px 30px rgba(250,204,21,0.12)'
          : '0 0 0 3px rgba(250,204,21,0.18)';
        e.currentTarget.style.borderColor = 'rgba(250,204,21,0.55)';
      }}
      onBlur={(e) => {
        e.currentTarget.style.boxShadow = selected ? '0 12px 30px rgba(250,204,21,0.12)' : 'none';
        e.currentTarget.style.borderColor = selected ? 'rgba(250,204,21,0.55)' : 'rgba(255,255,255,0.10)';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {Icon && <Icon size={22} strokeWidth={selected ? 2.2 : 1.6} color={selected ? '#FACC15' : 'rgba(255,255,255,0.70)'} />}
        <span style={{ fontWeight: selected ? 900 : 650, fontSize: '0.95rem', textTransform: 'uppercase', letterSpacing: '0.6px', color: selected ? '#FFFFFF' : 'rgba(255,255,255,0.78)' }}>
          {title}
        </span>
      </div>

      {selected && (
        <div
          style={{
            background: 'rgba(250,204,21,0.18)',
            border: '1px solid rgba(250,204,21,0.35)',
            borderRadius: '999px',
            padding: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          aria-label="Seleccionado"
        >
          <Check size={18} strokeWidth={3} color="#FACC15" />
        </div>
      )}
    </div>
  );
}
