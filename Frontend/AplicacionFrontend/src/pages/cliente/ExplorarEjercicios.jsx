import { useState, useEffect } from "react";
import { obtenerEjercicios } from "../../api/endpoints";
import { Search, Dumbbell } from "lucide-react"; 
import GymInput from "../../components/ui/GymInput";

const actionStyle = {
  background: '#FACC15', color: '#09090b', border: 0, borderRadius: '12px',
  padding: '12px 20px', minHeight: '44px', font: 'inherit', fontWeight: 700,
  cursor: 'pointer', marginTop: '16px'
};

export default function ExplorarEjercicios() {
  const [ejercicios, setEjercicios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [visible, setVisible] = useState(50);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);
    async function cargar() {
      try {
        const data = await obtenerEjercicios();
        if (!Array.isArray(data)) throw new Error('Invalid catalogue');
        if (active) setEjercicios(data);
      } catch {
        if (active) setError(true);
      } finally {
        if (active) setLoading(false);
      }
    }
    cargar();
    return () => { active = false; };
  }, [attempt]);

  const ejerciciosFiltrados = ejercicios.filter(ej => {
    const textoBusqueda = busqueda.trim().toLowerCase();
    const nombre = (ej.nombreTraducido || ej.nombre || "").toLowerCase();
    const grupo = (ej.grupoMuscularTraducido || ej.grupoMuscular || "").toLowerCase();

    return nombre.includes(textoBusqueda) || grupo.includes(textoBusqueda);
  });

  return (
    <div style={{ 
      padding: 'var(--spacing-xl) var(--spacing-2xl)', 
      minHeight: '100vh', 
      paddingBottom: '80px', 
      maxWidth: '1200px', 
      margin: '0 auto'}}>
      
      <div style={{ marginBottom: 'var(--spacing-xl)' }}>
        <h1 style={{ 
          fontSize: 'clamp(2rem, 5vw, 2.5rem)', 
          margin: '0', 
          color: 'white', 
          fontStyle: 'italic', 
          fontFamily: 'Teko, sans-serif', 
          textTransform: 'uppercase' 
        }}>
          EXPLORAR <span style={{ color: '#FACC15' }}>EJERCICIOS</span>
        </h1>
        <p style={{ 
          color: '#a3a3a3'}}>Descubre movimientos para tu rutina.</p>
      </div>

      <GymInput 
        aria-label="Buscar ejercicios"
        placeholder="Buscar por nombre o grupo muscular..."
        icon={Search}
        value={busqueda}
        onChange={(e) => { setBusqueda(e.target.value); setVisible(50); }}
      />

      {loading ? (
        <div role="status" style={{ textAlign: 'center', color: '#FACC15' }}>CARGANDO...</div>
      ) : error ? (
        <div role="alert" style={{ color: '#fca5a5' }}>
          <p>No se han podido cargar los ejercicios. Tu búsqueda se conserva.</p>
          <button type="button" style={actionStyle} onClick={() => setAttempt(value => value + 1)}>Reintentar</button>
        </div>
      ) : ejercicios.length === 0 ? (
        <p role="status">El catálogo todavía no tiene ejercicios disponibles.</p>
      ) : ejerciciosFiltrados.length === 0 ? (
        <p role="status">No hay ejercicios que coincidan con tu búsqueda.</p>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', 
          gap: 'var(--spacing-md)'}}>
          {ejerciciosFiltrados.slice(0, visible).map((ej) => (
            <TarjetaEjercicio key={ej.id} ejercicio={ej} />
          ))}
        </div>
      )}
      {!loading && !error && ejerciciosFiltrados.length > visible && (
        <button type="button" style={actionStyle} onClick={() => setVisible(count => count + 50)}>Mostrar más ejercicios</button>
      )}
    </div>
  );
}

// COMPONENTE TARJETA INTELIGENTE
function TarjetaEjercicio({ ejercicio }) {
    const [errorImagen, setErrorImagen] = useState(false);
    const mediaUrl = ejercicio.imagenUrl || ejercicio.gifUrl;
    const nombre = ejercicio.nombreTraducido || ejercicio.nombre;

    return (
        <div style={{ 
            backgroundColor: '#18181b', 
            borderRadius: '12px', 
            overflow: 'hidden',
            border: '1px solid #333',
            display: 'flex', 
            flexDirection: 'column',
            transition: 'transform 0.2s',
            cursor: 'pointer'}}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
            {/* ZONA DE IMAGEN */}
            <div style={{ 
                width: '100%', 
                aspectRatio: '1/1', 
                backgroundColor: '#202020', // FONDO OSCURO (Ya no blanco)
                position: 'relative',
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center'
            }}>
                {!errorImagen && mediaUrl ? (
                    <img 
                        src={mediaUrl} 
                        alt={nombre} 
                        loading="lazy"
                        onError={(e) => {
                            e.target.style.display = 'none';
                            setErrorImagen(true);
                        }}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                ) : ejercicio.videoUrl ? (
                    <video
                        src={ejercicio.videoUrl}
                        muted
                        loop
                        playsInline
                        preload="metadata"
                        onMouseEnter={(e) => e.currentTarget.play()}
                        onMouseLeave={(e) => {
                            e.currentTarget.pause();
                            e.currentTarget.currentTime = 0;
                        }}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                ) : (
                    <div style={{ color: '#525252', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <Dumbbell size={40} />
                    </div>
                )}

                <div style={{ 
                   position: 'absolute', 
                   bottom: '8px', 
                   right: '8px', 
                   background: '#FACC15', 
                   color: 'black', 
                   padding: '2px 6px', 
                   borderRadius: '4px', 
                   fontSize: '0.7rem', 
                   fontWeight: '800', 
                   textTransform: 'uppercase'}}>
                   {ejercicio.grupoMuscularTraducido}
                 </div>
            </div>
            
            {/* INFO */}
            <div style={{ 
              padding: 'var(--spacing-sm)'}}>
                <h3 style={{ 
                  margin: 0, 
                  fontSize: '0.9rem', 
                  color: 'white', 
                  textTransform: 'capitalize', 
                  fontWeight: '700'}}>
                  {nombre}
                </h3>
            </div>
        </div>
    );
}
