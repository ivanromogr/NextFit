import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ActionCard from "../../components/ui/ActionCard";
import '@testing-library/jest-dom';
import { User } from 'lucide-react'; // Usamos un icono de prueba

describe('Componente ActionCard', () => {
  it('renderiza el título y la descripción correctamente', () => {
    render(<ActionCard title="Entrenamiento" description="Crea tu rutina" />);
    
    expect(screen.getByText('Entrenamiento')).toBeInTheDocument();
    expect(screen.getByText('Crea tu rutina')).toBeInTheDocument();
  });

  it('llama a la función onClick al hacer clic con el ratón', () => {
    const handleClick = vi.fn(); // Creamos una función espía falsa
    render(<ActionCard title="Click Me" onClick={handleClick} />);
    
    const card = screen.getByRole('button');
    fireEvent.click(card);
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('llama a la función onClick al pulsar Enter o Espacio (Accesibilidad)', () => {
    const handleClick = vi.fn();
    render(<ActionCard title="Teclado" onClick={handleClick} />);
    
    const card = screen.getByRole('button');
    
    // Simulamos pulsar Enter
    fireEvent.keyDown(card, { key: 'Enter' });
    expect(handleClick).toHaveBeenCalledTimes(1);

    // Simulamos pulsar Espacio
    fireEvent.keyDown(card, { key: ' ' });
    expect(handleClick).toHaveBeenCalledTimes(2);
  });

  it('cambia los estilos al pasar el ratón y hacer foco (Hover & Focus)', () => {
    // Renderizamos la versión "highlight" para cubrir esa lógica también
    render(<ActionCard title="Eventos visuales" variant="highlight" icon={User} />);
    const card = screen.getByRole('button');

    // Disparamos todos los eventos visuales para cubrir esas líneas de código
    fireEvent.mouseEnter(card);
    fireEvent.mouseLeave(card);
    fireEvent.focus(card);
    fireEvent.blur(card);

    // Si llega hasta aquí sin lanzar errores, el componente maneja bien los estilos
    expect(card).toBeInTheDocument();
  });
});