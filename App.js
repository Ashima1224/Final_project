// src/App.js - Main Application Component

import React, { useState, useEffect } from 'react';
import { login as apiLogin, logout as apiLogout } from './api';
import Login from './components/Login';
import UserDashboard from './components/UserDashboard';
import DomainExpert from './components/DomainExpert';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check for stored session on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('cv-privacy-user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        localStorage.removeItem('cv-privacy-user');
      }
    }
    setLoading(false);
  }, []);

  const handleLogin = async (credentials) => {
    try {
      const userData = await apiLogin(credentials.username, credentials.password);
      setUser(userData);
      localStorage.setItem('cv-privacy-user', JSON.stringify(userData));
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const handleLogout = async () => {
    try {
      await apiLogout();
    } catch (e) {
      // Ignore logout errors
    }
    setUser(null);
    localStorage.removeItem('cv-privacy-user');
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1e1e2e 0%, #313244 100%)'
      }}>
        <div style={{ textAlign: 'center', color: 'white' }}>
          <div className="spinner" style={{ 
            width: '50px', 
            height: '50px', 
            border: '4px solid rgba(255,255,255,0.2)',
            borderTopColor: '#cba6f7',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }}></div>
          <div>Loading...</div>
        </div>
      </div>
    );
  }

  // Not logged in - show login
  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  // Admin user - show domain expert interface
  if (user.role === 'admin') {
    return <DomainExpert user={user} onLogout={handleLogout} />;
  }

  // Regular user - show user dashboard
  return <UserDashboard user={user} onLogout={handleLogout} />;
}

export default App;
