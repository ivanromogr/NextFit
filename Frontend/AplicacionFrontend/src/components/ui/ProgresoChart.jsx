import React from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { Activity } from 'lucide-react';

export default function ProgresoChart({ data, titulo, pr }) {
  if (!data || data.length === 0) {
    return (
      <div style={styles.emptyContainer}>
        <Activity size={40} color="#333" />
        <p style={{color: '#555', marginTop: '10px'}}>No hay datos suficientes aún</p>
      </div>
    );
  }

  return (
    <div style={styles.chartCard}>
      <div style={styles.header}>
        <h3 style={styles.title}>{titulo}</h3>
        {pr > 0 && (
            <div style={styles.prBadge}>
                🏆 PR: {pr}kg
            </div>
        )}
      </div>

      <div style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer>
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorValor" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#FACC15" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#FACC15" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
            <XAxis 
                dataKey="fecha" 
                stroke="#71717a" 
                tick={{fontSize: 12}} 
                tickLine={false}
                axisLine={false}
            />
            <YAxis 
                stroke="#71717a" 
                tick={{fontSize: 12}} 
                tickLine={false}
                axisLine={false}
                domain={['auto', 'auto']} // Ajuste automático para que la curva se vea bien
            />
            <Tooltip content={<CustomTooltip />} />
            <Area 
                type="monotone" 
                dataKey="valor" 
                stroke="#FACC15" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorValor)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// Tooltip personalizado (la cajita que sale al pasar el ratón)
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: '#18181b', 
        border: '1px solid #333', 
        padding: '10px', 
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
      }}>
        <p style={{color: '#71717a', fontSize: '0.8rem', marginBottom: '4px'}}>{label}</p>
        <p style={{color: '#FACC15', fontWeight: 'bold', fontSize: '1rem'}}>
          1RM: {payload[0].value} kg
        </p>
      </div>
    );
  }
  return null;
};

const styles = {
  chartCard: {
    background: '#121214',
    borderRadius: '16px',
    padding: '20px',
    border: '1px solid #27272a',
    marginBottom: '20px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.2)'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px'
  },
  title: {
    color: 'white',
    fontSize: '1.1rem',
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  prBadge: {
    background: 'rgba(250, 204, 21, 0.1)',
    color: '#FACC15',
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '0.8rem',
    fontWeight: 'bold',
    border: '1px solid rgba(250, 204, 21, 0.2)'
  },
  emptyContainer: {
    background: '#121214',
    borderRadius: '16px',
    height: '250px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid #27272a',
    borderStyle: 'dashed'
  }
};