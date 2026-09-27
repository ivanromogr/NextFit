import '@testing-library/jest-dom';
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ExportarDatos from '../../pages/auth/ExportarDatos';
import { getDataExport } from '../../api/endpoints';

vi.mock('../../api/endpoints', () => ({ getDataExport: vi.fn() }));

describe('ExportarDatos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    URL.createObjectURL = vi.fn(() => 'blob:temporary-export');
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  });

  it('descarga el blob temporal y revoca su URL', async () => {
    getDataExport.mockResolvedValue({
      data: new Blob(['{"accountType":"CLIENTE"}'], { type: 'application/json' }),
      headers: { 'content-disposition': 'attachment; filename=nextfit-data-2026-09-27.json' },
    });
    render(<ExportarDatos />);

    fireEvent.click(screen.getByRole('button', { name: 'Descargar mis datos' }));

    await waitFor(() => expect(getDataExport).toHaveBeenCalledTimes(1));
    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:temporary-export');
  });

  it('muestra un error genérico si la exportación falla', async () => {
    getDataExport.mockRejectedValue(new Error('network'));
    render(<ExportarDatos />);
    fireEvent.click(screen.getByRole('button', { name: 'Descargar mis datos' }));
    expect(await screen.findByRole('status')).toHaveTextContent('No se pudieron descargar tus datos');
  });
});
