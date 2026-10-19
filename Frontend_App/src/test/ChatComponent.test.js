import React from 'react';
import { act, render, waitFor } from '@testing-library/react-native';
import ChatComponent from '../components/functional/ChatComponent';
import { obtenerHistorialChat } from '../api/endpoints';
import { Client } from '@stomp/stompjs';
import { WS_URL } from '../config/environment';

jest.mock('../api/endpoints', () => ({ obtenerHistorialChat: jest.fn(), api: {}, getImageUrl: path => path }));
jest.mock('../components/context/authSession', () => ({ getAccessToken: jest.fn().mockResolvedValue('memory-token') }));
jest.mock('../components/functional/ChatSafetyControls', () => {
    const React = require('react');
    return function Controls({ onStateChange }) { React.useEffect(() => { onStateChange({ blockedByMe: false, canSend: true }); }, [onStateChange]); return null; };
});
jest.mock('lucide-react-native', () => {
    const React = require('react'); const { View } = require('react-native');
    const icon = props => React.createElement(View, props);
    return { Send: icon, Paperclip: icon, CheckCheck: icon, X: icon, Image: icon, Smile: icon, Film: icon };
});
jest.mock('rn-emoji-keyboard', () => () => null);
jest.mock('expo-image-picker', () => ({}));
jest.mock('expo-av', () => ({ Video: () => null, ResizeMode: {} }));
jest.mock('@stomp/stompjs', () => ({ Client: jest.fn() }));
let receive, configurations;
beforeEach(() => {
    jest.clearAllMocks(); configurations = [];
    obtenerHistorialChat.mockResolvedValue([]);
    Client.mockImplementation(config => {
        configurations.push(config);
        return { connected: true, activate: () => config.onConnect(), deactivate: jest.fn(), publish: jest.fn(), subscribe: (_queue, callback) => { receive = callback; } };
    });
});
it('uses the raw websocket endpoint and gets the in-memory token before connect', async () => {
    render(<ChatComponent usuarioId="me" destinatarioId="coach" />);
    await waitFor(() => expect(Client).toHaveBeenCalled());
    expect(WS_URL).toBe('ws://localhost:8080/ws/websocket');
    await configurations[0].beforeConnect();
    expect(Client.mock.results[0].value.connectHeaders.Authorization).toBe('Bearer memory-token');
});
it('does not show a message sent to a different conversation', async () => {
    const view = render(<ChatComponent usuarioId="me" destinatarioId="coach" />);
    await waitFor(() => expect(Client).toHaveBeenCalled());
    act(() => receive({ body: JSON.stringify({ id: 'wrong', remitenteId: 'me', destinatarioId: 'someone-else', contenido: 'Private other conversation', fechaHora: '2026-10-19T10:00:00' }) }));
    expect(view.queryByText('Private other conversation')).toBeNull();
    act(() => receive({ body: JSON.stringify({ id: 'right', remitenteId: 'coach', destinatarioId: 'me', contenido: 'Correct conversation', fechaHora: '2026-10-19T10:00:00', leido: true }) }));
    expect(view.getByText('Correct conversation')).toBeTruthy();
});
it('ignores an old conversation history response after switching contacts', async () => {
    let resolveOld;
    obtenerHistorialChat.mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve; }));
    const view = render(<ChatComponent usuarioId="me" destinatarioId="old-coach" />);
    view.rerender(<ChatComponent usuarioId="me" destinatarioId="new-coach" />);
    await act(async () => resolveOld([{ id: 'old', remitenteId: 'old-coach', destinatarioId: 'me', contenido: 'Stale history', fechaHora: '2026-10-19T10:00:00', leido: true }]));
    expect(view.queryByText('Stale history')).toBeNull();
});
