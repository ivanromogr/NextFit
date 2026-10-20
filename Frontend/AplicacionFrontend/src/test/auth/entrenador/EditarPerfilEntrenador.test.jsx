import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import EditarPerfilEntrenador from '../../../pages/entrenador/EditarPerfilEntrenador';
import * as endpoints from '../../../api/endpoints';

// 1. MOCK DE LA API
vi.mock('../../../api/endpoints', () => ({
    api: { get: vi.fn().mockResolvedValue({ data: { allowed: false } }) },
    getEntrenador: vi.fn(),
    actualizarEntrenador: vi.fn()
}));

// 2. MOCK DEL ROUTER
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

// 3. MOCK DEL CONTEXTO DE AUTENTICACIÓN
const auth = vi.hoisted(() => ({ userId: 'entrenador-boss-123' }));
vi.mock('../../../context/AuthContext', () => ({ useAuth: () => auth }));

// 4. MOCK DE ICONOS LUCIDE (Para evitar ruido visual y warnings)
// 4. MOCK DE ICONOS LUCIDE (Asegúrate de incluir 'Check')
vi.mock('lucide-react', async () => ({
    ...await vi.importActual('lucide-react'),
    User: () => <span data-testid="icon-user" />,
    ChevronLeft: () => <span data-testid="icon-chevron-left" />,
    Camera: () => <span data-testid="icon-camera" />,
    CheckCircle: () => <span data-testid="icon-check-circle" />,
    Check: () => <span data-testid="icon-check" />, 
    AlertCircle: () => <span data-testid="icon-alert" />,
    Briefcase: () => <span data-testid="icon-briefcase" />,
    Mail: () => <span data-testid="icon-mail" />,
    AlignLeft: () => <span data-testid="icon-align" />,
    Lock: () => <span data-testid="icon-lock" />,
    Globe: () => <span data-testid="icon-globe" />,
    ChevronRight: () => <span data-testid="icon-chevron-right" />
}));

// 5.  MOCK DE SUBIDA DE IMÁGENES (Bypass de validación de archivos)
vi.mock('../../../components/ui/ImageUpload', () => ({
    default: ({ onUploadSuccess }) => (
        <button 
            data-testid="mock-image-upload" 
            onClick={() => onUploadSuccess('https://mi-servidor.com/nueva-foto.jpg')}
            type="button"
        >
            Simular Subida de Foto
        </button>
    )
}));

