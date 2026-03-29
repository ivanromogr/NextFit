import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import CrearEntrenamiento from '../../components/functional/CrearEntrenamiento';

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

vi.stubGlobal('crypto', { randomUUID: () => 'test-uuid' });

describe('Componente CrearEntrenamiento', () => {
  
  beforeEach(() => {
    // Empezamos con relojes reales por defecto
    vi.useRealTimers();
    vi.stubGlobal('fetch', vi.fn());
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
    
    // Usamos vi.fn().mockResolvedValue para que la promesa sea controlable
    fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockEjercicios)
    });

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
    fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve([]) });
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
    
    fetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockEj) }) // Búsqueda inicial
      .mockResolvedValueOnce({ ok: true }); // Guardado

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
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/rutinas/manual"),
        expect.objectContaining({ method: "POST" })
      );
    });
  });
});