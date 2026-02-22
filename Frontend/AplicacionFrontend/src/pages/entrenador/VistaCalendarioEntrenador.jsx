import React from 'react';
import { useParams } from 'react-router-dom';
import CalendarioCliente from '../cliente/CalendarioCliente';

export default function VistaCalendarioEntrenador() {
    // Capturamos el ID que viene en la URL (ej: /entrenador/cliente/5/calendario)
    const { clienteId } = useParams();

    return (
        // Llamamos al calendario pero activando el "Modo Coach"
        <CalendarioCliente 
            clienteIdProp={clienteId} 
            isCoachMode={true} 
        />
    );
}