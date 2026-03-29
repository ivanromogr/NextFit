import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CalendarioCliente from '../../../pages/cliente/CalendarioCliente'; // Ajusta la ruta a tu componente
import { BrowserRouter } from 'react-router-dom';

// 1. MOCK DEL TOAST Y AUTH
vi.mock('../../../context/ToastContext', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() })
}));

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ userId: 'user-123' })
}));

// 2. MOCK DEL ROUTER
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({}) // Simulamos que estamos en modo cliente normal
  };
});

// 3. MOCK DE LA API
const { 
  mockObtenerEventos, 
  mockProgramarRutina, 
  mockEliminarEvento, 
  mockMoverEvento,
  mockObtenerRutinas 
} = vi.hoisted(() => ({
  mockObtenerEventos: vi.fn(),
  mockProgramarRutina: vi.fn(),
  mockEliminarEvento: vi.fn(),
  mockMoverEvento: vi.fn(),
  mockObtenerRutinas: vi.fn(),
}));

vi.mock('../../../api/endpoints', () => ({
  obtenerEventosCalendario: mockObtenerEventos,
  programarRutina: mockProgramarRutina,
  eliminarEventoCalendario: mockEliminarEvento,
  moverEventoCalendario: mockMoverEvento,
  obtenerRutinasCliente: mockObtenerRutinas,
  obtenerRutinasAsignadasPorEntrenador: vi.fn(),
  toggleCompletadoEvento: vi.fn()
}));

// 4. MOCK PARA EL MODAL RESULTADOS
vi.mock('../../../components/functional/ModalResultados', () => ({
  default: ({ onClose }) => (
    <div data-testid="mock-modal-resultados">
      <h2>Modal Resultados</h2>
      <button onClick={onClose}>Cerrar Modal</button>
    </div>
  )
}));

describe('Página de CalendarioCliente', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Por defecto, simulamos que el backend nos devuelve una lista vacía de eventos y rutinas
    mockObtenerEventos.mockResolvedValue([]);
    mockObtenerRutinas.mockResolvedValue([]);
  });

  const renderComponent = (props = {}) => {
    render(
      <BrowserRouter>
        <CalendarioCliente {...props} />
      </BrowserRouter>
    );
  };

  it('renderiza correctamente el calendario vacío', async () => {
    renderComponent();

    // Verificamos que se renderizan los días de la semana
    expect(screen.getByText('LUN')).toBeInTheDocument();
    expect(screen.getByText('DOM')).toBeInTheDocument();
    
    // Verificamos que se llama a la API para cargar eventos
    await waitFor(() => {
      expect(mockObtenerEventos).toHaveBeenCalled();
      expect(mockObtenerRutinas).toHaveBeenCalled();
    });
  });

  it('renderiza eventos existentes en el calendario', async () => {
    // Simulamos que el backend devuelve un evento programado para hoy
    const fechaHoy = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    mockObtenerEventos.mockResolvedValueOnce([
      { id: 1, rutinaNombre: 'Rutina Pierna', fecha: fechaHoy, estado: 'PENDIENTE' }
    ]);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Rutina Pierna')).toBeInTheDocument();
    });
  });

  it('abre el modal para programar una rutina al hacer clic en un día', async () => {
    // Simulamos que el cliente tiene una rutina guardada en su biblioteca
    mockObtenerRutinas.mockResolvedValueOnce([
      { id: 101, nombre: 'Rutina Hipertrofia' }
    ]);
    renderComponent();

    // Buscamos un día cualquiera (ej. el día 15) que sea del mes actual (no opaco)
    // Para simplificar, buscamos el contenedor general y hacemos click en el primer día
    const dayCells = await screen.findAllByText('15');
    // Normalmente renderiza días del mes anterior y posterior, pillamos el segundo (suele ser el del mes actual)
    const dayCellToClick = dayCells.length > 1 ? dayCells[1].closest('div') : dayCells[0].closest('div');
    
    fireEvent.click(dayCellToClick);

    // Verificamos que el modal se abre y muestra la rutina disponible
    await waitFor(() => {
      expect(screen.getByText('Rutina Hipertrofia')).toBeInTheDocument();
    });
  });

  it('permite programar una rutina desde el modal', async () => {
    mockObtenerRutinas.mockResolvedValueOnce([{ id: 101, nombre: 'Rutina Hipertrofia' }]);
    mockProgramarRutina.mockResolvedValueOnce({ success: true });

    renderComponent();

    const dayCells = await screen.findAllByText('15');
    const dayCellToClick = dayCells.length > 1 ? dayCells[1].closest('div') : dayCells[0].closest('div');
    
    fireEvent.click(dayCellToClick);

    // Esperamos a que se abra el modal y hacemos clic en la rutina
    const rutinaItem = await screen.findByText('Rutina Hipertrofia');
    fireEvent.click(rutinaItem.closest('button'));

    // Verificamos que se llama a la API con los datos correctos
    await waitFor(() => {
      expect(mockProgramarRutina).toHaveBeenCalledWith(
        'user-123', // clienteId
        101,        // rutinaId
        expect.any(String), // fecha
        undefined   // idEntrenador (es modo cliente)
      );
    });
  });

  it('abre el modal de confirmación de borrado y elimina un evento', async () => {
    const fechaHoy = new Date().toISOString().split('T')[0];
    mockObtenerEventos.mockResolvedValueOnce([
      { id: 99, rutinaNombre: 'Rutina Borrar', fecha: fechaHoy, estado: 'PENDIENTE' }
    ]);
    mockEliminarEvento.mockResolvedValueOnce({ success: true });

    renderComponent();

    // Esperamos a que el evento renderice
    await screen.findByText('Rutina Borrar');

    // Buscamos el botón de borrar (la papelera). Como usamos SVG, buscamos el contenedor botón de borrar.
    // Usamos getAllByRole porque hay varios botones en la tarjeta.
    const trashButtons = document.querySelectorAll('button');
    const trashBtn = Array.from(trashButtons).find(btn => btn.innerHTML.includes('lucide-trash-2'));
    
    // Hacemos click en borrar
    fireEvent.click(trashBtn);

    // Verificamos modal de confirmación
    await waitFor(() => {
      expect(screen.getByText('¿Eliminar Evento?')).toBeInTheDocument();
    });

    // Confirmamos borrado
    const confirmBtn = screen.getByText('ELIMINAR');
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mockEliminarEvento).toHaveBeenCalledWith(99);
    });
  });
});