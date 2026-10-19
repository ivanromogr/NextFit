import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import ModalResultados from '../../components/functional/ModalResultados'; 
import { obtenerEventosCalendario, obtenerUltimaSesionRutina } from '../../api/endpoints';

vi.mock('react-router-dom', () => ({
  useParams: () => ({ id: 'atleta-123' })
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ userId: 'coach-456' })
}));

vi.mock('../../api/endpoints', () => ({
  obtenerEventosCalendario: vi.fn(),
  obtenerUltimaSesionRutina: vi.fn()
}));

describe('Componente ModalResultados', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza el estado de carga y luego muestra "No se encontraron datos" si no hay evento', async () => {
    obtenerEventosCalendario.mockResolvedValueOnce([]);

    // Usamos ModalResultados
    render(<ModalResultados eventoId={999} onClose={mockOnClose} />);

    expect(screen.getByText(/Cargando datos del atleta/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/No se encontraron datos/i)).toBeInTheDocument();
    });
  });

  it('carga, transforma y renderiza los datos de la sesión correctamente', async () => {
    obtenerEventosCalendario.mockResolvedValueOnce([
      { id: 10, rutinaId: 50, fecha: '2026-03-28T10:00:00' }
    ]);

    obtenerUltimaSesionRutina.mockResolvedValueOnce({
      duracionSegundos: 3600,
      notasGenerales: '¡Entreno brutal!',
      series: [
        { ejercicioNombre: 'Sentadilla', peso: 100, reps: 10, rpe: 8 },
        { ejercicioNombre: 'Sentadilla', peso: 100, reps: 10, rpe: 8 },
        { ejercicioNombre: 'Press Militar', peso: 50, reps: 8, rpe: 0 }
      ]
    });

    render(<ModalResultados eventoId={10} onClose={mockOnClose} />);

    await waitFor(() => {
      expect(screen.getByText(/Resumen Sesión/i)).toBeInTheDocument();
    });

    expect(screen.getByText('60 min')).toBeInTheDocument();
    expect(screen.getByText(/2[.,\u00a0\u202f]?400 kg/i)).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument(); 
    expect(screen.getByText(/"¡Entreno brutal!"/i)).toBeInTheDocument();
    expect(screen.getByText('Sentadilla')).toBeInTheDocument();
    expect(screen.getByText('Press Militar')).toBeInTheDocument();
  });

  it('cierra el visor al hacer clic en el botón X', async () => {
    obtenerEventosCalendario.mockResolvedValueOnce([
      { id: 10, rutinaId: 50, fecha: '2026-03-28' }
    ]);
    obtenerUltimaSesionRutina.mockResolvedValueOnce({ duracionSegundos: 0, series: [] });

    render(<ModalResultados eventoId={10} onClose={mockOnClose} />);

    await waitFor(() => {
      expect(screen.getByText(/Resumen Sesión/i)).toBeInTheDocument();
    });

    const closeBtns = screen.getAllByRole('button');
    fireEvent.click(closeBtns[0]); 

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});