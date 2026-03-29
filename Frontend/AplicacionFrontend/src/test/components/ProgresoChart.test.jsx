import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ProgresoChart from '../../components/ui/ProgresoChart';

// 1. Mock de Recharts (imprescindible para ResponsiveContainer)
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

describe('Componente ProgresoChart', () => {
  const mockData = [
    { fecha: '2026-01-01', valor: 80 },
    { fecha: '2026-02-01', valor: 85 },
  ];

  it('muestra el mensaje de "No hay datos" cuando la lista está vacía', () => {
    render(<ProgresoChart data={[]} titulo="Press Banca" pr={0} />);
    
    expect(screen.getByText(/No hay datos suficientes aún/i)).toBeInTheDocument();
    // Verificamos que no se renderiza el título en el estado vacío según tu código
    expect(screen.queryByText('PRESS BANCA')).not.toBeInTheDocument();
  });

  it('renderiza el título correctamente cuando hay datos', () => {
    render(<ProgresoChart data={mockData} titulo="Sentadilla" pr={0} />);
    
    expect(screen.getByText('Sentadilla')).toBeInTheDocument();
  });

  it('muestra el badge de PR cuando el valor de pr es mayor a 0', () => {
    render(<ProgresoChart data={mockData} titulo="Peso Muerto" pr={150} />);
    
    // El texto esperado es "🏆 PR: 150kg"
    expect(screen.getByText(/🏆 PR: 150kg/i)).toBeInTheDocument();
  });

  it('no muestra el badge de PR cuando pr es 0 o menor', () => {
    render(<ProgresoChart data={mockData} titulo="Peso Muerto" pr={0} />);
    
    expect(screen.queryByText(/🏆 PR:/i)).not.toBeInTheDocument();
  });

  it('renderiza el contenedor del gráfico cuando hay datos', () => {
    const { container } = render(<ProgresoChart data={mockData} titulo="Test" pr={0} />);
    
    // Verificamos que se ha creado el SVG de Recharts (o al menos el contenedor)
    const chartContainer = container.querySelector('.recharts-responsive-container');
    expect(chartContainer).toBeInTheDocument();
  });
});