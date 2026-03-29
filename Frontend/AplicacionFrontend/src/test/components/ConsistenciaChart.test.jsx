import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ConsistenciaChart from '../../components/ui/ConsistenciaChart';

// 1. "Engañamos" a Recharts para que no intente medir la pantalla (que en el test no existe)
vi.mock('recharts', async () => {
  const OriginalRecharts = await vi.importActual('recharts');
  return {
    ...OriginalRecharts,
    // Obligamos a que el ResponsiveContainer siempre tenga un tamaño fijo en el test
    ResponsiveContainer: ({ children }) => (
      <OriginalRecharts.ResponsiveContainer width={500} height={300}>
        {children}
      </OriginalRecharts.ResponsiveContainer>
    ),
  };
});

// Datos falsos para probar el gráfico
const mockDataSemanal = [
  { label: 'Sem 1', cantidad: 3 },
  { label: 'Sem 2', cantidad: 0 }
];

const mockDataDiaria = [
  { label: 'Lun', cantidad: 1 },
  { label: 'Mar', cantidad: 0 }
];

describe('Componente ConsistenciaChart', () => {

  it('no renderiza nada si no hay datos (null o array vacío)', () => {
    const { container } = render(<ConsistenciaChart dataSemanal={[]} dataDiaria={[]} />);
    // El componente debería devolver null, así que el contenedor debe estar vacío
    expect(container.firstChild).toBeNull();
  });

  it('renderiza el título y los botones correctamente con datos iniciales', () => {
    render(<ConsistenciaChart dataSemanal={mockDataSemanal} dataDiaria={mockDataDiaria} />);
    
    // Verificamos el título
    expect(screen.getByText(/Consistencia/i)).toBeInTheDocument();
    
    // Verificamos los botones del toggle
    expect(screen.getByRole('button', { name: 'Días' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Semanas' })).toBeInTheDocument();
  });

  it('cambia el estado (de semana a día) al hacer clic en los botones', () => {
    render(<ConsistenciaChart dataSemanal={mockDataSemanal} dataDiaria={mockDataDiaria} />);
    
    const botonDias = screen.getByRole('button', { name: 'Días' });
    const botonSemanas = screen.getByRole('button', { name: 'Semanas' });

    // Hacemos clic en "Días"
    fireEvent.click(botonDias);
    // Verificamos que el botón de Días ahora tiene el color activo (#FACC15)
    expect(botonDias).toHaveStyle('color: #FACC15');
    // El de semanas debería estar apagado (#71717a)
    expect(botonSemanas).toHaveStyle('color: #71717a');

    // Hacemos clic en "Semanas" para volver
    fireEvent.click(botonSemanas);
    expect(botonSemanas).toHaveStyle('color: #FACC15');
    expect(botonDias).toHaveStyle('color: #71717a');
  });

});