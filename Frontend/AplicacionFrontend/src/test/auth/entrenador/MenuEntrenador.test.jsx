import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import MenuEntrenador from '../../../pages/entrenador/MenuEntrenador';
import * as endpoints from '../../../api/endpoints';

// 1. MOCKS DE INFRAESTRUCTURA
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return { ...actual, useNavigate: () => mockNavigate };
});

const auth = vi.hoisted(() => ({ userId: 'coach-ultra-123' }));
vi.mock('../../../context/AuthContext', () => ({ useAuth: () => auth }));

vi.mock('../../../api/endpoints', () => ({
    obtenerClientesEntrenador: vi.fn(),
    ficharCliente: vi.fn(),
    obtenerDashboardResumen: vi.fn(),
    getEntrenador: vi.fn()
}));

vi.mock('../../../components/functional/ChatComponent', () => ({
    default: () => <div data-testid="mock-chat">Panel de Chat</div>
}));

vi.mock('lucide-react', () => ({
    User: () => <span>IconUser</span>,
    Plus: () => <span>IconPlus</span>,
    X: () => <span>IconX</span>,
    Mail: () => <span>IconMail</span>,
    Activity: () => <span>IconActivity</span>,
    ChevronRight: () => <span>IconChevron</span>,
    CheckCircle2: () => <span>IconCheckCircle</span>,
    AlertTriangle: () => <span>IconAlert</span>,
    Zap: () => <span>IconZap</span>,
    Check: () => <span>IconCheck</span>,
    MessageCircle: () => <span>IconMessage</span>,
    TrendingUp: () => <span>IconTrending</span>,
    Bell: () => <span>IconBell</span>
}));

