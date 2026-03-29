import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import RoutineSummaryCard from '../../components/ui/RoutineSummaryCard';

describe('Componente RoutineSummaryCard', () => {
  const mockOnStart = vi.fn();

  const mockRutina = {
    id: 1,
    nombre: 'Torso Power',
    objetivo: 'Fuerza',
    nivel: 'Intermedio',
    detalles: [
      { ejercicio: { nombre: 'Press Banca', gifUrl: 'url1' } },
      { ejercicio: { nombre: 'Remo', gifUrl: 'url2' } },
      { ejercicio: { nombre: 'Dominadas', gifUrl: 'url3' } },
      { ejercicio: { nombre: 'Press Militar', gifUrl: 'url4' } },
      { ejercicio: { nombre: 'Curl Biceps', gifUrl: 'url5' } },
    ]
  };

  it('renderiza la información básica de la rutina', () => {
    render(<RoutineSummaryCard rutina={mockRutina} onStart={mockOnStart} />);
    
    expect(screen.getByText('Torso Power')).toBeInTheDocument();
    expect(screen.getByText(/Fuerza/i)).toBeInTheDocument();
    expect(screen.getByText('Intermedio')).toBeInTheDocument();
  });

  it('calcula correctamente la duración estimada', () => {
    // 5 ejercicios: 5 + (5 * 3) = 20 minutos
    render(<RoutineSummaryCard rutina={mockRutina} onStart={mockOnStart} />);
    expect(screen.getByText(/~20 Min/i)).toBeInTheDocument();
  });

  it('muestra el badge "+ más" cuando hay más de 4 ejercicios', () => {
    render(<RoutineSummaryCard rutina={mockRutina} onStart={mockOnStart} />);
    // Hay 5 ejercicios, debería poner +1 más
    expect(screen.getByText('+1 más')).toBeInTheDocument();
  });

  it('muestra "Lista de ejercicios" cuando hay 4 o menos ejercicios', () => {
    const rutinaCorta = {
      ...mockRutina,
      detalles: mockRutina.detalles.slice(0, 3)
    };
    render(<RoutineSummaryCard rutina={rutinaCorta} onStart={mockOnStart} />);
    expect(screen.getByText('Lista de ejercicios')).toBeInTheDocument();
  });

  it('maneja el caso de rutina sin ejercicios', () => {
    const rutinaVacia = { ...mockRutina, detalles: [] };
    render(<RoutineSummaryCard rutina={rutinaVacia} onStart={mockOnStart} />);
    
    expect(screen.getByText(/Sin ejercicios añadidos/i)).toBeInTheDocument();
    expect(screen.getByText(/~5 Min/i)).toBeInTheDocument(); // 5 + (0*3)
  });

  it('llama a onStart con el ID de la rutina al hacer clic en el botón', () => {
    render(<RoutineSummaryCard rutina={mockRutina} onStart={mockOnStart} />);
    
    const btn = screen.getByRole('button', { name: /EMPEZAR SESIÓN/i });
    fireEvent.click(btn);
    
    expect(mockOnStart).toHaveBeenCalledWith(1);
  });

  it('cambia estilos en hover de la tarjeta y el botón', () => {
    render(<RoutineSummaryCard rutina={mockRutina} onStart={mockOnStart} />);
    
    // Subimos un nivel más (.parentElement) para llegar al contenedor principal de la tarjeta
    const card = screen.getByText(mockRutina.nombre).closest('div').parentElement.parentElement;
    const btn = screen.getByRole('button', { name: /EMPEZAR SESIÓN/i });

    // Hover tarjeta
    fireEvent.mouseEnter(card);
    expect(card.style.transform).toBe('translateY(-5px)');
    
    fireEvent.mouseLeave(card);
    expect(card.style.transform).toBe('translateY(0)');

    // Hover botón
    fireEvent.mouseEnter(btn);
    expect(btn.style.filter).toBe('brightness(1.1)');
  });
});