import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import MenuCliente from '../../../pages/cliente/MenuCliente';
import { obtenerRutinasCliente, eliminarRutina } from '../../../api/endpoints';

// 1. MOCK DE ICONOS (Esto es la clave para que el test no falle)
vi.mock('lucide-react', async () => {
    const actual = await vi.importActual('lucide-react');
    return {
        ...actual,
        MoreHorizontal: () => <span data-testid="icon-more" />,
        Play: () => <span data-testid="icon-play" />,
        Trash2: () => <span data-testid="icon-trash" />,
        X: () => <span data-testid="icon-x" />,
    };
});

// 2. MOCK DE ROUTER Y AUTH
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../../../context/AuthContext', () => ({
    useAuth: () => ({ userId: 'atleta-123' })
}));

// 3. MOCK DE API
vi.mock('../../../api/endpoints', () => ({
    obtenerRutinasCliente: vi.fn(),
    eliminarRutina: vi.fn()
}));

describe('Página MenuCliente', () => {
    const mockRutinas = [
        { id: '1', nombre: 'Rutina Coach', creador: 'ENTRENADOR', objetivo: 'FUERZA', nivel: 'AVANZADO', detalles: [] },
        { id: '2', nombre: 'Día 1 - Plan Volumen', creador: 'IA', objetivo: 'MASA', nivel: 'INTERMEDIO', detalles: [{ ejercicio: { nombre: 'Press' } }] },
        { id: '3', nombre: 'Día 2 - Plan Volumen', creador: 'IA', objetivo: 'MASA', nivel: 'INTERMEDIO', detalles: [] },
        { id: '4', nombre: 'Mi Rutina Personal', creador: 'CLIENTE', objetivo: 'CARDIO', detalles: [] }
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(window, 'confirm').mockReturnValue(true);
    });

    const renderComponent = () => {
        render(<BrowserRouter><MenuCliente /></BrowserRouter>);
    };

    it('renderiza las secciones correctamente', async () => {
        obtenerRutinasCliente.mockResolvedValue(mockRutinas);
        renderComponent();

        expect(await screen.findByText(/Asignado por tu Coach/i)).toBeInTheDocument();
        expect(screen.getByText('Rutina Coach')).toBeInTheDocument();
        
        //  El nombre del grupo es "Plan Volumen" (basado en tu lógica de getIAPlanKey)
        expect(screen.getByText('Plan Volumen')).toBeInTheDocument();
        expect(screen.getByText('2 días')).toBeInTheDocument();
        
        expect(screen.getByText('Mi Rutina Personal')).toBeInTheDocument();
    });

    it('abre el modal de Plan IA y permite empezar un día específico', async () => {
        obtenerRutinasCliente.mockResolvedValue(mockRutinas);
        renderComponent();

        const btnVerPlan = await screen.findByText(/Ver días del plan/i);
        fireEvent.click(btnVerPlan);

        // 1. Esperamos a que aparezca el modal
        expect(await screen.findByText(/Selecciona el día que quieres entrenar/i)).toBeInTheDocument();
        
        // 2.  Buscamos el texto del día
        const textoDia1 = screen.getByText('Día 1 - Plan Volumen');
        
        // 3. Subimos solo hasta encontrar el contenedor de la fila (iaRow)
        // Buscamos el primer div hacia arriba que tenga justify-content: space-between
        const filaDia1 = textoDia1.closest('div[style*="justify-content: space-between"]');
        
        // 4. Buscamos el botón "Empezar" ÚNICAMENTE dentro de esa fila
        const btnEmpezar = within(filaDia1).getByRole('button', { name: /Empezar/i });
        fireEvent.click(btnEmpezar);

        expect(mockNavigate).toHaveBeenCalledWith('/cliente/sesion/2');
    });

    it('borra una rutina personal correctamente', async () => {
        obtenerRutinasCliente.mockResolvedValue(mockRutinas);
        eliminarRutina.mockResolvedValue({ success: true });
        renderComponent();

        // 1. Buscamos la card personal
        const cardTitle = await screen.findByText('Mi Rutina Personal');
        // Subimos hasta encontrar el contenedor de la card
        const card = cardTitle.closest('div[style*="grid-template-rows"]');
        
        // 2. Buscamos el botón de los 3 puntos dentro de ESA card usando el testid del icono
        const menuBtn = within(card).getByRole('button', { name: /más opciones de la rutina mi rutina personal/i });
        fireEvent.click(menuBtn);

        // 3. Pulsamos eliminar en el dropdown
        const deleteOption = await screen.findByText(/Eliminar/i);
        fireEvent.click(deleteOption);

        // 4. Confirmamos en el modal
        const confirmBtn = screen.getByText('ELIMINAR');
        fireEvent.click(confirmBtn);

        await waitFor(() => {
            expect(eliminarRutina).toHaveBeenCalledWith('4');
            expect(screen.queryByText('Mi Rutina Personal')).not.toBeInTheDocument();
        });
    });

    it('elimina un plan IA completo', async () => {
        obtenerRutinasCliente.mockResolvedValue(mockRutinas);
        eliminarRutina.mockResolvedValue({ success: true });
        renderComponent();

        await screen.findByText('Plan Volumen');
        const menuBtn = screen.getByRole('button', { name: /más opciones del plan plan volumen/i });
        fireEvent.click(menuBtn);

        const deletePlanBtn = screen.getByText(/Eliminar Plan Completo/i);
        fireEvent.click(deletePlanBtn);

        expect(window.confirm).toHaveBeenCalled();
        
        await waitFor(() => {
            expect(eliminarRutina).toHaveBeenCalledWith('2');
            expect(eliminarRutina).toHaveBeenCalledWith('3');
        });
    });
});
