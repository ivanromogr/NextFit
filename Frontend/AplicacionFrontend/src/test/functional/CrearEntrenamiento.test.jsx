import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import CrearEntrenamiento from '../../components/functional/CrearEntrenamiento';
import { guardarRutinaManual, obtenerEjercicios } from '../../api/endpoints';

// 1. MOCKS DE INFRAESTRUCTURA
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ userId: 'coach-123' }),
  AuthProvider: ({ children }) => <div>{children}</div>
}));

vi.mock('../../api/endpoints', () => ({
  actualizarRutina: vi.fn(),
  guardarRutinaManual: vi.fn(),
  obtenerEjercicios: vi.fn()
}));

vi.stubGlobal('crypto', { randomUUID: () => 'test-uuid' });

describe('Componente CrearEntrenamiento', () => {
  
  beforeEach(() => {
    // Empezamos con relojes reales por defecto
    vi.useRealTimers();
    vi.clearAllMocks();
    vi.stubGlobal('localStorage', {
      getItem: vi.fn().mockReturnValue('cliente-456'),
      setItem: vi.fn(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderComponent = (props = {}) => {
    render(
      <BrowserRouter>
        <CrearEntrenamiento {...props} />
      </BrowserRouter>
    );
  };

 it('permite buscar y añadir un ejercicio a la rutina', async () => {
    // 1. Preparamos el mock de datos
    const mockEjercicios = [{ id: 1, nombre: 'Press Banca', grupoMuscular: 'Pecho' }];
    obtenerEjercicios.mockResolvedValue(mockEjercicios);

    renderComponent();

    // 2. Activamos timers
    vi.useFakeTimers();

    const searchInput = screen.getByPlaceholderText(/Buscar ejercicio.../i);
    fireEvent.change(searchInput, { target: { value: 'Press' } });

    // 3. Adelantar tiempo y "limpiar" microtareas
    await act(async () => {
      vi.advanceTimersByTime(400); 
      // Forzamos a que todas las promesas de la cola se ejecuten
      await vi.runAllTicks(); 
    });

    // 4. Volvemos a relojes reales para que findByText no se cuelgue
    vi.useRealTimers();

    const ejercicioLib = await screen.findByText('Press Banca', {}, { timeout: 2000 });
    expect(ejercicioLib).toBeInTheDocument();

    fireEvent.click(ejercicioLib);
    expect(screen.getAllByText(/Press Banca/i)).toHaveLength(2);
  });

  it('valida que la rutina tenga nombre antes de guardar', async () => {
    obtenerEjercicios.mockResolvedValue([]);
    renderComponent();
    
    const saveBtn = screen.getByText(/GUARDAR/i);
    fireEvent.click(saveBtn);

    // Como usamos RealTimers aquí, waitFor funcionará perfecto
    await waitFor(() => {
      expect(screen.getByText(/Asigna un nombre a la rutina/i)).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it('guarda la rutina correctamente y redirige', async () => {
    const mockEj = [{ id: 1, nombre: 'Deadlift', grupoMuscular: 'Espalda' }];
    obtenerEjercicios.mockResolvedValue(mockEj);
    guardarRutinaManual.mockResolvedValue({ success: true });

    renderComponent();

    // 1. Nombre
    fireEvent.change(screen.getByPlaceholderText(/NOMBRE DE TU RUTINA/i), { 
      target: { value: 'Rutina Pesada' } 
    });
    
    // 2. Añadir ejercicio (sin usar timers, simplemente esperando el fetch real si es necesario)
    // O simplemente disparar la búsqueda y esperar un poco
    const searchInput = screen.getByPlaceholderText(/Buscar ejercicio.../i);
    fireEvent.change(searchInput, { target: { value: 'Dead' } });

    // En lugar de fake timers, esperamos al elemento (findBy tiene su propio pequeño wait)
    const ej = await screen.findByText('Deadlift', {}, { timeout: 3000 });
    fireEvent.click(ej);

    // 3. Guardar
    fireEvent.click(screen.getByText(/GUARDAR/i));

    await waitFor(() => {
      expect(guardarRutinaManual).toHaveBeenCalledWith(expect.objectContaining({
        nombre: 'Rutina Pesada',
        ejercicios: expect.any(Array)
      }));
    });
  });
  it('recupera el catálogo sin borrar el nombre ni la búsqueda', async () => {
    obtenerEjercicios.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce([{ id: 1, nombre: 'Press Banca' }]);
    renderComponent();
    fireEvent.change(screen.getByPlaceholderText(/NOMBRE DE TU RUTINA/i), { target: { value: 'Mi borrador' } });
    fireEvent.change(screen.getByPlaceholderText(/Buscar ejercicio/i), { target: { value: 'Press' } });
    expect(await screen.findByRole('alert')).toHaveTextContent('No se han podido cargar');
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('Press Banca')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Mi borrador')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Press')).toBeInTheDocument();
    expect(obtenerEjercicios).toHaveBeenCalledTimes(2);
  });

  it('no duplica guardados y conserva el plan al fallar para reintentar', async () => {
    obtenerEjercicios.mockResolvedValue([{ id: 1, nombre: 'Press Banca' }]);
    let reject;
    guardarRutinaManual.mockImplementationOnce(() => new Promise((resolve, fail) => { reject = fail; }));
    guardarRutinaManual.mockResolvedValueOnce({});
    renderComponent();
    fireEvent.change(screen.getByPlaceholderText(/NOMBRE DE TU RUTINA/i), { target: { value: 'Mi borrador' } });
    fireEvent.click(await screen.findByText('Press Banca'));
    const save = screen.getByRole('button', { name: /^GUARDAR$/i });
    fireEvent.click(save);
    fireEvent.click(save);
    expect(guardarRutinaManual).toHaveBeenCalledTimes(1);
    expect(save).toBeDisabled();
    await act(async () => reject(new Error('offline')));
    expect(save).toBeEnabled();
    expect(screen.getByDisplayValue('Mi borrador')).toBeInTheDocument();
    expect(screen.getAllByText('Press Banca')).toHaveLength(2);
    await act(async () => fireEvent.click(save));
    expect(guardarRutinaManual).toHaveBeenCalledTimes(2);
    expect(guardarRutinaManual).toHaveBeenLastCalledWith(expect.objectContaining({ nombre: 'Mi borrador', ejercicios: [expect.objectContaining({ idEjercicio: 1 })] }));
    expect(save).toBeDisabled();
  });

  it('guarda el peso con coma decimal sin truncarlo', async () => {
    obtenerEjercicios.mockResolvedValue([{ id: 1, nombre: 'Press Banca' }]);
    guardarRutinaManual.mockResolvedValue({});
    renderComponent();
    fireEvent.change(screen.getByPlaceholderText(/NOMBRE DE TU RUTINA/i), { target: { value: 'Plan decimal' } });
    fireEvent.click(await screen.findByText('Press Banca'));
    fireEvent.change(screen.getByRole('textbox', { name: 'Peso en kg de Press Banca' }), { target: { value: '35,5' } });
    await act(async () => fireEvent.click(screen.getByRole('button', { name: /^GUARDAR$/i })));
    expect(guardarRutinaManual).toHaveBeenCalledWith(expect.objectContaining({ ejercicios: [expect.objectContaining({ peso: 35.5 })] }));
  });

  it.each([
    ['Series', '0'], ['Series', '2.5'], ['Repeticiones', ''],
    ['Peso en kg', '-2'], ['Peso en kg', '35,5,1'], ['RPE', '11'], ['RPE', '8.5']
  ])('rechaza %s inválido (%s) sin enviar el plan', async (field, value) => {
    obtenerEjercicios.mockResolvedValue([{ id: 1, nombre: 'Press Banca' }]);
    renderComponent();
    fireEvent.change(screen.getByPlaceholderText(/NOMBRE DE TU RUTINA/i), { target: { value: 'Plan pendiente' } });
    fireEvent.click(await screen.findByText('Press Banca'));
    fireEvent.change(screen.getByLabelText(`${field} de Press Banca`), { target: { value } });
    fireEvent.click(screen.getByRole('button', { name: /^GUARDAR$/i }));
    expect(guardarRutinaManual).not.toHaveBeenCalled();
    expect(screen.getByText(/Revisa los ejercicios:/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue('Plan pendiente')).toBeInTheDocument();
  });

});
