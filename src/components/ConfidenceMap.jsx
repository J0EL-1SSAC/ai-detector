import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Map } from 'lucide-react';

export default function ConfidenceMap({ confidenceData, imageUrl }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!confidenceData?.grid?.length || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const { grid, blockSize, width, height } = confidenceData;

    canvas.width = width;
    canvas.height = height;

    // Draw heatmap overlay
    for (let by = 0; by < grid.length; by++) {
      for (let bx = 0; bx < grid[by].length; bx++) {
        const confidence = grid[by][bx];
        const x = bx * blockSize;
        const y = by * blockSize;

        // Color gradient: green (0) → yellow (0.5) → red (1)
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

        // Add subtle grid lines
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.15)`;
        ctx.strokeRect(x, y, blockSize, blockSize);
      }
    }
  }, [confidenceData]);

  if (!confidenceData?.grid?.length) {
    return (
      <div className="confidence-map-empty">
        <Map size={32} />
        <p>Confidence map available for image files only</p>
      </div>
    );
  }

  const stats = getStats(confidenceData.grid);

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
        <h3>Confidence Map</h3>
      </div>

      <div className="confidence-map-visual" ref={containerRef}>
        <div className="confidence-map-wrapper">
          {imageUrl && (
            <img
              src={imageUrl}
              alt="Analyzed"
              className="confidence-map-image"
            />
          )}
          <canvas
            ref={canvasRef}
            className="confidence-map-canvas"
          />
        </div>
      </div>

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
      </div>
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
