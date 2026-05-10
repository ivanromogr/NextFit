import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ImageUploadLocal from '../../components/ui/ImageUploadLocal';

describe('Componente ImageUploadLocal', () => {
  const mockOnUploadSuccess = vi.fn();

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal('fetch', vi.fn());
    vi.stubGlobal('alert', vi.fn());

    // Definimos una clase mock para FileReader
    class MockFileReader {
      constructor() {
        // Simulamos el método readAsDataURL
        this.readAsDataURL = vi.fn(() => {
          // Simulamos el resultado que daría una imagen
          this.result = 'data:image/png;base64,falsa-imagen-base64';
          // Ejecutamos el evento onloadend para que el componente siga su curso
          if (this.onloadend) {
            this.onloadend();
          }
        });
      }
    }

    // Registramos la CLASE como el FileReader global
    vi.stubGlobal('FileReader', MockFileReader);
  });

  it('renderiza el botón de carga correctamente', () => {
    render(<ImageUploadLocal onUploadSuccess={mockOnUploadSuccess} />);
    expect(screen.getByText(/CARGAR DESDE PC/i)).toBeInTheDocument();
  });

  it('muestra un alert si el archivo seleccionado no es una imagen', () => {
    render(<ImageUploadLocal onUploadSuccess={mockOnUploadSuccess} />);
    const input = screen.getByLabelText(/cargar desde pc/i);

    // Archivo de texto
    const file = new File(['hola'], 'test.txt', { type: 'text/plain' });
    fireEvent.change(input, { target: { files: [file] } });

    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining("archivo de imagen válido"));
  });

  it('convierte a Base64 y sube la imagen con éxito', async () => {
    // Simulamos respuesta 200 OK del servidor
    fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ url: 'http://localhost:8080/perfil.jpg' }),
    });

    render(<ImageUploadLocal onUploadSuccess={mockOnUploadSuccess} />);
    const input = screen.getByLabelText(/cargar desde pc/i);
    const file = new File(['(img)'], 'perfil.png', { type: 'image/png' });

    fireEvent.change(input, { target: { files: [file] } });

    // Verificamos que se llamó a la API con el JSON correcto (Base64)
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8098/api/upload/base64',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ base64: 'data:image/png;base64,falsa-imagen-base64' })
        })
      );
    });

    // Verificamos que se avisó al padre con la URL final
    expect(mockOnUploadSuccess).toHaveBeenCalledWith('http://localhost:8080/perfil.jpg');
  });

  it('muestra un alert si el servidor devuelve un error', async () => {
    // Simulamos error 400
    fetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'Formato no soportado' }),
    });

    render(<ImageUploadLocal onUploadSuccess={mockOnUploadSuccess} />);
    const input = screen.getByLabelText(/cargar desde pc/i);
    const file = new File(['(img)'], 'perfil.png', { type: 'image/png' });

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith(expect.stringContaining("Formato no soportado"));
    });
  });

  it('cambia el estilo visual al pasar el ratón (Hover)', () => {
    render(<ImageUploadLocal onUploadSuccess={mockOnUploadSuccess} />);
    const label = screen.getByText(/CARGAR DESDE PC/i).closest('label');

    fireEvent.mouseEnter(label);
    expect(label.style.borderColor).toBe('rgb(250, 204, 21)'); // #FACC15

    fireEvent.mouseLeave(label);
    expect(label.style.borderColor).toBe('rgb(39, 39, 42)'); // #27272a
  });
});
