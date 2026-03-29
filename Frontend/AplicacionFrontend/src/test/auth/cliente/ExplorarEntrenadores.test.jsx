import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import ExplorarEntrenadores from '../../../pages/cliente/ExplorarEntrenadores';
import { api } from '../../../api/endpoints';

// 1. MOCK DE ROUTER
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate
    };
});

// 2. MOCK DE LA API (Usando el objeto 'api')
vi.mock('../../../api/endpoints', () => ({
    api: {
        get: vi.fn()
    }
}));

describe('Página ExplorarEntrenadores', () => {
    const mockEntrenadores = [
        {
            id: 'coach-1',
            nombre: 'Carlos',
            apellido: 'Fuerza',
            descripcionPerfil: 'Experto en powerlifting',
            modalidadTrabajo: 'ONLINE',
            tarifaMensual: 50,
            especialidad: 'Fuerza, Hipertrofia',
            aniosExperiencia: 5,
            fotoPerfil: ''
        },
        {
            id: 'coach-2',
            nombre: 'Elena',
            apellido: 'Yoga',
            descripcionPerfil: 'Movilidad y bienestar',
            modalidadTrabajo: 'PRESENCIAL',
            tarifaMensual: 75,
            especialidad: 'Movilidad',
            aniosExperiencia: 10,
            fotoPerfil: ''
        }
    ];

    beforeEach(() => {
        vi.clearAllMocks();
    });

    const renderComponent = () => {
        render(
            <BrowserRouter>
                <ExplorarEntrenadores />
            </BrowserRouter>
        );
    };

    it('muestra el estado de carga y renderiza los entrenadores iniciales', async () => {
        api.get.mockResolvedValue({ data: mockEntrenadores });
        
        renderComponent();

        expect(screen.getByText(/Cargando entrenadores.../i)).toBeInTheDocument();

        // Esperamos a que la API responda
        expect(await screen.findByText(/Carlos Fuerza/i)).toBeInTheDocument();
        expect(screen.getByText(/Elena Yoga/i)).toBeInTheDocument();
        expect(screen.getByText('50€')).toBeInTheDocument();
    });

    it('filtra localmente por nombre sin llamar de nuevo a la API', async () => {
        api.get.mockResolvedValue({ data: mockEntrenadores });
        renderComponent();

        await screen.findByText(/Carlos Fuerza/i);

        const searchInput = screen.getByPlaceholderText(/Nombre o palabras clave/i);
        
        // Escribimos "Elena" para filtrar la lista actual
        fireEvent.change(searchInput, { target: { value: 'Elena' } });

        // Elena debe seguir, Carlos debe desaparecer
        expect(screen.getByText(/Elena Yoga/i)).toBeInTheDocument();
        expect(screen.queryByText(/Carlos Fuerza/i)).not.toBeInTheDocument();
        
        // Comprobamos que solo se llamó una vez (la inicial)
        expect(api.get).toHaveBeenCalledTimes(1);
    });

    it('ejecuta filtros de backend al pulsar el botón Filtrar', async () => {
        api.get.mockResolvedValue({ data: mockEntrenadores });
        renderComponent();

        await screen.findByText(/Carlos Fuerza/i);

        // Cambiamos el select de especialidad
        const selectEsp = screen.getByDisplayValue(/Todas las especialidades/i);
        fireEvent.change(selectEsp, { target: { value: 'Fuerza' } });

        // Escribimos un precio máximo
        const inputPrecio = screen.getByPlaceholderText(/Máx €/i);
        fireEvent.change(inputPrecio, { target: { value: '60' } });

        // Pulsamos el botón Filtrar
        const btnFiltrar = screen.getByText(/Filtrar/i);
        fireEvent.click(btnFiltrar);

        // Verificamos que la API se llama con los parámetros correctos
        await waitFor(() => {
            expect(api.get).toHaveBeenLastCalledWith('/api/entrenador/publicos', expect.objectContaining({
                params: expect.objectContaining({
                    especialidad: 'Fuerza',
                    tarifaMax: '60'
                })
            }));
        });
    });

    it('navega al perfil del entrenador al hacer click en la tarjeta', async () => {
        api.get.mockResolvedValue({ data: mockEntrenadores });
        renderComponent();

        const cardName = await screen.findByText(/Carlos Fuerza/i);
        // El onClick está en el contenedor principal de la card
        fireEvent.click(cardName.closest('h3').parentElement.parentElement.parentElement);

        expect(mockNavigate).toHaveBeenCalledWith('/cliente/entrenador-perfil/coach-1');
    });

    it('muestra el estado vacío cuando no hay resultados', async () => {
        api.get.mockResolvedValue({ data: [] });
        renderComponent();

        expect(await screen.findByText(/No hay resultados/i)).toBeInTheDocument();
    });
});