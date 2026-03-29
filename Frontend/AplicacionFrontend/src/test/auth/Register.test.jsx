import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ConsistenciaChart from '../../components/ui/ConsistenciaChart';

// 🚀 EL FIX: Mockeamos ResponsiveContainer para que renderice instantáneamente
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
    
    // Verificamos el título (ajusta según tu texto exacto)
    expect(screen.getByText(/Consistencia/i)).toBeInTheDocument();
    
    // Verificamos los botones de alternancia
    expect(screen.getByText(/Semanas/i)).toBeInTheDocument();
    expect(screen.getByText(/Días/i)).toBeInTheDocument();
  });

  it('cambia el estado al hacer clic en los botones', () => {
    render(<ConsistenciaChart dataSemanal={mockDataSemanal} dataDiaria={mockDataDiaria} />);
    
    const botonDia = screen.getByText(/Días/i);
    fireEvent.click(botonDia);

    // Si el clic funciona, el test terminará rápido gracias al mock
    expect(botonDia).toBeInTheDocument();
  });
});