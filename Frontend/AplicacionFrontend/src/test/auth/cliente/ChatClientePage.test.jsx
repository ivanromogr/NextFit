import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import ChatClientePage from '../../../pages/cliente/ChatClientePage'; // Ajusta la ruta si es necesario
import { api } from '../../../api/endpoints';
import Stomp from 'stompjs';

const mockObtenerContactosChat = vi.hoisted(() => vi.fn());

// 1. MOCK DE AUTH CONTEXT
const auth = vi.hoisted(() => ({ userId: 'cliente-123' }));
vi.mock('../../../context/AuthContext', () => ({ useAuth: () => auth }));

// 2. MOCK DE ROUTER (useLocation para simular que venimos de otra página)
const mockLocation = { state: null };
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useLocation: () => mockLocation
  };
});

// 3. MOCK DE LA API
vi.mock('../../../api/endpoints', () => ({
  api: { get: vi.fn() },
  obtenerContactosChat: mockObtenerContactosChat
}));

// 4. MOCK DEL COMPONENTE HIJO (ChatComponent)
vi.mock('../../../components/functional/ChatComponent', () => ({
  default: ({ nombreDestinatario, autoGreet, greetingMessage }) => (
    <div data-testid="mock-chat-component" data-greeting={autoGreet ? greetingMessage : ""}>
      Chat activo con: {nombreDestinatario}
      <textarea aria-label="Borrador de prueba" />
    </div>
  )
}));

// 5. MOCK DE WEBSOCKETS (SockJS y Stomp)
vi.mock('sockjs-client', () => {
  return {
    // Usamos una clase vacía para que "new SockJS" funcione a la perfección
    default: class MockSockJS {
      constructor() {}
    }
  };
});

vi.mock('stompjs', () => ({
  default: {
    over: vi.fn().mockReturnValue({
      connect: vi.fn((headers, callback) => callback()), // Simula conexión exitosa al instante
      subscribe: vi.fn(),
      disconnect: vi.fn()
    })
  }
}));

