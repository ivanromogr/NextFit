import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import GestionAtletas from '../../../pages/entrenador/GestionAtletas';
import * as endpoints from '../../../api/endpoints';

// 1. MOCKS DE INFRAESTRUCTURA
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../../../context/AuthContext', () => ({
    useAuth: () => ({ userId: 'coach-123' })
}));

vi.mock('../../../api/endpoints', () => ({
    obtenerClientesEntrenador: vi.fn(),
    ficharCliente: vi.fn(),
    desvincularAtleta: vi.fn()
}));

vi.mock('../../../components/functional/ChatComponent', () => ({
    default: () => <div data-testid="mock-chat">Chat Abierto</div>
}));

vi.mock('lucide-react', () => ({
    User: () => <span>UserIcon</span>,
    Plus: () => <span>PlusIcon</span>,
    Search: () => <span>SearchIcon</span>,
    Mail: () => <span>MailIcon</span>,
    ChevronRight: () => <span>ChevronIcon</span>,
    Check: () => <span>CheckIcon</span>,
    MessageCircle: () => <span>ChatIcon</span>,
    X: () => <span>XIcon</span>,
    UserMinus: () => <span>UnlinkIcon</span>,
    AlertTriangle: () => <span>AlertIcon</span>,
}));

describe('Página GestionAtletas', () => {
    const mockClientes = [
        { 
            cliente: { id: 'c1', nombre: 'Juan', apellido: 'Pérez', objetivo: 'Ganar Masa', fotoPerfil: null },
            semanaCompletada: true 
        },
        { 
            cliente: { id: 'c2', nombre: 'María', apellido: 'Gómez', objetivo: 'Definición', fotoPerfil: null },
            semanaCompletada: false 
        }
    ];

    beforeEach(() => {
        vi.clearAllMocks();
    });

    const renderComponent = () => {
        render(<BrowserRouter><GestionAtletas /></BrowserRouter>);
    };

    it('muestra el estado vacío cuando el entrenador no tiene atletas', async () => {
        endpoints.obtenerClientesEntrenador.mockResolvedValue([]);
        renderComponent();
        expect(await screen.findByText(/Tu equipo está vacío/i)).toBeInTheDocument();
    });

    it('carga y lista a los atletas vinculados', async () => {
        endpoints.obtenerClientesEntrenador.mockResolvedValue(mockClientes);
        renderComponent();
        expect(await screen.findByText('Juan Pérez')).toBeInTheDocument();
        expect(screen.getByText('CUMPLIDO')).toBeInTheDocument();
    });

    it('filtra atletas correctamente por nombre en el buscador', async () => {
        endpoints.obtenerClientesEntrenador.mockResolvedValue(mockClientes);
        renderComponent();

        await screen.findByText('Juan Pérez');
        const searchInput = screen.getByPlaceholderText(/Buscar por nombre/i);

        // Usamos el acento correcto del mock
        fireEvent.change(searchInput, { target: { value: 'Marí' } });

        expect(screen.getByText('María Gómez')).toBeInTheDocument();
        expect(screen.queryByText('Juan Pérez')).not.toBeInTheDocument();
    });

    it('gestiona la desvinculación de un atleta mediante el modal de confirmación', async () => {
        endpoints.obtenerClientesEntrenador.mockResolvedValue(mockClientes);
        endpoints.desvincularAtleta.mockResolvedValue({ success: true });
        
        renderComponent();
        
        // 1. Esperamos a Juan
        await screen.findByText('Juan Pérez');

        // 2. 🎯 FIX SEGURO: Buscamos el botón por su 'title' directamente.
        // Como hay varios, pillamos el [0] (que corresponde a Juan en el array)
        const unlinkBtns = screen.getAllByTitle('Desvincular Atleta');
        fireEvent.click(unlinkBtns[0]);

        // 3. 🎯 FIX DUPLICADOS: Al abrir el modal, "Juan Pérez" está en la lista Y en el modal.
        // Verificamos que el modal de confirmación está presente primero.
        expect(screen.getByText(/¿DESVINCULAR ATLETA?/i)).toBeInTheDocument();
        
        // Comprobamos que el nombre aparece (usando getAll para que no explote por la duplicidad)
        const juanNames = screen.getAllByText(/Juan Pérez/i);
        expect(juanNames.length).toBeGreaterThanOrEqual(1);

        // 4. Confirmar desvincular
        const confirmBtn = screen.getByText('SÍ, DESVINCULAR');
        fireEvent.click(confirmBtn);

        // 5. Verificamos API y que desaparece de la UI
        await waitFor(() => {
            expect(endpoints.desvincularAtleta).toHaveBeenCalledWith('coach-123', 'c1');
            expect(screen.queryByText('Juan Pérez')).not.toBeInTheDocument();
        });
    });

    it('abre el chat al hacer click en el icono de mensaje', async () => {
        endpoints.obtenerClientesEntrenador.mockResolvedValue(mockClientes);
        renderComponent();

        // Buscamos el botón del chat por el icono que mockeamos
        const chatIcons = await screen.findAllByText('ChatIcon');
        fireEvent.click(chatIcons[0].closest('button'));

        expect(screen.getByTestId('mock-chat')).toBeInTheDocument();
        
        // Cerrar chat
        const closeBtn = screen.getByText('XIcon').closest('button');
        fireEvent.click(closeBtn);
        expect(screen.queryByTestId('mock-chat')).not.toBeInTheDocument();
    });

    it('navega a las rutinas del cliente al hacer click en Gestionar', async () => {
        endpoints.obtenerClientesEntrenador.mockResolvedValue(mockClientes);
        renderComponent();

        const btnGestionar = await screen.findAllByText(/Gestionar/i);
        fireEvent.click(btnGestionar[0]);

        expect(mockNavigate).toHaveBeenCalledWith('/entrenador/cliente/c1/rutinas');
    });
});