import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, waitFor,act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ImageUpload from '../../components/ui/ImageUpload';

describe('Componente ImageUpload', () => {
  const mockOnUploadSuccess = vi.fn();

  beforeEach(() => {
    vi.restoreAllMocks();
    // Forzamos a que siempre empiecen con timers reales
    vi.useRealTimers();
    
    vi.stubGlobal('localStorage', {
      getItem: vi.fn().mockReturnValue('token-xyz'),
    });
    
    // Mock de fetch base
    vi.stubGlobal('fetch', vi.fn());
  });

  it('renderiza correctamente', () => {
    render(<ImageUpload onUploadSuccess={mockOnUploadSuccess} />);
    expect(screen.getByText(/subir imagen/i)).toBeInTheDocument();
  });

 it('muestra error si el archivo no es imagen y desaparece tras 3s', () => {
    // 1. Activamos timers falsos
    vi.useFakeTimers();
    
    render(<ImageUpload onUploadSuccess={mockOnUploadSuccess} />);
    const input = screen.getByLabelText(/subir imagen/i);
    const file = new File(['hola'], 'test.txt', { type: 'text/plain' });

    // 2. Disparamos el cambio
    fireEvent.change(input, { target: { files: [file] } });

    // 3. Verificamos que el mensaje aparece
    expect(screen.getByText(/por favor sube una imagen válida/i)).toBeInTheDocument();

    // 4. ADELANTAMOS EL TIEMPO (dentro de act)
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    // 5. Verificamos que ya NO está (sin usar waitFor, porque ya debería haber desaparecido)
    expect(screen.queryByText(/por favor sube una imagen válida/i)).not.toBeInTheDocument();

    vi.useRealTimers();
  });

  it('sube la imagen con éxito y llama a la función de éxito', async () => {
   
    fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ url: 'http://fitness.com/avatar.jpg' }),
    });

    render(<ImageUpload onUploadSuccess={mockOnUploadSuccess} label="Subir Foto" />);
    const input = screen.getByLabelText(/subir foto/i);
    const file = new File(['(img)'], 'perfil.png', { type: 'image/png' });

    fireEvent.change(input, { target: { files: [file] } });

    // findByText ya lleva un "waitFor" interno que funciona genial con timers reales
    const successMsg = await screen.findByText(/imagen subida correctamente/i);
    expect(successMsg).toBeInTheDocument();
    
    expect(mockOnUploadSuccess).toHaveBeenCalledWith('http://fitness.com/avatar.jpg');
  });

  it('muestra error si el servidor falla', async () => {
    fetch.mockResolvedValue({ ok: false, status: 500 });

    render(<ImageUpload onUploadSuccess={mockOnUploadSuccess} />);
    const input = screen.getByLabelText(/subir imagen/i);
    const file = new File(['(img)'], 'perfil.png', { type: 'image/png' });

    fireEvent.change(input, { target: { files: [file] } });

    const errorMsg = await screen.findByText(/error al subir la imagen/i);
    expect(errorMsg).toBeInTheDocument();
  });
});