describe('Página ChatClientePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.userId = 'cliente-123';
    api.get.mockReset();
    // Limpiamos la caché simulada
    vi.stubGlobal('sessionStorage', {
      getItem: vi.fn().mockReturnValue(null),
      setItem: vi.fn()
    });
    mockObtenerContactosChat.mockReset().mockResolvedValue([]);
    mockLocation.state = null; // Reseteamos la navegación
  });

  const renderComponent = () => {
    return render(
      <BrowserRouter>
        <ChatClientePage />
      </BrowserRouter>
    );
  };

  const coach = { id: 'coach-1', nombre: 'Coach', apellido: 'Carlos' };
  const friend = { id: 'friend-1', nombre: 'Gym', apellido: 'Amigo', alias: 'Compi' };

  it('ignores malformed local contact JSON and loads the real profile', async () => {
    sessionStorage.getItem.mockReturnValue('{broken');
    api.get.mockResolvedValue({ data: { entrenador: coach } });
    renderComponent();
    expect(await screen.findByText('Coach Carlos')).toBeInTheDocument();
  });

  it.each(['read', 'write'])('continues when browser storage %s is unavailable', async operation => {
    sessionStorage[operation === 'read' ? 'getItem' : 'setItem'].mockImplementation(() => { throw new Error('storage disabled'); });
    api.get.mockResolvedValue({ data: { entrenador: coach } });
    mockObtenerContactosChat.mockResolvedValue([friend]);
    renderComponent();
    expect(await screen.findByText('Compi')).toBeInTheDocument();
    expect(screen.getByText('Coach Carlos')).toBeInTheDocument();
  });

  it('uses available backend contacts when the profile fails and deduplicates the trainer after retry', async () => {
    api.get.mockRejectedValueOnce(new Error('offline')).mockResolvedValue({ data: { entrenador: coach } });
    mockObtenerContactosChat.mockResolvedValue([coach, friend]);
    renderComponent();
    fireEvent.click(await screen.findByText('Coach Carlos'));
    fireEvent.change(screen.getByLabelText('Borrador de prueba'), { target: { value: 'Borrador conservado' } });
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar conversaciones' }));
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
    expect(screen.getAllByText('Coach Carlos')).toHaveLength(1);
    expect(screen.getByLabelText('Borrador de prueba')).toHaveValue('Borrador conservado');
  });

  it('keeps the trainer visible after contact-list failure and recovers contacts on retry', async () => {
    api.get.mockResolvedValue({ data: { entrenador: coach } });
    mockObtenerContactosChat.mockRejectedValueOnce(new Error('offline')).mockResolvedValue([friend]);
    renderComponent();
    expect(await screen.findByText('Coach Carlos')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('No se pudieron cargar todas las conversaciones');
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar conversaciones' }));
    expect(await screen.findByText('Compi')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('does not mark the selected trainer as a new unread conversation', async () => {
    api.get.mockResolvedValue({ data: { entrenador: coach } });
    renderComponent();
    fireEvent.click(await screen.findByText('Coach Carlos'));
    const client = Stomp.over.mock.results.at(-1).value;
    await act(async () => client.subscribe.mock.calls.at(-1)[1]({ body: JSON.stringify({ remitenteId: coach.id, contenido: 'Chat abierto' }) }));
    expect(screen.queryByText('Nuevo mensaje recibido')).not.toBeInTheDocument();
    expect(screen.getAllByText('Coach Carlos')).toHaveLength(1);
    expect(api.get).toHaveBeenCalledTimes(1);
  });

  it('carga y muestra la lista de contactos inicial (Entrenador + Amigos)', async () => {
    // Simulamos la respuesta del perfil del cliente (para sacar a su entrenador)
    api.get.mockImplementation((url) => {
      if (url.includes('/api/clientes/cliente-123')) {
        return Promise.resolve({
          data: { entrenador: { id: 'coach-1', nombre: 'Coach', apellido: 'Carlos' } }
        });
      }
      return Promise.resolve({ data: [] });
    });
    mockObtenerContactosChat.mockResolvedValueOnce([
      { id: 'amigo-1', nombre: 'Gym', apellido: 'Bro', alias: 'Mi Bro' }
    ]);

    renderComponent();

    // Verificamos que aparece el mensaje por defecto del chat vacío
    expect(screen.getByText('Comunidad NextFit')).toBeInTheDocument();

    // Verificamos que la barra lateral cargó al entrenador y al amigo
    await waitFor(() => {
      expect(screen.getByText(/Coach Carlos/i)).toBeInTheDocument();
      expect(screen.getByText(/Mi Bro/i)).toBeInTheDocument();
    });
  });

  it('abre el ChatComponent al hacer clic en un contacto', async () => {
    api.get.mockImplementation((url) => {
      if (url.includes('/api/clientes/cliente-123')) {
        return Promise.resolve({
          data: { entrenador: { id: 'coach-1', nombre: 'Coach', apellido: 'Carlos' } }
        });
      }
      return Promise.resolve({ data: [] });
    });

    renderComponent();

    // Esperamos a que cargue el entrenador en la lista
    const contacto = await screen.findByText(/Coach Carlos/i);
    
    // Hacemos clic en el contacto
    fireEvent.click(contacto);

    // Verificamos que el ChatComponent (nuestro mock) se renderiza con el nombre correcto
    await waitFor(() => {
      expect(screen.getByTestId('mock-chat-component')).toBeInTheDocument();
      expect(screen.getByText('Chat activo con: Coach Carlos')).toBeInTheDocument();
    });
  });

 it('permite buscar y añadir un nuevo amigo mediante su email', async () => {
    api.get.mockResolvedValue({ data: [] }); // Inicialmente sin amigos

    renderComponent();

    // 1. Encontramos el icono Plus usando la clase estándar de lucide-react
    const addIcon = document.querySelector('.lucide-plus');
    
    // Hacemos click en el icono (su contenedor clickeable)
    fireEvent.click(addIcon);

    // 2. Verificamos que se abre el modal
    await waitFor(() => {
      expect(screen.getByText('Añadir nuevo contacto')).toBeInTheDocument();
    });

    // 3. Escribimos el email y buscamos
    const emailInput = screen.getByPlaceholderText('usuario@email.com');
    fireEvent.change(emailInput, { target: { value: 'nuevo@gym.com' } });

    // Preparamos la API para que devuelva al usuario cuando lo busquemos
    api.get.mockResolvedValueOnce({
      data: { id: 'nuevo-1', nombre: 'Nuevo', apellido: 'Usuario' }
    });

    const searchBtn = screen.getByText('Buscar usuario');
    fireEvent.click(searchBtn);

    // 4. Verificamos que lo encontró y nos pide confirmación/alias
    await waitFor(() => {
      expect(screen.getByText('¡Usuario encontrado!')).toBeInTheDocument();
    });

    const aliasInput = screen.getByPlaceholderText('Ej: Juan Gym');
    fireEvent.change(aliasInput, { target: { value: 'Compi de Press' } });

    // 5. Guardamos en contactos
    const saveBtn = screen.getByText(/Guardar en contactos/i);
    fireEvent.click(saveBtn);

    // 6. Verificamos que ahora aparece en la lista de la barra lateral
    await waitFor(() => {
      expect(screen.getByText('Compi de Press')).toBeInTheDocument();
    });
  });

  it('abre el chat automáticamente si venimos redirigidos (openChatWith)', async () => {
    // Simulamos que el router nos pasa el estado { openChatWith: 'entrenador-5' }
    mockLocation.state = { openChatWith: 'entrenador-5' };

    // Preparamos la respuesta de la API cuando el useEffect intente buscar al entrenador
    api.get.mockImplementation((url) => {
      if (url.includes('/api/entrenador/entrenador-5')) {
        return Promise.resolve({
          data: { id: 'entrenador-5', nombre: 'Entrenador', apellido: 'Redirigido' }
        });
      }
      return Promise.resolve({ data: [] });
    });

    renderComponent();

    // Verificamos que el chat se abre automáticamente sin que el usuario haga clic
    await waitFor(() => {
      expect(screen.getByTestId('mock-chat-component')).toBeInTheDocument();
      expect(screen.getByText('Chat activo con: Entrenador Redirigido')).toBeInTheDocument();
    });
  });

  it('ignores a late external contact after a newer navigation', async () => {
    let finishOld;
    mockLocation.state = { openChatWith: 'old-coach', autoGreet: true, greetingMessage: 'Saludo anterior' };
    api.get.mockImplementation(url => url === '/api/entrenador/old-coach'
      ? new Promise(resolve => { finishOld = resolve; })
      : Promise.resolve({ data: url === '/api/entrenador/new-coach'
        ? { id: 'new-coach', nombre: 'Nuevo', apellido: 'Coach' } : { entrenador: coach } }));
    const view = renderComponent();
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/api/entrenador/old-coach'));
    mockLocation.state = { openChatWith: 'new-coach', autoGreet: true, greetingMessage: 'Saludo actual' };
    view.rerender(<BrowserRouter><ChatClientePage /></BrowserRouter>);
    await screen.findByText('Chat activo con: Nuevo Coach');
    await act(async () => finishOld({ data: { id: 'old-coach', nombre: 'Anterior', apellido: 'Coach' } }));
    expect(screen.getByTestId('mock-chat-component')).toHaveAttribute('data-greeting', 'Saludo actual');
    expect(screen.queryByText('Chat activo con: Anterior Coach')).not.toBeInTheDocument();
  });
  it('does not replace an explicitly selected conversation with a delayed external contact', async () => {
    let finishExternal;
    mockLocation.state = { openChatWith: 'external-coach', autoGreet: true };
    api.get.mockImplementation(url => url === '/api/entrenador/external-coach'
      ? new Promise(resolve => { finishExternal = resolve; }) : Promise.resolve({ data: { entrenador: coach } }));
    mockObtenerContactosChat.mockResolvedValue([friend]);
    renderComponent();
    fireEvent.click(await screen.findByText('Compi'));
    await act(async () => finishExternal({ data: { id: 'external-coach', nombre: 'Externo', apellido: 'Coach' } }));
    expect(screen.getByText('Chat activo con: Compi')).toBeInTheDocument();
    expect(screen.getByTestId('mock-chat-component')).toHaveAttribute('data-greeting', '');
  });
  it('does not transfer the requested greeting to a manually selected contact', async () => {
    mockLocation.state = { openChatWith: 'external-coach', autoGreet: true, greetingMessage: 'Saludo privado' };
    api.get.mockImplementation(url => Promise.resolve({ data: url === '/api/entrenador/external-coach'
      ? { id: 'external-coach', nombre: 'Externo', apellido: 'Coach' } : { entrenador: coach } }));
    mockObtenerContactosChat.mockResolvedValue([friend]);
    renderComponent();
    await screen.findByText('Chat activo con: Externo Coach');
    expect(screen.getByTestId('mock-chat-component')).toHaveAttribute('data-greeting', 'Saludo privado');
    fireEvent.click(await screen.findByText('Compi'));
    expect(screen.getByTestId('mock-chat-component')).toHaveAttribute('data-greeting', '');
  });
  it('does not copy cached contacts from the previous account into the new cache', async () => {
    sessionStorage.getItem.mockImplementation(key => key === 'contactos_chat_cliente-123' ? JSON.stringify([friend]) : null);
    api.get.mockResolvedValue({ data: { entrenador: null } });
    const view = renderComponent();
    fireEvent.click(await screen.findByText('Compi'));
    auth.userId = 'new-client';
    view.rerender(<BrowserRouter><ChatClientePage /></BrowserRouter>);
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/api/clientes/new-client'));
    expect(screen.queryByText('Compi')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mock-chat-component')).not.toBeInTheDocument();
    expect(sessionStorage.setItem.mock.calls.filter(([key]) => key === 'contactos_chat_new-client')).toHaveLength(0);
  });
});
