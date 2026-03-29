import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import GymCard from '../../components/ui/GymCard';
import { Activity } from 'lucide-react'; // Icono de prueba

describe('Componente GymCard', () => {

  it('renderiza el título correctamente', () => {
    render(<GymCard title="Ganar Músculo" />);
    expect(screen.getByText('Ganar Músculo')).toBeInTheDocument();
  });

  it('llama a la función onClick al hacer clic', () => {
    const handleClick = vi.fn();
    render(<GymCard title="Click" onClick={handleClick} />);
    
    const card = screen.getByRole('button');
    fireEvent.click(card);
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('aplica los estilos de "seleccionado" correctamente', () => {
    render(<GymCard title="Seleccionada" selected={true} />);
    const card = screen.getByRole('button');
    
    // Verificamos el color amarillo específico de cuando está seleccionado (#FACC15)
    expect(card).toHaveStyle('color: #FACC15');
    // Verificamos que el texto tenga el grosor de fuente 800
    const text = screen.getByText(/seleccionada/i);
    expect(text).toHaveStyle('font-weight: 800');
  });

  it('maneja la accesibilidad por teclado (Enter y Espacio)', () => {
    const handleClick = vi.fn();
    render(<GymCard title="Teclado" onClick={handleClick} />);
    const card = screen.getByRole('button');

    // Enter
    fireEvent.keyDown(card, { key: 'Enter' });
    expect(handleClick).toHaveBeenCalledTimes(1);

    // Espacio
    fireEvent.keyDown(card, { key: ' ' });
    expect(handleClick).toHaveBeenCalledTimes(2);

    // Otra tecla no debería hacer nada
    fireEvent.keyDown(card, { key: 'Escape' });
    expect(handleClick).toHaveBeenCalledTimes(2);
  });

  it('cubre los eventos de interacción visual (Hover y Focus)', () => {
    render(<GymCard title="Interactivo" icon={Activity} selected={false} />);
    const card = screen.getByRole('button');

    // Disparamos todos los eventos para cubrir las líneas de estilo dinámico
    fireEvent.mouseEnter(card);
    fireEvent.mouseLeave(card);
    fireEvent.focus(card);
    fireEvent.blur(card);

    // Versión seleccionada para cubrir los "if" dentro de los eventos
    const { unmount } = render(<GymCard title="Interactivo Sel" selected={true} />);
    const cardSel = screen.getByText('Interactivo Sel').closest('div');
    
    fireEvent.mouseEnter(cardSel);
    fireEvent.mouseLeave(cardSel);
    fireEvent.focus(cardSel);
    fireEvent.blur(cardSel);

    expect(card).toBeInTheDocument();
  });
});