import React from 'react';
import { motion } from 'framer-motion';
import { Clock, AlertCircle, AlertTriangle, CheckCircle, Zap } from 'lucide-react';

function getAnomalyBadge(anomaly) {
  switch (anomaly) {
    case 'future_date':
      return <span className="anomaly-badge anomaly-critical">Future Date</span>;
    case 'impossible_order':
      return <span className="anomaly-badge anomaly-critical">Impossible</span>;
    case 'zero_duration':
      return <span className="anomaly-badge anomaly-high">Zero Duration</span>;
    case 'rapid_modification':
      return <span className="anomaly-badge anomaly-critical">Rapid Edit</span>;
    case 'suspicious_date':
      return <span className="anomaly-badge anomaly-medium">Suspicious</span>;
    case 'epoch_date':
      return <span className="anomaly-badge anomaly-high">Epoch Date</span>;
    default:
      return null;
  }
}

function formatDate(date) {
  if (!date) return 'Unknown';
  try {
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  } catch {
    return 'Invalid Date';
  }
}

function getTimeDiff(events) {
  if (events.length < 2) return null;
  const first = new Date(events[0].date).getTime();
  const last = new Date(events[events.length - 1].date).getTime();
  const diffMs = last - first;
  const diffSec = diffMs / 1000;
  const diffMin = diffSec / 60;
  const diffHour = diffMin / 60;

  if (diffSec < 60) return `${diffSec.toFixed(1)} seconds`;
  if (diffMin < 60) return `${diffMin.toFixed(1)} minutes`;
  return `${diffHour.toFixed(1)} hours`;
}

export default function Timeline({ timelineData }) {
  if (!timelineData || !timelineData.events) return null;

  const { events, findings } = timelineData;
  const timeDiff = getTimeDiff(events);
  const hasAnomalies = events.some(e => e.anomaly);
  const isRapid = events.some(e => e.anomaly === 'rapid_modification');

  return (
    <motion.div
      className="timeline-container"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      id="digital-evidence-timeline"
    >
      <div className="section-header">
        <Clock size={20} />
        <h3>Digital Evidence Timeline</h3>
        {isRapid && (
          <motion.div
            className="rapid-alert"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            <Zap size={16} />
            <span>Rapid Modification</span>
          </motion.div>
        )}
      </div>

      {timeDiff && (
        <div className={`time-span ${isRapid ? 'time-span--danger' : ''}`}>
          <span>Total timeline span: </span>
          <strong>{timeDiff}</strong>
          {isRapid && <span className="time-warning"> — AI generation indicator!</span>}
        </div>
      )}

      {events.length > 0 ? (
        <div className="timeline-track">
          {events.map((event, i) => (
            <motion.div
              key={i}
              className={`timeline-event ${event.anomaly ? 'timeline-event--anomaly' : ''}`}
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.15 }}
            >
              <div className="timeline-dot-line">
                <div className={`timeline-dot ${event.anomaly ? 'dot-anomaly' : 'dot-normal'}`}>
                  {event.anomaly ? <AlertCircle size={12} /> : <CheckCircle size={12} />}
                </div>
                {i < events.length - 1 && <div className="timeline-line" />}
              </div>
              <div className="timeline-content">
                <div className="timeline-event-header">
                  <span className="timeline-label">{event.label}</span>
                  {getAnomalyBadge(event.anomaly)}
                </div>
                <span className="timeline-date">{formatDate(event.date)}</span>
                <span className="timeline-source">{event.source}</span>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="timeline-empty">
          <AlertTriangle size={24} />
          <p>No timeline events found — the file lacks timestamp data.</p>
        </div>
      )}
    </motion.div>
  );
}
