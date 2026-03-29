import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import GymDateInput from '../../components/ui/GymDateInput';

describe('Componente GymDateInput', () => {
  const mockOnChange = vi.fn();

  it('renderiza la etiqueta y la fecha formateada correctamente', () => {
    // Fecha en formato backend: 1995-05-15
    render(<GymDateInput label="Fecha de Nacimiento" value="1995-05-15" onChange={mockOnChange} />);
    
   expect(screen.getByText(/fecha de nacimiento/i)).toBeInTheDocument();
    // Debería mostrar la fecha en formato bonito: 15/05/1995
    expect(screen.getByText('15/05/1995')).toBeInTheDocument();
  });

  it('muestra el placeholder si no hay valor', () => {
    render(<GymDateInput label="Fecha" value="" onChange={mockOnChange} />);
    expect(screen.getByText('Selecciona una fecha')).toBeInTheDocument();
  });

  it('abre y cierra el calendario al hacer clic en el botón', () => {
    render(<GymDateInput label="Fecha" value="2023-10-10" onChange={mockOnChange} />);
    
    const boton = screen.getByRole('button', { name: /10\/10\/2023/i });
    
    // Al principio el DatePicker no debería ser visible (max-height: 0)
    // Pero el componente DatePicker solo se renderiza si open es true
    fireEvent.click(boton);
    
    // Ahora deberíamos ver el selector de mes del header custom
    expect(screen.getByLabelText('Seleccionar mes')).toBeInTheDocument();
    
    // Volvemos a hacer clic para cerrar
    fireEvent.click(boton);
    // Esperamos a que el estado cambie (en este caso el selector desaparece del DOM)
    expect(screen.queryByLabelText('Seleccionar mes')).not.toBeInTheDocument();
  });

  it('llama a onChange con el formato correcto al seleccionar una fecha', () => {
    render(<GymDateInput label="Fecha" value="2023-10-10" onChange={mockOnChange} />);
    
    // Abrimos el calendario
    fireEvent.click(screen.getByRole('button'));

    // Buscamos un día (por ejemplo, el día 15 del mes actual)
    // DatePicker usa clases de aria-label para los días: "Choose Tuesday, October 15th, 2023"
    // Pero lo más fácil es buscar por texto en las celdas del calendario
    const dia15 = screen.getByText('15');
    fireEvent.click(dia15);

    // Verificamos que se llamó a onChange con el formato ISO (YYYY-MM-DD)
    expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining({
      target: { value: expect.stringMatching(/^\d{4}-\d{2}-15$/) }
    }));
  });

  it('permite cambiar el mes y el año desde el header custom', () => {
    render(<GymDateInput label="Fecha" value="2023-10-10" onChange={mockOnChange} />);
    fireEvent.click(screen.getByRole('button'));

    const selectMes = screen.getByLabelText('Seleccionar mes');
    const selectAnio = screen.getByLabelText('Seleccionar año');

    // Cambiamos a Enero (valor 0)
    fireEvent.change(selectMes, { target: { value: '0' } });
    expect(selectMes.value).toBe('0');

    // Cambiamos el año a 1990
    fireEvent.change(selectAnio, { target: { value: '1990' } });
    expect(selectAnio.value).toBe('1990');
  });
});