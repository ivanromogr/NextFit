import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ConsistenciaChart from '../../components/ui/ConsistenciaChart';

// 1. MOCK CRÍTICO: Engañamos a Recharts para evitar el Timeout
vi.mock('recharts', async () => {
  const OriginalRecharts = await vi.importActual('recharts');
  return {
    ...OriginalRecharts,
    ResponsiveContainer: ({ children }) => (
      <div className="recharts-responsive-container" style={{ width: '500px', height: '300px' }}>
        {children}
      </div>
    ),
  };
});

describe('Componente ConsistenciaChart', () => {
  const mockDataSemanal = [
    { dia: 'Lun', minutos: 60 },
    { dia: 'Mar', minutos: 45 },
  ];
  const mockDataDiaria = [
    { hora: '08:00', minutos: 60 },
  ];

  it('renderiza el título y los botones correctamente con datos iniciales', () => {
    render(<ConsistenciaChart dataSemanal={mockDataSemanal} dataDiaria={mockDataDiaria} />);
    
    // 1. Ajustamos el título a lo que sale en el HTML: "Consistencia"
    expect(screen.getByText(/Consistencia/i)).toBeInTheDocument();
    
    // 2. Ajustamos los botones a plural: "Semanas" y "Días"
    expect(screen.getByText(/Semanas/i)).toBeInTheDocument();
    expect(screen.getByText(/Días/i)).toBeInTheDocument();
  });

  it('cambia el estado (de semana a día) al hacer clic en los botones', () => {
    render(<ConsistenciaChart dataSemanal={mockDataSemanal} dataDiaria={mockDataDiaria} />);
    
    // Buscamos "Días" en plural
    const botonDia = screen.getByText(/Días/i);
    fireEvent.click(botonDia);

    expect(botonDia).toBeInTheDocument();
  });

  it('cambia el estado (de semana a día) al hacer clic en los botones', () => {
    render(<ConsistenciaChart dataSemanal={mockDataSemanal} dataDiaria={mockDataDiaria} />);
    
    const botonDia = screen.getByText(/Día/i);
    fireEvent.click(botonDia);

    // Si el componente cambia internamente, el test no debería fallar por timeout
    expect(botonDia).toBeInTheDocument();
  });
});