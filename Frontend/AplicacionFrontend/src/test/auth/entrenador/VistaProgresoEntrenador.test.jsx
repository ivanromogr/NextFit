import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter, useParams } from 'react-router-dom';
import VistaProgresoEntrenador from '../../../pages/entrenador/VistaProgresoEntrenador';

// 1. MOCK DE REACT-ROUTER-DOM
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useParams: vi.fn(),
    };
});

// 2. MOCK DEL COMPONENTE HIJO (Ruta corregida para Vitest)
vi.mock('../../../pages/cliente/ProgresoCliente', () => ({
    default: ({ clienteIdProp, isCoachMode }) => (
        <div data-testid="mock-progreso">
            ID del Atleta: {clienteIdProp} | Modo Coach: {isCoachMode ? 'ACTIVADO' : 'DESACTIVADO'}
        </div>
    )
}));

// 3. MOCK DE AUTH CONTEXT (Seguridad extra)
vi.mock('../../../context/AuthContext', () => ({
    useAuth: () => ({ userId: 'coach-id-123' })
}));

describe('Página VistaProgresoEntrenador', () => {

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('captura el ID del atleta de la URL y renderiza el progreso en modo coach', async () => {
        // Simulamos la URL: /entrenador/cliente/atleta_99/progreso
        useParams.mockReturnValue({ clienteId: 'atleta_99' });

        render(
            <BrowserRouter>
                <VistaProgresoEntrenador />
            </BrowserRouter>
        );

        // Verificamos que se renderiza nuestro mock
        const container = await screen.findByTestId('mock-progreso');
        expect(container).toBeInTheDocument();

        // Validamos que las props pasadas son las correctas
        expect(screen.getByText(/ID del Atleta: atleta_99/i)).toBeInTheDocument();
        expect(screen.getByText(/Modo Coach: ACTIVADO/i)).toBeInTheDocument();
    });

    it('maneja correctamente IDs con caracteres especiales o guiones', async () => {
        const complexId = 'usr-001-abc_x';
        useParams.mockReturnValue({ clienteId: complexId });

        render(
            <BrowserRouter>
                <VistaProgresoEntrenador />
            </BrowserRouter>
        );

        expect(await screen.findByText(new RegExp(`ID del Atleta: ${complexId}`, 'i'))).toBeInTheDocument();
    });
});