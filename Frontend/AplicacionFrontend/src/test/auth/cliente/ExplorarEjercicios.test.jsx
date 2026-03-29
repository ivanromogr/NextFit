import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ExplorarEjercicios from '../../../pages/cliente/ExplorarEjercicios';
import { obtenerEjercicios } from '../../../api/endpoints';

// 1. MOCK DE LA API
vi.mock('../../../api/endpoints', () => ({
  obtenerEjercicios: vi.fn()
}));

// 2. MOCK DEL COMPONENTE UI (GymInput) 
// Lo mockeamos para asegurarnos de que el test sea rápido y se centre en la lógica de la página
vi.mock('../../../components/ui/GymInput', () => ({
  default: ({ value, onChange, placeholder }) => (
    <input 
      data-testid="gym-input-mock"
      placeholder={placeholder}
      value={value}
      onChange={onChange}
    />
  )
}));

describe('Página ExplorarEjercicios', () => {
  const mockEjercicios = [
    { id: 1, nombre: 'Press Banca', grupoMuscular: 'PECHO', gifUrl: 'press.gif' },
    { id: 2, nombre: 'Sentadilla', grupoMuscular: 'PIERNA', gifUrl: 'squat.gif' },
    { id: 3, nombre: 'Dominadas', grupoMuscular: 'ESPALDA', gifUrl: 'pullup.gif' }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = () => {
    render(<ExplorarEjercicios />);
  };

  it('muestra el estado de carga y luego renderiza los ejercicios', async () => {
    obtenerEjercicios.mockResolvedValue(mockEjercicios);
    
    renderComponent();

    // Verificamos que sale el texto de carga
    expect(screen.getByText(/CARGANDO.../i)).toBeInTheDocument();

    // Esperamos a que la API responda y se pinten los nombres
    expect(await screen.findByText(/Press Banca/i)).toBeInTheDocument();
    expect(screen.getByText(/Sentadilla/i)).toBeInTheDocument();
    expect(screen.getByText(/Dominadas/i)).toBeInTheDocument();
  });

  it('filtra los ejercicios correctamente al escribir en el buscador', async () => {
    obtenerEjercicios.mockResolvedValue(mockEjercicios);
    renderComponent();

    // Esperamos a que carguen
    await screen.findByText(/Press Banca/i);

    const input = screen.getByTestId('gym-input-mock');

    // Buscamos por nombre: "Sentadilla"
    fireEvent.change(input, { target: { value: 'Sentadilla' } });
    
    expect(screen.getByText(/Sentadilla/i)).toBeInTheDocument();
    expect(screen.queryByText(/Press Banca/i)).not.toBeInTheDocument();

    // Buscamos por grupo muscular: "PECHO"
    fireEvent.change(input, { target: { value: 'PECHO' } });
    
    expect(screen.getByText(/Press Banca/i)).toBeInTheDocument();
    expect(screen.queryByText(/Sentadilla/i)).not.toBeInTheDocument();
  });

  it('muestra el icono de Dumbbell si la imagen del ejercicio falla', async () => {
    obtenerEjercicios.mockResolvedValue([
      { id: 99, nombre: 'Ejercicio Roto', grupoMuscular: 'PECHO', gifUrl: 'error.gif' }
    ]);
    
    renderComponent();

    // Encontramos la imagen
    const img = await screen.findByAltText(/Ejercicio Roto/i);
    
    // Simulamos un error de carga de la imagen
    fireEvent.error(img);

    // Verificamos que la imagen se oculta (display: none)
    expect(img).toHaveStyle('display: none');

    // Verificamos que ahora aparece el icono de Dumbbell
    // Buscamos el contenedor que creaste para el error de imagen
    const fallbackIcon = document.querySelector('svg.lucide-dumbbell');
    expect(fallbackIcon).toBeInTheDocument();
  });

  it('no explota si la API devuelve un error o datos vacíos', async () => {
    obtenerEjercicios.mockRejectedValue(new Error('API Down'));
    
    renderComponent();

    // Debería terminar de cargar y no mostrar nada (o podrías añadir un mensaje de "No hay resultados")
    await waitFor(() => {
      expect(screen.queryByText(/CARGANDO.../i)).not.toBeInTheDocument();
    });
    
    // El grid debería estar vacío (ninguna tarjeta)
    expect(screen.queryByRole('heading', { level: 3 })).not.toBeInTheDocument();
  });
});