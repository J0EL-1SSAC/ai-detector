import React, { useState, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import ScanPage from './pages/ScanPage';

export default function App() {
  const [currentPage, setCurrentPage] = useState('login');
  const [user, setUser] = useState(null);
  const [scanMode, setScanMode] = useState('scan');

  // Check for saved session
  useEffect(() => {
    const saved = localStorage.getItem('deepscan_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setUser(parsed);
        setCurrentPage('dashboard');
      } catch {
        localStorage.removeItem('deepscan_user');
      }
    }
  }, []);

  const handleLogin = useCallback((userData) => {
    setUser(userData);
    setCurrentPage('dashboard');
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('deepscan_user');
    setUser(null);
    setCurrentPage('login');
  }, []);

  const handleNavigate = useCallback((toolId) => {
    setScanMode(toolId);
    setCurrentPage('scan');
  }, []);

  const handleBackToDashboard = useCallback(() => {
    setCurrentPage('dashboard');
  }, []);

  const handleUpdateUser = useCallback((updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('deepscan_user', JSON.stringify(updatedUser));
  }, []);

  return (
    <AnimatePresence mode="wait">
      {currentPage === 'login' && (
        <LoginPage key="login" onLogin={handleLogin} />
      )}
      {currentPage === 'dashboard' && (
        <Dashboard
          key="dashboard"
          user={user}
          onNavigate={handleNavigate}
          onLogout={handleLogout}
        />
      )}
      {currentPage === 'scan' && (
        <ScanPage
          key="scan"
          scanMode={scanMode}
          onBack={handleBackToDashboard}
          user={user}
          onUpdateUser={handleUpdateUser}
        />
      )}
    </AnimatePresence>
  );
}
