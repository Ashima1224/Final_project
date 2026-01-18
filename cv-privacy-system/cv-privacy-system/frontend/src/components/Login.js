// src/components/Login.js - Login Component

import React, { useState } from 'react';

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await onLogin({ username, password });
      if (!result.success) {
        setError(result.error || 'Invalid username or password');
      }
    } catch (err) {
      setError('Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = async (user, pass) => {
    setUsername(user);
    setPassword(pass);
    setLoading(true);
    setError('');
    
    try {
      const result = await onLogin({ username: user, password: pass });
      if (!result.success) {
        setError(result.error || 'Invalid credentials');
      }
    } catch (err) {
      setError('Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '48px', marginBottom: '8px' }}>🚗</div>
          <h2 style={{ marginBottom: '8px' }}>Privacy Preference System</h2>
          <p style={{ color: '#6c7086', margin: 0 }}>
            Sign in to manage your connected vehicle privacy preferences
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', marginTop: '16px', padding: '14px' }}
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div style={{ 
          marginTop: '32px', 
          padding: '20px', 
          background: '#f8f9fa', 
          borderRadius: '12px',
          fontSize: '13px'
        }}>
          <div style={{ fontWeight: '600', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🔑</span> Quick Login (Demo Accounts)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              type="button"
              onClick={() => quickLogin('alice', 'userpass')}
              className="btn btn-secondary"
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px' }}
              disabled={loading}
            >
              <span>👤 Alice (User)</span>
              <span style={{ fontSize: '12px', color: '#6c7086' }}>alice / userpass</span>
            </button>
            <button
              type="button"
              onClick={() => quickLogin('bob', 'userpass')}
              className="btn btn-secondary"
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px' }}
              disabled={loading}
            >
              <span>👤 Bob (User)</span>
              <span style={{ fontSize: '12px', color: '#6c7086' }}>bob / userpass</span>
            </button>
            <button
              type="button"
              onClick={() => quickLogin('admin', 'admin123')}
              className="btn btn-secondary"
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px' }}
              disabled={loading}
            >
              <span>🔧 Admin</span>
              <span style={{ fontSize: '12px', color: '#6c7086' }}>admin / admin123</span>
            </button>
          </div>
        </div>

        <div style={{ 
          marginTop: '24px', 
          fontSize: '12px', 
          color: '#9ca3af', 
          textAlign: 'center' 
        }}>
          Privacy Preference & Rule-Based Policy Evaluation System
        </div>
      </div>
    </div>
  );
}
