import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import DistribucionMuscularChart from '../../components/ui/DistribucionMuscularChart';

// 1. Engañamos a Recharts de nuevo para que funcione sin problemas en la terminal
vi.mock('recharts', async () => {
  const OriginalRecharts = await vi.importActual('recharts');
  return {
    ...OriginalRecharts,
    ResponsiveContainer: ({ children }) => (
      <OriginalRecharts.ResponsiveContainer width={500} height={300}>
        {children}
      </OriginalRecharts.ResponsiveContainer>
    ),
  };
});

// 2. Unos datos falsos para que el gráfico tenga algo que pintar
const mockData = [
  { musculo: 'Pecho', series: 12 },
  { musculo: 'Espalda', series: 14 },
  { musculo: 'Piernas', series: 10 },
  { musculo: 'Hombros', series: 8 }
];

describe('Componente DistribucionMuscularChart', () => {
  
  it('no renderiza nada si la lista de datos está vacía', () => {
    const { container } = render(<DistribucionMuscularChart data={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('no renderiza nada si no se le pasa la prop data (undefined)', () => {
    const { container } = render(<DistribucionMuscularChart />);
    expect(container.firstChild).toBeNull();
  });

  it('renderiza el título y el contenedor cuando recibe datos válidos', () => {
    render(<DistribucionMuscularChart data={mockData} />);
    
    // Verificamos que el título principal está en pantalla
    expect(screen.getByText(/Balance Muscular/i)).toBeInTheDocument();
  });
});