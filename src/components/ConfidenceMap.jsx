import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Map, Eye, Hand, Brain, Waves, Blend, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';

const REGION_COLORS = {
  eyes:      { border: '#ef4444', bg: 'rgba(239,68,68,0.12)', icon: Eye },
  hands:     { border: '#f97316', bg: 'rgba(249,115,22,0.12)', icon: Hand },
  skin:      { border: '#ec4899', bg: 'rgba(236,72,153,0.12)', icon: Brain },
  diffusion: { border: '#8b5cf6', bg: 'rgba(139,92,246,0.12)', icon: Waves },
  blending:  { border: '#06b6d4', bg: 'rgba(6,182,212,0.12)', icon: Blend },
};

const SEVERITY_COLORS = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#10b981',
};

export default function ConfidenceMap({ confidenceData, imageUrl }) {
  const canvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const containerRef = useRef(null);
  const [showRegions, setShowRegions] = useState(true);
  const [expandedRegions, setExpandedRegions] = useState(false);

  // Draw heatmap
  useEffect(() => {
    if (!confidenceData?.grid?.length || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const { grid, blockSize, width, height } = confidenceData;

    canvas.width = width;
    canvas.height = height;

    for (let by = 0; by < grid.length; by++) {
      for (let bx = 0; bx < grid[by].length; bx++) {
        const confidence = grid[by][bx];
        const x = bx * blockSize;
        const y = by * blockSize;

        let r, g, b;
        if (confidence < 0.5) {
          const t = confidence * 2;
          r = Math.round(255 * t);
          g = 255;
          b = 0;
        } else {
          const t = (confidence - 0.5) * 2;
          r = 255;
          g = Math.round(255 * (1 - t));
          b = 0;
        }

        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.4)`;
        ctx.fillRect(x, y, blockSize, blockSize);
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.15)`;
        ctx.strokeRect(x, y, blockSize, blockSize);
      }
    }
  }, [confidenceData]);

  // Draw suspicious region overlays
  useEffect(() => {
    if (!confidenceData?.suspiciousRegions?.length || !overlayCanvasRef.current) return;
    if (!confidenceData.width || !confidenceData.height) return;

    const canvas = overlayCanvasRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width = confidenceData.width;
    canvas.height = confidenceData.height;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!showRegions) return;

    confidenceData.suspiciousRegions.forEach((region, idx) => {
      const colors = REGION_COLORS[region.type] || REGION_COLORS.diffusion;

      // Draw filled background
      ctx.fillStyle = colors.bg;
      ctx.fillRect(region.x, region.y, region.w, region.h);

      // Draw border
      ctx.strokeStyle = colors.border;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 3]);
      ctx.strokeRect(region.x + 1, region.y + 1, region.w - 2, region.h - 2);
      ctx.setLineDash([]);

      // Draw corner brackets
      const bracketLen = Math.min(12, region.w / 4, region.h / 4);
      ctx.strokeStyle = colors.border;
      ctx.lineWidth = 3;
      ctx.setLineDash([]);

      // Top-left
      ctx.beginPath();
      ctx.moveTo(region.x, region.y + bracketLen);
      ctx.lineTo(region.x, region.y);
      ctx.lineTo(region.x + bracketLen, region.y);
      ctx.stroke();

      // Top-right
      ctx.beginPath();
      ctx.moveTo(region.x + region.w - bracketLen, region.y);
      ctx.lineTo(region.x + region.w, region.y);
      ctx.lineTo(region.x + region.w, region.y + bracketLen);
      ctx.stroke();

      // Bottom-left
      ctx.beginPath();
      ctx.moveTo(region.x, region.y + region.h - bracketLen);
      ctx.lineTo(region.x, region.y + region.h);
      ctx.lineTo(region.x + bracketLen, region.y + region.h);
      ctx.stroke();

      // Bottom-right
      ctx.beginPath();
      ctx.moveTo(region.x + region.w - bracketLen, region.y + region.h);
      ctx.lineTo(region.x + region.w, region.y + region.h);
      ctx.lineTo(region.x + region.w, region.y + region.h - bracketLen);
      ctx.stroke();

      // Label background
      const labelText = `${region.score}%`;
      ctx.font = 'bold 10px Inter, sans-serif';
      const textWidth = ctx.measureText(labelText).width;
      const labelW = textWidth + 10;
      const labelH = 16;
      const labelX = region.x;
      const labelY = region.y - labelH - 2;

      if (labelY > 0) {
        ctx.fillStyle = colors.border;
        ctx.beginPath();
        ctx.roundRect(labelX, labelY, labelW, labelH, 3);
        ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.textBaseline = 'middle';
        ctx.fillText(labelText, labelX + 5, labelY + labelH / 2);
      }
    });
  }, [confidenceData, showRegions]);

  if (!confidenceData?.grid?.length) {
    return (
      <div className="confidence-map-empty">
        <Map size={32} />
        <p>Confidence map available for image files only</p>
      </div>
    );
  }

  const stats = getStats(confidenceData.grid);
  const regions = confidenceData.suspiciousRegions || [];
  const regionsByType = groupByType(regions);

  return (
    <motion.div
      className="confidence-map-container"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      id="confidence-map"
    >
      <div className="section-header">
        <Map size={20} />
        <h3>Confidence Map & Suspicious Regions</h3>
      </div>

      <div className="confidence-map-visual" ref={containerRef}>
        <div className="confidence-map-wrapper">
          {imageUrl && (
            <img src={imageUrl} alt="Analyzed" className="confidence-map-image" />
          )}
          <canvas ref={canvasRef} className="confidence-map-canvas" />
          <canvas ref={overlayCanvasRef} className="confidence-map-canvas region-overlay-canvas" />
        </div>
      </div>

      {/* Region toggle */}
      {regions.length > 0 && (
        <div className="region-toggle-row">
          <button
            className={`region-toggle-btn ${showRegions ? 'active' : ''}`}
            onClick={() => setShowRegions(!showRegions)}
          >
            <AlertTriangle size={14} />
            {showRegions ? 'Hide' : 'Show'} Suspicious Regions ({regions.length})
          </button>
        </div>
      )}

      <div className="confidence-map-legend">
        <div className="legend-gradient">
          <span>Authentic</span>
          <div className="gradient-bar" />
          <span>AI-Generated</span>
        </div>
      </div>

      <div className="confidence-stats">
        <div className="stat-item">
          <span className="stat-label">Avg Confidence</span>
          <span className="stat-value">{stats.average.toFixed(1)}%</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Max Region</span>
          <span className="stat-value">{stats.max.toFixed(1)}%</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Hotspots</span>
          <span className="stat-value">{stats.hotspots}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Suspicious Regions</span>
          <span className="stat-value" style={{ color: regions.length > 0 ? '#ef4444' : '#10b981' }}>
            {regions.length}
          </span>
        </div>
      </div>

      {/* Suspicious Regions Details */}
      {regions.length > 0 && (
        <motion.div
          className="suspicious-regions-panel"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <button className="regions-expand-header" onClick={() => setExpandedRegions(!expandedRegions)}>
            <div className="regions-expand-left">
              <AlertTriangle size={16} style={{ color: '#ef4444' }} />
              <span className="regions-expand-title">
                {regions.length} Suspicious Region{regions.length !== 1 ? 's' : ''} Detected
              </span>
            </div>
            {expandedRegions ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          <AnimatePresence>
            {expandedRegions && (
              <motion.div
                className="regions-detail-grid"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                {Object.entries(regionsByType).map(([type, typeRegions]) => {
                  const colors = REGION_COLORS[type] || REGION_COLORS.diffusion;
                  const Icon = colors.icon;
                  return (
                    <div key={type} className="region-type-group">
                      <div className="region-type-header" style={{ borderLeftColor: colors.border }}>
                        <Icon size={16} style={{ color: colors.border }} />
                        <span className="region-type-name">{getTypeLabel(type)}</span>
                        <span className="region-type-count" style={{ background: colors.bg, color: colors.border }}>
                          {typeRegions.length}
                        </span>
                      </div>
                      {typeRegions.map((region, i) => (
                        <div key={i} className="region-detail-item">
                          <div className="region-detail-top">
                            <span className="region-detail-label">{region.label}</span>
                            <span
                              className="region-severity-badge"
                              style={{
                                background: `${SEVERITY_COLORS[region.severity]}20`,
                                color: SEVERITY_COLORS[region.severity],
                                borderColor: `${SEVERITY_COLORS[region.severity]}40`
                              }}
                            >
                              {region.severity.toUpperCase()} — {region.score}%
                            </span>
                          </div>
                          <p className="region-detail-desc">{region.detail}</p>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </motion.div>
  );
}

function getStats(grid) {
  const allValues = grid.flat();
  const average = (allValues.reduce((a, b) => a + b, 0) / allValues.length) * 100;
  const max = Math.max(...allValues) * 100;
  const hotspots = allValues.filter(v => v > 0.7).length;
  return { average, max, hotspots };
}

function groupByType(regions) {
  const groups = {};
  for (const r of regions) {
    if (!groups[r.type]) groups[r.type] = [];
    groups[r.type].push(r);
  }
  return groups;
}

function getTypeLabel(type) {
  const labels = {
    eyes: 'Eye Region Anomalies',
    hands: 'Hand/Finger Anomalies',
    skin: 'Skin Texture Anomalies',
    diffusion: 'Diffusion Noise Patterns',
    blending: 'Edge Blending Artifacts',
  };
  return labels[type] || type;
}
