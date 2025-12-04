import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../api/api';
import './LoginSignup.css';

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      console.log('Attempting login with:', { username, password });
      const response = await authAPI.login({ username, password });
      console.log('Login response:', response);
      
      if (response && response.user) {
        // Store user data in localStorage
        localStorage.setItem('user', JSON.stringify(response.user));
        
        // Call the onLogin callback
        if (onLogin) {
          onLogin(response.user);
        }
        
        // Navigate to dashboard
        navigate('/dashboard');
      } else {
        setError('Login failed: Invalid response from server');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'Login failed. Please check your credentials and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="form-section">
        <div className="form-container">
          <div className="logo">
            <div className="logo-icon">DM</div>
          </div>
          
          <h1>Welcome Back</h1>
          <p className="subtitle">Sign in to access your company documents</p>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="login-form">
            <div className="input-group">
              <label htmlFor="username">Username</label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                required
                disabled={loading}
              />
            </div>

            <div className="input-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                disabled={loading}
              />
            </div>

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="account-link">
            Don't have an account? <Link to="/register">Sign up</Link>
          </div>

          <div className="copyright">
            © 2024 Document Management System. All rights reserved.
          </div>
        </div>
      </div>

      <div className="image-section">
        <div className="dashboard-preview">
          <h2>Document Management System</h2>
          <p>Organize, access, and manage company documents efficiently across all departments.</p>
          
          <div className="dashboard-cards">
            <div className="main-card">
              <h3>Document Statistics</h3>
              <div className="stats">
                <div className="stat-item">
                  <div className="stat-label">Total Documents</div>
                  <div className="stat-value">1,247</div>
                  <div className="stat-change">↑ 12% this month</div>
                </div>
                <div className="stat-item">
                  <div className="stat-label">Active Users</div>
                  <div className="stat-value">156</div>
                  <div className="stat-change">↑ 8% this month</div>
                </div>
              </div>
            </div>
            
            <div className="overlay-card">
              <h4>Departments</h4>
              <div className="department-list">
                <div>• Engineering</div>
                <div>• Operations</div>
                <div>• Procurement</div>
                <div>• HR</div>
                <div>• Safety</div>
                <div>• Compliance</div>
              </div>
            </div>
          </div>

          <div className="partner-logos">
            <span>Secure Document Management</span>
            <div className="logos">
              <span>🔒 AES-256 Encryption</span>
              <span>📁 Role-Based Access</span>
              <span>⚡ Real-Time Sync</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;