import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import GymInput from '../../components/ui/GymInput';
import { Mail } from 'lucide-react'; // Icono de prueba

describe('Componente GymInput', () => {
  const mockOnChange = vi.fn();

  it('renderiza la etiqueta y el input correctamente', () => {
    render(
      <GymInput 
        label="Nombre de usuario" 
        placeholder="Escribe aquí" 
        value="" 
        onChange={mockOnChange} 
      />
    );
    
    // Verificamos que la etiqueta (label) existe
    expect(screen.getByText(/nombre de usuario/i)).toBeInTheDocument();
    // Verificamos que el placeholder está ahí
    expect(screen.getByPlaceholderText('Escribe aquí')).toBeInTheDocument();
  });

  it('genera un ID automático basado en el label si no se le pasa uno', () => {
    render(<GymInput label="Correo Electronico" value="" onChange={mockOnChange} />);
    const input = screen.getByLabelText(/correo electronico/i);
    
    // Debería ser: gym-input-correo-electronico
    expect(input.id).toBe('gym-input-correo-electronico');
  });

  it('llama a onChange cuando el usuario escribe', () => {
    render(<GymInput label="Prueba" value="" onChange={mockOnChange} />);
    const input = screen.getByRole('textbox');
    
    fireEvent.change(input, { target: { value: 'Nuevo texto' } });
    
    expect(mockOnChange).toHaveBeenCalledTimes(1);
  });

  it('renderiza el icono y el sufijo cuando se proporcionan', () => {
    render(
      <GymInput 
        label="Peso" 
        value="80" 
        onChange={mockOnChange} 
        icon={Mail} 
        suffix="KG" 
      />
    );
    
    // Verificamos que el sufijo se ve en pantalla
    expect(screen.getByText('KG')).toBeInTheDocument();
    
    // Verificamos los paddings dinámicos (esto cubre la lógica de estilos)
    const input = screen.getByRole('textbox');
    expect(input.style.paddingLeft).toBe('46px'); // Porque tiene icono
    expect(input.style.paddingRight).toBe('56px'); // Porque tiene sufijo
  });

  it('cambia el estilo al ganar y perder el foco (Focus/Blur)', () => {
    render(<GymInput label="Foco" value="" onChange={mockOnChange} />);
    const input = screen.getByRole('textbox');

    // Simular ganar el foco
    fireEvent.focus(input);
    expect(input.style.borderColor).toBe('rgba(250, 204, 21, 0.55)');

    // Simular perder el foco
    fireEvent.blur(input);
    expect(input.style.borderColor).toBe('rgba(255, 255, 255, 0.1)');
  });

  it('usa el tipo de input especificado (password, number, etc)', () => {
  render(<GymInput label="Clave" type="password" value="" onChange={mockOnChange} />);
  
  // 1. Aquí lo guardas como inputPass
  const inputPass = screen.getByLabelText(/clave/i);

  // 2. Aquí debes usar el MISMO nombre: inputPass
  expect(inputPass).toHaveAttribute('type', 'password');
});
});