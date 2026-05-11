import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Edit, ArrowRight, PenTool } from 'lucide-react';

export default function CrearHub() {
    const navigate = useNavigate();

    const styles = {
        page: { padding: '50px 80px', color: 'white', minHeight: '100vh', background: '#09090b', fontFamily: 'sans-serif' },
        header: { marginBottom: '50px', textAlign:'center' },
        title: { fontSize: '2.5rem', fontWeight: '900', margin: 0, textTransform: 'uppercase', letterSpacing: '-1px', lineHeight: '1' },
        subtitle: { color: '#71717a', marginTop: '10px', fontSize: '1.1rem' },
        
        gridActions: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px', maxWidth:'800px', margin:'0 auto' },
        
        actionBtnCard: {
            background: '#121214', border: '1px solid #27272a', borderRadius: '24px', padding: '40px',
            display: 'flex', flexDirection:'column', alignItems: 'center', textAlign:'center', gap: '20px',
            cursor: 'pointer', transition: 'all 0.3s ease', position:'relative', overflow:'hidden'
        },
        iconCircle: (color, bg) => ({
            width: '80px', height: '80px', borderRadius: '50%', background: bg, color: color,
            display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom:'10px'
        }),
        cardTitle: { color: 'white', fontWeight: '900', fontSize: '1.5rem', textTransform:'uppercase', margin:0 },
        cardSub: { color: '#71717a', fontSize: '1rem', margin:0 },
        arrow: { position:'absolute', bottom:'30px', right:'30px', color:'#333', transition:'all 0.3s' }
    };

    return (
        <div style={styles.page}>
            <header style={styles.header}>
                <h1 style={styles.title}>Crear Nueva Rutina</h1>
                <p style={styles.subtitle}>¿Cómo quieres empezar hoy?</p>
            </header>

            <div style={styles.gridActions}>
                {/* OPCIÓN 1: IA */}
                <div
                    style={styles.actionBtnCard}
                    onClick={() => navigate("/cliente/generar-ia")}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = "#FACC15";
                        e.currentTarget.style.background = "linear-gradient(145deg, rgba(250, 204, 21, 0.1), #121214)";
                        e.currentTarget.querySelector('.arrow-icon').style.color = "#FACC15";
                        e.currentTarget.querySelector('.arrow-icon').style.transform = "translateX(5px)";
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "#27272a";
                        e.currentTarget.style.background = "#121214";
                        e.currentTarget.querySelector('.arrow-icon').style.color = "#333";
                        e.currentTarget.querySelector('.arrow-icon').style.transform = "translateX(0)";
                    }}
                >
                    <div style={styles.iconCircle('#FACC15', 'rgba(250, 204, 21, 0.1)')}>
                        <Sparkles size={40} />
                    </div>
                    <div>
                        <h2 style={styles.cardTitle}>Entrenamientos Predeterminados</h2>
                        <p style={styles.cardSub}>Plan personalizado automático e inteligente.</p>
                    </div>
                    <ArrowRight className="arrow-icon" style={styles.arrow} size={24} />
                </div>

                {/* OPCIÓN 2: MANUAL */}
                <div
                    style={styles.actionBtnCard}
                    onClick={() => navigate("/cliente/crear-rutina")} // Esto lleva al creador manual antiguo
                    onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = "white";
                        e.currentTarget.style.background = "linear-gradient(145deg, rgba(255, 255, 255, 0.1), #121214)";
                        e.currentTarget.querySelector('.arrow-icon').style.color = "white";
                        e.currentTarget.querySelector('.arrow-icon').style.transform = "translateX(5px)";
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "#27272a";
                        e.currentTarget.style.background = "#121214";
                        e.currentTarget.querySelector('.arrow-icon').style.color = "#333";
                        e.currentTarget.querySelector('.arrow-icon').style.transform = "translateX(0)";
                    }}
                >
                    <div style={styles.iconCircle('white', '#27272a')}>
                        <Edit size={40} />
                    </div>
                    <div>
                        <h2 style={styles.cardTitle}>Diseñar Manual</h2>
                        <p style={styles.cardSub}>Crea tu rutina ejercicio a ejercicio desde cero.</p>
                    </div>
                    <ArrowRight className="arrow-icon" style={styles.arrow} size={24} />
                </div>
            </div>
        </div>
    );
}