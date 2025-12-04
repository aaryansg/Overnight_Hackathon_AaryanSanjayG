// components/Login.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, Shield } from 'lucide-react';
import './LoginSignup.css';

const Login = ({ onLogin }) => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Check for admin login
    if (formData.email === 'admin' && formData.password === 'admin') {
      // Admin login
      setTimeout(() => {
        onLogin({
          name: 'Administrator',
          role: 'System Administrator',
          department: 'IT',
          email: 'admin@infraco.com',
          userId: 'ADMIN-001'
        }, 'admin');
        navigate('/admin/dashboard');
        setLoading(false);
      }, 1000);
      return;
    }

    // Regular user login (mock)
    setTimeout(() => {
      if (formData.email && formData.password) {
        onLogin({
          name: 'John Doe',
          role: 'Infrastructure Manager',
          department: 'Operations',
          email: formData.email,
          userId: 'INF-OP-2024-001'
        });
        navigate('/dashboard');
      } else {
        setError('Please fill in all fields');
      }
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="login-page">
      {/* Left Section - Form */}
      <div className="form-section">
        <div className="form-container">
          <div className="logo">
            <div className="logo-icon">
              <Shield size={24} />
            </div>
          </div>

          <h1>Welcome to InfraDoc AI</h1>
          <p className="subtitle">Sign in to access your document intelligence dashboard</p>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="input-group">
              <label htmlFor="email">Email or Username</label>
              <input
                type="text"
                id="email"
                name="email"
                placeholder="Enter your email or username"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="input-group">
              <label htmlFor="password">Password</label>
              <div className="password-input">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
                <span 
                  className="eye-icon"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </span>
                <button 
                  type="button"
                  className="link-button forgot-link"
                  onClick={() => navigate('/forgot-password')}
                >
                  Forgot password?
                </button>
              </div>
            </div>

            <div className="checkbox-group">
              <input type="checkbox" id="remember" />
              <label htmlFor="remember">Remember me for 30 days</label>
            </div>

            <button 
              type="submit" 
              className="login-btn"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <div className="account-link">
            Don't have an account?{' '}
            <button 
              type="button"
              className="link-button"
              onClick={() => navigate('/register')}
            >
              Sign up
            </button>
          </div>

          <div className="admin-login-note" style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#6b7280' }}>
            <p><strong>Admin Login:</strong> username: <code>admin</code>, password: <code>admin</code></p>
          </div>

          <div className="copyright">
            © 2024 InfraDoc AI. All rights reserved.
          </div>
        </div>
      </div>

      {/* Right Section - Dashboard Preview */}
      <div className="image-section">
        <div className="dashboard-preview">
          <h2>Document Intelligence Platform</h2>
          <p>AI-powered insights for infrastructure management</p>
          
          <div className="dashboard-cards">
            <div className="main-card">
              <h3>InfraDoc AI Dashboard</h3>
              <div className="stats">
                <div className="stat-item">
                  <span className="stat-label">Documents</span>
                  <span className="stat-value">1,247</span>
                  <span className="stat-change">+24 this week</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">AI Insights</span>
                  <span className="stat-value">12,845</span>
                  <span className="stat-change">97.2% accuracy</span>
                </div>
              </div>
            </div>
            
            <div className="overlay-card">
              <h4>Quick Upload</h4>
              <div className="trip-form">
                <input type="text" placeholder="Document name..." />
                <button type="button">Process with AI</button>
              </div>
            </div>
          </div>

          <div className="partner-logos">
            <span>Trusted by leading infrastructure companies</span>
            <div className="logos">
              <span>InfraCo</span>
              <span>BuildRight</span>
              <span>StructSafe</span>
              <span>CityWorks</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;