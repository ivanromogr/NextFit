import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
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

vi.mock('../../../context/AuthContext', () => ({
    useAuth: () => ({ userId: 'coach-ultra-123' })
}));

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
    });

    const renderComponent = () => {
        render(<BrowserRouter><MenuEntrenador /></BrowserRouter>);
    };

    it('muestra el estado de carga inicial', () => {
        // 🎯 FIX: Bloqueamos TODAS las promesas del Promise.all para que no terminen
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

        // 🎯 FIX JUAN: Buscamos específicamente en la columna de atletas
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
});