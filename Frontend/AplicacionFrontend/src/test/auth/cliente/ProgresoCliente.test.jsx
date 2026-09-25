import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import ProgresoCliente from '../../../pages/cliente/ProgresoCliente';
import * as endpoints from '../../../api/endpoints';

// 1. MOCKS DE CONTEXTO Y ROUTER
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../../../context/AuthContext', () => ({
    useAuth: () => ({ userId: 'atleta-123' })
}));

vi.mock('../../../components/ui/ProgresoChart', () => ({ default: () => <div data-testid="chart-progreso" /> }));
vi.mock('../../../components/ui/ConsistenciaChart', () => ({ default: () => <div data-testid="chart-consistencia" /> }));
vi.mock('../../../components/ui/DistribucionMuscularChart', () => ({ default: () => <div data-testid="chart-radar" /> }));
vi.mock('../../../components/ui/PersonalRecordsList', () => ({ default: () => <div data-testid="prs-list" /> }));

// 3. MOCK DE API
vi.mock('../../../api/endpoints', () => ({
    obtenerStatsGlobales: vi.fn(),
    obtenerProgresoEjercicio: vi.fn(),
    obtenerEjerciciosConHistorial: vi.fn(),
    obtenerEjercicios: vi.fn(),
    obtenerPRs: vi.fn()
}));

describe('Página ProgresoCliente', () => {
    const mockStats = {
        totalEntrenos: 15,
        volumenTotal: "120",
        horasEntrenadas: 22,
        comparativaVolumen: 10, // +10%
        distribucionMuscular: [{ grupo: 'Pecho', valor: 40 }]
    };

    const mockEjercicios = [
        { id: 'ex-1', nombre: 'Press Banca' },
        { id: 'ex-2', nombre: 'Sentadilla' }
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        endpoints.obtenerEjerciciosConHistorial.mockResolvedValue([]);
    });

    const renderComponent = (props = {}) => {
        render(
            <BrowserRouter>
                <ProgresoCliente {...props} />
            </BrowserRouter>
        );
    };

    it('carga y muestra los KPIs principales correctamente', async () => {
        endpoints.obtenerStatsGlobales.mockResolvedValue(mockStats);
        endpoints.obtenerPRs.mockResolvedValue([]);
        endpoints.obtenerEjerciciosConHistorial.mockResolvedValue(mockEjercicios);
        endpoints.obtenerEjercicios.mockResolvedValue(mockEjercicios);
        endpoints.obtenerProgresoEjercicio.mockResolvedValue([]);

        renderComponent();

        // Verificamos que los números de los KPIs aparecen
        expect(await screen.findByText('15')).toBeInTheDocument(); // Entrenos
        expect(screen.getByText('120')).toBeInTheDocument(); // Volumen
        expect(screen.getByText('22h')).toBeInTheDocument(); // Horas

        // Verificamos la flecha de comparativa (+10%)
        expect(screen.getByText(/10% vs semana pasada/i)).toBeInTheDocument();
    });

    it('cambia la gráfica al seleccionar un ejercicio diferente', async () => {
        endpoints.obtenerStatsGlobales.mockResolvedValue(mockStats);
        endpoints.obtenerEjerciciosConHistorial.mockResolvedValue(mockEjercicios);
        endpoints.obtenerEjercicios.mockResolvedValue(mockEjercicios);
        endpoints.obtenerProgresoEjercicio.mockResolvedValue({ grafica: [], pr: 100 });

        renderComponent();

        const select = await screen.findByRole('combobox');
        
        // Cambiamos de Press Banca (ex-1) a Sentadilla (ex-2)
        fireEvent.change(select, { target: { value: 'ex-2' } });

        await waitFor(() => {
            expect(endpoints.obtenerProgresoEjercicio).toHaveBeenCalledWith(
                expect.any(String), 
                'ex-2',
                null
            );
        });
    });

    it('se adapta correctamente al Modo Entrenador', async () => {
        endpoints.obtenerStatsGlobales.mockResolvedValue(mockStats);
        endpoints.obtenerEjercicios.mockResolvedValue([]);
        endpoints.obtenerProgresoEjercicio.mockResolvedValue([]);

        // Pasamos props de entrenador
        renderComponent({ clienteIdProp: 'cliente-ajeno', isCoachMode: true });

        expect(await screen.findByText(/VISTA ENTRENADOR/i)).toBeInTheDocument();
        expect(screen.getByText(/Progreso del Atleta/i)).toBeInTheDocument();
        
        // Verificamos que el botón VOLVER aparece en modo coach
        expect(screen.getByText(/VOLVER/i)).toBeInTheDocument();
    });

    it('muestra mensaje de error si no hay ejercicios disponibles', async () => {
        endpoints.obtenerStatsGlobales.mockResolvedValue(mockStats);
        endpoints.obtenerEjerciciosConHistorial.mockResolvedValue([]);
        endpoints.obtenerEjercicios.mockResolvedValue([]); // Lista vacía
        
        renderComponent();

        expect(await screen.findByText(/No hay datos de ejercicios/i)).toBeInTheDocument();
    });

    it('navega hacia atrás al pulsar el botón volver', async () => {
        endpoints.obtenerStatsGlobales.mockResolvedValue(mockStats);
        renderComponent({ isCoachMode: true });

        const btnBack = await screen.findByText(/VOLVER/i);
        fireEvent.click(btnBack);

        expect(mockNavigate).toHaveBeenCalledWith(-1);
    });
});
