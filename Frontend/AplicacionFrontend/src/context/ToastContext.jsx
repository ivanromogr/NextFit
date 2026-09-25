/* eslint-disable react-refresh/only-export-components -- the hook is intentionally exported with its provider. */
import React, { createContext, useContext, useState } from 'react';
import GymToast from '../components/ui/GymToast';

const ToastContext = createContext();

export const useToast = () => useContext(ToastContext);

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const addToast = (message, type = 'success') => {
        const id = Date.now();
        setToasts((prev) => [...prev, { id, message, type }]);
    };

    const removeToast = (id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    };

    // Funciones helper para usar fácil: toast.success("Hola")
    const toast = {
        success: (msg) => addToast(msg, 'success'),
        error: (msg) => addToast(msg, 'error'),
        info: (msg) => addToast(msg, 'info')
    };

    return (
        <ToastContext.Provider value={toast}>
            {children}
            {/* Contenedor de Toasts */}
            <div style={{ position: 'fixed', top: 0, right: 0, zIndex: 9999, pointerEvents: 'none' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '20px', pointerEvents: 'auto' }}>
                    {toasts.map((t) => (
                        <GymToast 
                            key={t.id} 
                            message={t.message} 
                            type={t.type} 
                            onClose={() => removeToast(t.id)} 
                        />
                    ))}
                </div>
            </div>
        </ToastContext.Provider>
    );
};
