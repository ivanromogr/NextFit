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
    post: vi.fn(), put: vi.fn(), delete: vi.fn()
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

const mockHistory = data => api.get.mockImplementation(url => Promise.resolve({ data: url.includes('/safety/') ? { blockedByMe: false, canSend: true } : data }));

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
    api.get.mockReset(); api.post.mockReset(); api.put.mockReset(); api.delete.mockReset();
    api.get.mockImplementation(url => Promise.resolve({ data: url.includes('/safety/') ? { blockedByMe: false, canSend: true } : [] }));
    HTMLDialogElement.prototype.showModal = function() { this.setAttribute('open', ''); };
    HTMLDialogElement.prototype.close = function() { this.removeAttribute('open'); };
    // Simulamos que la pestaña está activa para la lógica de "leído"
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    document.hasFocus = vi.fn().mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renderiza correctamente y carga el historial vacío', async () => {
    mockHistory([]);

    render(<ChatComponent {...defaultProps} />);

    expect(screen.getByText('Coach Carlos')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/api/chat/historial?otroUsuarioId=2');
      expect(screen.getByText('Aún no hay mensajes.')).toBeInTheDocument();
    });
  });

  it('muestra el historial de mensajes al cargar', async () => {
    const mockHistorial = [
      { id: 101, remitenteId: 2, destinatarioId: 1, contenido: 'Hola, ¿cómo van las agujetas?', fechaHora: new Date().toISOString(), leido: true },
      { id: 102, remitenteId: 1, destinatarioId: 2, contenido: 'Me duele todo 😭', fechaHora: new Date().toISOString(), leido: true }
    ];
    mockHistory(mockHistorial);

    render(<ChatComponent {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Hola, ¿cómo van las agujetas?')).toBeInTheDocument();
      expect(screen.getByText('Me duele todo 😭')).toBeInTheDocument();
    });
  });

  it('envía un mensaje de texto mediante WebSocket', async () => {
    mockHistory([]);

    render(<ChatComponent {...defaultProps} />);

    const input = screen.getByPlaceholderText('Escribe un mensaje...');
    
    await waitFor(() => expect(input).not.toBeDisabled());
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
    mockHistory([]);
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
    mockHistory([]);
    // Simulamos respuesta exitosa de subida de archivo
    api.post.mockResolvedValueOnce({ data: { id: '11111111-1111-1111-1111-111111111111', url: '/api/upload/files/11111111-1111-1111-1111-111111111111' } });

    render(<ChatComponent {...defaultProps} />);

    // Encontramos el input file oculto y simulamos adjuntar imagen
    const fileInput = document.querySelector('input[type="file"]');
    const file = new File(['(⌐□_□)'], 'chucknorris.png', { type: 'image/png' });
    
    fireEvent.change(fileInput, { target: { files: [file] } });

    // Verificamos que aparece la vista previa
    await waitFor(() => {
      expect(screen.getByText('chucknorris.png')).toBeInTheDocument();
    });

    await waitFor(() => expect(screen.getByPlaceholderText('Añade un comentario...')).not.toBeDisabled());
    // Enviamos el formulario
    const form = screen.getByPlaceholderText('Añade un comentario...').closest('form');
    fireEvent.submit(form);

    await waitFor(() => {
      // 1. Debe subir el archivo primero
      expect(api.post).toHaveBeenCalled();
      
      // 2. Debe publicar sólo el ID opaco del adjunto
      expect(mockPublish).toHaveBeenCalledWith(expect.objectContaining({
        destination: '/app/chat',
        body: expect.stringContaining('"attachmentId":"11111111-1111-1111-1111-111111111111"')
      }));
    });
  });

  it.each([
    [503, 'No se pudo subir la imagen. Conservamos el adjunto y tu comentario para que puedas reintentarlo.'],
    [413, 'La imagen supera el tamaño permitido. Elige una imagen más pequeña.'],
    [415, 'Formato no admitido. Selecciona una imagen JPEG, PNG o WebP.'],
    [400, 'Formato no admitido. Selecciona una imagen JPEG, PNG o WebP.', 'UNSUPPORTED_FILE_TYPE'],
  ])('shows upload failure %s and preserves the draft for a successful retry', async (status, message, code) => {
    api.post.mockRejectedValueOnce({ response: { status, data: { code } } })
      .mockResolvedValueOnce({ data: { id: 'retry-attachment' } });
    render(<ChatComponent {...defaultProps} />);
    await waitFor(() => expect(screen.getByPlaceholderText('Escribe un mensaje...')).not.toBeDisabled());
    fireEvent.change(document.querySelector('input[type="file"]'), {
      target: { files: [new File(['image'], 'draft.png', { type: 'image/png' })] }
    });
    const comment = screen.getByPlaceholderText('Añade un comentario...');
    fireEvent.change(comment, { target: { value: 'Comentario que quiero conservar' } });
    fireEvent.submit(comment.closest('form'));
    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(comment).toHaveValue('Comentario que quiero conservar');
    expect(screen.getByText('draft.png')).toBeInTheDocument();
    expect(mockPublish).not.toHaveBeenCalled();
    fireEvent.submit(comment.closest('form'));
    await waitFor(() => expect(mockPublish).toHaveBeenCalledWith(expect.objectContaining({
      destination: '/app/chat',
      body: expect.stringContaining('"attachmentId":"retry-attachment"')
    })));
    expect(api.post).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText('Escribe un mensaje...')).toHaveValue('');
  });

  it.each(['success', 'failure'])('ignores upload %s after switching to another conversation', async outcome => {
    let resolveUpload, rejectUpload;
    api.post.mockImplementationOnce(() => new Promise((resolve, reject) => {
      resolveUpload = resolve; rejectUpload = reject;
    }));
    const { rerender } = render(<ChatComponent {...defaultProps} />);
    await waitFor(() => expect(screen.getByPlaceholderText('Escribe un mensaje...')).not.toBeDisabled());
    fireEvent.change(document.querySelector('input[type="file"]'), {
      target: { files: [new File(['image'], 'old.png', { type: 'image/png' })] }
    });
    fireEvent.submit(screen.getByPlaceholderText('Añade un comentario...').closest('form'));
    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));
    rerender(<ChatComponent {...defaultProps} destinatarioId={3} nombreDestinatario="Otro contacto" />);
    const input = screen.getByPlaceholderText('Escribe un mensaje...');
    await waitFor(() => expect(input).not.toBeDisabled());
    fireEvent.change(input, { target: { value: 'Borrador de otra conversación' } });
    const { act } = await import('@testing-library/react');
    await act(async () => {
      if (outcome === 'success') resolveUpload({ data: { id: 'old-attachment' } });
      else rejectUpload({ response: { status: 503 } });
    });
    expect(input).toHaveValue('Borrador de otra conversación');
    expect(input).not.toBeDisabled();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(mockPublish).not.toHaveBeenCalled();
  });

  it('marca los mensajes recibidos como leídos si la ventana está visible', async () => {
    const mockHistorial = [
      { id: 101, remitenteId: 2, destinatarioId: 1, contenido: 'Mensaje nuevo', fechaHora: new Date().toISOString(), leido: false }
    ];
    mockHistory(mockHistorial);

    render(<ChatComponent {...defaultProps} />);

    await waitFor(() => {
      expect(mockPublish).toHaveBeenCalledWith(expect.objectContaining({
        destination: '/app/chat/leer',
        body: expect.stringContaining(`"remitenteId":2`)
      }));
    });
  });
  it('does not mix outgoing messages addressed to another conversation', async () => {
    render(<ChatComponent {...defaultProps} />);
    await waitFor(() => expect(mockSubscribe).toHaveBeenCalled());
    const receive = mockSubscribe.mock.calls[0][1];
    const { act } = await import('@testing-library/react');
    act(() => receive({ body: JSON.stringify({ id: 999, remitenteId: 1, destinatarioId: 3, contenido: 'Different conversation', fechaHora: new Date().toISOString() }) }));
    expect(screen.queryByText('Different conversation')).not.toBeInTheDocument();
  });

  it('blocks, disables sending, and unblocks only after server confirmation', async () => {
    api.put.mockResolvedValue({ data: { blockedByMe: true, canSend: false } });
    api.delete.mockResolvedValue({ data: { blockedByMe: false, canSend: true } });
    render(<ChatComponent {...defaultProps} />);
    const block = screen.getByRole('button', { name: 'Bloquear chat' });
    await waitFor(() => expect(block).not.toBeDisabled());
    fireEvent.click(block);
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    await waitFor(() => expect(api.put).toHaveBeenCalledWith('/api/chat/blocks/2'));
    await waitFor(() => expect(screen.getByPlaceholderText('Escribe un mensaje...')).toBeDisabled());
    fireEvent.click(screen.getByRole('button', { name: 'Desbloquear' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    await waitFor(() => expect(api.delete).toHaveBeenCalledWith('/api/chat/blocks/2'));
    await waitFor(() => expect(screen.getByPlaceholderText('Escribe un mensaje...')).not.toBeDisabled());
  });

  it('reports a received message with the selected reason', async () => {
    mockHistory([{ id: 101, remitenteId: 2, destinatarioId: 1, contenido: 'Received', fechaHora: new Date().toISOString(), leido: true }]);
    api.post.mockResolvedValue({ status: 202 });
    render(<ChatComponent {...defaultProps} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Denunciar mensaje' }));
    fireEvent.change(screen.getByLabelText('Motivo'), { target: { value: 'SPAM' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar denuncia' }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/api/chat/messages/101/reports', { reason: 'SPAM' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Denuncia registrada');
  });

  it('keeps sending disabled if safety state cannot be loaded', async () => {
    api.get.mockImplementation(url => url.includes('/safety/') ? Promise.reject(new Error('offline')) : Promise.resolve({ data: [] }));
    render(<ChatComponent {...defaultProps} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo comprobar');
    expect(screen.getByPlaceholderText('Escribe un mensaje...')).toBeDisabled();
  });

  it('ignores a delayed history response from the previously selected contact', async () => {
    let resolveOld;
    api.get.mockImplementation(url => {
      if (url.includes('/safety/')) return Promise.resolve({ data: { blockedByMe: false, canSend: true } });
      if (url.endsWith('=2')) return new Promise(resolve => { resolveOld = resolve; });
      return Promise.resolve({ data: [] });
    });
    const { rerender } = render(<ChatComponent {...defaultProps} />);
    rerender(<ChatComponent {...defaultProps} destinatarioId={3} />);
    const { act } = await import('@testing-library/react');
    await act(async () => resolveOld({ data: [{ id: 999, remitenteId: 2, destinatarioId: 1, contenido: 'Old conversation history', fechaHora: new Date().toISOString(), leido: true }] }));
    expect(screen.queryByText('Old conversation history')).not.toBeInTheDocument();
  });

  it('shows a server rejection without inserting it as a chat message', async () => {
    render(<ChatComponent {...defaultProps} />);
    await waitFor(() => expect(mockSubscribe).toHaveBeenCalled());
    const receive = mockSubscribe.mock.calls[0][1];
    const { act } = await import('@testing-library/react');
    act(() => receive({ body: JSON.stringify({ type: 'CHAT_ERROR', message: 'No se pueden enviar mensajes en esta conversación' }) }));
    expect(screen.getByRole('alert')).toHaveTextContent('No se pueden enviar mensajes');
    expect(screen.getByText('Aún no hay mensajes.')).toBeInTheDocument();
  });

  it('does not send an automatic greeting before learning the conversation already has messages', async () => {
    let resolveHistory;
    api.get.mockImplementation(url => url.includes('/safety/')
      ? Promise.resolve({ data: { blockedByMe: false, canSend: true } })
      : new Promise(resolve => { resolveHistory = resolve; }));
    render(<ChatComponent {...defaultProps} autoGreet greetingMessage="Automatic greeting" />);
    await waitFor(() => expect(screen.getByPlaceholderText('Escribe un mensaje...')).not.toBeDisabled());
    expect(mockPublish).not.toHaveBeenCalled();
    const { act } = await import('@testing-library/react');
    await act(async () => resolveHistory({ data: [{ id: 101, remitenteId: 2, destinatarioId: 1, contenido: 'Existing message', fechaHora: new Date().toISOString(), leido: true }] }));
    expect(screen.getByText('Existing message')).toBeInTheDocument();
    expect(mockPublish).not.toHaveBeenCalled();
  });

});