describe('Página MenuEntrenador (Cuartel General)', () => {
    const mockClientes = [
        { cliente: { id: 'c1', nombre: 'Juan', apellido: 'Pérez', objetivo: 'Fuerza', fotoPerfil: null }, semanaCompletada: true }
    ];

    const mockResumen = {
        feedActividad: [{ id: 1, clienteId: 'c1', clienteNombre: 'Juan', rutina: 'Pecho-Biceps', fecha: new Date().toISOString() }],
        stats: { hoy: 5, riesgo: 2, records: 10 }
    };

    const mockPerfil = { nombre: 'Carlos Entrenador', fotoPerfil: 'url-foto.jpg' };

    beforeEach(() => {
        vi.clearAllMocks();
        auth.userId = 'coach-ultra-123';
        endpoints.obtenerClientesEntrenador.mockReset().mockResolvedValue(mockClientes);
        endpoints.obtenerDashboardResumen.mockReset().mockResolvedValue(mockResumen);
        endpoints.getEntrenador.mockReset().mockResolvedValue(mockPerfil);
    });

    const renderComponent = () => {
        return render(<BrowserRouter><MenuEntrenador /></BrowserRouter>);
    };

    it('muestra el estado de carga inicial', () => {
        endpoints.obtenerClientesEntrenador.mockReturnValue(new Promise(() => {}));
        endpoints.obtenerDashboardResumen.mockReturnValue(new Promise(() => {}));
        endpoints.getEntrenador.mockReturnValue(new Promise(() => {}));
        
        renderComponent();
        
        // Buscamos el texto de carga (usamos regex flexible)
        expect(screen.getByText(/CARGANDO/i)).toBeInTheDocument();
        expect(screen.getByText(/CUARTEL GENERAL/i)).toBeInTheDocument();
    });

    it('carga y renderiza correctamente todos los datos del dashboard', async () => {
        endpoints.obtenerClientesEntrenador.mockResolvedValue(mockClientes);
        endpoints.obtenerDashboardResumen.mockResolvedValue(mockResumen);
        endpoints.getEntrenador.mockResolvedValue(mockPerfil);

        renderComponent();

        // Saludo
        expect(await screen.findByText(/Hola, Carlos/i)).toBeInTheDocument();

        // KPIs
        expect(screen.getByText('5')).toBeInTheDocument();
        expect(screen.getByText('2')).toBeInTheDocument();

        const seccionAtletas = screen.getByText(/MIS ATLETAS/i).closest('div');
        expect(within(seccionAtletas).getByText(/Juan/i)).toBeInTheDocument();
        expect(within(seccionAtletas).getByText(/Pérez/i)).toBeInTheDocument();
        expect(within(seccionAtletas).getByText(/CUMPLIDO/i)).toBeInTheDocument();
    });

    it('abre el chat flotante de un atleta específico', async () => {
        endpoints.obtenerClientesEntrenador.mockResolvedValue(mockClientes);
        endpoints.getEntrenador.mockResolvedValue(mockPerfil);

        renderComponent();
        
        // Esperamos a que aparezca la tarjeta
        const nombreAtleta = await screen.findByText(/Juan Pérez/i);
        const tarjetaJuan = nombreAtleta.closest('div').parentElement.parentElement;
        
        // Pulsamos el botón de chat DENTRO de esa tarjeta
        const chatBtn = within(tarjetaJuan).getByText('IconMessage').closest('button');
        fireEvent.click(chatBtn);

        expect(screen.getByTestId('mock-chat')).toBeInTheDocument();

        // Cerramos con la X
        const closeBtn = screen.getByText('IconX').closest('button');
        fireEvent.click(closeBtn);
        expect(screen.queryByTestId('mock-chat')).not.toBeInTheDocument();
    });

    it('navega a las rutinas desde la tarjeta del atleta', async () => {
        endpoints.obtenerClientesEntrenador.mockResolvedValue(mockClientes);
        endpoints.getEntrenador.mockResolvedValue(mockPerfil);

        renderComponent();
        const nombreAtleta = await screen.findByText(/Juan Pérez/i);
        const tarjetaJuan = nombreAtleta.closest('div').parentElement.parentElement;
        
        const manageBtn = within(tarjetaJuan).getByText(/Gestionar/i);
        fireEvent.click(manageBtn);

        expect(mockNavigate).toHaveBeenCalledWith('/entrenador/cliente/c1/rutinas');
    });

    it('abre el modal y vincula a un nuevo atleta con éxito', async () => {
        endpoints.getEntrenador.mockResolvedValue(mockPerfil);
        endpoints.ficharCliente.mockResolvedValue({ success: true });

        renderComponent();
        await screen.findByText(/Hola, Carlos/i);

        fireEvent.click(screen.getByText(/Nuevo Atleta/i));
        
        const input = screen.getByPlaceholderText(/usuario@email.com/i);
        fireEvent.change(input, { target: { value: 'nuevo@atleta.com' } });
        
        fireEvent.click(screen.getByText(/Añadir al Equipo/i));

        await waitFor(() => {
            expect(endpoints.ficharCliente).toHaveBeenCalledWith('coach-ultra-123', 'nuevo@atleta.com');
            expect(screen.queryByText(/Vincular Atleta/i)).not.toBeInTheDocument();
        });
    });

    it('recovers a failed summary without inventing zero statistics or empty activity', async () => {
        endpoints.obtenerDashboardResumen.mockRejectedValueOnce(new Error('offline')).mockResolvedValue(mockResumen);
        renderComponent();
        await screen.findByRole('alert');
        expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
        expect(screen.queryByText('Entrenan Hoy')).not.toBeInTheDocument();
        expect(screen.queryByText('No hay actividad reciente en tu equipo.')).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Reintentar panel' }));
        expect(await screen.findByText('5')).toBeInTheDocument();
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
    it('keeps available statistics when athletes fail without showing an empty team', async () => {
        endpoints.obtenerClientesEntrenador.mockRejectedValueOnce(new Error('offline'));
        renderComponent();
        await screen.findByRole('alert');
        expect(screen.getByText('5')).toBeInTheDocument();
        expect(screen.queryByText('No tienes atletas vinculados.')).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Reintentar panel' }));
        expect(await screen.findByText('Juan Pérez')).toBeInTheDocument();
    });
    it('reports a profile failure while keeping the other available sections', async () => {
        endpoints.getEntrenador.mockRejectedValueOnce(new Error('offline'));
        renderComponent();
        expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo cargar tu perfil.');
        expect(screen.getByText('5')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Reintentar panel' }));
        expect(await screen.findByText(/Hola, Carlos/)).toBeInTheDocument();
    });
    it('rejects malformed summary data instead of treating it as a zero result', async () => {
        endpoints.obtenerDashboardResumen.mockResolvedValue({ stats: {}, feedActividad: [] });
        renderComponent();
        expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo cargar el resumen');
        expect(screen.queryByText('Entrenan Hoy')).not.toBeInTheDocument();
    });
    it('ignores a late initial load from the previous account', async () => {
        let finishOld;
        endpoints.obtenerDashboardResumen.mockReturnValueOnce(new Promise(resolve => { finishOld = resolve; }));
        const view = renderComponent();
        await waitFor(() => expect(endpoints.obtenerDashboardResumen).toHaveBeenCalledTimes(1));
        auth.userId = 'coach-other';
        endpoints.getEntrenador.mockResolvedValue({ nombre: 'Laura' });
        endpoints.obtenerClientesEntrenador.mockResolvedValue([]);
        endpoints.obtenerDashboardResumen.mockResolvedValue({ stats: { hoy: 7, riesgo: 0, records: 0 }, feedActividad: [] });
        view.rerender(<BrowserRouter><MenuEntrenador /></BrowserRouter>);
        await screen.findByText(/Hola, Laura/);
        await act(async () => finishOld(mockResumen));
        expect(screen.getByText('7')).toBeInTheDocument();
        expect(screen.queryByText('5')).not.toBeInTheDocument();
        expect(screen.queryByText('Juan Pérez')).not.toBeInTheDocument();
    });
    it('hides loaded data immediately when the account changes', async () => {
        const view = renderComponent();
        await screen.findByText(/Hola, Carlos/);
        auth.userId = 'coach-other';
        endpoints.obtenerDashboardResumen.mockReturnValue(new Promise(() => {}));
        view.rerender(<BrowserRouter><MenuEntrenador /></BrowserRouter>);
        expect(screen.queryByText(/Hola, Carlos/)).not.toBeInTheDocument();
        expect(screen.queryByText('Juan Pérez')).not.toBeInTheDocument();
        expect(screen.queryByText('5')).not.toBeInTheDocument();
    });
    it('deduplicates simultaneous focus refreshes and removes its listener on unmount', async () => {
        const view = renderComponent();
        await screen.findByText('5');
        let finishRefresh;
        endpoints.obtenerDashboardResumen.mockReturnValueOnce(new Promise(resolve => { finishRefresh = resolve; }));
        fireEvent(window, new Event('focus'));
        fireEvent(window, new Event('focus'));
        expect(endpoints.obtenerDashboardResumen).toHaveBeenCalledTimes(2);
        await act(async () => finishRefresh(mockResumen));
        view.unmount();
        fireEvent(window, new Event('focus'));
        expect(endpoints.obtenerDashboardResumen).toHaveBeenCalledTimes(2);
    });
    it('marks retained statistics as stale on refresh failure and recovers on focus', async () => {
        renderComponent();
        await screen.findByText('5');
        endpoints.obtenerDashboardResumen.mockRejectedValueOnce(new Error('offline'));
        fireEvent(window, new Event('focus'));
        expect(await screen.findByRole('alert')).toHaveTextContent('últimos datos recibidos');
        expect(screen.getByText('5')).toBeInTheDocument();
        endpoints.obtenerDashboardResumen.mockResolvedValue({ ...mockResumen, stats: { ...mockResumen.stats, hoy: 8 } });
        fireEvent(window, new Event('focus'));
        expect(await screen.findByText('8')).toBeInTheDocument();
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
});
