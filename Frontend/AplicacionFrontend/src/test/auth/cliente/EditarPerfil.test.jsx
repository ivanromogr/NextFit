import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import EditarPerfil from '../../../pages/cliente/EditarPerfil';
import { getCliente } from '../../../api/endpoints';

// 1. MOCK DE ROUTER Y AUTH
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ userId: 'atleta-123' })
}));

// 2. MOCK DE API (GET)
vi.mock('../../../api/endpoints', () => ({
  getCliente: vi.fn()
}));

// 3. MOCK DE IMAGEUPLOAD (Para no lidiar con subidas reales)
vi.mock('../../../components/ui/ImageUpload', () => ({
  default: ({ onUploadSuccess }) => (
    <button onClick={() => onUploadSuccess('http://nueva-foto.jpg')}>
      Simular Upload
    </button>
  )
}));

describe('Página EditarPerfil', () => {
  const mockCliente = {
    nombre: 'Juan',
    apellido: 'Pérez',
    email: 'juan@test.com',
    fotoPerfil: 'http://foto-vieja.jpg'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock del fetch global para el PUT
    vi.stubGlobal('fetch', vi.fn());
  });

  const renderComponent = () => {
    render(
      <BrowserRouter>
        <EditarPerfil />
      </BrowserRouter>
    );
  };

  it('carga y muestra los datos del cliente correctamente', async () => {
    getCliente.mockResolvedValue(mockCliente);
    renderComponent();

    // Verificamos estado de carga
    expect(screen.getByText(/Cargando datos/i)).toBeInTheDocument();

    // Verificamos que los inputs se llenan
    const nombreInput = await screen.findByDisplayValue('Juan');
    const apellidoInput = screen.getByDisplayValue('Pérez');
    const emailInput = screen.getByDisplayValue('juan@test.com');

    expect(nombreInput).toBeInTheDocument();
    expect(apellidoInput).toBeInTheDocument();
    expect(emailInput).toBeInTheDocument();
  });

  it('actualiza el perfil con éxito al pulsar guardar', async () => {
    getCliente.mockResolvedValue(mockCliente);
    // Simulamos respuesta exitosa del servidor (fetch PUT)
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true })
    });

    renderComponent();

    const nombreInput = await screen.findByDisplayValue('Juan');
    
    // Cambiamos el nombre
    fireEvent.change(nombreInput, { target: { value: 'Juan Actualizado' } });

    // Click en Guardar
    const saveBtn = screen.getByText(/GUARDAR/i);
    fireEvent.click(saveBtn);

    // Verificamos que se llamó al fetch con el payload correcto
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/clientes/atleta-123'),
        expect.objectContaining({
          method: 'PUT',
          body: expect.stringContaining('"nombre":"Juan Actualizado"')
        })
      );
    });

    // Verificamos el mensaje de éxito (Toast)
    expect(await screen.findByText(/Perfil actualizado correctamente/i)).toBeInTheDocument();
  });

  it('envía la contraseña solo si el usuario la escribe', async () => {
    getCliente.mockResolvedValue(mockCliente);
    global.fetch.mockResolvedValue({ ok: true });

    renderComponent();

    const passInput = await screen.findByPlaceholderText(/Déjalo en blanco/i);
    fireEvent.change(passInput, { target: { value: 'nuevaPass123' } });

    fireEvent.click(screen.getByText(/GUARDAR/i));

    await waitFor(() => {
      const callBody = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(callBody.contrasena).toBe('nuevaPass123');
    });
  });

  it('muestra error si la actualización falla', async () => {
    getCliente.mockResolvedValue(mockCliente);
    // Simulamos error de servidor
    global.fetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve('Error interno del servidor')
    });

    renderComponent();
    await screen.findByDisplayValue('Juan');

    fireEvent.click(screen.getByText(/GUARDAR/i));

    // Verificamos que el Toast de error aparece
    expect(await screen.findByText(/Error: HTTP 500/i)).toBeInTheDocument();
  });

  it('navega al dashboard al pulsar cancelar', async () => {
    getCliente.mockResolvedValue(mockCliente);
    renderComponent();

    const cancelBtn = await screen.findByText(/CANCELAR/i);
    fireEvent.click(cancelBtn);

    expect(mockNavigate).toHaveBeenCalledWith('/cliente/dashboard');
  });
});