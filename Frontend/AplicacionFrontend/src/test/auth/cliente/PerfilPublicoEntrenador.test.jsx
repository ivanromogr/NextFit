import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import PerfilPublicoEntrenador from '../../../pages/cliente/PerfilPublicoEntrenador';
import { api } from '../../../api/endpoints';

// 1. 🛡️ MOCK DE ICONOS (La clave del éxito)
vi.mock('lucide-react', async () => {
    const actual = await vi.importActual('lucide-react');
    return {
        ...actual,
        Star: ({ onClick, 'data-testid': testId }) => (
            <span data-testid={testId || "icon-star"} onClick={onClick} />
        ),
        X: ({ onClick }) => <span data-testid="icon-close" onClick={onClick} />,
        Zap: () => <span data-testid="icon-zap" />,
    };
});

// 2. MOCK DE ROUTER
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
        useParams: () => ({ id: 'coach-77' })
    };
});

// 3. MOCK DE API
vi.mock('../../../api/endpoints', () => ({
    api: {
        get: vi.fn(),
        post: vi.fn()
    }
}));

describe('Página PerfilPublicoEntrenador', () => {
    const mockData = {
        entrenador: {
            id: 'coach-77',
            nombre: 'Marc',
            apellido: 'Titan',
            fotoPerfil: '',
            genero: 'masculino',
            aniosExperiencia: 8,
            descripcionPerfil: 'Experto en transformaciones.',
            tarifaMensual: 99
        },
        valoracionMedia: 4.8,
        resenas: [{ id: 1, estrellas: 5, comentario: 'Genial' }]
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    const renderComponent = () => {
        render(<BrowserRouter><PerfilPublicoEntrenador /></BrowserRouter>);
    };

    it('renderiza el perfil y permite enviar una reseña', async () => {
        api.get.mockResolvedValue({ data: mockData });
        api.post.mockResolvedValue({ success: true });
        
        renderComponent();
        
        // Esperamos a que cargue
        expect(await screen.findByText(/Marc Titan/i)).toBeInTheDocument();

        // 1. Abrir modal
        fireEvent.click(screen.getByText(/Escribir Reseña/i));
        expect(screen.getByText(/TU EXPERIENCIA/i)).toBeInTheDocument();

        // 2.  Seleccionar estrellas usando el testid del mock
        // Buscamos solo las estrellas que están DENTRO del modal
        const modal = screen.getByText(/TU EXPERIENCIA/i).closest('div').parentElement;
        const stars = within(modal).getAllByTestId('icon-star');
        
        // Hacemos click en la 4ª estrella (índice 3)
        fireEvent.click(stars[3]); 

        // 3. Escribir comentario
        const textarea = screen.getByPlaceholderText(/Escribe tu testimonio/i);
        fireEvent.change(textarea, { target: { value: 'Buen coach' } });

        // 4. Enviar
        fireEvent.click(screen.getByText(/ENVIAR VALORACIÓN/i));

        await waitFor(() => {
            expect(api.post).toHaveBeenCalledWith(
                '/api/entrenador/coach-77/resena', 
                expect.objectContaining({ estrellas: 4, comentario: 'Buen coach' })
            );
        });
    });

    it('navega al chat al pulsar Iniciar Transformación', async () => {
        api.get.mockResolvedValue({ data: mockData });
        renderComponent();

        const btnZap = await screen.findByText(/INICIAR TRANSFORMACIÓN/i);
        fireEvent.click(btnZap);

        expect(mockNavigate).toHaveBeenCalledWith('/cliente/chat', expect.any(Object));
    });
});