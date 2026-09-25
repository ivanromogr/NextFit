import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter, useParams } from 'react-router-dom';
import RutinasDeCliente from '../../../pages/entrenador/RutinasDeCliente';
import * as endpoints from '../../../api/endpoints';

// 1. MOCKS DE INFRAESTRUCTURA
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return { 
        ...actual, 
        useNavigate: () => mockNavigate,
        useParams: vi.fn()
    };
});

vi.mock('../../../context/AuthContext', () => ({
    useAuth: () => ({ userId: 'entrenador-123' })
}));

const mockToast = { success: vi.fn(), error: vi.fn() };
vi.mock('../../../context/ToastContext', () => ({
    useToast: () => mockToast
}));

vi.mock('../../../api/endpoints', () => ({
    getCliente: vi.fn(),
    obtenerRutinasAsignadasPorEntrenador: vi.fn(),
    eliminarRutina: vi.fn(),
    obtenerPlantillasEntrenador: vi.fn(),
    clonarPlantilla: vi.fn()
}));

vi.mock('lucide-react', () => ({
    Dumbbell: () => <span>IconDumbbell</span>,
    Plus: () => <span>IconPlus</span>,
    ChevronLeft: () => <span>IconBack</span>,
    ChevronRight: () => <span>IconChevronRight</span>,
    Edit: () => <span>IconEdit</span>,
    Trash2: () => <span>IconTrash</span>,
    Calendar: () => <span>IconCalendar</span>,
    User: () => <span>IconUser</span>,
    TrendingUp: () => <span>IconTrend</span>,
    Download: () => <span>IconImport</span>,
    Copy: () => <span>IconCopy</span>,
    X: () => <span>IconX</span>,
    Activity: () => <span>IconActivity</span>,
    AlertCircle: () => <span>IconAlert</span>
}));

describe('Página RutinasDeCliente', () => {
    const mockId = 'atleta-001';
    const mockCliente = { id: mockId, nombre: 'Marc', apellido: 'Gasol', fotoPerfil: null };
    const mockRutinas = [
        { id: 'r1', nombre: 'Fuerza Explosiva', nivel: 'Pro', objetivo: 'Potencia', detalles: [1, 2, 3] }
    ];
    const mockPlantillas = [
        { id: 'p1', nombre: 'Plantilla Push/Pull', nivel: 'Medio', objetivo: 'Masa' }
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        useParams.mockReturnValue({ clienteId: mockId });
        vi.stubGlobal('confirm', vi.fn(() => true));
    });

    const renderComponent = () => {
        render(<BrowserRouter><RutinasDeCliente /></BrowserRouter>);
    };

    it('carga y muestra los datos del cliente y sus rutinas', async () => {
        endpoints.getCliente.mockResolvedValue(mockCliente);
        endpoints.obtenerRutinasAsignadasPorEntrenador.mockResolvedValue(mockRutinas);

        renderComponent();

        // Buscamos con regex y findByText para dar tiempo a la carga asíncrona
        expect(await screen.findByText(/Marc/i)).toBeInTheDocument();
        expect(await screen.findByText(/Gasol/i)).toBeInTheDocument();
        expect(screen.getByText(/Fuerza Explosiva/i)).toBeInTheDocument();
    });

    it('permite eliminar una rutina tras confirmar', async () => {
        endpoints.getCliente.mockResolvedValue(mockCliente);
        endpoints.obtenerRutinasAsignadasPorEntrenador.mockResolvedValue(mockRutinas);
        endpoints.eliminarRutina.mockResolvedValue({ success: true });

        renderComponent();
        await screen.findByText(/Marc/i);

        // Usamos getAllByText y pillamos el primero si hay varios iconos/botones
        const btnEliminar = screen.getByText(/Eliminar/i);
        fireEvent.click(btnEliminar);

        expect(window.confirm).toHaveBeenCalled();
        await waitFor(() => {
            expect(endpoints.eliminarRutina).toHaveBeenCalledWith('r1');
            expect(mockToast.success).toHaveBeenCalledWith("Rutina eliminada correctamente");
        });
    });

  it('abre el modal e importa una plantilla maestra con éxito', async () => {
        endpoints.getCliente.mockResolvedValue(mockCliente);
        endpoints.obtenerRutinasAsignadasPorEntrenador.mockResolvedValue([]);
        endpoints.obtenerPlantillasEntrenador.mockResolvedValue(mockPlantillas);
        endpoints.clonarPlantilla.mockResolvedValue({ success: true });

        renderComponent();
        await screen.findByText(/Marc/i);

        // 1. Abrir Modal
        fireEvent.click(screen.getByText(/Importar Plantilla/i));
        
        // 2. Esperar a que la plantilla aparezca
        expect(await screen.findByText('Plantilla Push/Pull')).toBeInTheDocument();

        // Esto ignora el prefijo "IconImport" del icono mockeado.
        const btnConfirmarImport = screen.getByRole('button', { name: /Importar$/ });
        fireEvent.click(btnConfirmarImport);

        // 4. Validar
        await waitFor(() => {
            expect(endpoints.clonarPlantilla).toHaveBeenCalledWith('p1', 'atleta-001');
            expect(mockToast.success).toHaveBeenCalledWith("¡Plantilla clonada con éxito!");
        });
    });

    it('muestra estado vacío si el atleta no tiene rutinas', async () => {
        endpoints.getCliente.mockResolvedValue(mockCliente);
        endpoints.obtenerRutinasAsignadasPorEntrenador.mockResolvedValue([]);
        
        renderComponent();
        
        // Ahora no explotará porque ChevronRight está mockeado
        expect(await screen.findByText(/Biblioteca Vacía/i)).toBeInTheDocument();
    });
});
