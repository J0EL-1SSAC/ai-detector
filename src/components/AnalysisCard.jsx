import React from 'react';
import { motion } from 'framer-motion';
import {
  FileSearch, Fingerprint, Cpu, GitCompare, Clock, Shield,
  AlertTriangle, CheckCircle, Info, AlertCircle, ChevronDown, ChevronUp,
  FlaskConical, Radio, BarChart3, Eye
} from 'lucide-react';

const ICONS = {
  FileSearch, Fingerprint, Cpu, GitCompare, Clock, Shield,
  FlaskConical, Radio, BarChart3, Eye, AlertTriangle
};

function getSeverityIcon(severity) {
  switch (severity) {
    case 'critical': return <AlertCircle size={16} className="severity-icon severity-critical" />;
    case 'high': return <AlertTriangle size={16} className="severity-icon severity-high" />;
    case 'medium': return <AlertTriangle size={16} className="severity-icon severity-medium" />;
    case 'low': return <Info size={16} className="severity-icon severity-low" />;
    default: return <Info size={16} className="severity-icon severity-info" />;
  }
}

function getScoreColor(score) {
  if (score >= 70) return 'var(--danger)';
  if (score >= 40) return 'var(--warning)';
  return 'var(--success)';
}

function getScoreLabel(score) {
  if (score >= 70) return 'High Risk';
  if (score >= 40) return 'Moderate';
  return 'Low Risk';
}

export default function AnalysisCard({ result, index, expanded, onToggle }) {
  const IconComponent = ICONS[result.icon] || Shield;
  const scoreColor = getScoreColor(result.score);

  return (
    <motion.div
      className="analysis-card"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      id={`analysis-card-${result.name.replace(/\s+/g, '-').toLowerCase()}`}
    >
      <div className="card-header" onClick={onToggle}>
        <div className="card-header-left">
          <div className="card-icon" style={{ color: scoreColor }}>
            <IconComponent size={22} />
          </div>
          <div className="card-title-group">
            <h3 className="card-title">{result.name}</h3>
            <span className="card-label" style={{ color: scoreColor }}>
              {getScoreLabel(result.score)}
            </span>
          </div>
        </div>
        <div className="card-header-right">
          <div className="score-gauge-mini">
            <svg viewBox="0 0 36 36" className="score-ring-mini">
              <path
                d="M18 2.0845
                   a 15.9155 15.9155 0 0 1 0 31.831
                   a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="3"
              />
              <motion.path
                d="M18 2.0845
                   a 15.9155 15.9155 0 0 1 0 31.831
                   a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke={scoreColor}
                strokeWidth="3"
                strokeLinecap="round"
                initial={{ strokeDasharray: '0 100' }}
                animate={{ strokeDasharray: `${result.score} 100` }}
                transition={{ duration: 1, delay: index * 0.1 + 0.3 }}
              />
            </svg>
            <span className="score-text-mini" style={{ color: scoreColor }}>
              {result.score}%
            </span>
          </div>
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </div>

      {expanded && (
        <motion.div
          className="card-body"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="findings-list">
            {result.findings.map((finding, i) => (
              <div key={i} className={`finding-item finding-${finding.severity}`}>
                <div className="finding-header">
                  {getSeverityIcon(finding.severity)}
                  <span className="finding-title">{finding.title}</span>
                </div>
                <p className="finding-detail">{finding.detail}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
