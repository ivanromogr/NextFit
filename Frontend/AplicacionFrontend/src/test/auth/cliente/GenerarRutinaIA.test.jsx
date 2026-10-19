import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import GenerarRutinaIA from '../../../pages/cliente/GenerarRutinaIA';
import { generarRutinaAuto } from '../../../api/endpoints';

// 1. MOCK DE ROUTER
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

// 2. MOCK DE LA API
vi.mock('../../../api/endpoints', () => ({
    generarRutinaAuto: vi.fn()
}));

describe('Página GenerarRutinaIA', () => {

    beforeEach(() => {
        vi.clearAllMocks();
        vi.stubGlobal('localStorage', {
            getItem: vi.fn().mockReturnValue('atleta-ia-007'),
            setItem: vi.fn()
        });
        vi.stubGlobal('alert', vi.fn());
    });

    const renderComponent = (props = {}) => {
        render(
            <BrowserRouter>
                <GenerarRutinaIA {...props} />
            </BrowserRouter>
        );
    };

    it('describe el generador automático', () => {
        renderComponent();
        expect(screen.getByText(/Generador de/i)).toBeInTheDocument();
        expect(screen.queryByText(/^IA$/)).not.toBeInTheDocument();
        expect(screen.getByText(/Selecciona tu Objetivo Principal/i)).toBeInTheDocument();
    });

    it('redirecciona al login si no hay ID de usuario en localStorage', () => {
        localStorage.getItem.mockReturnValue(null);
        renderComponent();
        expect(mockNavigate).toHaveBeenCalledWith('/auth/login');
    });

    it('permite cambiar las opciones de configuración y generar la rutina', async () => {
        generarRutinaAuto.mockResolvedValue({ success: true });
        renderComponent();

        // Cambiamos objetivo a FUERZA
        const cardFuerza = screen.getByText('FUERZA');
        fireEvent.click(cardFuerza);

        // Cambiamos nivel a Avanzado
        const cardAvanzado = screen.getByText('Avanzado');
        fireEvent.click(cardAvanzado);

        // Cambiamos frecuencia a 5 Días
        const card5Dias = screen.getByText('5 Días');
        fireEvent.click(card5Dias);

        // Pulsamos el botón
        const btnGenerar = screen.getByText(/GENERAR PLAN PERSONALIZADO/i);
        fireEvent.click(btnGenerar);

        // 1. Verificamos que la API recibe el payload correcto
        await waitFor(() => {
            expect(generarRutinaAuto).toHaveBeenCalledWith(expect.objectContaining({
                idCliente: 'atleta-ia-007',
                objetivo: 'FUERZA',
                nivel: 'AVANZADO',
                diasPorSemana: 5
            }));
        });

        // 2.  Esperamos a que pase el setTimeout(500ms) y se llame a navigate
        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/cliente/dashboard');
        }, { timeout: 2000 }); // Damos margen de sobra por si el PC va lento
    });

    it('muestra un alert si la IA falla', async () => {
        generarRutinaAuto.mockRejectedValue({
            response: { data: { message: "Error IA" } }
        });

        renderComponent();
        
        fireEvent.click(screen.getByText(/GENERAR PLAN PERSONALIZADO/i));

        await waitFor(() => {
            expect(window.alert).toHaveBeenCalledWith(expect.stringContaining("Error IA"));
        });
    });
});
