import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import ChatSafetyControls from '../components/functional/ChatSafetyControls';
import { api } from '../api/endpoints';
jest.mock('../api/endpoints', () => ({ api: { get: jest.fn(), put: jest.fn(), delete: jest.fn(), post: jest.fn() } }));

beforeEach(() => {
    jest.clearAllMocks();
    api.get.mockResolvedValue({ data: { blockedByMe: false, canSend: true } });
});
it('blocks only after confirmation and uses the returned server state', async () => {
    const onStateChange = jest.fn();
    api.put.mockResolvedValue({ data: { blockedByMe: true, canSend: false } });
    const view = render(<ChatSafetyControls otherId="coach" onStateChange={onStateChange} onCloseReport={jest.fn()} />);
    await waitFor(() => expect(onStateChange).toHaveBeenLastCalledWith({ blockedByMe: false, canSend: true }));
    fireEvent.press(view.getByText('Bloquear chat'));
    expect(api.put).not.toHaveBeenCalled();
    fireEvent.press(view.getByText('Confirmar'));
    await waitFor(() => expect(api.put).toHaveBeenCalledWith('/chat/blocks/coach'));
    await waitFor(() => expect(onStateChange).toHaveBeenLastCalledWith({ blockedByMe: true, canSend: false }));
    expect(view.getByText('Desbloquear')).toBeTruthy();
});
it('sends the selected report reason and closes after success', async () => {
    api.post.mockResolvedValue({ status: 202 });
    const onCloseReport = jest.fn();
    const view = render(<ChatSafetyControls otherId="coach" onStateChange={jest.fn()} reportMessageId="received" onCloseReport={onCloseReport} />);
    fireEvent.press(view.getByText('Spam o publicidad'));
    fireEvent.press(view.getByText('Enviar denuncia'));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/chat/messages/received/reports', { reason: 'SPAM' }));
    expect(onCloseReport).toHaveBeenCalled();
});
it('does not enable sending if state loading fails', async () => {
    api.get.mockRejectedValueOnce(new Error('offline'));
    const onStateChange = jest.fn();
    const view = render(<ChatSafetyControls otherId="coach" onStateChange={onStateChange} onCloseReport={jest.fn()} />);
    await waitFor(() => expect(view.getByText('No se pudo comprobar el estado del chat.')).toBeTruthy());
    expect(onStateChange).toHaveBeenLastCalledWith(null);
});
it('keeps the dialog open and reports a failed save', async () => {
    api.post.mockRejectedValueOnce(new Error('offline'));
    const onCloseReport = jest.fn();
    const view = render(<ChatSafetyControls otherId="coach" onStateChange={jest.fn()} reportMessageId="received" onCloseReport={onCloseReport} />);
    fireEvent.press(view.getByText('Enviar denuncia'));
    await waitFor(() => expect(view.getAllByText('No se pudo guardar el cambio. Inténtalo de nuevo.').length).toBeGreaterThan(0));
    expect(onCloseReport).not.toHaveBeenCalled();
});
