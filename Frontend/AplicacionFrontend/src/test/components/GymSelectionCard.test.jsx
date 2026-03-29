import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import GymSelectionCard from '../../components/ui/GymSelectionCard';
import { User } from 'lucide-react';

describe('Componente GymSelectionCard', () => {
  const mockOnClick = vi.fn();

  it('renderiza el título y el icono correctamente', () => {
    render(<GymSelectionCard title="Entrenador" icon={User} onClick={mockOnClick} />);
    
   expect(screen.getByText(/entrenador/i)).toBeInTheDocument();
    // Verificamos que el rol de botón existe
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('muestra el icono de Check solo cuando está seleccionado', () => {
    const { rerender } = render(
      <GymSelectionCard title="Opción" selected={false} onClick={mockOnClick} />
    );
    
    // El aria-label "Seleccionado" no debería estar en el DOM
    expect(screen.queryByLabelText('Seleccionado')).not.toBeInTheDocument();

    // Volvemos a renderizar con selected={true}
    rerender(<GymSelectionCard title="Opción" selected={true} onClick={mockOnClick} />);
    
    // Ahora el Check debería aparecer
    expect(screen.getByLabelText('Seleccionado')).toBeInTheDocument();
  });

  it('ejecuta onClick al hacer clic o usar el teclado', () => {
    render(<GymSelectionCard title="Interactiva" onClick={mockOnClick} />);
    const card = screen.getByRole('button');

    // Clic de ratón
    fireEvent.click(card);
    expect(mockOnClick).toHaveBeenCalledTimes(1);

    // Tecla Enter
    fireEvent.keyDown(card, { key: 'Enter' });
    expect(mockOnClick).toHaveBeenCalledTimes(2);

    // Tecla Espacio
    fireEvent.keyDown(card, { key: ' ' });
    expect(mockOnClick).toHaveBeenCalledTimes(3);
  });

  it('aplica cambios de estilo en hover, focus y blur', () => {
    render(<GymSelectionCard title="Estilos" selected={false} onClick={mockOnClick} />);
    const card = screen.getByRole('button');

    // Simulamos hover para cubrir las líneas de onMouseEnter/Leave
    fireEvent.mouseEnter(card);
    expect(card.style.transform).toBe('translateY(-1px)');
    
    fireEvent.mouseLeave(card);
    expect(card.style.transform).toBe('translateY(0)');

    // Simulamos Focus y Blur
    fireEvent.focus(card);
    expect(card.style.borderColor).toBe('rgba(250, 204, 21, 0.55)');
    
    fireEvent.blur(card);
    expect(card.style.borderColor).toBe('rgba(255, 255, 255, 0.1)');
  });

  it('ajusta los estilos visuales cuando está seleccionado', () => {
    render(<GymSelectionCard title="VIP" selected={true} onClick={mockOnClick} />);
    const card = screen.getByRole('button');

    // Verificamos el fondo y el sombreado de selección
    expect(card.style.background).toBe('rgba(250, 204, 21, 0.1)');
    expect(card.style.boxShadow).toBeTruthy();
  });
});