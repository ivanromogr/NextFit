import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
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

        const deleteBtn = screen.getByRole('button', { name: /eliminar ejercicio sentadilla/i });
        
        fireEvent.click(deleteBtn);

        expect(window.confirm).toHaveBeenCalled();
        expect(screen.queryByText('Sentadilla')).not.toBeInTheDocument();
    });
    it('no muestra un editor vacío tras un fallo y permite recuperar la carga', async () => {
        obtenerRutinasCliente.mockRejectedValueOnce(new Error('private details')).mockResolvedValueOnce(mockRutinas);
        obtenerEjercicios.mockResolvedValue(mockEjercicios);
        renderComponent();
        expect(await screen.findByRole('alert')).toHaveTextContent('No se ha podido cargar');
        expect(screen.queryByRole('button', { name: /GUARDAR/i })).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
        expect(await screen.findByDisplayValue('Mi Rutina Pro')).toBeInTheDocument();
    });

    it('no permite editar una rutina inexistente', async () => {
        obtenerRutinasCliente.mockResolvedValue([]);
        obtenerEjercicios.mockResolvedValue(mockEjercicios);
        renderComponent();
        expect(await screen.findByRole('alert')).toHaveTextContent('No se encuentra esta rutina');
        expect(screen.queryByRole('button', { name: /GUARDAR/i })).not.toBeInTheDocument();
    });

    it('evita guardados simultáneos y conserva la edición para reintentar', async () => {
        obtenerRutinasCliente.mockResolvedValue(mockRutinas);
        obtenerEjercicios.mockResolvedValue(mockEjercicios);
        let reject;
        actualizarRutina.mockImplementationOnce(() => new Promise((resolve, fail) => { reject = fail; }));
        actualizarRutina.mockResolvedValueOnce({});
        renderComponent();
        fireEvent.change(await screen.findByDisplayValue('Mi Rutina Pro'), { target: { value: 'Edición pendiente' } });
        const save = screen.getByRole('button', { name: /GUARDAR/i });
        fireEvent.click(save);
        fireEvent.click(save);
        expect(actualizarRutina).toHaveBeenCalledTimes(1);
        expect(save).toBeDisabled();
        await act(async () => reject(new Error('Network error')));
        expect(screen.getByDisplayValue('Edición pendiente')).toBeInTheDocument();
        expect(save).toBeEnabled();
        await act(async () => fireEvent.click(save));
        expect(actualizarRutina).toHaveBeenCalledTimes(2);
        expect(actualizarRutina).toHaveBeenLastCalledWith('rutina-123', expect.objectContaining({ nombre: 'Edición pendiente' }));
    });

    it('aplica la pauta común desde cualquier serie y guarda la coma decimal sin perder datos', async () => {
        obtenerRutinasCliente.mockResolvedValue(mockRutinas);
        obtenerEjercicios.mockResolvedValue(mockEjercicios);
        actualizarRutina.mockResolvedValue({});
        renderComponent();
        const second = await screen.findByLabelText('Peso de la serie 2 de Sentadilla');
        fireEvent.change(second, { target: { value: '32,5' } });
        expect(screen.getByLabelText('Peso de la serie 1 de Sentadilla')).toHaveValue('32,5');
        fireEvent.change(screen.getByLabelText('Repeticiones de la serie 2 de Sentadilla'), { target: { value: '12' } });
        expect(screen.getByLabelText('Repeticiones de la serie 1 de Sentadilla')).toHaveValue(12);
        await act(async () => fireEvent.click(screen.getByRole('button', { name: /GUARDAR/i })));
        expect(actualizarRutina).toHaveBeenCalledWith('rutina-123', expect.objectContaining({
            ejercicios: [expect.objectContaining({ series: 2, peso: 32.5, repeticiones: 12 })]
        }));
    });

    it('rechaza cantidades inválidas conservando la edición y permite corregirlas', async () => {
        obtenerRutinasCliente.mockResolvedValue(mockRutinas);
        obtenerEjercicios.mockResolvedValue(mockEjercicios);
        actualizarRutina.mockResolvedValue({});
        renderComponent();
        const rpe = await screen.findByLabelText('RPE de la serie 2 de Sentadilla');
        fireEvent.change(rpe, { target: { value: '11' } });
        fireEvent.click(screen.getByRole('button', { name: /GUARDAR/i }));
        expect(actualizarRutina).not.toHaveBeenCalled();
        expect(screen.getByText(/Revisa las series:/)).toBeInTheDocument();
        expect(screen.getByDisplayValue('Mi Rutina Pro')).toBeInTheDocument();
        fireEvent.change(rpe, { target: { value: '8' } });
        await act(async () => fireEvent.click(screen.getByRole('button', { name: /GUARDAR/i })));
        expect(actualizarRutina).toHaveBeenCalledTimes(1);
    });

});
