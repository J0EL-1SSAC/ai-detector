import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Mail, Lock, User, Eye, EyeOff, ArrowRight, Fingerprint, Scan, Zap } from 'lucide-react';

export default function LoginPage({ onLogin }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate authentication
    await new Promise(r => setTimeout(r, 1500));
    const user = {
      name: formData.name || formData.email.split('@')[0],
      email: formData.email,
      avatar: formData.email.split('@')[0].charAt(0).toUpperCase(),
      plan: 'Pro',
      scansToday: 0,
      totalScans: 0,
      joinDate: new Date().toISOString(),
      scanHistory: []
    };
    localStorage.setItem('deepscan_user', JSON.stringify(user));
    setIsLoading(false);
    onLogin(user);
  };

  const handleChange = (field) => (e) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
  };

  return (
    <div className="login-page">
      <div className="login-bg-effects">
        <div className="login-orb login-orb-1" />
        <div className="login-orb login-orb-2" />
        <div className="login-orb login-orb-3" />
        <div className="bg-grid" />
      </div>

      <motion.div
        className="login-container"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
      >
        {/* Left: Branding Panel */}
        <div className="login-branding">
          <motion.div
            className="branding-content"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="branding-logo">
              <motion.div
                className="logo-icon-large"
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
              >
                <Shield size={40} />
              </motion.div>
              <h1>DeepScan AI</h1>
            </div>
            <p className="branding-tagline">Next-Generation AI Content Forensics Platform</p>

            <div className="branding-features">
              {[
                { icon: Fingerprint, title: 'GAN Fingerprinting', desc: 'Identify exact AI model architectures' },
                { icon: Scan, title: 'Error Level Analysis', desc: 'Detect manipulation via ELA & PRNU' },
                { icon: Zap, title: "Benford's Law Analysis", desc: 'Statistical anomaly detection in pixels' }
              ].map((feat, i) => (
                <motion.div
                  key={feat.title}
                  className="branding-feature"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + i * 0.15 }}
                >
                  <div className="feature-icon-box">
                    <feat.icon size={18} />
                  </div>
                  <div>
                    <strong>{feat.title}</strong>
                    <span>{feat.desc}</span>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="branding-stats">
              <div className="bstat"><strong>12M+</strong><span>Files Analyzed</span></div>
              <div className="bstat"><strong>99.2%</strong><span>Accuracy</span></div>
              <div className="bstat"><strong>50+</strong><span>AI Models</span></div>
            </div>
          </motion.div>
        </div>

        {/* Right: Auth Form */}
        <div className="login-form-panel">
          <AnimatePresence mode="wait">
            <motion.div
              key={isSignUp ? 'signup' : 'login'}
              className="login-form-content"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <h2>{isSignUp ? 'Create Account' : 'Welcome Back'}</h2>
              <p className="form-subtitle">
                {isSignUp
                  ? 'Start your AI forensics journey'
                  : 'Sign in to your forensics dashboard'}
              </p>

              <form onSubmit={handleSubmit} className="login-form">
                {isSignUp && (
                  <motion.div
                    className="form-field"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                  >
                    <label htmlFor="name">Full Name</label>
                    <div className="input-wrapper">
                      <User size={18} className="input-icon" />
                      <input
                        type="text"
                        id="name"
                        placeholder="Enter your name"
                        value={formData.name}
                        onChange={handleChange('name')}
                        required
                      />
                    </div>
                  </motion.div>
                )}

                <div className="form-field">
                  <label htmlFor="email">Email Address</label>
                  <div className="input-wrapper">
                    <Mail size={18} className="input-icon" />
                    <input
                      type="email"
                      id="email"
                      placeholder="you@example.com"
                      value={formData.email}
                      onChange={handleChange('email')}
                      required
                    />
                  </div>
                </div>

                <div className="form-field">
                  <label htmlFor="password">Password</label>
                  <div className="input-wrapper">
                    <Lock size={18} className="input-icon" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="password"
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={handleChange('password')}
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {!isSignUp && (
                  <div className="form-extras">
                    <label className="remember-me">
                      <input type="checkbox" defaultChecked />
                      <span>Remember me</span>
                    </label>
                    <a href="#" className="forgot-link">Forgot password?</a>
                  </div>
                )}

                <button
                  type="submit"
                  className="login-btn"
                  disabled={isLoading}
                  id="login-submit-btn"
                >
                  {isLoading ? (
                    <div className="btn-spinner" />
                  ) : (
                    <>
                      {isSignUp ? 'Create Account' : 'Sign In'}
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </form>

              <div className="form-divider">
                <span>or</span>
              </div>

              <div className="social-buttons">
                <button className="social-btn" type="button">
                  <svg viewBox="0 0 24 24" width="18" height="18"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                  Google
                </button>
                <button className="social-btn" type="button">
                  <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0 1 12 6.836c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.416 22 12c0-5.523-4.477-10-10-10z"/></svg>
                  GitHub
                </button>
              </div>

              <p className="switch-mode">
                {isSignUp ? 'Already have an account?' : "Don't have an account?"}
                <button
                  type="button"
                  className="switch-btn"
                  onClick={() => setIsSignUp(!isSignUp)}
                >
                  {isSignUp ? 'Sign In' : 'Sign Up'}
                </button>
              </p>
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
