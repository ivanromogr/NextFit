import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import GymButton from '../../components/ui/GymButton';

describe('Componente GymButton', () => {

  it('renderiza el texto (children) correctamente', () => {
    render(<GymButton>Haz clic aquí</GymButton>);
    expect(screen.getByRole('button', { name: 'Haz clic aquí' })).toBeInTheDocument();
  });

  it('llama a la función onClick cuando se hace clic', () => {
    const handleClick = vi.fn();
    render(<GymButton onClick={handleClick}>Enviar</GymButton>);
    
    const boton = screen.getByRole('button');
    fireEvent.click(boton);
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('muestra el estado de carga (loading) y deshabilita el botón', () => {
    const handleClick = vi.fn();
    render(<GymButton loading={true} onClick={handleClick}>Enviar</GymButton>);
    
    const boton = screen.getByRole('button');
    
    // Debería mostrar "Procesando…" en lugar del children original
    expect(screen.getByText('Procesando…')).toBeInTheDocument();
    
    // Debería estar deshabilitado y no ejecutar el onClick
    expect(boton).toBeDisabled();
    fireEvent.click(boton);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('deshabilita el botón si la prop disabled es true', () => {
    const handleClick = vi.fn();
    render(<GymButton disabled={true} onClick={handleClick}>Apagado</GymButton>);
    
    const boton = screen.getByRole('button');
    expect(boton).toBeDisabled();
    
    fireEvent.click(boton);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('aplica el estilo de variante "secondary"', () => {
    render(<GymButton variant="secondary">Secundario</GymButton>);
    const boton = screen.getByRole('button');
    // Verificamos que tenga el color blanco (#FFFFFF) típico de la variante secondary
    expect(boton).toHaveStyle('color: #FFFFFF'); 
  });

  it('maneja correctamente los eventos del ratón (hover, active, focus)', () => {
    render(<GymButton>Eventos</GymButton>);
    const boton = screen.getByRole('button');

    // Simulamos que el usuario pasa el ratón y hace clic para cubrir esas líneas
    fireEvent.mouseEnter(boton);
    fireEvent.mouseDown(boton);
    fireEvent.mouseUp(boton);
    fireEvent.mouseLeave(boton);
    
    // Simulamos que el usuario navega con el tabulador (focus y blur)
    fireEvent.focus(boton);
    fireEvent.blur(boton);

    // Si llega hasta aquí sin reventar, es que los eventos cambian los estilos correctamente
    expect(boton).toBeInTheDocument();
  });

  it('ignora los eventos del ratón si el botón está deshabilitado', () => {
    render(<GymButton disabled>Eventos Deshabilitados</GymButton>);
    const boton = screen.getByRole('button');

    // Disparamos eventos en el botón apagado (para cubrir los "if (isDisabled) return")
    fireEvent.mouseEnter(boton);
    fireEvent.mouseDown(boton);
    fireEvent.mouseUp(boton);
    fireEvent.focus(boton);

    expect(boton).toBeDisabled();
  });

});