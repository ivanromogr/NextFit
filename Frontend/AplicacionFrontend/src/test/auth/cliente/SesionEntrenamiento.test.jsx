import '@testing-library/jest-dom';
import React, { act } from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import SesionEntrenamiento from '../../../pages/cliente/SesionEntrenamiento';

import { 
    obtenerRutinasCliente, 
    guardarSesionRealizada, 
    obtenerUltimaSesionRutina 
} from '../../../api/endpoints';

vi.mock('../../../api/endpoints', () => ({
    obtenerRutinasCliente: vi.fn(),
    guardarSesionRealizada: vi.fn(),
    obtenerUltimaSesionRutina: vi.fn(),
    obtenerRutinasAsignadasPorEntrenador: vi.fn()
}));

// Mocks de Lucide, Router y Contextos (se mantienen igual)
vi.mock('lucide-react', async () => {
    const actual = await vi.importActual('lucide-react');
    return {
        ...actual,
        Check: () => <span data-testid="icon-check" />,
        Clock: () => <span data-testid="icon-clock" />,
        Eye: () => <span data-testid="icon-eye" />,
        Activity: () => <span data-testid="icon-activity" />,
    };
});

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
        useParams: () => ({ rutinaId: 'rutina-99' }),
        useLocation: () => ({ state: {} })
    };
});

vi.mock('../../../context/AuthContext', () => ({
    useAuth: () => ({ userId: 'atleta-test' })
}));

vi.mock('../../../context/ToastContext', () => ({
    useToast: () => ({ success: vi.fn(), error: vi.fn() })
}));

describe('Página SesionEntrenamiento', () => {
    const mockRutina = {
        id: 'rutina-99',
        nombre: 'Torso Explosivo',
        detalles: [
            { 
                ejercicio: { id: 'ej-1', nombre: 'Press Militar', imagenUrl: '' },
                series: 1, repeticiones: 10, peso: 40, rpe: 8 
            }
        ]
    };

    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
        navigator.vibrate = vi.fn();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    const renderComponent = () => {
        render(<BrowserRouter><SesionEntrenamiento /></BrowserRouter>);
    };

    it('carga la rutina y muestra los datos iniciales', async () => {
        obtenerRutinasCliente.mockResolvedValue([mockRutina]);
        obtenerUltimaSesionRutina.mockResolvedValue(null);
        
        renderComponent();

        expect(await screen.findByText('Torso Explosivo')).toBeInTheDocument();
        expect(screen.getByDisplayValue('40')).toBeInTheDocument();
    });

   it('incrementa el cronómetro correctamente', async () => {
        vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
        
        obtenerRutinasCliente.mockResolvedValue([mockRutina]);
        obtenerUltimaSesionRutina.mockResolvedValue(null);
        
        renderComponent();

        // 2. Esperamos a que la rutina cargue (findByText usa setTimeout, que es real)
        await screen.findByText('Torso Explosivo');

        // 3. Avanzamos el tiempo 65 segundos dentro de act
        act(() => {
            vi.advanceTimersByTime(65000);
        });

        // 4. Verificamos el resultado
        expect(screen.getByText(/1min 05s/i)).toBeInTheDocument();
        
        // 5. Muy importante: Volvemos al tiempo real
        vi.useRealTimers();
    });

    it('permite completar una serie y actualizar volumen', async () => {
        // Aseguramos que estamos en tiempo real para la carga inicial
        vi.useRealTimers();
        
        obtenerRutinasCliente.mockResolvedValue([mockRutina]);
        renderComponent();

        await screen.findByText('Torso Explosivo');

        // Buscamos el texto "VOLUMEN" y subimos al padre
        const volumenContainer = screen.getByText(/VOLUMEN/i).closest('div');
        
        // Verificamos que el 0 que hay DENTRO de ese contenedor existe
        expect(within(volumenContainer).getByText('0')).toBeInTheDocument();

        // 2. Buscamos el botón de check (el círculo de la serie)
        const checkBtn = screen.getAllByRole('button').find(b => b.style.borderRadius === '50%');
        fireEvent.click(checkBtn);

        // 3. Verificamos volumen: 40kg * 10 reps = 400 (específicamente en ese contenedor)
        expect(within(volumenContainer).getByText('400')).toBeInTheDocument();
    });

    it('permite completar una serie y actualizar volumen', async () => {
        obtenerRutinasCliente.mockResolvedValue([mockRutina]);
        renderComponent();

        await screen.findByText('Torso Explosivo');

        const volumenBox = screen.getByText(/VOLUMEN/i).closest('div');
        
        // Buscamos el botón de check
        const checkBtn = screen.getAllByRole('button').find(b => b.style.borderRadius === '50%');
        fireEvent.click(checkBtn);

        expect(within(volumenBox).getByText('400')).toBeInTheDocument();
    });

    it('abre el modal de fin y guarda en la base de datos', async () => {
        obtenerRutinasCliente.mockResolvedValue([mockRutina]);
        guardarSesionRealizada.mockResolvedValue({ success: true });
        
        renderComponent();
        await screen.findByText('Torso Explosivo');

        fireEvent.click(screen.getByText(/TERMINAR/i));
        expect(await screen.findByText(/¡Sesión Completada!/i)).toBeInTheDocument();

        fireEvent.click(screen.getByText(/GUARDAR/i));

        await waitFor(() => {
            expect(guardarSesionRealizada).toHaveBeenCalled();
        });
    });
});
