import React from 'react';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer 
} from 'recharts';
import { Activity } from 'lucide-react';

export default function DistribucionMuscularChart({ data }) {
  if (!data || data.length === 0) return null;

  return (
    <div style={styles.chartCard}>
      <div style={styles.header}>
        <h3 style={styles.title}>
            <Activity size={20} style={{marginRight: '10px'}}/>
            Balance Muscular
        </h3>
      </div>

      <div style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer>
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
            <PolarGrid stroke="#333" />
            <PolarAngleAxis dataKey="musculo" tick={{ fill: '#a1a1aa', fontSize: 11, fontWeight: 'bold' }} />
            <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={false} axisLine={false} />
            <Radar
              name="Series"
              dataKey="series"
              stroke="#FACC15"
              strokeWidth={2}
              fill="#FACC15"
              fillOpacity={0.4}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

const styles = {
  chartCard: {
    background: '#121214', borderRadius: '16px', padding: '25px',
    border: '1px solid #27272a', marginBottom: '20px', height: '100%' // Para que ocupe altura completa si lo ponemos en grid
  },
  header: { marginBottom: '10px' },
  title: {
    color: 'white', fontSize: '1.1rem', fontWeight: '800', textTransform: 'uppercase', display: 'flex', alignItems: 'center'
  }
};