import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import AgendaEntrenador from '../../../pages/entrenador/AgendaEntrenador';
import * as endpoints from '../../../api/endpoints';

// 1. MOCK DE ROUTER Y CONTEXTO
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../../../context/AuthContext', () => ({
    useAuth: () => ({ userId: 'entrenador-boss' })
}));

// 2. MOCK DE ICONOS LUCIDE (Previene fallos de renderizado de SVGs)
vi.mock('lucide-react', async () => {
    const actual = await vi.importActual('lucide-react');
    return {
        ...actual,
        Calendar: () => <span data-testid="icon-calendar" />,
        ChevronLeft: () => <span data-testid="icon-prev" />,
        ChevronRight: () => <span data-testid="icon-next" />,
        Activity: () => <span data-testid="icon-activity" />,
        Bell: () => <span data-testid="icon-bell" />,
    };
});

// 3. MOCK DE API
vi.mock('../../../api/endpoints', () => ({
    getEntrenador: vi.fn(),
    obtenerClientesEntrenador: vi.fn(),
    obtenerEventosCalendario: vi.fn()
}));

describe('Página AgendaEntrenador', () => {
    // 📅 FIJAMOS UNA FECHA: 15 de Marzo de 2026
    const FECHA_FIJA = new Date('2026-03-15T12:00:00Z');

    const mockPerfil = { nombre: 'Coach Supremo', fotoPerfil: '' };
    
    const mockClientes = [
        { cliente: { id: 'cliente-1', nombre: 'Juan', apellido: 'Pérez' } }
    ];

    const mockEventosJuan = [
        { 
            id: 'ev-1', 
            fecha: '2026-03-15T10:00:00Z', // Mismo día que la fecha fija
            estado: 'COMPLETADO', 
            rutinaNombre: 'Fuerza Torso' 
        }
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        
        // 🎯 FIX: Congelamos SÓLO el objeto Date. 
        // Así el calendario siempre creerá que es 15 de Marzo de 2026, 
        // pero los setTimeout de Testing Library seguirán funcionando.
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(FECHA_FIJA);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    const renderComponent = () => {
        render(<BrowserRouter><AgendaEntrenador /></BrowserRouter>);
    };

    it('carga el calendario y muestra el estado vacío si no hay eventos', async () => {
        endpoints.getEntrenador.mockResolvedValue({ entrenador: mockPerfil });
        endpoints.obtenerClientesEntrenador.mockResolvedValue(mockClientes);
        endpoints.obtenerEventosCalendario.mockResolvedValue([]); // Sin eventos

        renderComponent();

        // 1. Verificamos el título del mes (debería ser Marzo 2026 por la fecha fija)
        expect(await screen.findByText(/Marzo 2026/i)).toBeInTheDocument();

        // 2. Verificamos que carga el estado vacío
        expect(endpoints.obtenerEventosCalendario).toHaveBeenCalledWith(
            'cliente-1',
            expect.any(String),
            expect.any(String),
            'entrenador-boss'
        );
        expect(screen.getByText(/Día despejado/i)).toBeInTheDocument();
        expect(screen.getByText(/Ningún atleta tiene entrenamientos asignados/i)).toBeInTheDocument();
    });

    it('carga los clientes y muestra los eventos del día seleccionado', async () => {
        endpoints.getEntrenador.mockResolvedValue({ entrenador: mockPerfil });
        endpoints.obtenerClientesEntrenador.mockResolvedValue(mockClientes);
        endpoints.obtenerEventosCalendario.mockResolvedValue(mockEventosJuan);

        renderComponent();

        // Esperamos a que el calendario renderice el mes
        expect(await screen.findByText(/Marzo 2026/i)).toBeInTheDocument();

        // Verificamos que aparece el evento de Juan Pérez
        expect(screen.getByText(/Juan Pérez/i)).toBeInTheDocument();
        expect(screen.getByText(/Fuerza Torso/i)).toBeInTheDocument();
        expect(screen.getByText(/COMPLETADO/i)).toBeInTheDocument();
    });

    it('navega al calendario del cliente al pulsar "Gestionar"', async () => {
        endpoints.getEntrenador.mockResolvedValue({ entrenador: mockPerfil });
        endpoints.obtenerClientesEntrenador.mockResolvedValue(mockClientes);
        endpoints.obtenerEventosCalendario.mockResolvedValue(mockEventosJuan);

        renderComponent();

        // Esperamos a que aparezca la tarjeta del evento
        await screen.findByText(/Juan Pérez/i);

        // Pulsamos Gestionar
        const btnGestionar = screen.getByText(/Gestionar/i);
        fireEvent.click(btnGestionar);

        // Verificamos que viaja a la ruta correcta con el ID de Juan
        expect(mockNavigate).toHaveBeenCalledWith('/entrenador/cliente/cliente-1/calendario');
    });

    it('cambia de mes correctamente al pulsar los controles', async () => {
        endpoints.getEntrenador.mockResolvedValue({ entrenador: mockPerfil });
        endpoints.obtenerClientesEntrenador.mockResolvedValue([]);
        endpoints.obtenerEventosCalendario.mockResolvedValue([]);

        renderComponent();

        // 1. Verificamos que estamos en Marzo
        expect(await screen.findByText(/Marzo 2026/i)).toBeInTheDocument();

        // 2. Vamos a Abril
        // 🎯 FIX: Capturamos el botón JUSTO ANTES de hacer click
        let btnNext = screen.getByTestId('icon-next').parentElement;
        fireEvent.click(btnNext);
        expect(await screen.findByText(/Abril 2026/i)).toBeInTheDocument();

        // 3. Volvemos a Marzo
        // 🎯 FIX: Re-capturamos el botón "Prev" desde el nuevo DOM (Abril)
        let btnPrev = screen.getByTestId('icon-prev').parentElement;
        fireEvent.click(btnPrev); 
        expect(await screen.findByText(/Marzo 2026/i)).toBeInTheDocument(); 

        // 4. Bajamos a Febrero
        // 🎯 FIX: Re-capturamos el botón "Prev" desde el nuevo DOM (Marzo)
        btnPrev = screen.getByTestId('icon-prev').parentElement;
        fireEvent.click(btnPrev); 
        expect(await screen.findByText(/Febrero 2026/i)).toBeInTheDocument();
    });
});
