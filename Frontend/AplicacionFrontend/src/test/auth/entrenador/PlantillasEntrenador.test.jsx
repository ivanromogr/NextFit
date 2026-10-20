import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import PlantillasEntrenador from '../../../pages/entrenador/PlantillasEntrenador';
import * as endpoints from '../../../api/endpoints';

// 1. MOCKS DE INFRAESTRUCTURA
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return { ...actual, useNavigate: () => mockNavigate };
});

const auth = vi.hoisted(() => ({ userId: 'coach-123' }));
vi.mock('../../../context/AuthContext', () => ({ useAuth: () => auth }));

const mockToast = {
    success: vi.fn(),
    error: vi.fn()
};
vi.mock('../../../context/ToastContext', () => ({
    useToast: () => mockToast
}));

vi.mock('../../../api/endpoints', () => ({
    obtenerPlantillasEntrenador: vi.fn(),
    eliminarRutina: vi.fn()
}));

// Mock de iconos Lucide
vi.mock('lucide-react', () => ({
    BookOpen: () => <span data-testid="icon-book" />,
    Plus: () => <span data-testid="icon-plus" />,
    Edit: () => <span data-testid="icon-edit" />,
    Trash2: () => <span data-testid="icon-trash" />,
    Activity: () => <span data-testid="icon-activity" />,
    Copy: () => <span data-testid="icon-copy" />,
    Dumbbell: () => <span data-testid="icon-dumbbell" />
}));

