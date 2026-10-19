import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
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

    it('ofrece botones enfocables y anuncia la opción seleccionada', async () => {
        renderComponent();
        const fuerza = screen.getByRole('button', { name: 'FUERZA' });
        fuerza.focus();
        expect(fuerza.tagName).toBe('BUTTON');
        expect(fuerza).toHaveFocus();
        fireEvent.click(fuerza);
        expect(fuerza).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByRole('button', { name: 'HIPERTROFIA' })).toHaveAttribute('aria-pressed', 'false');
        const avanzado = screen.getByRole('button', { name: 'Avanzado' });
        avanzado.focus();
        expect(avanzado.tagName).toBe('BUTTON');
        fireEvent.click(avanzado);
        expect(avanzado).toHaveAttribute('aria-pressed', 'true');
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

    it('conserva las opciones tras un fallo y evita peticiones duplicadas', async () => {
        let reject;
        generarRutinaAuto.mockImplementationOnce(() => new Promise((resolve, fail) => { reject = fail; }));
        generarRutinaAuto.mockResolvedValueOnce({});
        renderComponent();
        fireEvent.click(screen.getByText('FUERZA'));
        const button = screen.getByRole('button', { name: /GENERAR PLAN PERSONALIZADO/i });
        fireEvent.click(button);
        fireEvent.click(button);
        expect(generarRutinaAuto).toHaveBeenCalledTimes(1);
        expect(button).toBeDisabled();
        expect(screen.getByRole('button', { name: 'FUERZA' })).toBeDisabled();
        await act(async () => reject(new Error('private server details')));
        expect(screen.getByRole('alert')).toHaveTextContent('Revisa tus rutinas');
        expect(screen.getByRole('alert')).not.toHaveTextContent('private server details');
        fireEvent.click(button);
        await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/cliente/dashboard'));
        expect(generarRutinaAuto).toHaveBeenCalledTimes(2);
        expect(generarRutinaAuto).toHaveBeenLastCalledWith(expect.objectContaining({ objetivo: 'FUERZA' }));
    });

    it('bloquea otra creación después de guardar', async () => {
        generarRutinaAuto.mockResolvedValue({});
        const onSuccess = vi.fn();
        renderComponent({ onSuccess });
        const button = screen.getByRole('button', { name: /GENERAR PLAN PERSONALIZADO/i });
        fireEvent.click(button);
        await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
        fireEvent.click(button);
        expect(generarRutinaAuto).toHaveBeenCalledTimes(1);
        expect(button).toBeDisabled();
    });

    it('no navega después de salir de la pantalla', async () => {
        let resolve;
        generarRutinaAuto.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
        const view = render(<BrowserRouter><GenerarRutinaIA /></BrowserRouter>);
        fireEvent.click(screen.getByRole('button', { name: /GENERAR PLAN PERSONALIZADO/i }));
        view.unmount();
        await act(async () => resolve({}));
        expect(mockNavigate).not.toHaveBeenCalled();
    });
});
