import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import EditarRutina from '../../../pages/cliente/EditarRutina';
import { obtenerRutinasCliente, obtenerEjercicios, actualizarRutina } from '../../../api/endpoints';

// 1. MOCK DE ROUTER
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
        useParams: () => ({ rutinaId: 'rutina-123', clienteId: 'atleta-456' })
    };
});

// 2. MOCK DE LA API
vi.mock('../../../api/endpoints', () => ({
    obtenerRutinasCliente: vi.fn(),
    obtenerEjercicios: vi.fn(),
    actualizarRutina: vi.fn()
}));

describe('Página EditarRutina', () => {
    const mockEjercicios = [
        { id: 1, nombre: 'Sentadilla', grupoMuscular: 'PIERNA', imagenUrl: '' },
        { id: 2, nombre: 'Press Banca', grupoMuscular: 'PECHO', imagenUrl: '' }
    ];

    const mockRutinas = [
        {
            id: 'rutina-123',
            nombre: 'Mi Rutina Pro',
            descripcion: 'Descripción original',
            detalles: [
                {
                    ejercicio: { id: 1, nombre: 'Sentadilla', grupoMuscular: 'PIERNA' },
                    series: 2,
                    repeticiones: 10,
                    peso: 80,
                    rpe: 8
                }
            ]
        }
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        vi.stubGlobal('localStorage', {
            getItem: vi.fn().mockReturnValue('atleta-456')
        });
        vi.stubGlobal('window', {
            ...window,
            confirm: vi.fn().mockReturnValue(true)
        });
    });

    const renderComponent = () => {
        render(<BrowserRouter><EditarRutina /></BrowserRouter>);
    };

    it('carga la rutina y expande las series correctamente', async () => {
        obtenerRutinasCliente.mockResolvedValue(mockRutinas);
        obtenerEjercicios.mockResolvedValue(mockEjercicios);
        renderComponent();

        expect(await screen.findByDisplayValue('Mi Rutina Pro')).toBeInTheDocument();
        const weightInputs = await screen.findAllByDisplayValue('80');
        expect(weightInputs.length).toBeGreaterThan(0);
    });

    it('permite añadir una nueva serie a un ejercicio', async () => {
        obtenerRutinasCliente.mockResolvedValue(mockRutinas);
        obtenerEjercicios.mockResolvedValue(mockEjercicios);
        renderComponent();

        const addSetBtn = await screen.findByText(/AÑADIR SERIE/i);
        fireEvent.click(addSetBtn);

        // Verificamos que aparece el número 3 (nueva serie)
        expect(await screen.findByText('3')).toBeInTheDocument();
    });

    it('abre el buscador y añade un ejercicio', async () => {
        obtenerRutinasCliente.mockResolvedValue(mockRutinas);
        obtenerEjercicios.mockResolvedValue(mockEjercicios);
        renderComponent();

        const openBtn = await screen.findByText(/AÑADIR EJERCICIO AL PLAN/i);
        fireEvent.click(openBtn);

        const searchInput = screen.getByPlaceholderText(/BUSCAR EJERCICIO/i);
        fireEvent.change(searchInput, { target: { value: 'Press' } });

        const option = await screen.findByText('Press Banca');
        fireEvent.click(option);

        expect(await screen.findByText('Press Banca')).toBeInTheDocument();
    });

   it('guarda los cambios y muestra éxito', async () => {
        obtenerRutinasCliente.mockResolvedValue(mockRutinas);
        obtenerEjercicios.mockResolvedValue(mockEjercicios);
        actualizarRutina.mockResolvedValue({ success: true });

        renderComponent();

        const title = await screen.findByDisplayValue('Mi Rutina Pro');
        fireEvent.change(title, { target: { value: 'Nueva Rutina' } });

        const saveBtn = screen.getByText(/GUARDAR/i);
        fireEvent.click(saveBtn);

        //  En lugar de waitFor sobre el mock, esperamos a que aparezca el Toast.
        // findByText ya lleva un "waitFor" implícito y es más robusto.
        const toast = await screen.findByText(/Rutina guardada correctamente/i);
        expect(toast).toBeInTheDocument();

        // Una vez que el texto está ahí, sabemos que la API se llamó sí o sí
        expect(actualizarRutina).toHaveBeenCalledWith('rutina-123', expect.objectContaining({
            nombre: 'Nueva Rutina'
        }));
    });

    it('permite eliminar un ejercicio tras confirmar', async () => {
        obtenerRutinasCliente.mockResolvedValue(mockRutinas);
        obtenerEjercicios.mockResolvedValue(mockEjercicios);
        renderComponent();

        await screen.findByText('Sentadilla');

        //  Buscamos TODOS los botones y filtramos por el que tiene el estilo 'absolute'
        // que es el que definiste para borrar el ejercicio completo.
        const buttons = screen.getAllByRole('button');
        const deleteBtn = buttons.find(b => b.style.position === 'absolute');
        
        if (!deleteBtn) throw new Error("No se encontró el botón de borrar ejercicio");
        
        fireEvent.click(deleteBtn);

        expect(window.confirm).toHaveBeenCalled();
        expect(screen.queryByText('Sentadilla')).not.toBeInTheDocument();
    });
});