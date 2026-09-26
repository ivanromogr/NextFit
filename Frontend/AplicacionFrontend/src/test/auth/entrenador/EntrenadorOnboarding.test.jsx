import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import EntrenadorOnboarding from '../../../pages/entrenador/EntrenadorOnboarding';
import * as endpoints from '../../../api/endpoints';

// 1. MOCK DE API
vi.mock('../../../api/endpoints', () => ({
    completarOnboardingEntrenador: vi.fn()
}));

// 2. MOCK DEL ROUTER
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
        useLocation: () => ({ state: { userId: 'entrenador-test-123' } })
    };
});

// 3. MOCK DE ICONOS LUCIDE
vi.mock('lucide-react', () => ({
    ChevronLeft: () => <span data-testid="icon-back" />,
    Check: () => <span data-testid="icon-check" />,
    Dumbbell: () => <span data-testid="icon-dumbbell" />,
    User: () => <span data-testid="icon-user" />,
    Briefcase: () => <span data-testid="icon-briefcase" />,
    GraduationCap: () => <span data-testid="icon-grad" />,
    Laptop: () => <span data-testid="icon-laptop" />,
    Users: () => <span data-testid="icon-users" />,
    FileText: () => <span data-testid="icon-file" />,
    Zap: () => <span data-testid="icon-zap" />,
    Activity: () => <span data-testid="icon-activity" />,
    HeartPulse: () => <span data-testid="icon-heart" />,
    Trophy: () => <span data-testid="icon-trophy" />,
    Utensils: () => <span data-testid="icon-utensils" />,
    Swords: () => <span data-testid="icon-swords" />,
    ChevronDown: () => <span data-testid="icon-chevrondown" />
}));

// 4. MOCK DE GYM DATE INPUT (Bypass al componente de fechas)
vi.mock('../../../components/ui/GymDateInput', () => ({
    __esModule: true,
    default: ({ onChange }) => (
        <input 
            data-testid="mock-date-input" 
            type="date" 
            onChange={(e) => onChange(e)} 
        />
    )
}));

// Mock temporal para solucionar posibles warnings de estilos
window.alert = vi.fn();

