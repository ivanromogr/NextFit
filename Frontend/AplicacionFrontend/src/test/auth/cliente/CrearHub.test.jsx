import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import CrearHub from '../../../pages/cliente/CrearHub'; // Asegúrate de que la ruta es correcta

// 1. MOCK DE REACT ROUTER
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

describe('Página CrearHub', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = () => {
    render(
      <BrowserRouter>
        <CrearHub />
      </BrowserRouter>
    );
  };

  it('renderiza correctamente el hub de creación', () => {
    renderComponent();

    // Verificamos los títulos principales
    expect(screen.getByText('Crear Nueva Rutina')).toBeInTheDocument();
    expect(screen.getByText('Generar con IA')).toBeInTheDocument();
    expect(screen.getByText('Diseñar Manual')).toBeInTheDocument();
  });

  it('navega a la página de Generar IA al hacer clic en su tarjeta', () => {
    renderComponent();

    // Buscamos la tarjeta por su título y hacemos clic en el contenedor (su "padre" o botón)
    const cardIA = screen.getByText('Generar con IA').closest('div').parentElement;
    fireEvent.click(cardIA);

    expect(mockNavigate).toHaveBeenCalledWith('/cliente/generar-ia');
  });

  it('navega a la página de Diseñar Manual al hacer clic en su tarjeta', () => {
    renderComponent();

    const cardManual = screen.getByText('Diseñar Manual').closest('div').parentElement;
    fireEvent.click(cardManual);

    expect(mockNavigate).toHaveBeenCalledWith('/cliente/crear-rutina');
  });

  it('ejecuta las animaciones hover correctamente sin romperse (Card IA)', () => {
    renderComponent();
    
    // Obtenemos el contenedor de la tarjeta de IA
    const cardIA = screen.getByText('Generar con IA').closest('div').parentElement;

    // Simulamos que el ratón entra
    fireEvent.mouseEnter(cardIA);
    // JSDOM convierte #FACC15 a rgb(250, 204, 21)
    expect(cardIA.style.borderColor).toBe('rgb(250, 204, 21)'); 

    // Simulamos que el ratón sale
    fireEvent.mouseLeave(cardIA);
    // JSDOM convierte #27272a a rgb(39, 39, 42)
    expect(cardIA.style.borderColor).toBe('rgb(39, 39, 42)'); 
  });

  it('ejecuta las animaciones hover correctamente sin romperse (Card Manual)', () => {
    renderComponent();
    
    // Obtenemos el contenedor de la tarjeta Manual
    const cardManual = screen.getByText('Diseñar Manual').closest('div').parentElement;

    // Simulamos que el ratón entra
    fireEvent.mouseEnter(cardManual);
    expect(cardManual.style.borderColor).toBe('white'); // 'white' se suele quedar igual

    // Simulamos que el ratón sale
    fireEvent.mouseLeave(cardManual);
    // JSDOM convierte #27272a a rgb(39, 39, 42)
    expect(cardManual.style.borderColor).toBe('rgb(39, 39, 42)');
  });


 it('ejecuta las animaciones hover correctamente sin romperse (Card Manual)', () => {
    renderComponent();
    
    // Obtenemos el contenedor de la tarjeta Manual
    const cardManual = screen.getByText('Diseñar Manual').closest('div').parentElement;

    // Simulamos que el ratón entra
    fireEvent.mouseEnter(cardManual);
    expect(cardManual.style.borderColor).toBe('white'); // 'white' se suele quedar igual

    // Simulamos que el ratón sale
    fireEvent.mouseLeave(cardManual);
    
    expect(cardManual.style.borderColor).toBe('rgb(39, 39, 42)');
  });
});