describe('Página PlantillasEntrenador', () => {
    const mockPlantillas = [
        { id: 'p1', nombre: 'Fuerza Máxima', nivel: 'Avanzado', objetivo: 'Fuerza', detalles: [1, 2, 3] },
        { id: 'p2', nombre: 'Hipertrofia Base', nivel: 'Intermedio', objetivo: 'Masa', detalles: [1, 2, 3, 4, 5] }
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        auth.userId = 'coach-123';
        endpoints.obtenerPlantillasEntrenador.mockReset();
        // Mock de window.confirm
        vi.stubGlobal('confirm', vi.fn(() => true));
    });

    const renderComponent = () => {
        return render(<BrowserRouter><PlantillasEntrenador /></BrowserRouter>);
    };

    it('muestra el loader mientras carga las plantillas', () => {
        endpoints.obtenerPlantillasEntrenador.mockReturnValue(new Promise(() => {}));
        renderComponent();
        expect(screen.getByTestId('icon-activity')).toBeInTheDocument();
    });

    it('muestra el estado vacío si no hay plantillas', async () => {
        endpoints.obtenerPlantillasEntrenador.mockResolvedValue([]);
        renderComponent();

        expect(await screen.findByText(/Tu biblioteca está vacía/i)).toBeInTheDocument();
        expect(screen.getByText(/Crea rutinas maestras/i)).toBeInTheDocument();
    });

    it('renderiza la lista de plantillas correctamente', async () => {
        endpoints.obtenerPlantillasEntrenador.mockResolvedValue(mockPlantillas);
        renderComponent();

        expect(await screen.findByText('Fuerza Máxima')).toBeInTheDocument();
        expect(screen.getByText('Hipertrofia Base')).toBeInTheDocument();
        
        // Usamos una función para encontrar el texto aunque esté dividido por etiquetas <span>
        const matchEjercicios = (num) => (content, element) => {
            const hasText = (node) => node.textContent === `${num} ejercicios` || node.textContent.includes(`${num} ejercicios`);
            const nodeHasText = hasText(element);
            const childrenDontHaveText = Array.from(element.children).every(
                (child) => !hasText(child)
            );
            return nodeHasText && childrenDontHaveText;
        };

        // Ahora buscamos el texto de forma flexible
        expect(screen.getByText(matchEjercicios(3))).toBeInTheDocument();
        expect(screen.getByText(matchEjercicios(5))).toBeInTheDocument();
    });

    it('navega al creador al pulsar "Crear Nueva Plantilla"', async () => {
        endpoints.obtenerPlantillasEntrenador.mockResolvedValue([]);
        renderComponent();

        const btnCrear = await screen.findByText(/Crear Nueva Plantilla/i);
        fireEvent.click(btnCrear);

        expect(mockNavigate).toHaveBeenCalledWith('/entrenador/plantillas/crear');
    });

    it('navega al editor al pulsar "Editar" en una tarjeta', async () => {
        endpoints.obtenerPlantillasEntrenador.mockResolvedValue(mockPlantillas);
        renderComponent();

        const btnsEditar = await screen.findAllByText(/Editar/i);
        fireEvent.click(btnsEditar[0]); // Pulsamos el de la primera plantilla (p1)

        expect(mockNavigate).toHaveBeenCalledWith('/entrenador/plantillas/editar/p1');
    });

    it('elimina una plantilla tras confirmar el diálogo', async () => {
        endpoints.obtenerPlantillasEntrenador.mockResolvedValue(mockPlantillas);
        endpoints.eliminarRutina.mockResolvedValue({ success: true });
        
        renderComponent();

        const btnsEliminar = await screen.findAllByText(/Eliminar/i);
        fireEvent.click(btnsEliminar[0]);

        // Verificamos que se pidió confirmación
        expect(window.confirm).toHaveBeenCalled();

        await waitFor(() => {
            expect(endpoints.eliminarRutina).toHaveBeenCalledWith('p1');
            expect(mockToast.success).toHaveBeenCalledWith('Plantilla eliminada');
            // Al terminar de borrar, debería intentar recargar la lista
            expect(endpoints.obtenerPlantillasEntrenador).toHaveBeenCalledTimes(2);
        });
    });

    it('muestra un error si falla el borrado', async () => {
        endpoints.obtenerPlantillasEntrenador.mockResolvedValue(mockPlantillas);
        endpoints.eliminarRutina.mockRejectedValue(new Error('Fallo API'));
        
        renderComponent();

        const btnsEliminar = await screen.findAllByText(/Eliminar/i);
        fireEvent.click(btnsEliminar[0]);

        await waitFor(() => {
            expect(mockToast.error).toHaveBeenCalledWith('Error al eliminar la plantilla');
        });
    });

    it('recovers a failed load without presenting an empty collection', async () => {
        endpoints.obtenerPlantillasEntrenador.mockRejectedValueOnce(new Error('offline')).mockResolvedValue(mockPlantillas);
        renderComponent();
        const retry = await screen.findByRole('button', { name: 'Reintentar plantillas' });
        expect(screen.queryByText(/Tu biblioteca está vacía/i)).not.toBeInTheDocument();
        fireEvent.click(retry);
        expect(await screen.findByText('Fuerza Máxima')).toBeInTheDocument();
        expect(endpoints.obtenerPlantillasEntrenador).toHaveBeenCalledTimes(2);
    });
    it('treats a malformed collection as an error rather than an empty result', async () => {
        endpoints.obtenerPlantillasEntrenador.mockResolvedValue({ error: 'unavailable' });
        renderComponent();
        expect(await screen.findByRole('alert')).toBeInTheDocument();
        expect(screen.queryByText(/Tu biblioteca está vacía/i)).not.toBeInTheDocument();
    });
    it('ignores a delayed response from the previous account', async () => {
        let finishOld;
        endpoints.obtenerPlantillasEntrenador.mockImplementation(id => id === 'coach-123'
            ? new Promise(resolve => { finishOld = resolve; }) : Promise.resolve([]));
        const view = renderComponent();
        await waitFor(() => expect(endpoints.obtenerPlantillasEntrenador).toHaveBeenCalledWith('coach-123'));
        auth.userId = 'coach-other';
        view.rerender(<BrowserRouter><PlantillasEntrenador /></BrowserRouter>);
        await screen.findByText(/Tu biblioteca está vacía/i);
        await act(async () => finishOld(mockPlantillas));
        expect(screen.queryByText('Fuerza Máxima')).not.toBeInTheDocument();
    });
    it('hides previously loaded data immediately when the account changes', async () => {
        endpoints.obtenerPlantillasEntrenador.mockResolvedValueOnce(mockPlantillas).mockReturnValue(new Promise(() => {}));
        const view = renderComponent();
        await screen.findByText('Fuerza Máxima');
        auth.userId = 'coach-other';
        view.rerender(<BrowserRouter><PlantillasEntrenador /></BrowserRouter>);
        expect(screen.queryByText('Fuerza Máxima')).not.toBeInTheDocument();
        expect(screen.queryByText(/Tu biblioteca está vacía/i)).not.toBeInTheDocument();
    });
});