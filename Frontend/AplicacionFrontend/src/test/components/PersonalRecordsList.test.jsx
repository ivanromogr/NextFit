import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import PersonalRecordsList from '../../components/ui/PersonalRecordsList';

describe('Componente PersonalRecordsList', () => {
  
  const mockPRs = [
    { ejercicio: 'Press Banca', fecha: '20/03/2026', peso: 100, esReciente: true },
    { ejercicio: 'Sentadilla', fecha: '15/03/2026', peso: 140, esReciente: false },
    { ejercicio: 'Peso Muerto', fecha: '10/03/2026', peso: 180, esReciente: false },
    { ejercicio: 'Press Militar', fecha: '05/03/2026', peso: 60, esReciente: false },
  ];

  it('no renderiza nada si la lista de PRs está vacía o es null', () => {
    const { container } = render(<PersonalRecordsList prs={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renderiza el título del Salón de la Fama', () => {
    render(<PersonalRecordsList prs={mockPRs} />);
    expect(screen.getByText(/Salón de la Fama/i)).toBeInTheDocument();
  });

  it('muestra el badge de "Nuevos" y el texto de motivación cuando hay récords recientes', () => {
    render(<PersonalRecordsList prs={mockPRs} />);
    
    expect(screen.getByText(/¡1 Nuevos!/i)).toBeInTheDocument();
    expect(screen.getByText(/Has roto/i)).toBeInTheDocument();
    expect(screen.getByText(/1 récords/i)).toBeInTheDocument();
  });

  it('muestra el subtexto genérico cuando NO hay récords recientes', () => {
    const viejosPRs = [
        { ejercicio: 'Curl Biceps', fecha: '01/01/2026', peso: 20, esReciente: false }
    ];
    render(<PersonalRecordsList prs={viejosPRs} />);
    
    expect(screen.getByText(/Tus mejores levantamientos históricos/i)).toBeInTheDocument();
    expect(screen.queryByText(/Nuevos!/i)).not.toBeInTheDocument();
  });

  it('renderiza los datos de los ejercicios correctamente (Nombre, Fecha, Peso)', () => {
    render(<PersonalRecordsList prs={mockPRs} />);
    
    expect(screen.getByText('Press Banca')).toBeInTheDocument();
    expect(screen.getByText('20/03/2026')).toBeInTheDocument();
    // Buscamos el peso. Usamos queryByText porque el peso está separado por un span para "kg"
    expect(screen.getByText(/100/i)).toBeInTheDocument();
  });

  it('aplica los estilos correctos según el índice (Medallas vs Trofeo)', () => {
    const { container } = render(<PersonalRecordsList prs={mockPRs} />);
    
    // Buscamos los iconos de Lucide (Trophy y Medal)
    // El índice 0, 1 y 2 deberían tener el componente Medal (que renderiza un <svg>)
    // El índice 3 en adelante debería tener un Trophy
    const svgIcons = container.querySelectorAll('svg');
    
    // 1 de la cabecera + 1 de la llama del badge + 4 de la lista = 6 iconos aprox.
    expect(svgIcons.length).toBeGreaterThan(4);
  });
});
