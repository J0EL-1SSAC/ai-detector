import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, ShieldCheck, ShieldQuestion, RotateCcw } from 'lucide-react';
import AnalysisCard from './AnalysisCard';
import ConfidenceMap from './ConfidenceMap';
import CrossModelChart from './CrossModelChart';
import Timeline from './Timeline';

function getOverallVerdict(score) {
  if (score >= 70) return { label: 'Likely AI-Generated', icon: ShieldAlert, className: 'verdict-danger' };
  if (score >= 40) return { label: 'Possibly AI-Generated', icon: ShieldQuestion, className: 'verdict-warning' };
  return { label: 'Likely Authentic', icon: ShieldCheck, className: 'verdict-safe' };
}

function getOverallColor(score) {
  if (score >= 70) return 'var(--danger)';
  if (score >= 40) return 'var(--warning)';
  return 'var(--success)';
}

export default function ResultsDashboard({ results, confidenceMap, imageUrl, onReset }) {
  const [expandedCards, setExpandedCards] = useState(new Set([0]));

  if (!results) return null;

  const { overallScore, analyses, crossModelScores, timelineData } = results;
  const verdict = getOverallVerdict(overallScore);
  const VerdictIcon = verdict.icon;
  const color = getOverallColor(overallScore);

  const toggleCard = (index) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  return (
    <motion.div
      className="results-dashboard"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      id="results-dashboard"
    >
      {/* Overall Score */}
      <motion.div
        className={`overall-score-card ${verdict.className}`}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, type: 'spring' }}
      >
        <div className="overall-score-visual">
          <svg viewBox="0 0 120 120" className="score-ring">
            <circle
              cx="60" cy="60" r="52"
              fill="none"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="8"
            />
            <motion.circle
              cx="60" cy="60" r="52"
              fill="none"
              stroke={color}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${overallScore * 3.267} 326.7`}
              transform="rotate(-90 60 60)"
              initial={{ strokeDasharray: '0 326.7' }}
              animate={{ strokeDasharray: `${overallScore * 3.267} 326.7` }}
              transition={{ duration: 1.5, ease: 'easeOut' }}
            />
          </svg>
          <div className="score-center">
            <motion.span
              className="score-number"
              style={{ color }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              {overallScore}%
            </motion.span>
            <span className="score-subtitle">AI Probability</span>
          </div>
        </div>

        <div className="verdict-info">
          <div className="verdict-badge" style={{ color }}>
            <VerdictIcon size={24} />
            <span>{verdict.label}</span>
          </div>
          <p className="verdict-description">
            Based on analysis of metadata, watermarks, model artifacts, confidence mapping, cross-model signatures, and timeline forensics.
          </p>
          <button className="reset-btn" onClick={onReset} id="analyze-new-btn">
            <RotateCcw size={16} />
            Analyze Another File
          </button>
        </div>
      </motion.div>

      {/* Analysis Cards */}
      <div className="analysis-grid">
        {analyses.map((result, i) => (
          <AnalysisCard
            key={result.name}
            result={result}
            index={i}
            expanded={expandedCards.has(i)}
            onToggle={() => toggleCard(i)}
          />
        ))}
      </div>

      {/* Confidence Map */}
      <ConfidenceMap confidenceData={confidenceMap} imageUrl={imageUrl} />

      {/* Cross Model Chart */}
      <CrossModelChart modelScores={crossModelScores} />

      {/* Timeline */}
      <Timeline timelineData={timelineData} />
    </motion.div>
  );
}
