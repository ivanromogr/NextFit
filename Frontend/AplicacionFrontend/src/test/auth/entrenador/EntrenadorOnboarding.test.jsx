import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import EntrenadorOnboarding from '../../../pages/entrenador/EntrenadorOnboarding';
import * as endpoints from '../../../api/endpoints';

const auth = vi.hoisted(() => ({ userId: 'entrenador-test-123' }));
vi.mock('../../../context/AuthContext', () => ({ useAuth: () => auth }));

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
        auth.userId = 'entrenador-test-123';
        auth.loading = false;
        endpoints.completarOnboardingEntrenador.mockReset();
        localStorage.clear();
    });

    const renderComponent = () => {
        return render(<BrowserRouter><EntrenadorOnboarding /></BrowserRouter>);
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
      expect(mockNavigate).toHaveBeenCalledWith('/entrenador/dashboard');
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

    const advanceToExperience = () => {
        fireEvent.click(screen.getByText('Hombre').closest('div'));
        fireEvent.change(screen.getByTestId('mock-date-input'), { target: { value: '1990-05-15' } });
        fireEvent.click(screen.getByRole('button', { name: /SIGUIENTE/i }));
        fireEvent.click(screen.getByText('Musculación').closest('div'));
        fireEvent.click(screen.getByRole('button', { name: /SIGUIENTE/i }));
    };
    const completeForm = () => {
        advanceToExperience();
        fireEvent.change(screen.getByPlaceholderText('Ej: 5'), { target: { value: '6' } });
        fireEvent.click(screen.getByText('Presencial').closest('div'));
        fireEvent.click(screen.getByRole('button', { name: /SIGUIENTE/i }));
        fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Grado en CAFD / INEF' } });
        fireEvent.change(screen.getByPlaceholderText(/Hola, soy especialista en/i), { target: { value: 'Biografía conservada para reintentar el alta.' } });
    };
    it('waits for cookie restoration before requiring login', () => {
        auth.loading = true;
        auth.userId = null;
        const view = renderComponent();
        expect(screen.getByRole('status')).toHaveTextContent('Comprobando tu sesión');
        expect(mockNavigate).not.toHaveBeenCalled();
        auth.loading = false;
        auth.userId = 'restored-coach';
        view.rerender(<BrowserRouter><EntrenadorOnboarding /></BrowserRouter>);
        expect(screen.getByText('TU PERFIL')).toBeInTheDocument();
        expect(mockNavigate).not.toHaveBeenCalled();
    });
    it('requires the authenticated account and ignores stale registration IDs', () => {
        auth.userId = null;
        sessionStorage.setItem('registration_userId', 'old-account');
        localStorage.setItem('registration_userId', 'old-account');
        renderComponent();
        expect(mockNavigate).toHaveBeenCalledWith('/auth/login', { replace: true });
        expect(screen.queryByRole('button', { name: /SIGUIENTE/i })).not.toBeInTheDocument();
        expect(endpoints.completarOnboardingEntrenador).not.toHaveBeenCalled();
    });
    it('resets the draft immediately when the authenticated account changes', () => {
        const view = renderComponent();
        advanceToExperience();
        auth.userId = 'new-coach';
        view.rerender(<BrowserRouter><EntrenadorOnboarding /></BrowserRouter>);
        expect(screen.getByText('TU PERFIL')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /SIGUIENTE/i })).toBeDisabled();
    });
    it('blocks a future birth date', () => {
        renderComponent();
        fireEvent.click(screen.getByText('Hombre').closest('div'));
        fireEvent.change(screen.getByTestId('mock-date-input'), { target: { value: '2999-05-15' } });
        expect(screen.getByRole('button', { name: /SIGUIENTE/i })).toBeDisabled();
    });
    it('enforces the adult age requirement shown by the date picker', () => {
        renderComponent();
        fireEvent.click(screen.getByText('Hombre').closest('div'));
        const recentYear = new Date().getFullYear() - 10;
        fireEvent.change(screen.getByTestId('mock-date-input'), { target: { value: `${recentYear}-05-15` } });
        expect(screen.getByRole('button', { name: /SIGUIENTE/i })).toBeDisabled();
    });
    it.each(['6.5', '2147483648'])('does not truncate or overflow experience %s', value => {
        renderComponent();
        advanceToExperience();
        fireEvent.change(screen.getByPlaceholderText('Ej: 5'), { target: { value } });
        fireEvent.click(screen.getByText('Presencial').closest('div'));
        expect(screen.getByRole('button', { name: /SIGUIENTE/i })).toBeDisabled();
    });
    it('preserves the draft after a failed save and prevents concurrent retry submissions', async () => {
        let finishSave;
        endpoints.completarOnboardingEntrenador.mockRejectedValueOnce(new Error('offline'))
            .mockReturnValue(new Promise(resolve => { finishSave = resolve; }));
        renderComponent();
        completeForm();
        fireEvent.click(screen.getByRole('button', { name: /FINALIZAR ALTA/i }));
        await screen.findByRole('alert');
        expect(screen.getByPlaceholderText(/Hola, soy especialista en/i)).toHaveValue('Biografía conservada para reintentar el alta.');
        const retry = screen.getByRole('button', { name: /FINALIZAR ALTA/i });
        fireEvent.click(retry);
        fireEvent.click(retry);
        expect(endpoints.completarOnboardingEntrenador).toHaveBeenCalledTimes(2);
        expect(endpoints.completarOnboardingEntrenador).toHaveBeenLastCalledWith(expect.objectContaining({ idEntrenador: auth.userId, aniosExperiencia: 6 }));
        await act(async () => finishSave({}));
        expect(mockNavigate).toHaveBeenCalledWith('/entrenador/dashboard');
    });
    it('ignores a save that finishes after changing account', async () => {
        let finishSave;
        endpoints.completarOnboardingEntrenador.mockReturnValue(new Promise(resolve => { finishSave = resolve; }));
        const view = renderComponent();
        completeForm();
        fireEvent.click(screen.getByRole('button', { name: /FINALIZAR ALTA/i }));
        auth.userId = 'new-coach';
        view.rerender(<BrowserRouter><EntrenadorOnboarding /></BrowserRouter>);
        await act(async () => finishSave({}));
        expect(mockNavigate).not.toHaveBeenCalled();
        expect(screen.getByText('TU PERFIL')).toBeInTheDocument();
    });
});
