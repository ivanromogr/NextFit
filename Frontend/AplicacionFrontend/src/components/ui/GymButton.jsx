import React from 'react';

export default function GymButton({
  children,
  onClick,
  loading,
  fullWidth,
  disabled,
  type = 'button',
  variant = 'primary', 
}) {
  const isDisabled = disabled || loading;
  const isSecondary = variant === 'secondary';

  const baseStyle = {
    width: fullWidth ? '100%' : 'auto',
    padding: '14px 18px',
    borderRadius: '14px',
    fontSize: '1rem',
    fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
    fontWeight: 800,
    letterSpacing: '0.7px',
    textTransform: 'uppercase',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    border: '1px solid transparent',
    transition: 'transform 0.12s ease, box-shadow 0.2s ease, filter 0.2s ease, background 0.2s ease, border-color 0.2s ease',
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    opacity: isDisabled ? 0.7 : 1,
    userSelect: 'none',
    outline: 'none',
  };

  const primaryStyle = {
    background: 'linear-gradient(135deg, #FACC15 0%, #EAB308 100%)',
    color: '#0A0A0A',
    boxShadow: '0 10px 25px rgba(250, 204, 21, 0.18)',
  };

  const secondaryStyle = {
    background: 'rgba(255,255,255,0.04)',
    color: '#FFFFFF',
    borderColor: 'rgba(255,255,255,0.10)',
    boxShadow: 'none',
  };

  const disabledStyle = {
    background: '#141416',
    color: '#6B7280',
    borderColor: 'rgba(255,255,255,0.08)',
    boxShadow: 'none',
  };

  const currentStyle = {
    ...baseStyle,
    ...(isDisabled ? disabledStyle : isSecondary ? secondaryStyle : primaryStyle),
  };

  return (
    <button
      type={type}
      onClick={isDisabled ? undefined : onClick}
      disabled={isDisabled}
      style={currentStyle}
      onMouseEnter={(e) => {
        if (isDisabled) return;
        e.currentTarget.style.filter = isSecondary ? 'brightness(1.08)' : 'brightness(1.04)';
        e.currentTarget.style.boxShadow = isSecondary
          ? '0 10px 25px rgba(0,0,0,0.35)'
          : '0 14px 35px rgba(250, 204, 21, 0.22)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.filter = 'none';
        e.currentTarget.style.boxShadow = currentStyle.boxShadow || 'none';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
      onMouseDown={(e) => {
        if (isDisabled) return;
        e.currentTarget.style.transform = 'translateY(1px) scale(0.99)';
      }}
      onMouseUp={(e) => {
        if (isDisabled) return;
        e.currentTarget.style.transform = 'translateY(0) scale(1)';
      }}
      onFocus={(e) => {
        if (isDisabled) return;
        e.currentTarget.style.boxShadow = isSecondary
          ? '0 0 0 3px rgba(250, 204, 21, 0.20)'
          : '0 0 0 3px rgba(250, 204, 21, 0.28), 0 14px 35px rgba(250, 204, 21, 0.18)';
        e.currentTarget.style.borderColor = 'rgba(250, 204, 21, 0.55)';
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = 'transparent';
        e.currentTarget.style.boxShadow = currentStyle.boxShadow || 'none';
      }}
    >
      {loading ? (
        <>
          <span
            aria-hidden="true"
            style={{
              width: 16,
              height: 16,
              borderRadius: '50%',
              border: '2px solid rgba(0,0,0,0.25)',
              borderTopColor: 'rgba(0,0,0,0.75)',
              display: 'inline-block',
              animation: 'gym-spin 0.8s linear infinite',
            }}
          />
          <span>Procesando…</span>
          <style>{`
            @keyframes gym-spin { to { transform: rotate(360deg); } }
          `}</style>
        </>
      ) : (
        children
      )}
    </button>
  );
}
