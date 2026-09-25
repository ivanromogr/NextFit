import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ChatComponent from '../../components/functional/ChatComponent';
import { api } from '../../api/endpoints';

// 1. MOCK DE LA API
vi.mock('../../api/endpoints', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn()
  }
}));

// 2. MOCK DEL WEBSOCKET (STOMP)
const mockPublish = vi.fn();
const mockSubscribe = vi.fn();
const mockDeactivate = vi.fn();

vi.mock('@stomp/stompjs', () => ({
  Client: vi.fn().mockImplementation(function(config) {
    this.activate = vi.fn(() => {
      // Simulamos que la conexión tiene éxito inmediatamente
      if (config.onConnect) config.onConnect();
    });
    this.deactivate = mockDeactivate;
    this.publish = mockPublish;
    this.subscribe = mockSubscribe;
    this.connected = true;
    return this;
  })
}));

// 3. MOCK DEL SCROLL (Vital para evitar que JSDOM colapse)
window.HTMLElement.prototype.scrollIntoView = vi.fn();

describe('Componente ChatComponent', () => {
  const defaultProps = {
    usuarioId: 1,
    destinatarioId: 2,
    nombreDestinatario: 'Coach Carlos',
    fotoDestinatario: null
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Simulamos que la pestaña está activa para la lógica de "leído"
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    document.hasFocus = vi.fn().mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renderiza correctamente y carga el historial vacío', async () => {
    api.get.mockResolvedValueOnce({ data: [] });

    render(<ChatComponent {...defaultProps} />);

    expect(screen.getByText('Coach Carlos')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/api/chat/historial?usuario1=1&usuario2=2');
      expect(screen.getByText('Aún no hay mensajes.')).toBeInTheDocument();
    });
  });

  it('muestra el historial de mensajes al cargar', async () => {
    const mockHistorial = [
      { id: 101, remitenteId: 2, contenido: 'Hola, ¿cómo van las agujetas?', fechaHora: new Date().toISOString(), leido: true },
      { id: 102, remitenteId: 1, contenido: 'Me duele todo 😭', fechaHora: new Date().toISOString(), leido: true }
    ];
    api.get.mockResolvedValueOnce({ data: mockHistorial });

    render(<ChatComponent {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Hola, ¿cómo van las agujetas?')).toBeInTheDocument();
      expect(screen.getByText('Me duele todo 😭')).toBeInTheDocument();
    });
  });

  it('envía un mensaje de texto mediante WebSocket', async () => {
    api.get.mockResolvedValueOnce({ data: [] });

    render(<ChatComponent {...defaultProps} />);

    const input = screen.getByPlaceholderText('Escribe un mensaje...');
    
    // Escribimos el mensaje
    fireEvent.change(input, { target: { value: '¡Listo para entrenar!' } });

    // Encontramos el formulario que envuelve al input y lanzamos el evento submit
    const form = input.closest('form');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockPublish).toHaveBeenCalledWith(expect.objectContaining({
        destination: '/app/chat',
        body: expect.stringContaining('¡Listo para entrenar!')
      }));
    });
    
    // El input debería limpiarse tras el envío
    expect(input.value).toBe('');
  });
  it('ejecuta el saludo automático (autoGreet) si está activado', async () => {
    api.get.mockResolvedValueOnce({ data: [] });
    const mockOnAutoGreetSent = vi.fn();

    render(
      <ChatComponent 
        {...defaultProps} 
        autoGreet={true} 
        greetingMessage="¡Hola! Soy tu nuevo entrenador."
        onAutoGreetSent={mockOnAutoGreetSent}
      />
    );

    // Como el mock de STOMP llama a onConnect inmediatamente, el saludo debería dispararse
    await waitFor(() => {
      expect(mockPublish).toHaveBeenCalledWith(expect.objectContaining({
        destination: '/app/chat',
        body: expect.stringContaining('¡Hola! Soy tu nuevo entrenador.')
      }));
      expect(mockOnAutoGreetSent).toHaveBeenCalled();
    });
  });

  it('maneja la selección y subida de archivos adjuntos', async () => {
    api.get.mockResolvedValueOnce({ data: [] });
    // Simulamos respuesta exitosa de subida de archivo
    api.post.mockResolvedValueOnce({ data: { url: '/uploads/imagen.jpg' } });

    render(<ChatComponent {...defaultProps} />);

    // Encontramos el input file oculto y simulamos adjuntar imagen
    const fileInput = document.querySelector('input[type="file"]');
    const file = new File(['(⌐□_□)'], 'chucknorris.png', { type: 'image/png' });
    
    fireEvent.change(fileInput, { target: { files: [file] } });

    // Verificamos que aparece la vista previa
    await waitFor(() => {
      expect(screen.getByText('chucknorris.png')).toBeInTheDocument();
    });

    // Enviamos el formulario
    const form = screen.getByPlaceholderText('Añade un comentario...').closest('form');
    fireEvent.submit(form);

    await waitFor(() => {
      // 1. Debe subir el archivo primero
      expect(api.post).toHaveBeenCalled();
      
      // 2. Debe publicar en el websocket con la URL devuelta
      expect(mockPublish).toHaveBeenCalledWith(expect.objectContaining({
        destination: '/app/chat',
        body: expect.stringContaining('/uploads/imagen.jpg')
      }));
    });
  });

  it('marca los mensajes recibidos como leídos si la ventana está visible', async () => {
    const mockHistorial = [
      { id: 101, remitenteId: 2, contenido: 'Mensaje nuevo', fechaHora: new Date().toISOString(), leido: false }
    ];
    api.get.mockResolvedValueOnce({ data: mockHistorial });

    render(<ChatComponent {...defaultProps} />);

    await waitFor(() => {
      expect(mockPublish).toHaveBeenCalledWith(expect.objectContaining({
        destination: '/app/chat/leer',
        body: expect.stringContaining(`"remitenteId":2,"destinatarioId":1`)
      }));
    });
  });
});
