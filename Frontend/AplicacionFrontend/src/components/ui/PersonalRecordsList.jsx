import React from 'react';
import { Trophy, Flame, Medal } from 'lucide-react';

export default function PersonalRecordsList({ prs }) {
    if (!prs || prs.length === 0) return null;

    // Contamos cuántos son nuevos esta semana
    const nuevosRecords = prs.filter(p => p.esReciente).length;

    return (
        <div style={styles.card}>
            <div style={styles.header}>
                <h3 style={styles.title}>
                    <Trophy size={20} color="#FACC15" style={{marginRight: 8}}/> 
                    Salón de la Fama
                </h3>
                {nuevosRecords > 0 && (
                    <div style={styles.badgeNew}>
                        <Flame size={14} fill="#ef4444" color="#ef4444"/> 
                        ¡{nuevosRecords} Nuevos!
                    </div>
                )}
            </div>

            {nuevosRecords > 0 ? (
                <p style={styles.subtext}>
                    ¡Has roto <span style={{color:'#FACC15', fontWeight:'bold'}}>{nuevosRecords} récords</span> esta semana! Sigue así 🔥
                </p>
            ) : (
                <p style={styles.subtext}>Tus mejores levantamientos históricos.</p>
            )}

            <div style={styles.listContainer}>
                {prs.map((pr, index) => (
                    <div key={index} style={styles.item(pr.esReciente)}>
                        <div style={styles.iconCol}>
                            {index === 0 ? <Medal size={24} color="#FACC15" /> : 
                             index === 1 ? <Medal size={24} color="#C0C0C0" /> :
                             index === 2 ? <Medal size={24} color="#CD7F32" /> :
                             <Trophy size={18} color="#333" />}
                        </div>
                        
                        <div style={{flex: 1}}>
                            <div style={styles.exName}>{pr.ejercicio}</div>
                            <div style={styles.date}>{pr.fecha}</div>
                        </div>

                        <div style={styles.weightData}>
                            <span style={styles.weight}>{pr.peso} <span style={{fontSize:'0.8rem'}}>kg</span></span>
                            {pr.esReciente && <Flame size={16} color="#ef4444" fill="#ef4444" style={{marginLeft:5}}/>}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

const styles = {
    card: {
        background: '#121214', borderRadius: '16px', padding: '25px',
        border: '1px solid #27272a', display: 'flex', flexDirection: 'column',
        height: '100%', maxHeight: '500px' // Altura máxima para que no sea infinito
    },
    header: {
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px'
    },
    title: {
        color: 'white', fontSize: '1.1rem', fontWeight: '800', textTransform: 'uppercase', 
        display: 'flex', alignItems: 'center'
    },
    badgeNew: {
        background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', 
        padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold',
        display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid rgba(239, 68, 68, 0.2)'
    },
    subtext: {
        color: '#a1a1aa', fontSize: '0.9rem', marginBottom: '20px', lineHeight: '1.4'
    },
    listContainer: {
        overflowY: 'auto', paddingRight: '5px'
    },
    item: (esReciente) => ({
        display: 'flex', alignItems: 'center', padding: '12px 0', 
        borderBottom: '1px solid #1f1f22',
        background: esReciente ? 'linear-gradient(90deg, rgba(250,204,21,0.05) 0%, transparent 100%)' : 'transparent',
        borderRadius: '8px', paddingLeft: esReciente ? '10px' : '0'
    }),
    iconCol: { width: '40px', display: 'flex', justifyContent: 'center' },
    exName: { color: 'white', fontWeight: '700', fontSize: '0.95rem' },
    date: { color: '#52525b', fontSize: '0.75rem', fontWeight: '500' },
    weightData: { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', minWidth: '80px' },
    weight: { color: '#FACC15', fontWeight: '900', fontSize: '1.2rem' }
};