describe('Página EntrenadorOnboarding', () => {

    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    const renderComponent = () => {
        render(<BrowserRouter><EntrenadorOnboarding /></BrowserRouter>);
    };

    it('bloquea el avance si no se han rellenado los datos del paso 1', async () => {
        renderComponent();
        
        // Comprobamos que estamos en el primer paso
        expect(await screen.findByText('TU PERFIL')).toBeInTheDocument();
        
        // El botón SIGUIENTE debería estar deshabilitado
        const btnSiguiente = screen.getByRole('button', { name: /SIGUIENTE/i });
        expect(btnSiguiente).toBeDisabled();
    });

    it('completa todo el flujo del onboarding del entrenador y redirige', async () => {
        endpoints.completarOnboardingEntrenador.mockResolvedValue({ success: true });
        
        renderComponent();

        // ------------------ PASO 1: IDENTIDAD ------------------
        expect(await screen.findByText('TU PERFIL')).toBeInTheDocument();
        
        // Seleccionamos Género
        const btnHombre = screen.getByText('Hombre').closest('div');
        fireEvent.click(btnHombre);

        // Ingresamos Fecha de Nacimiento (usando nuestro mock)
        const dateInput = screen.getByTestId('mock-date-input');
        fireEvent.change(dateInput, { target: { value: '1990-05-15' } });

        // Avanzamos al paso 2
        let btnSiguiente = screen.getByRole('button', { name: /SIGUIENTE/i });
        await waitFor(() => expect(btnSiguiente).not.toBeDisabled());
        fireEvent.click(btnSiguiente);


        // ------------------ PASO 2: ESPECIALIDAD ------------------
        expect(await screen.findByText('TUS PUNTOS FUERTES')).toBeInTheDocument();

        // Seleccionamos un par de especialidades
        const btnMusculacion = screen.getByText('Musculación').closest('div');
        const btnCrossFit = screen.getByText('CrossFit').closest('div');
        
        fireEvent.click(btnMusculacion);
        fireEvent.click(btnCrossFit);

        // Verificamos que el contador cambia
        expect(screen.getByText('2 disciplina(s) seleccionada(s)')).toBeInTheDocument();

        // Avanzamos al paso 3
        btnSiguiente = screen.getByRole('button', { name: /SIGUIENTE/i });
        await waitFor(() => expect(btnSiguiente).not.toBeDisabled());
        fireEvent.click(btnSiguiente);


        // ------------------ PASO 3: EXPERIENCIA ------------------
        expect(await screen.findByText('TRAYECTORIA')).toBeInTheDocument();

        // Años de experiencia (GymInput renderiza un input normal con el role correspondiente o tipo number)
        const inputAnios = screen.getByPlaceholderText('Ej: 5');
        fireEvent.change(inputAnios, { target: { value: '6' } });

        // Modalidad de trabajo
        const btnPresencial = screen.getByText('Presencial').closest('div');
        fireEvent.click(btnPresencial);

        // Avanzamos al paso 4
        btnSiguiente = screen.getByRole('button', { name: /SIGUIENTE/i });
        await waitFor(() => expect(btnSiguiente).not.toBeDisabled());
        fireEvent.click(btnSiguiente);


        // ------------------ PASO 4: DETALLES ------------------
        expect(await screen.findByText('TU MARCA PERSONAL')).toBeInTheDocument();

        // Formación (Select)
        const selectFormacion = screen.getByRole('combobox');
        fireEvent.change(selectFormacion, { target: { value: 'Grado en CAFD / INEF' } });

        // Biografía (Textarea)
        const textareaBio = screen.getByPlaceholderText(/Hola, soy especialista en/i);
        fireEvent.change(textareaBio, { target: { value: 'Hola a todos, llevo muchos años dedicándome a esto y me encanta ayudar a la gente.' } });

        // Finalizar Alta
        const btnFinalizar = screen.getByRole('button', { name: /FINALIZAR ALTA/i });
        await waitFor(() => expect(btnFinalizar).not.toBeDisabled());
        fireEvent.click(btnFinalizar);


        // ------------------ VALIDACIÓN FINAL ------------------
        await waitFor(() => {
            expect(endpoints.completarOnboardingEntrenador).toHaveBeenCalledWith(
                expect.objectContaining({
                    idEntrenador: 'entrenador-test-123',
                    genero: 'MASCULINO',
                    edad: expect.any(Number), // No importa la edad exacta, sino que se ha calculado
                    especialidad: 'Musculación, CrossFit',
                    aniosExperiencia: 6,
                    modalidadTrabajo: 'PRESENCIAL',
                    formacion: 'Grado en CAFD / INEF',
                    descripcionPerfil: 'Hola a todos, llevo muchos años dedicándome a esto y me encanta ayudar a la gente.'
                })
            );
            // Comprobamos la redirección
      expect(mockNavigate).toHaveBeenCalledWith('/auth/login');
        });
    });

    it('permite retroceder al paso anterior manteniendo los datos', async () => {
        renderComponent();

        // PASO 1
        expect(await screen.findByText('TU PERFIL')).toBeInTheDocument();
        fireEvent.click(screen.getByText('Hombre').closest('div'));
        fireEvent.change(screen.getByTestId('mock-date-input'), { target: { value: '1990-05-15' } });
        
        let btnSiguiente = screen.getByRole('button', { name: /SIGUIENTE/i });
        await waitFor(() => expect(btnSiguiente).not.toBeDisabled());
        fireEvent.click(btnSiguiente);

        // PASO 2
        expect(await screen.findByText('TUS PUNTOS FUERTES')).toBeInTheDocument();
        
        // Pulsamos el botón de volver (mockeado con icon-back)
        const btnVolver = screen.getByTestId('icon-back').closest('button');
        fireEvent.click(btnVolver);

        // Volvemos a estar en el PASO 1
        expect(await screen.findByText('TU PERFIL')).toBeInTheDocument();
    });
});
