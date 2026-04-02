import { useState, useEffect } from "react";
import { obtenerEjercicios } from "../../api/endpoints";
import { Search, Dumbbell } from "lucide-react"; 
import GymInput from "../../components/ui/GymInput";

export default function ExplorarEjercicios() {
  const [ejercicios, setEjercicios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    async function cargar() {
      try {
        const data = await obtenerEjercicios();
        if (Array.isArray(data)) {
            setEjercicios(data);
        }
      } catch (error) {
        console.error("Error cargando ejercicios:", error);
      } finally {
        setLoading(false);
      }
    }
    cargar();
  }, []);

  const ejerciciosFiltrados = ejercicios.filter(ej => 
    ej.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    ej.grupoMuscular.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div style={{ padding: '24px', minHeight: '100vh', paddingBottom: '80px', maxWidth: '1200px', margin: '0 auto' }}>
      
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ fontSize: '2.5rem', margin: '0', color: 'white', fontStyle: 'italic', fontFamily: 'Teko, sans-serif', textTransform: 'uppercase' }}>
          EXPLORAR <span style={{ color: '#FACC15' }}>EJERCICIOS</span>
        </h1>
        <p style={{ color: '#a3a3a3' }}>Descubre movimientos para tu rutina.</p>
      </div>

      <GymInput 
        placeholder="Buscar (ej: Press, Squat, Chest)..." 
        icon={Search}
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
      />

      {loading ? (
        <div style={{ textAlign: 'center', color: '#FACC15' }}>CARGANDO...</div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', 
          gap: '16px' 
        }}>
          {ejerciciosFiltrados.slice(0, 50).map((ej) => (
            <TarjetaEjercicio key={ej.id} ejercicio={ej} />
          ))}
        </div>
      )}
    </div>
  );
}

// COMPONENTE TARJETA INTELIGENTE
function TarjetaEjercicio({ ejercicio }) {
    const [errorImagen, setErrorImagen] = useState(false);

    return (
        <div style={{ 
            backgroundColor: '#18181b', 
            borderRadius: '12px', 
            overflow: 'hidden',
            border: '1px solid #333',
            display: 'flex', flexDirection: 'column',
            transition: 'transform 0.2s',
            cursor: 'pointer'
        }}>
            {/* ZONA DE IMAGEN */}
            <div style={{ 
                width: '100%', aspectRatio: '1/1', 
                backgroundColor: '#202020', // FONDO OSCURO (Ya no blanco)
                position: 'relative',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
                {!errorImagen ? (
                    <img 
                        src={ejercicio.gifUrl} 
                        alt={ejercicio.nombreTraducido} 
                        loading="lazy"
                        // SI FALLA LA CARGA, ACTIVAMOS EL MODO ERROR
                        onError={(e) => {
                            e.target.style.display = 'none'; // Ocultamos la imagen rota
                            setErrorImagen(true); // Mostramos el icono
                        }}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} // 'cover' llena mejor el cuadro
                    />
                ) : (
                    // ESTO SE MUESTRA SI EL GIF FALLA
                    <div style={{ color: '#525252', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <Dumbbell size={40} />
                    </div>
                )}

                <div style={{ 
                   position: 'absolute', bottom: '8px', right: '8px', 
                   background: '#FACC15', color: 'black', 
                   padding: '2px 6px', borderRadius: '4px', 
                   fontSize: '0.7rem', fontWeight: '800', textTransform: 'uppercase'
                 }}>
                   {ejercicio.grupoMuscularTraducido}
                 </div>
            </div>
            
            {/* INFO */}
            <div style={{ padding: '12px' }}>
                <h3 style={{ margin: 0, fontSize: '0.9rem', color: 'white', textTransform: 'capitalize', fontWeight: '700' }}>
                  {ejercicio.nombreTraducido}
                </h3>
            </div>
        </div>
    );
}