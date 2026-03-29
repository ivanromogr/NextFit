import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import DashboardCliente from '../../../pages/cliente/DashboardCliente';
import { obtenerResumenDashboard, getCliente } from '../../../api/endpoints';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ userId: 'atleta-789' })
}));

vi.mock('../../../api/endpoints', () => ({
  obtenerResumenDashboard: vi.fn(),
  getCliente: vi.fn()
}));

describe('Página DashboardCliente', () => {
  const mockResumenBase = {
    entrenosHechos: 2,
    entrenosObjetivo: 4,
    volumenSemana: 5400,
    rachaActual: 3,
    eventoHoy: null
  };

  const mockPerfilBase = { nombre: 'Juan Entreno', fotoPerfil: 'http://foto.jpg' };

  beforeEach(() => { vi.clearAllMocks(); });

  const renderComponent = () => {
    render(<BrowserRouter><DashboardCliente /></BrowserRouter>);
  };

  it('renderiza los datos del perfil y las estadísticas correctamente', async () => {
    obtenerResumenDashboard.mockResolvedValue(mockResumenBase);
    getCliente.mockResolvedValue(mockPerfilBase);
    renderComponent();

    expect(await screen.findByText(/Hola,/i)).toBeInTheDocument();
    
    // Verificamos el volumen con buscador flexible
    await waitFor(() => {
        expect(screen.getByText((content) => content.includes('5') && content.includes('400'))).toBeInTheDocument();
    });
    
    expect(screen.getByText('2')).toBeInTheDocument(); 
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('gestiona correctamente el dropdown de notificaciones', async () => {
    obtenerResumenDashboard.mockResolvedValue({ 
      ...mockResumenBase, 
      eventoHoy: { id: 1, rutinaNombre: 'Pierna', completado: false } 
    });
    getCliente.mockResolvedValue(mockPerfilBase);
    renderComponent();

    // Esperamos carga
    expect(await screen.findByText(/Hola,/i)).toBeInTheDocument();

    // Abrimos campana
    const bellIcon = document.querySelector('.lucide-bell');
    fireEvent.click(bellIcon.parentElement);

    // Verificamos contenido específico para evitar duplicados con el Hero
    expect(screen.getByRole('heading', { level: 3, name: /^Tu Actividad$/i })).toBeInTheDocument();
    expect(screen.getByText(/Hoy te toca destrozar: Pierna/i)).toBeInTheDocument();

    // Cerramos
    const closeIcon = document.querySelector('.lucide-x');
    fireEvent.click(closeIcon.parentElement);
    
    await waitFor(() => {
      expect(screen.queryByRole('heading', { level: 3, name: /^Tu Actividad$/i })).not.toBeInTheDocument();
    });
  });
});