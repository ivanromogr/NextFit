import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import ChatPage from '../../../pages/entrenador/ChatPage'; // Ajusta la ruta si es necesario
import * as endpoints from '../../../api/endpoints';

// 1. MOCK DE API
vi.mock('../../../api/endpoints', () => ({
    obtenerClientesEntrenador: vi.fn(),
    getCliente: vi.fn()
}));

// 2. MOCK DE CONTEXTO
vi.mock('../../../context/AuthContext', () => ({
    useAuth: () => ({ userId: 'entrenador-boss' })
}));

// 3. MOCK DE ICONOS LUCIDE
vi.mock('lucide-react', async () => {
    const actual = await vi.importActual('lucide-react');
    return {
        ...actual,
        Search: () => <span data-testid="icon-search" />,
        MessageSquare: () => <span data-testid="icon-message" />,
        User: () => <span data-testid="icon-user" />,
        Edit: () => <span data-testid="icon-edit" />
    };
});

// 4. MOCK DEL COMPONENTE HIJO (CHATCOMPONENT)
// No queremos testear el chat interno aquí, solo la lista y la selección.
vi.mock('../../../components/functional/ChatComponent', () => {
    return {
        default: ({ nombreDestinatario }) => (
            <div data-testid="mock-chat-component">
                Chat abierto con: {nombreDestinatario}
            </div>
        )
    };
});

// 5. 🎯 MOCK DE WEBSOCKETS (STOMP y SOCKJS)
// Simulamos el cliente STOMP para poder "disparar" mensajes falsos en los tests
let mockStompSubscribeCallback = null;

const mockStompClient = {
    debug: null,
    connect: vi.fn((headers, callback) => {
        // Simulamos que se conecta instantáneamente
        callback();
    }),
    subscribe: vi.fn((topic, callback) => {
        // Guardamos el callback para poder fingir que llega un mensaje
        mockStompSubscribeCallback = callback;
    }),
    disconnect: vi.fn()
};

vi.mock('sockjs-client', () => {
    return { default: vi.fn() };
});

vi.mock('stompjs', () => {
    return {
        default: {
            over: vi.fn(() => mockStompClient)
        }
    };
});

describe('Página ChatPage', () => {
    const mockClientes = [
        { id: '1', nombre: 'Juan', apellido: 'Pérez', fotoPerfil: null },
        { id: '2', nombre: 'María', apellido: 'Gómez', fotoPerfil: 'foto.jpg' },
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        mockStompSubscribeCallback = null;
    });

    const renderComponent = () => {
        render(<BrowserRouter><ChatPage /></BrowserRouter>);
    };

    it('carga la lista de clientes y muestra el estado vacío del chat', async () => {
        endpoints.obtenerClientesEntrenador.mockResolvedValue(mockClientes);
        renderComponent();

        // Esperamos a que los clientes se carguen
        expect(await screen.findByText('Juan Pérez')).toBeInTheDocument();
        expect(screen.getByText('María Gómez')).toBeInTheDocument();

        // Como no hay ninguno seleccionado, debería verse el estado vacío
        expect(screen.getByText('Tus Conversaciones')).toBeInTheDocument();
        expect(screen.getByText('Selecciona un atleta en el panel para comenzar.')).toBeInTheDocument();
    });

    it('filtra los clientes al usar el buscador', async () => {
        endpoints.obtenerClientesEntrenador.mockResolvedValue(mockClientes);
        renderComponent();

        expect(await screen.findByText('Juan Pérez')).toBeInTheDocument();

        // Escribimos en el buscador
        const searchInput = screen.getByPlaceholderText('Buscar conversación...');
        fireEvent.change(searchInput, { target: { value: 'María' } });

        // Verificamos que María sigue estando, pero Juan ha desaparecido
        expect(screen.getByText('María Gómez')).toBeInTheDocument();
        expect(screen.queryByText('Juan Pérez')).not.toBeInTheDocument();
    });

    it('abre el chat correspondiente al hacer click en un cliente', async () => {
        endpoints.obtenerClientesEntrenador.mockResolvedValue(mockClientes);
        renderComponent();

        // Esperamos a que aparezcan los clientes
        const juanItem = await screen.findByText('Juan Pérez');
        
        // Hacemos click en el contenedor del cliente
        fireEvent.click(juanItem.closest('div'));

        // El componente vacío debería desaparecer
        expect(screen.queryByText('Tus Conversaciones')).not.toBeInTheDocument();
        
        // Debería aparecer nuestro mock del ChatComponent
        expect(screen.getByTestId('mock-chat-component')).toBeInTheDocument();
        expect(screen.getByText('Chat abierto con: Juan Pérez')).toBeInTheDocument();
    });

    it('recibe un mensaje por WebSocket y actualiza la UI', async () => {
        endpoints.obtenerClientesEntrenador.mockResolvedValue(mockClientes);
        renderComponent();
        
        // Esperamos a que cargue la lista base
        expect(await screen.findByText('Juan Pérez')).toBeInTheDocument();

        // Simulamos que el WebSocket recibe un mensaje de Juan (id: '1')
        const mockPayload = {
            body: JSON.stringify({ remitenteId: '1', contenido: 'Hola coach' })
        };

        // Disparamos el mensaje manualmente
        await waitFor(() => {
            if (mockStompSubscribeCallback) {
                mockStompSubscribeCallback(mockPayload);
            }
        });

        // Juan ahora debería tener la notificación activa
        expect(await screen.findByText('Nuevo mensaje recibido')).toBeInTheDocument();
    });
});