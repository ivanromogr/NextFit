import React from 'react';
import { useParams } from 'react-router-dom';
import ProgresoCliente from '../cliente/ProgresoCliente';

export default function VistaProgresoEntrenador() {
    const { clienteId } = useParams();

    return (
        <ProgresoCliente 
            clienteIdProp={clienteId} 
            isCoachMode={true} 
        />
    );
}