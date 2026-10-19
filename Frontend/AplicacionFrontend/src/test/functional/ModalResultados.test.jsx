import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ModalResultados from '../../components/functional/ModalResultados';
import { obtenerDetalleSesion } from '../../api/endpoints';

vi.mock('../../api/endpoints', () => ({ obtenerDetalleSesion: vi.fn() }));
const session = (notas) => ({ fecha: '2026-10-01T12:00:00', duracion: 1200, volumenTotal: 400, notas, ejercicios: [{ nombre: 'Sentadilla', series: [{ kilos: 40, repes: 10, rpe: 8 }] }] });
beforeEach(() => vi.resetAllMocks());

describe('Resumen del evento del calendario', () => {
  it('consulta el evento seleccionado directamente y muestra su sesión', async () => {
    obtenerDetalleSesion.mockResolvedValue(session('Sesión del día seleccionado'));
    render(<ModalResultados eventoId="evento-anterior" onClose={vi.fn()} />);
    expect(await screen.findByText(/Sesión del día seleccionado/)).toBeInTheDocument();
    expect(obtenerDetalleSesion).toHaveBeenCalledWith('evento-anterior');
    expect(obtenerDetalleSesion).toHaveBeenCalledTimes(1);
    expect(screen.getByText('40 kg')).toBeInTheDocument();
  });

  it('ofrece reintento ante un fallo y no lo confunde con ausencia de sesión', async () => {
    obtenerDetalleSesion.mockRejectedValueOnce(new Error('private details')).mockResolvedValueOnce(session('Recuperada'));
    render(<ModalResultados eventoId="evento" onClose={vi.fn()} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('No se ha podido cargar');
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText(/Recuperada/)).toBeInTheDocument();
  });

  it('explica que un evento sin registro no tiene resultados', async () => {
    obtenerDetalleSesion.mockRejectedValue({ response: { status: 404 } });
    render(<ModalResultados eventoId="evento" onClose={vi.fn()} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('todavía no tiene una sesión registrada');
  });

  it('ignora una respuesta anterior cuando se selecciona otro evento', async () => {
    let resolveOld;
    obtenerDetalleSesion.mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve; }));
    obtenerDetalleSesion.mockResolvedValueOnce(session('Evento nuevo'));
    const view = render(<ModalResultados eventoId="anterior" onClose={vi.fn()} />);
    view.rerender(<ModalResultados eventoId="nuevo" onClose={vi.fn()} />);
    await screen.findByText(/Evento nuevo/);
    await act(async () => resolveOld(session('Evento viejo')));
    expect(screen.queryByText(/Evento viejo/)).not.toBeInTheDocument();
    expect(screen.getByText(/Evento nuevo/)).toBeInTheDocument();
  });

  it('cierra el resumen y restaura el estado previo del scroll al desmontar', () => {
    obtenerDetalleSesion.mockReturnValue(new Promise(() => {}));
    document.body.style.overflow = 'auto';
    const onClose = vi.fn();
    const view = render(<ModalResultados eventoId="evento" onClose={onClose} />);
    expect(document.body.style.overflow).toBe('hidden');
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar resumen' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    view.unmount();
    expect(document.body.style.overflow).toBe('auto');
    document.body.style.overflow = '';
  });
});
