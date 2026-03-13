import React from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { GitCompare } from 'lucide-react';

const MODEL_COLORS = {
  'DALL-E 3': '#10b981',
  'Midjourney': '#8b5cf6',
  'Stable Diffusion': '#f59e0b',
  'Adobe Firefly': '#ef4444',
  'Google Imagen': '#3b82f6',
  'Flux': '#ec4899',
  'ElevenLabs': '#06b6d4',
  'Suno AI': '#f97316',
  'Sora': '#14b8a6',
  'Runway Gen-3': '#a855f7'
};

const CustomTooltip = ({ active, payload }) => {
  if (active && payload?.length) {
    const data = payload[0].payload;
    return (
      <div className="chart-tooltip">
        <p className="tooltip-name">{data.name}</p>
        <p className="tooltip-score">{data.score}% match</p>
      </div>
    );
  }
  return null;
};

export default function CrossModelChart({ modelScores }) {
  if (!modelScores || Object.keys(modelScores).length === 0) {
    return null;
  }

  const chartData = Object.entries(modelScores)
    .filter(([_, score]) => score > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([name, score]) => ({
      name: name.length > 12 ? name.substring(0, 12) + '…' : name,
      fullName: name,
      score,
      color: MODEL_COLORS[name] || '#64748b'
    }));

  const radarData = Object.entries(modelScores)
    .filter(([name, _]) => {
      const model = Object.keys(MODEL_COLORS).find(m => m === name);
      return model !== undefined;
    })
    .map(([name, score]) => ({
      model: name.length > 10 ? name.substring(0, 10) + '…' : name,
      score,
      fullMark: 100
    }));

  if (chartData.length === 0) {
    return (
      <motion.div
        className="cross-model-empty"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <GitCompare size={32} />
        <p>No model signatures detected</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="cross-model-container"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      id="cross-model-chart"
    >
      <div className="section-header">
        <GitCompare size={20} />
        <h3>Cross-Model Consistency</h3>
      </div>

      <div className="chart-grid">
        {/* Bar Chart */}
        <div className="chart-panel">
          <h4>Model Match Scores</h4>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20 }}>
                <XAxis type="number" domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={100} tick={{ fill: '#e2e8f0', fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="score" radius={[0, 6, 6, 0]} barSize={20}>
                  {chartData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Radar Chart */}
        {radarData.length >= 3 && (
          <div className="chart-panel">
            <h4>Signature Radar</h4>
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height={250}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="rgba(148, 163, 184, 0.2)" />
                  <PolarAngleAxis dataKey="model" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 9 }} />
                  <Radar
                    dataKey="score"
                    stroke="#8b5cf6"
                    fill="#8b5cf6"
                    fillOpacity={0.3}
                    strokeWidth={2}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
