import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import GymToast from '../../components/ui/GymToast';

describe('Componente GymToast', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    // 1. Activamos los timers falsos antes de cada test
    vi.useFakeTimers();
  });

  afterEach(() => {
    // 2. Limpiamos los timers y los mocks
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('renderiza el mensaje y el icono según el tipo', () => {
    const { rerender } = render(
      <GymToast message="¡Operación éxito!" type="success" onClose={mockOnClose} />
    );
    
    expect(screen.getByText('¡Operación éxito!')).toBeInTheDocument();
    
    // Verificamos que el borde tenga el color de éxito (#FACC15)
    const toast = screen.getByText('¡Operación éxito!').parentElement;
    expect(toast).toHaveStyle('border-color: #FACC15');

    // Probamos el tipo error para cubrir el objeto config
    rerender(<GymToast message="Error fatal" type="error" onClose={mockOnClose} />);
    expect(toast).toHaveStyle('border-color: #ef4444');
  });

  it('se cierra automáticamente después de 3 segundos', () => {
    render(<GymToast message="Auto-cierre" type="info" onClose={mockOnClose} />);
    
    // Avanzamos el tiempo 3 segundos (el tiempo del auto-cierre)
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    // Avanzamos 300ms más (el tiempo de la animación de salida)
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

 it('llama a onClose cuando se pulsa el botón de cerrar (X)', () => {
  render(<GymToast message="Cerrar manual" type="success" onClose={mockOnClose} />);
  
  const closeBtn = screen.getByRole('button');
  fireEvent.click(closeBtn);

  act(() => {
    vi.advanceTimersByTime(300);
  });

  
  expect(mockOnClose).toHaveBeenCalled(); 
});

  it('usa la configuración por defecto si el tipo no existe', () => {
    render(<GymToast message="Default" type="unknown" onClose={mockOnClose} />);
    const toast = screen.getByText('Default').parentElement;
    
    // Según tu código, si no existe el tipo, usa color blanco (#fff)
    expect(toast).toHaveStyle('border-color: #fff');
  });
});