import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import Login from '../../pages/auth/Login';
import { AuthProvider } from '../../context/AuthContext';

import * as api from '../../api/endpoints';

// 2. MOCKS DE NAVEGACIÓN
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// 3. MOCK DE API (Asegúrate de que la ruta sea EXACTAMENTE igual al import de arriba)
vi.mock('../../api/endpoints', () => ({
  // Definimos loginForm como una función de Vitest explícitamente
  loginForm: vi.fn()
}));

describe('Página de Login', () => {
  
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('sessionStorage', {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
  });

  const renderLogin = () => {
    render(
      <AuthProvider>
        <BrowserRouter>
          <Login />
        </BrowserRouter>
      </AuthProvider>
    );
  };

  it('redirige al dashboard de CLIENTE tras un login exitoso', async () => {
    // Ahora loginForm SÍ tendrá el método mockResolvedValue
    api.loginForm.mockResolvedValue({
      status: 200,
      data: { id: '123', role: 'cliente' }
    });

    renderLogin();

    fireEvent.change(screen.getByPlaceholderText(/usuario@email.com/i), {
      target: { value: 'atleta@test.com' }
    });
    fireEvent.change(screen.getByPlaceholderText(/••••••••/i), {
      target: { value: 'password123' }
    });

    fireEvent.click(screen.getByRole('button', { name: /INICIAR SESIÓN/i }));

    await waitFor(() => {
      expect(api.loginForm).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/cliente/dashboard');
    });
  });

  it('muestra error de credenciales (401)', async () => {
    api.loginForm.mockRejectedValue({
      response: { status: 401 }
    });

    renderLogin();
    
    fireEvent.click(screen.getByRole('button', { name: /INICIAR SESIÓN/i }));

    await waitFor(() => {
      expect(screen.getByText(/credenciales incorrectas/i)).toBeInTheDocument();
    });
  });
});