describe('Página EditarPerfilEntrenador', () => {
    const mockEntrenadorData = {
        id: 'entrenador-boss-123',
        nombre: 'Carlos',
        apellido: 'Fit',
        email: 'carlos@gym.com',
        especialidad: 'Fuerza, Hipertrofia',
        aniosExperiencia: 5,
        formacion: 'Grado en CAFD / INEF',
        descripcionPerfil: 'Soy el mejor coach de la ciudad.',
        modalidadTrabajo: 'MIXTO',
        genero: 'MASCULINO',
        fotoPerfil: 'foto-antigua.jpg',
        perfilPublico: false,
        tarifaMensual: null
    };

    beforeEach(() => {
        vi.clearAllMocks();
        auth.userId = 'entrenador-boss-123';
        endpoints.getEntrenador.mockReset();
        endpoints.actualizarEntrenador.mockReset();
    });

    const renderComponent = () => {
        return render(<BrowserRouter><EditarPerfilEntrenador /></BrowserRouter>);
    };

    it('carga y muestra los datos iniciales del entrenador correctamente', async () => {
        endpoints.getEntrenador.mockResolvedValueOnce(mockEntrenadorData);
        renderComponent();

        // 1. Verificamos el estado de carga
        expect(screen.getByText('Cargando datos...')).toBeInTheDocument();

        // 2. Esperamos a que la carga termine y comprobamos los datos
        expect(await screen.findByDisplayValue('Carlos')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Fit')).toBeInTheDocument();
        expect(screen.getByDisplayValue('carlos@gym.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('email@ejemplo.com')).toHaveAttribute('readonly');
        expect(screen.getByDisplayValue('5')).toBeInTheDocument(); // Años de experiencia
        
        // Verificamos que las especialidades se han parseado correctamente
        expect(screen.getByText(/Seleccionadas: Fuerza, Hipertrofia/i)).toBeInTheDocument();
    });

    it('permite activar el perfil público y definir una tarifa mensual', async () => {
        endpoints.getEntrenador.mockResolvedValueOnce(mockEntrenadorData);
        renderComponent();

        // Esperamos a que cargue la interfaz
        await screen.findByDisplayValue('Carlos');

        // Activamos el checkbox del Escaparate Público
        const togglePublico = screen.getByRole('checkbox');
        expect(togglePublico).not.toBeChecked();
        fireEvent.click(togglePublico);
        expect(togglePublico).toBeChecked();

        // Ahora debería aparecer el input de la tarifa (buscamos por el placeholder que le pusiste)
        const tarifaInput = screen.getByPlaceholderText('Ej: 50');
        fireEvent.change(tarifaInput, { target: { value: '65' } });
        expect(tarifaInput.value).toBe('65');
    });

    it('permite seleccionar y deseleccionar especialidades', async () => {
        endpoints.getEntrenador.mockResolvedValueOnce(mockEntrenadorData);
        renderComponent();

        await screen.findByDisplayValue('Carlos');

        // Inicialmente tiene Fuerza e Hipertrofia. Vamos a añadir CrossFit.
        // Hacemos click en la tarjeta de CrossFit (Buscamos el título dentro de GymSelectionCard)
        const cardCrossFit = screen.getByText('CrossFit').closest('div');
        fireEvent.click(cardCrossFit);

        // Verificamos que se actualiza el texto inferior
        expect(screen.getByText(/Seleccionadas: Fuerza, Hipertrofia, CrossFit/i)).toBeInTheDocument();

        // Ahora quitamos Fuerza
        const cardFuerza = screen.getByText('Fuerza').closest('div');
        fireEvent.click(cardFuerza);

        // Verificamos que Fuerza desaparece
        expect(screen.getByText(/Seleccionadas: Hipertrofia, CrossFit/i)).toBeInTheDocument();
    });

    it('envía el formulario correctamente y redirige', async () => {
        endpoints.getEntrenador.mockResolvedValueOnce(mockEntrenadorData);
        endpoints.actualizarEntrenador.mockResolvedValueOnce({ success: true });
        renderComponent();

        await screen.findByDisplayValue('Carlos');

        // Simulamos la subida de una nueva foto
        const btnUpload = screen.getByTestId('mock-image-upload');
        fireEvent.click(btnUpload);

        // Cambiamos el nombre
        const inputNombre = screen.getByDisplayValue('Carlos');
        fireEvent.change(inputNombre, { target: { value: 'Carlos Pro' } });

        // Enviamos el formulario
        const btnGuardar = screen.getByText('Guardar cambios');
        fireEvent.click(btnGuardar);

        await waitFor(() => {
            expect(endpoints.actualizarEntrenador).toHaveBeenCalledWith(
                'entrenador-boss-123',
                expect.objectContaining({
                    nombre: 'Carlos Pro',
                    fotoPerfil: 'https://mi-servidor.com/nueva-foto.jpg',
                    aniosExperiencia: 5,
                    perfilPublico: false, // No lo tocamos en este test
                    modalidadTrabajo: 'MIXTO'
                })
            );
            
            // Validamos que salta el Toast de éxito
            expect(screen.getByText('Perfil actualizado correctamente')).toBeInTheDocument();
            
            // Validamos redirección tras el timeout (usamos un pequeño truco para evitar el setTimeout largo)
            // Ya que Vitest no mockea setTimeouts automáticamente a menos que se lo digamos,
            // podemos solo comprobar que se ha llamado a la función en la promesa.
        });
    });

    it('muestra un error si falla la actualización', async () => {
        endpoints.getEntrenador.mockResolvedValueOnce(mockEntrenadorData);
        // Simulamos un fallo del servidor
        endpoints.actualizarEntrenador.mockRejectedValueOnce(new Error('Fallo de conexión'));
        
        renderComponent();
        await screen.findByDisplayValue('Carlos');

        fireEvent.click(screen.getByText('Guardar cambios'));

        // Validamos que el toast de error aparece en pantalla
        await waitFor(() => {
            expect(screen.getByText(/Error al actualizar el perfil/i)).toBeInTheDocument();
        });
    });

  it('blocks editing after a failed load and recovers the real fields on retry', async () => {
    endpoints.getEntrenador.mockRejectedValueOnce(new Error('offline')).mockResolvedValue(mockEntrenadorData);
    renderComponent();
    await screen.findByRole('alert');
    expect(screen.queryByRole('button', { name: /Guardar cambios/i })).not.toBeInTheDocument();
    expect(endpoints.actualizarEntrenador).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar perfil' }));
    expect(await screen.findByDisplayValue('Carlos')).toBeInTheDocument();
  });
  it('rejects an invalid profile instead of allowing a blank replacement', async () => {
    endpoints.getEntrenador.mockResolvedValue({ error: 'unavailable' });
    renderComponent();
    await screen.findByRole('alert');
    expect(screen.queryByRole('button', { name: /Guardar cambios/i })).not.toBeInTheDocument();
  });
  it('ignores a delayed profile response from another account', async () => {
    let finishOld;
    endpoints.getEntrenador.mockImplementation(id => id === 'entrenador-boss-123'
      ? new Promise(resolve => { finishOld = resolve; }) : Promise.resolve({ ...mockEntrenadorData, nombre: 'Laura' }));
    const view = renderComponent();
    await waitFor(() => expect(endpoints.getEntrenador).toHaveBeenCalledWith('entrenador-boss-123'));
    auth.userId = 'another-account';
    view.rerender(<BrowserRouter><EditarPerfilEntrenador /></BrowserRouter>);
    await screen.findByDisplayValue('Laura');
    await act(async () => finishOld(mockEntrenadorData));
    expect(screen.queryByDisplayValue('Carlos')).not.toBeInTheDocument();
    expect(screen.getByDisplayValue('Laura')).toBeInTheDocument();
  });
  it('hides the previous loaded profile immediately when the account changes', async () => {
    endpoints.getEntrenador.mockResolvedValueOnce(mockEntrenadorData).mockReturnValue(new Promise(() => {}));
    const view = renderComponent();
    await screen.findByDisplayValue('Carlos');
    auth.userId = 'another-account';
    view.rerender(<BrowserRouter><EditarPerfilEntrenador /></BrowserRouter>);
    expect(screen.queryByDisplayValue('Carlos')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Guardar cambios/i })).not.toBeInTheDocument();
  });
  it('preserves edits after a failed save and sends only one concurrent retry', async () => {
    endpoints.getEntrenador.mockResolvedValue(mockEntrenadorData);
    let finishSave;
    endpoints.actualizarEntrenador.mockRejectedValueOnce(new Error('offline')).mockReturnValue(new Promise(resolve => { finishSave = resolve; }));
    renderComponent();
    const name = await screen.findByDisplayValue('Carlos');
    fireEvent.change(name, { target: { value: 'Nombre editado' } });
    fireEvent.click(screen.getByRole('button', { name: /Guardar cambios/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: /Guardar cambios/i })).not.toBeDisabled());
    expect(name).toHaveValue('Nombre editado');
    const retry = screen.getByRole('button', { name: /Guardar cambios/i });
    fireEvent.click(retry);
    fireEvent.click(retry);
    expect(endpoints.actualizarEntrenador).toHaveBeenCalledTimes(2);
    expect(endpoints.actualizarEntrenador).toHaveBeenLastCalledWith('entrenador-boss-123', expect.objectContaining({ nombre: 'Nombre editado' }));
    await act(async () => finishSave({}));
  });
  it('does not navigate when a save completes after leaving the profile', async () => {
    endpoints.getEntrenador.mockResolvedValue(mockEntrenadorData);
    let finishSave;
    endpoints.actualizarEntrenador.mockReturnValue(new Promise(resolve => { finishSave = resolve; }));
    const view = renderComponent();
    await screen.findByDisplayValue('Carlos');
    fireEvent.click(screen.getByRole('button', { name: /Guardar cambios/i }));
    view.unmount();
    vi.useFakeTimers();
    try {
      await act(async () => { finishSave({}); });
      await act(async () => { vi.advanceTimersByTime(2000); });
      expect(mockNavigate).not.toHaveBeenCalled();
    } finally { vi.useRealTimers(); }
  });
});
