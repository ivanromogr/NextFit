import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import ModalResultados from '../../components/functional/ModalResultados'; 
import { obtenerDetalleSesion } from '../../api/endpoints';

vi.mock('react-router-dom', () => ({
  useParams: () => ({ id: 'atleta-123' })
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ userId: 'coach-456' })
}));

vi.mock('../../api/endpoints', () => ({
  obtenerDetalleSesion: vi.fn()
}));

describe('Componente ModalResultados', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza el estado de carga y luego muestra "todavía no tiene una sesión registrada" si no hay evento', async () => {
    obtenerDetalleSesion.mockRejectedValueOnce({ response: { status: 404 } });

    // Usamos ModalResultados
    render(<ModalResultados eventoId={999} onClose={mockOnClose} />);

    expect(screen.getByText(/Cargando datos del atleta/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/todavía no tiene una sesión registrada/i)).toBeInTheDocument();
    });
  });

  it('carga, transforma y renderiza los datos de la sesión correctamente', async () => {
    obtenerDetalleSesion.mockResolvedValueOnce({
      fecha: '2026-03-28T10:00:00', duracion: 3600, volumenTotal: 2400,
      notas: '¡Entreno brutal!',
      ejercicios: [
        { nombre: 'Sentadilla', series: [{ kilos: 100, repes: 10, rpe: 8 }, { kilos: 100, repes: 10, rpe: 8 }] },
        { nombre: 'Press Militar', series: [{ kilos: 50, repes: 8, rpe: 0 }] }
      ]
    });

    render(<ModalResultados eventoId={10} onClose={mockOnClose} />);

    await waitFor(() => {
      expect(screen.getByText(/Resumen Sesión/i)).toBeInTheDocument();
    });

    expect(await screen.findByText('60 min')).toBeInTheDocument();
    expect(screen.getByText(/2[.,\u00a0\u202f]?400 kg/i)).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument(); 
    expect(screen.getByText(/"¡Entreno brutal!"/i)).toBeInTheDocument();
    expect(screen.getByText('Sentadilla')).toBeInTheDocument();
    expect(screen.getByText('Press Militar')).toBeInTheDocument();
  });

  it('cierra el visor al hacer clic en el botón X', async () => {
    obtenerDetalleSesion.mockResolvedValueOnce({ fecha: '2026-03-28', duracion: 0, volumenTotal: 0, ejercicios: [] });

    render(<ModalResultados eventoId={10} onClose={mockOnClose} />);

    await waitFor(() => {
      expect(screen.getByText(/Resumen Sesión/i)).toBeInTheDocument();
    });

    const closeBtns = screen.getAllByRole('button');
    fireEvent.click(closeBtns[0]); 

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});