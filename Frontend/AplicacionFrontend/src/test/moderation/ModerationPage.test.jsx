import '@testing-library/jest-dom';
import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ModerationPage from '../../pages/moderation/ModerationPage';
import ModerationEntry from '../../components/account/ModerationEntry';
import { api } from '../../api/endpoints';
vi.mock('../../api/endpoints', () => ({ api: { get: vi.fn(), post: vi.fn() } }));
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ userId: 'operator', role: 'CLIENTE' }) }));
const item = { reporterId: 'reporter', messageId: 'message', reason: 'SPAM', status: 'PENDING', createdAt: '2026-10-19T09:00:00Z' };
const detail = { ...item, version: 0, evidence: { senderName: 'Reported Person', content: '<img src=x onerror=alert(1)>', sentAt: '2026-10-19T08:00:00', hasAttachment: false }, restricted: false, canLiftRestriction: false, audit: [] };
const resolved = { ...detail, status: 'CONFIRMED', version: 1, restricted: true, canLiftRestriction: true, audit: [{ id: 'audit', operatorId: 'operator-uuid', action: 'RESTRICT_CHAT', note: 'Reviewed spam evidence.', createdAt: '2026-10-19T10:00:00Z' }] };
beforeEach(() => {
    vi.resetAllMocks();
    HTMLDialogElement.prototype.showModal = function() { this.setAttribute('open', ''); };
    HTMLDialogElement.prototype.close = function() { this.removeAttribute('open'); };
    api.get.mockImplementation(url => Promise.resolve({ data: url.endsWith('/access') ? { allowed: true } : url.endsWith('/reports') ? { items: [item], page: 0, totalPages: 1, totalElements: 1 } : detail }));
    api.post.mockResolvedValue({ data: resolved });
});
const show = () => render(<BrowserRouter><ModerationPage /></BrowserRouter>);
const openReport = async () => { fireEvent.click(await screen.findByRole('button', { name: /Spam o publicidad.*Pendiente/ })); await screen.findByText('Reported Person', { exact: false }); };

