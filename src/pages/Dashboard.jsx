import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Shield, Scan, Activity, Clock, TrendingUp, FileSearch,
  BarChart3, Zap, Fingerprint, Eye, Layers, Binary,
  Download, Trash2, ChevronRight, LogOut, Settings,
  FlaskConical, Microscope, GitCompare, Radio, AlertTriangle
} from 'lucide-react';

const FEATURE_CARDS = [
  {
    id: 'benford',
    icon: BarChart3,
    title: "Benford's Law Check",
    desc: 'First-digit distribution analysis reveals synthetic pixel generation',
    color: '#10b981',
    badge: 'Unique'
  },
  {
    id: 'gan',
    icon: Fingerprint,
    title: 'GAN Fingerprint Decoder',
    desc: 'Identify specific GAN architectures from spectral signatures',
    color: '#f59e0b',
    badge: 'Unique'
  }
];

function getTimeGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

export default function Dashboard({ user, onNavigate, onLogout }) {
  const [selectedHistory, setSelectedHistory] = useState(null);
  const scanHistory = user?.scanHistory || [];

  return (
    <div className="dashboard-page">
      <div className="bg-gradient" />
      <div className="bg-grid" />

      {/* Top Bar */}
      <header className="dash-header">
        <div className="dash-header-inner">
          <div className="logo-group">
            <motion.div
              className="logo-icon"
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ repeat: Infinity, duration: 4 }}
            >
              <Shield size={28} />
            </motion.div>
            <div>
              <h1 className="app-title" style={{ fontSize: '1.2rem' }}>DeepScan AI</h1>
              <span className="app-subtitle">Forensics Dashboard</span>
            </div>
          </div>
          <div className="dash-user-area">
            <div className="user-info">
              <span className="user-name">{user?.name || 'Analyst'}</span>
              <span className="user-plan">{user?.plan || 'Pro'} Plan</span>
            </div>
            <div className="user-avatar">{user?.avatar || 'U'}</div>
            <button className="icon-btn" onClick={onLogout} title="Sign Out">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className="dash-main">
        {/* Welcome Section */}
        <motion.section
          className="dash-welcome"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="welcome-text">
            <h2>{getTimeGreeting()}, {user?.name?.split(' ')[0] || 'Analyst'} 👋</h2>
            <p>Your forensics workspace is ready. Choose an analysis tool below to begin.</p>
          </div>
        </motion.section>

        {/* Stats Row */}
        <motion.section
          className="dash-stats"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {[
            { icon: Scan, label: 'Scans Today', value: user?.scansToday || 0, color: '#8b5cf6' },
            { icon: Activity, label: 'Total Scans', value: user?.totalScans || 0, color: '#10b981' },
            { icon: AlertTriangle, label: 'AI Detected', value: scanHistory.filter(s => s.score >= 50).length, color: '#ef4444' },
            { icon: TrendingUp, label: 'Accuracy Rate', value: '99.2%', color: '#f59e0b' }
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              className="stat-card"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15 + i * 0.08 }}
            >
              <div className="stat-card-icon" style={{ background: `${stat.color}20`, color: stat.color }}>
                <stat.icon size={20} />
              </div>
              <div className="stat-card-info">
                <span className="stat-card-value">{stat.value}</span>
                <span className="stat-card-label">{stat.label}</span>
              </div>
            </motion.div>
          ))}
        </motion.section>

        {/* Feature Cards Grid */}
        <motion.section
          className="dash-features"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <h3 className="section-title">Analysis Tools</h3>
          <div className="features-grid">
            {FEATURE_CARDS.map((feat, i) => (
              <motion.div
                key={feat.id}
                className="feature-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 + i * 0.06 }}
                whileHover={{ y: -4, borderColor: feat.color + '60' }}
                onClick={() => onNavigate(feat.id)}
                id={`feature-${feat.id}`}
              >
                <div className="feature-card-top">
                  <div className="feature-card-icon" style={{ background: `${feat.color}15`, color: feat.color }}>
                    <feat.icon size={22} />
                  </div>
                  <span className="feature-badge" style={{ background: `${feat.color}20`, color: feat.color }}>
                    {feat.badge}
                  </span>
                </div>
                <h4>{feat.title}</h4>
                <p>{feat.desc}</p>
                <div className="feature-card-action" style={{ color: feat.color }}>
                  Launch <ChevronRight size={14} />
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Scan History */}
        <motion.section
          className="dash-history"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <h3 className="section-title">Recent Scans</h3>
          {scanHistory.length > 0 ? (
            <div className="history-list">
              {scanHistory.slice(0, 10).map((scan, i) => (
                <div key={i} className="history-item">
                  <div className="history-file-icon">
                    <FileSearch size={18} />
                  </div>
                  <div className="history-details">
                    <span className="history-name">{scan.fileName}</span>
                    <span className="history-date">
                      {new Date(scan.date).toLocaleString()}
                    </span>
                  </div>
                  <div className="history-score" style={{
                    color: scan.score >= 70 ? 'var(--danger)' : scan.score >= 40 ? 'var(--warning)' : 'var(--success)'
                  }}>
                    {scan.score}%
                  </div>
                  <span className="history-verdict">
                    {scan.score >= 70 ? 'AI Detected' : scan.score >= 40 ? 'Suspicious' : 'Likely Authentic'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="history-empty">
              <Clock size={32} />
              <p>No scans yet. Choose a tool above to start analyzing files.</p>
            </div>
          )}
        </motion.section>
      </main>
    </div>
  );
}
