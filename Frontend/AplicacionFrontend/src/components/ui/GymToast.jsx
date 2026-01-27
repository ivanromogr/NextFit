import React, { useEffect, useState } from 'react';
import { CheckCircle, AlertCircle, X, Info } from 'lucide-react';

export default function GymToast({ message, type, onClose }) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Animación de entrada
        requestAnimationFrame(() => setIsVisible(true));
        
        // Auto-cierre a los 3 segundos
        const timer = setTimeout(() => {
            setIsVisible(false);
            setTimeout(onClose, 300); // Esperar a que termine la animación de salida
        }, 3000);

        return () => clearTimeout(timer);
    }, [onClose]);

    // Configuración según tipo
    const config = {
        success: { icon: CheckCircle, color: '#FACC15', bg: 'rgba(250, 204, 21, 0.1)' },
        error:   { icon: AlertCircle, color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' },
        info:    { icon: Info,        color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' }
    }[type] || { icon: Info, color: '#fff', bg: '#333' };

    const Icon = config.icon;

    const styles = {
        toast: {
            position: 'fixed',
            top: '20px',
            right: '20px',
            background: '#18181b', // Tu color de fondo oscuro
            border: `1px solid ${config.color}`,
            borderLeft: `6px solid ${config.color}`,
            borderRadius: '8px',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            minWidth: '300px',
            maxWidth: '400px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            zIndex: 9999,
            color: 'white',
            fontFamily: 'sans-serif',
            transform: isVisible ? 'translateX(0)' : 'translateX(120%)',
            opacity: isVisible ? 1 : 0,
            transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        },
        closeBtn: {
            marginLeft: 'auto',
            background: 'none',
            border: 'none',
            color: '#71717a',
            cursor: 'pointer',
            padding: '4px'
        },
        message: {
            fontSize: '0.95rem',
            fontWeight: '600'
        }
    };

    return (
        <div style={styles.toast}>
            <div style={{ color: config.color }}>
                <Icon size={24} />
            </div>
            <div style={styles.message}>{message}</div>
            <button style={styles.closeBtn} onClick={() => { setIsVisible(false); setTimeout(onClose, 300); }}>
                <X size={18} />
            </button>
        </div>
    );
}