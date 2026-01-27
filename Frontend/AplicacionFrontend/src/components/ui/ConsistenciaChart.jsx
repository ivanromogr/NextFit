import React, { useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { BarChart2, Calendar, List } from 'lucide-react';

export default function ConsistenciaChart({ dataSemanal, dataDiaria }) {
  // Estado para el toggle: 'semana' o 'dia'
  const [vista, setVista] = useState('semana'); 

  // Elegimos qué datos mostrar según la vista
  const data = vista === 'semana' ? dataSemanal : dataDiaria;

  if (!data || data.length === 0) return null;

  return (
    <div style={styles.chartCard}>
      <div style={styles.header}>
        <h3 style={styles.title}>
            <BarChart2 size={20} style={{marginRight: '10px'}}/>
            Consistencia
        </h3>
        
        {/* TOGGLE DE VISTAS */}
        <div style={styles.toggleContainer}>
            <button 
                style={styles.toggleBtn(vista === 'dia')} 
                onClick={() => setVista('dia')}
            >
                Días
            </button>
            <button 
                style={styles.toggleBtn(vista === 'semana')} 
                onClick={() => setVista('semana')}
            >
                Semanas
            </button>
        </div>
      </div>

      <div style={{ width: '100%', height: 250 }}>
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
            <XAxis 
                dataKey="label" 
                stroke="#71717a" 
                tick={{fontSize: 10}} 
                tickLine={false}
                axisLine={false}
                interval={vista === 'dia' ? 1 : 0} // Mostrar todos los días si caben
            />
            <YAxis hide />
            <Tooltip 
                cursor={{fill: 'rgba(255,255,255,0.05)'}}
                contentStyle={{ background: '#18181b', border: '1px solid #333', borderRadius: '8px' }}
                itemStyle={{ color: '#FACC15' }}
            />
            <Bar dataKey="cantidad" radius={[4, 4, 0, 0]} barSize={vista === 'dia' ? 15 : 30}>
                {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.cantidad > 0 ? "#FACC15" : "#27272a"} />
                ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

const styles = {
  chartCard: {
    background: '#121214', borderRadius: '16px', padding: '25px',
    border: '1px solid #27272a', marginBottom: '30px', boxShadow: '0 4px 6px rgba(0,0,0,0.2)'
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'
  },
  title: {
    color: 'white', fontSize: '1.1rem', fontWeight: '800',
    textTransform: 'uppercase', display: 'flex', alignItems: 'center'
  },
  toggleContainer: {
    background: '#09090b', borderRadius: '8px', padding: '4px', border: '1px solid #333', display: 'flex'
  },
  toggleBtn: (active) => ({
    background: active ? '#27272a' : 'transparent',
    color: active ? '#FACC15' : '#71717a',
    border: 'none', padding: '6px 12px', borderRadius: '6px',
    fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer',
    transition: 'all 0.2s'
  })
};