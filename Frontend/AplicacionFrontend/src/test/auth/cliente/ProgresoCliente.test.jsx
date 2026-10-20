import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
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

vi.mock('../../../components/ui/ProgresoChart', () => ({ default: ({data, pr}) => <div data-testid="chart-progreso">PR: {pr} {JSON.stringify(data)}</div> }));
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
        endpoints.obtenerStatsGlobales.mockReset().mockResolvedValue(mockStats);
        endpoints.obtenerPRs.mockReset().mockResolvedValue([]);
        endpoints.obtenerEjerciciosConHistorial.mockReset().mockResolvedValue([]);
        endpoints.obtenerEjercicios.mockReset().mockResolvedValue(mockEjercicios);
        endpoints.obtenerProgresoEjercicio.mockReset().mockResolvedValue([]);
    });

    const renderComponent = (props = {}) => {
        return render(
            <BrowserRouter>
                <ProgresoCliente {...props} />
            </BrowserRouter>
        );
    };

    it('shows a global statistics failure without inventing zeros and retries independently', async () => {
        endpoints.obtenerStatsGlobales.mockRejectedValueOnce(new Error('offline')).mockResolvedValue(mockStats);
        renderComponent();
        expect(screen.queryByText('0')).not.toBeInTheDocument();
        expect(await screen.findByRole('alert')).toHaveTextContent('No se pudieron cargar las estadísticas');
        fireEvent.click(screen.getByRole('button', { name: 'Reintentar estadísticas' }));
        expect(await screen.findByText('15')).toBeInTheDocument();
        expect(endpoints.obtenerPRs).toHaveBeenCalledTimes(1);
    });

    it('keeps the chosen exercise when retrying personal records', async () => {
        endpoints.obtenerPRs.mockRejectedValueOnce(new Error('offline')).mockResolvedValue([]);
        renderComponent();
        const select = await screen.findByRole('combobox');
        fireEvent.change(select, { target: { value: 'ex-2' } });
        fireEvent.click(screen.getByRole('button', { name: 'Reintentar récords' }));
        await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
        expect(select).toHaveValue('ex-2');
        expect(endpoints.obtenerStatsGlobales).toHaveBeenCalledTimes(1);
    });

    it('does not replace failed exercise history with the library as if history were empty', async () => {
        endpoints.obtenerEjerciciosConHistorial.mockRejectedValueOnce(new Error('offline')).mockResolvedValue(mockEjercicios);
        renderComponent();
        expect(await screen.findByRole('alert')).toHaveTextContent('No se pudieron cargar los ejercicios');
        expect(endpoints.obtenerEjercicios).not.toHaveBeenCalled();
        expect(screen.queryByText('No hay datos de ejercicios.')).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Reintentar ejercicios' }));
        expect(await screen.findByRole('combobox')).toHaveValue('ex-1');
    });

    it('ignores a delayed chart from a previously selected exercise', async () => {
        let finishOld;
        endpoints.obtenerProgresoEjercicio.mockImplementation((_, exercise) => exercise === 'ex-1'
            ? new Promise(resolve => { finishOld = resolve; })
            : Promise.resolve({ grafica: [{ fecha: 'hoy', valor: 200 }], pr: 150 }));
        renderComponent();
        const select = await screen.findByRole('combobox');
        await waitFor(() => expect(finishOld).toBeDefined());
        fireEvent.change(select, { target: { value: 'ex-2' } });
        expect(await screen.findByTestId('chart-progreso')).toHaveTextContent('PR: 150');
        await act(async () => finishOld({ grafica: [{ fecha: 'ayer', valor: 99 }], pr: 99 }));
        expect(screen.getByTestId('chart-progreso')).toHaveTextContent('PR: 150');
        expect(screen.getByTestId('chart-progreso')).not.toHaveTextContent('ayer');
    });

    it('ignores late statistics from another athlete', async () => {
        let finishOld;
        endpoints.obtenerStatsGlobales.mockImplementation(id => id === 'first-athlete'
            ? new Promise(resolve => { finishOld = resolve; })
            : Promise.resolve({ ...mockStats, totalEntrenos: 42 }));
        const { rerender } = renderComponent({ clienteIdProp: 'first-athlete', isCoachMode: true });
        await waitFor(() => expect(finishOld).toBeDefined());
        rerender(<BrowserRouter><ProgresoCliente clienteIdProp="second-athlete" isCoachMode /></BrowserRouter>);
        expect(await screen.findByText('42')).toBeInTheDocument();
        await act(async () => finishOld(mockStats));
        expect(screen.queryByText('15')).not.toBeInTheDocument();
        expect(screen.getByText('42')).toBeInTheDocument();
    });

    it('hides the old chart after a new exercise fails and offers its own retry', async () => {
        endpoints.obtenerProgresoEjercicio.mockImplementation((_, exercise) => exercise === 'ex-1'
            ? Promise.resolve({ grafica: [{ fecha: 'ayer', valor: 100 }], pr: 100 })
            : Promise.reject(new Error('offline')));
        renderComponent();
        expect(await screen.findByTestId('chart-progreso')).toHaveTextContent('PR: 100');
        fireEvent.change(screen.getByRole('combobox'), { target: { value: 'ex-2' } });
        expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo cargar la gráfica');
        expect(screen.queryByTestId('chart-progreso')).not.toBeInTheDocument();
        endpoints.obtenerProgresoEjercicio.mockResolvedValue({ grafica: [], pr: 200 });
        fireEvent.click(screen.getByRole('button', { name: 'Reintentar gráfica' }));
        expect(await screen.findByTestId('chart-progreso')).toHaveTextContent('PR: 200');
    });

    it('renders the API tonnage suffix exactly once', async () => {
        endpoints.obtenerStatsGlobales.mockResolvedValue({ ...mockStats, volumenTotal: '1t' });
        renderComponent();
        expect(await screen.findByText('15')).toBeInTheDocument();
        expect(screen.queryByText('1t')).not.toBeInTheDocument();
        expect(screen.getByText('1')).toBeInTheDocument();
    });

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
