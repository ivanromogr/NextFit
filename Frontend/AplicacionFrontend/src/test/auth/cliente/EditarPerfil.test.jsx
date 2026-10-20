import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import EditarPerfil from '../../../pages/cliente/EditarPerfil';
import { actualizarCliente, getCliente } from '../../../api/endpoints';

// 1. MOCK DE ROUTER Y AUTH
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const auth = vi.hoisted(() => ({ userId: 'atleta-123' }));
vi.mock('../../../context/AuthContext', () => ({ useAuth: () => auth }));

// 2. MOCK DE API
vi.mock('../../../api/endpoints', () => ({
    api: { get: vi.fn().mockResolvedValue({ data: { allowed: false } }) },
  actualizarCliente: vi.fn(),
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
        auth.userId = 'atleta-123';
        getCliente.mockReset();
        actualizarCliente.mockReset();
  });

  const renderComponent = () => {
    return render(
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
    expect(screen.getByPlaceholderText('email@ejemplo.com')).toHaveAttribute('readonly');
  });

  it('actualiza el perfil con éxito al pulsar guardar', async () => {
    getCliente.mockResolvedValue(mockCliente);
    actualizarCliente.mockResolvedValue('Perfil actualizado');

    renderComponent();

    const nombreInput = await screen.findByDisplayValue('Juan');
    
    // Cambiamos el nombre
    fireEvent.change(nombreInput, { target: { value: 'Juan Actualizado' } });

    // Click en Guardar
    const saveBtn = screen.getByText(/GUARDAR/i);
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(actualizarCliente).toHaveBeenCalledWith(
        'atleta-123',
        expect.objectContaining({
          nombre: 'Juan Actualizado'
        })
      );
    });

    // Verificamos el mensaje de éxito (Toast)
    expect(await screen.findByText(/Perfil actualizado correctamente/i)).toBeInTheDocument();
  });

  it('gestiona la contraseña desde seguridad y no la envía al guardar el perfil', async () => {
    getCliente.mockResolvedValue(mockCliente);
    actualizarCliente.mockResolvedValue('Perfil actualizado');
    renderComponent();
    await screen.findByDisplayValue('Juan');
    expect(screen.getByRole('link', { name: /Cambiar contraseña/i })).toHaveAttribute('href', '/cliente/seguridad/password');
    expect(document.querySelector('input[type="password"]')).toBeNull();
    fireEvent.click(screen.getByText(/GUARDAR/i));
    await waitFor(() => expect(actualizarCliente).toHaveBeenCalled());
    expect(actualizarCliente.mock.calls[0][1]).not.toHaveProperty('contrasena');
  });

  it('muestra error si la actualización falla', async () => {
    getCliente.mockResolvedValue(mockCliente);
    actualizarCliente.mockRejectedValue(new Error('HTTP 500'));

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

  it('blocks editing after a failed load and recovers the real fields on retry', async () => {
    getCliente.mockRejectedValueOnce(new Error('offline')).mockResolvedValue(mockCliente);
    renderComponent();
    await screen.findByRole('alert');
    expect(screen.queryByRole('button', { name: /^GUARDAR$/i })).not.toBeInTheDocument();
    expect(actualizarCliente).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar perfil' }));
    expect(await screen.findByDisplayValue('Juan')).toBeInTheDocument();
  });
  it('rejects an invalid profile instead of allowing a blank replacement', async () => {
    getCliente.mockResolvedValue({ error: 'unavailable' });
    renderComponent();
    await screen.findByRole('alert');
    expect(screen.queryByRole('button', { name: /^GUARDAR$/i })).not.toBeInTheDocument();
  });
  it('ignores a delayed profile response from another account', async () => {
    let finishOld;
    getCliente.mockImplementation(id => id === 'atleta-123'
      ? new Promise(resolve => { finishOld = resolve; }) : Promise.resolve({ ...mockCliente, nombre: 'Laura' }));
    const view = renderComponent();
    await waitFor(() => expect(getCliente).toHaveBeenCalledWith('atleta-123'));
    auth.userId = 'another-account';
    view.rerender(<BrowserRouter><EditarPerfil /></BrowserRouter>);
    await screen.findByDisplayValue('Laura');
    await act(async () => finishOld(mockCliente));
    expect(screen.queryByDisplayValue('Juan')).not.toBeInTheDocument();
    expect(screen.getByDisplayValue('Laura')).toBeInTheDocument();
  });
  it('hides the previous loaded profile immediately when the account changes', async () => {
    getCliente.mockResolvedValueOnce(mockCliente).mockReturnValue(new Promise(() => {}));
    const view = renderComponent();
    await screen.findByDisplayValue('Juan');
    auth.userId = 'another-account';
    view.rerender(<BrowserRouter><EditarPerfil /></BrowserRouter>);
    expect(screen.queryByDisplayValue('Juan')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^GUARDAR$/i })).not.toBeInTheDocument();
  });
  it('preserves edits after a failed save and sends only one concurrent retry', async () => {
    getCliente.mockResolvedValue(mockCliente);
    let finishSave;
    actualizarCliente.mockRejectedValueOnce(new Error('offline')).mockReturnValue(new Promise(resolve => { finishSave = resolve; }));
    renderComponent();
    const name = await screen.findByDisplayValue('Juan');
    fireEvent.change(name, { target: { value: 'Nombre editado' } });
    fireEvent.click(screen.getByRole('button', { name: /^GUARDAR$/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: /^GUARDAR$/i })).not.toBeDisabled());
    expect(name).toHaveValue('Nombre editado');
    const retry = screen.getByRole('button', { name: /^GUARDAR$/i });
    fireEvent.click(retry);
    fireEvent.click(retry);
    expect(actualizarCliente).toHaveBeenCalledTimes(2);
    expect(actualizarCliente).toHaveBeenLastCalledWith('atleta-123', expect.objectContaining({ nombre: 'Nombre editado' }));
    await act(async () => finishSave({}));
  });
  it('does not navigate when a save completes after leaving the profile', async () => {
    getCliente.mockResolvedValue(mockCliente);
    let finishSave;
    actualizarCliente.mockReturnValue(new Promise(resolve => { finishSave = resolve; }));
    const view = renderComponent();
    await screen.findByDisplayValue('Juan');
    fireEvent.click(screen.getByRole('button', { name: /^GUARDAR$/i }));
    view.unmount();
    vi.useFakeTimers();
    try {
      await act(async () => { finishSave({}); });
      await act(async () => { vi.advanceTimersByTime(2000); });
      expect(mockNavigate).not.toHaveBeenCalled();
    } finally { vi.useRealTimers(); }
  });
});
