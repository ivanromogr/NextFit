import { lazy } from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom';
import PageBoundary from '../components/layout/PageBoundary';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('Carga de pantallas bajo demanda', () => {
  it('anuncia la espera y muestra la pantalla cuando termina la descarga', async () => {
    let complete;
    const Page = lazy(() => new Promise(resolve => { complete = resolve; }));
    render(<PageBoundary><Page /></PageBoundary>);
    expect(screen.getByRole('status')).toHaveTextContent('Cargando pantalla');
    await act(async () => { complete({ default: () => <h1>Mi progreso</h1> }); });
    expect(await screen.findByRole('heading', { name: 'Mi progreso' })).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('un fallo al descargar ofrece recuperación sin mostrar detalles internos', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const Page = lazy(() => Promise.reject(new Error('private-chunk-path-and-internal-details')));
    render(<PageBoundary><Page /></PageBoundary>);
    expect(await screen.findByRole('alert')).toHaveTextContent('No se ha podido abrir esta pantalla');
    expect(screen.getByRole('button', { name: 'Volver a cargar' })).toBeEnabled();
    expect(screen.getByRole('link', { name: 'Volver al inicio' })).toHaveAttribute('href', '/auth/login');
    expect(screen.queryByText(/private-chunk/)).not.toBeInTheDocument();
  });
});