describe('Moderation panel', () => {
    it('denies normal accounts without requesting the report queue', async () => {
        api.get.mockResolvedValue({ data: { allowed: false } });
        show();
        expect(await screen.findByText('Acceso restringido')).toBeInTheDocument();
        expect(api.get).toHaveBeenCalledTimes(1);
    });
    it('renders reported text safely and requires a note before confirming a decision', async () => {
        show(); await openReport();
        expect(screen.getByText(detail.evidence.content)).toBeInTheDocument();
        expect(document.querySelector('img')).toBeNull();
        expect(screen.getByRole('button', { name: 'Revisar y confirmar' })).toBeDisabled();
        fireEvent.change(screen.getByLabelText('Acción'), { target: { value: 'RESTRICT_CHAT' } });
        fireEvent.change(screen.getByLabelText('Motivo de la decisión'), { target: { value: 'Reviewed spam evidence.' } });
        fireEvent.click(screen.getByRole('button', { name: 'Revisar y confirmar' }));
        expect(api.post).not.toHaveBeenCalled();
        fireEvent.click(screen.getByRole('button', { name: 'Confirmar decisión', exact: true }));
        await waitFor(() => expect(api.post).toHaveBeenCalledWith('/api/moderation/reports/reporter/message/decisions', { action: 'RESTRICT_CHAT', note: 'Reviewed spam evidence.', expectedVersion: 0 }));
        expect(await screen.findByText('Decisión registrada.')).toBeInTheDocument();
        expect(screen.getByText('Reviewed spam evidence.')).toBeInTheDocument();
    });
    it('cancels without persisting a decision', async () => {
        show(); await openReport();
        fireEvent.change(screen.getByLabelText('Motivo de la decisión'), { target: { value: 'No violation.' } });
        fireEvent.click(screen.getByRole('button', { name: 'Revisar y confirmar' }));
        fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
        expect(api.post).not.toHaveBeenCalled();
    });
    it('shows concurrency conflicts without claiming the decision succeeded', async () => {
        api.post.mockRejectedValue({ response: { status: 409 } });
        show(); await openReport();
        fireEvent.change(screen.getByLabelText('Motivo de la decisión'), { target: { value: 'Evidence checked.' } });
        fireEvent.click(screen.getByRole('button', { name: 'Revisar y confirmar' }));
        fireEvent.click(screen.getByRole('button', { name: 'Confirmar decisión', exact: true }));
        expect(await screen.findByRole('alert')).toHaveTextContent('Otra decisión ha cambiado');
        expect(screen.queryByText('Decisión registrada.')).not.toBeInTheDocument();
    });
    it('clears report information if operator authorization is revoked', async () => {
        const normalGet = api.get.getMockImplementation();
        api.get.mockImplementation((url, options) => url.endsWith('/message') ? Promise.reject({ response: { status: 403 } }) : normalGet(url, options));
        show();
        fireEvent.click(await screen.findByRole('button', { name: /Spam o publicidad.*Pendiente/ }));
        expect(await screen.findByText('Acceso restringido')).toBeInTheDocument();
        expect(screen.queryByText('Spam o publicidad')).not.toBeInTheDocument();
    });
    it('uses the current version and reversal action when lifting a restriction', async () => {
        const normalGet = api.get.getMockImplementation();
        api.get.mockImplementation((url, options) => url.endsWith('/message') ? Promise.resolve({ data: resolved }) : normalGet(url, options));
        show(); await openReport();
        fireEvent.change(screen.getByLabelText('Motivo de la decisión'), { target: { value: 'Restriction reviewed and lifted.' } });
        fireEvent.submit(screen.getByLabelText('Motivo de la decisión').closest('form'));
        fireEvent.click(screen.getByRole('button', { name: 'Confirmar decisión', exact: true }));
        await waitFor(() => expect(api.post).toHaveBeenCalledWith(expect.any(String), { action: 'LIFT_RESTRICTION', note: 'Restriction reviewed and lifted.', expectedVersion: 1 }));
    });
    it('does not show delayed evidence from a previous selection', async () => {
        let resolveOld;
        const second = { ...item, reporterId: 'reporter-2', messageId: 'message-2', reason: 'OTHER' };
        api.get.mockImplementation(url => {
            if (url.endsWith('/access')) return Promise.resolve({ data: { allowed: true } });
            if (url.endsWith('/reports')) return Promise.resolve({ data: { items: [item, second], totalPages: 1, totalElements: 2 } });
            if (url.endsWith('/message')) return new Promise(resolve => { resolveOld = resolve; });
            return Promise.resolve({ data: { ...detail, ...second, evidence: { ...detail.evidence, content: 'Current selection' } } });
        });
        show();
        fireEvent.click(await screen.findByRole('button', { name: /Spam o publicidad.*Pendiente/ }));
        fireEvent.click(screen.getByRole('button', { name: /Otro motivo.*Pendiente/ }));
        await screen.findByText('Current selection');
        await act(async () => resolveOld({ data: detail }));
        expect(screen.queryByText(detail.evidence.content)).not.toBeInTheDocument();
    });
});
it('shows the moderation link only after the server grants access', async () => {
    render(<BrowserRouter><ModerationEntry /></BrowserRouter>);
    expect(screen.queryByRole('link', { name: /Moderación/ })).not.toBeInTheDocument();
    expect(await screen.findByRole('link', { name: /Moderación/ })).toHaveAttribute('href', '/moderacion');
});
it('hides the moderation entry from unprivileged accounts', async () => {
    api.get.mockResolvedValue({ data: { allowed: false } });
    render(<BrowserRouter><ModerationEntry /></BrowserRouter>);
    await waitFor(() => expect(api.get).toHaveBeenCalled());
    expect(screen.queryByRole('link', { name: /Moderación/ })).not.toBeInTheDocument();
});
