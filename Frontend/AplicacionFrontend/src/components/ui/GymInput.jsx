import React from 'react';

export default function GymInput({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  icon: Icon,
  suffix,
  id,
  autoComplete,
  readOnly,
}) {
  const inputId = id || (label ? `gym-input-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);

  return (
    <div style={{ marginBottom: '18px', width: '100%' }}>
      {label && (
        <label
          htmlFor={inputId}
          style={{
            display: 'block',
            marginBottom: '10px',
            color: 'rgba(255,255,255,0.55)',
            fontSize: '0.82rem',
            fontWeight: 800,
            letterSpacing: '0.9px',
            textTransform: 'uppercase',
            fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
          }}
        >
          {label}
        </label>
      )}

      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        {Icon && (
          <div
            style={{
              position: 'absolute',
              left: '14px',
              color: '#FACC15',
              zIndex: 10,
              display: 'flex',
              pointerEvents: 'none',
            }}
          >
            <Icon size={20} />
          </div>
        )}

        <input
          id={inputId}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          readOnly={readOnly}
          style={{
            width: '100%',
            padding: '14px 14px',
            paddingLeft: Icon ? '46px' : '14px',
            paddingRight: suffix ? '56px' : '14px',
            backgroundColor: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.10)',
            borderRadius: '14px',
            color: '#ffffff',
            fontSize: '1rem',
            outline: 'none',
            transition: 'border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease',
            fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
          }}
          onFocus={(e) => {
            e.target.style.borderColor = 'rgba(250,204,21,0.55)';
            e.target.style.boxShadow = '0 0 0 3px rgba(250,204,21,0.18)';
            e.target.style.backgroundColor = 'rgba(255,255,255,0.04)';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = 'rgba(255,255,255,0.10)';
            e.target.style.boxShadow = 'none';
            e.target.style.backgroundColor = 'rgba(255,255,255,0.03)';
          }}
        />

        {suffix && (
          <div
            style={{
              position: 'absolute',
              right: '14px',
              color: '#FACC15',
              fontWeight: 900,
              fontSize: '0.85rem',
              letterSpacing: '0.6px',
              pointerEvents: 'none',
            }}
          >
            {suffix}
          </div>
        )}
      </div>
    </div>
  );
}
