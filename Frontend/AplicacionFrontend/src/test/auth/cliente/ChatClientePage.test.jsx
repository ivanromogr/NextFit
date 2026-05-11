import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import ChatClientePage from '../../../pages/cliente/ChatClientePage'; // Ajusta la ruta si es necesario
import { api } from '../../../api/endpoints';

const mockObtenerContactosChat = vi.hoisted(() => vi.fn());

// 1. MOCK DE AUTH CONTEXT
vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ userId: 'cliente-123' })
}));

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
// Así evitamos cargar toda la lógica de subir archivos y websockets del hijo de nuevo
vi.mock('../../../components/functional/ChatComponent', () => ({
  default: ({ nombreDestinatario }) => (
    <div data-testid="mock-chat-component">
      Chat activo con: {nombreDestinatario}
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
    // Limpiamos la caché simulada
    vi.stubGlobal('sessionStorage', {
      getItem: vi.fn().mockReturnValue(null),
      setItem: vi.fn()
    });
    mockObtenerContactosChat.mockResolvedValue([]);
    mockLocation.state = null; // Reseteamos la navegación
  });

  const renderComponent = () => {
    render(
      <BrowserRouter>
        <ChatClientePage />
      </BrowserRouter>
    );
  };

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
});
