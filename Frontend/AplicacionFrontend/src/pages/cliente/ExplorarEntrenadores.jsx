import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Filter, Star, User, Euro, MessageSquare, MapPin, Award } from "lucide-react";
import { api } from "../../api/endpoints"; 

export default function ExplorarEntrenadores() {
    const navigate = useNavigate();
    const [entrenadores, setEntrenadores] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Filtros
    const [busqueda, setBusqueda] = useState("");
    const [filtroEspecialidad, setFiltroEspecialidad] = useState("");

    const LISTA_ESPECIALIDADES = [
        "Fuerza", "Hipertrofia", "Pérdida de Peso", "CrossFit",
        "Cardio", "Movilidad", "Rehabilitación", "Funcional", "Calistenia"
    ];

    useEffect(() => {
        const cargarEntrenadores = async () => {
            try {
                // 👇 Llamamos al endpoint público del backend
                const res = await api.get("/api/entrenador/publicos");
                setEntrenadores(res.data);
            } catch (error) {
                console.error("Error cargando el marketplace", error);
            } finally {
                setLoading(false);
            }
        };
        cargarEntrenadores();
    }, []);

    const entrenadoresFiltrados = entrenadores.filter(ent => {
        const coincideTexto = 
            (ent.nombre + " " + ent.apellido).toLowerCase().includes(busqueda.toLowerCase()) || 
            (ent.descripcionPerfil && ent.descripcionPerfil.toLowerCase().includes(busqueda.toLowerCase()));
        
        const coincideEspecialidad = filtroEspecialidad === "" || 
            (ent.especialidad && ent.especialidad.toLowerCase().includes(filtroEspecialidad.toLowerCase()));

        return coincideTexto && coincideEspecialidad;
    });

    const styles = {
        container: { minHeight: "100vh", background: "#09090b", color: "white", padding: "40px 20px", fontFamily: "Inter, sans-serif" },
        header: { maxWidth: "1200px", margin: "0 auto 40px auto", textAlign: "center" },
        title: { fontSize: "2.5rem", fontWeight: "900", margin: "0 0 15px 0", color: "white", letterSpacing: "-1px" },
        subtitle: { fontSize: "1.1rem", color: "#a1a1aa", maxWidth: "600px", margin: "0 auto" },
        filtrosWrapper: { maxWidth: "1200px", margin: "0 auto 40px auto", display: "flex", gap: "15px", flexWrap: "wrap" },
        searchBox: { flex: "1 1 300px", display: "flex", alignItems: "center", background: "#18181b", borderRadius: "12px", border: "1px solid #27272a", padding: "0 15px" },
        searchInput: { width: "100%", background: "transparent", border: "none", color: "white", padding: "14px 10px", outline: "none", fontSize: "1rem" },
        selectBox: { padding: "14px 20px", background: "#18181b", borderRadius: "12px", border: "1px solid #27272a", color: "white", outline: "none", fontSize: "1rem", cursor: "pointer", minWidth: "200px" },
        grid: { maxWidth: "1200px", margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "25px" },
        card: { background: "linear-gradient(145deg, #121214 0%, #0c0c0e 100%)", borderRadius: "20px", border: "1px solid #27272a", overflow: "hidden", display: "flex", flexDirection: "column", transition: "transform 0.2s, boxShadow 0.2s", cursor: 'pointer' },
        cardHeader: { padding: "24px", display: "flex", gap: "15px", alignItems: "center", borderBottom: "1px solid #1f1f22" },
        avatar: { width: "70px", height: "70px", borderRadius: "16px", background: "#27272a", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 },
        avatarImg: { width: "100%", height: "100%", objectFit: "cover" },
        name: { fontSize: "1.2rem", fontWeight: "800", margin: "0 0 4px 0" },
        modality: { fontSize: "0.85rem", color: "#FACC15", fontWeight: "600", display: "flex", alignItems: "center", gap: "4px" },
        cardBody: { padding: "24px", flex: 1, display: "flex", flexDirection: "column", gap: "15px" },
        bio: { fontSize: "0.9rem", color: "#a1a1aa", lineHeight: "1.5", margin: 0, flex: 1, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" },
        tags: { display: "flex", flexWrap: "wrap", gap: "8px" },
        tag: { background: "rgba(255,255,255,0.05)", padding: "6px 12px", borderRadius: "8px", fontSize: "0.8rem", color: "#d4d4d8", fontWeight: "500", display: "flex", alignItems: "center", gap: "6px" },
        cardFooter: { padding: "20px 24px", background: "rgba(0,0,0,0.2)", display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid #1f1f22" },
        price: { fontSize: "1.4rem", fontWeight: "900", color: "white" },
        priceSub: { fontSize: "0.8rem", color: "#71717a", fontWeight: "500" },
        btnContactar: { background: "#FACC15", color: "black", border: "none", padding: "10px 20px", borderRadius: "10px", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", transition: "0.2s" }
    };

    if (loading) return <div style={{...styles.container, display: 'flex', justifyContent: 'center', alignItems: 'center'}}>Cargando entrenadores...</div>;

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h1 style={styles.title}>Encuentra a tu entrenador ideal</h1>
                <p style={styles.subtitle}>Explora perfiles, compara tarifas y conecta con profesionales verificados de NextFit para llevar tu entrenamiento al siguiente nivel.</p>
            </div>

            <div style={styles.filtrosWrapper}>
                <div style={styles.searchBox}>
                    <Search size={20} color="#71717a" />
                    <input 
                        style={styles.searchInput} 
                        placeholder="Buscar por nombre o palabras clave..." 
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                    />
                </div>
                
                <select 
                    style={styles.selectBox}
                    value={filtroEspecialidad}
                    onChange={(e) => setFiltroEspecialidad(e.target.value)}
                >
                    <option value="">Todas las especialidades</option>
                    {LISTA_ESPECIALIDADES.map(esp => (
                        <option key={esp} value={esp}>{esp}</option>
                    ))}
                </select>
            </div>

            {entrenadoresFiltrados.length === 0 ? (
                <div style={{textAlign: 'center', color: '#71717a', padding: '50px', background: '#121214', borderRadius: '20px', maxWidth: '800px', margin: '0 auto'}}>
                    <Search size={48} color="#27272a" style={{marginBottom: '20px'}} />
                    <h3 style={{color: 'white', fontSize: '1.2rem'}}>No hay resultados</h3>
                    <p>No hemos encontrado ningún entrenador que coincida con tus filtros.</p>
                </div>
            ) : (
                <div style={styles.grid}>
                    {entrenadoresFiltrados.map(ent => (
                        <div 
                            key={ent.id} 
                            style={styles.card}
                            onClick={() => navigate(`/cliente/entrenador-perfil/${ent.id}`)}
                            onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                            onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                        >
                            <div style={styles.cardHeader}>
                                <div style={styles.avatar}>
                                    {ent.fotoPerfil ? <img src={ent.fotoPerfil} style={styles.avatarImg} alt={ent.nombre}/> : <User size={28} color="#71717a"/>}
                                </div>
                                <div>
                                    <h3 style={styles.name}>{ent.nombre} {ent.apellido}</h3>
                                    <div style={styles.modality}>
                                        <MapPin size={14} /> {ent.modalidadTrabajo || "Online / Presencial"}
                                    </div>
                                </div>
                            </div>
                            
                            <div style={styles.cardBody}>
                                <p style={styles.bio}>
                                    {ent.descripcionPerfil || "Este entrenador aún no ha añadido una biografía a su perfil público, pero está listo para ayudarte a conseguir tus objetivos."}
                                </p>
                                
                                <div style={styles.tags}>
                                    {ent.aniosExperiencia && (
                                        <span style={styles.tag}><Award size={14} color="#FACC15"/> {ent.aniosExperiencia} años exp.</span>
                                    )}
                                    {/* ✅ Ahora mostramos TODAS las especialidades */}
                                    {ent.especialidad && ent.especialidad.split(',').map((esp, i) => (
                                        <span key={i} style={styles.tag}>{esp.trim()}</span>
                                    ))}
                                </div>
                            </div>

                            <div style={styles.cardFooter}>
                                <div>
                                    <div style={styles.price}>{ent.tarifaMensual ? `${ent.tarifaMensual}€` : "A consultar"}</div>
                                    <div style={styles.priceSub}>/ mes</div>
                                </div>
                                
                                <button 
                                    style={styles.btnContactar} 
                                    onClick={(e) => {
                                        e.stopPropagation(); // Evita que se dispare el click de la tarjeta
                                        navigate(`/cliente/entrenador-perfil/${ent.id}`);
                                    }}
                                >
                                    Ver Perfil
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}