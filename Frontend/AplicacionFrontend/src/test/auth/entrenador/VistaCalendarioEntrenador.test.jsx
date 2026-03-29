import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter, useParams } from 'react-router-dom';
import VistaCalendarioEntrenador from '../../../pages/entrenador/VistaCalendarioEntrenador';

// 1. MOCK DE REACT-ROUTER-DOM
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useParams: vi.fn(),
    };
});

// 2. 🎯 FIX: MOCK DEL COMPONENTE HIJO (Ruta corregida)
// Ajustamos la ruta para que Vitest intercepte la importación correctamente
vi.mock('../../../pages/cliente/CalendarioCliente', () => ({
    // Importante: Si el componente se exporta como 'default'
    default: ({ clienteIdProp, isCoachMode }) => (
        <div data-testid="mock-calendario">
            ID: {clienteIdProp} | CoachMode: {isCoachMode ? 'SI' : 'NO'}
        </div>
    )
}));

// 3. MOCK DE AUTH CONTEXT (Por si acaso algún otro componente lo llama)
vi.mock('../../../context/AuthContext', () => ({
    useAuth: () => ({ userId: 'coach-123' })
}));

describe('Página VistaCalendarioEntrenador', () => {

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('extrae el clienteId de la URL y lo pasa correctamente al Calendario', async () => {
        // Simulamos el ID en la URL
        useParams.mockReturnValue({ clienteId: '42' });

        render(
            <BrowserRouter>
                <VistaCalendarioEntrenador />
            </BrowserRouter>
        );

        // Ahora debería encontrar el mock y no intentar renderizar el real
        expect(await screen.findByTestId('mock-calendario')).toBeInTheDocument();
        expect(screen.getByText(/ID: 42/i)).toBeInTheDocument();
        expect(screen.getByText(/CoachMode: SI/i)).toBeInTheDocument();
    });

    it('funciona correctamente incluso con IDs de cliente en formato string largo', async () => {
        const longId = 'uuid-abc-123-long-id';
        useParams.mockReturnValue({ clienteId: longId });

        render(
            <BrowserRouter>
                <VistaCalendarioEntrenador />
            </BrowserRouter>
        );

        expect(await screen.findByText(new RegExp(`ID: ${longId}`, 'i'))).toBeInTheDocument();
    });
});