// components/admin/AdminDashboard.jsx
import React, { useState, useEffect } from 'react';
import AdminSidebar from './AdminSidebar';
import AdminNavbar from './AdminNavbar';
import AdminUpload from './AdminUpload';
import './AdminDashboard.css';

const AdminDashboard = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState({
    totalDocuments: 1247,
    users: 42,
    processed: 1189,
    pending: 58,
    storageUsed: '4.8 GB',
    aiAccuracy: '97.2%'
  });
  const [recentActivity, setRecentActivity] = useState([
    { id: 1, user: 'John Doe', action: 'Uploaded Bridge Report', time: '10 min ago', type: 'upload' },
    { id: 2, user: 'System', action: 'AI Processing Complete', time: '25 min ago', type: 'processing' },
    { id: 3, user: 'Sarah Chen', action: 'Downloaded Audit Report', time: '1 hour ago', type: 'download' },
    { id: 4, user: 'Admin', action: 'Added new user', time: '2 hours ago', type: 'user' },
    { id: 5, user: 'System', action: 'Scheduled backup', time: '3 hours ago', type: 'system' }
  ]);

  const [users, setUsers] = useState([
    { id: 1, name: 'John Doe', email: 'john@infraco.com', role: 'Manager', status: 'active', lastActive: '2 hours ago' },
    { id: 2, name: 'Sarah Chen', email: 'sarah@infraco.com', role: 'Engineer', status: 'active', lastActive: '1 hour ago' },
    { id: 3, name: 'Mike Wilson', email: 'mike@infraco.com', role: 'Inspector', status: 'inactive', lastActive: '2 days ago' },
    { id: 4, name: 'Lisa Brown', email: 'lisa@infraco.com', role: 'Analyst', status: 'active', lastActive: '30 min ago' }
  ]);

  // Handle logout
  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    } else {
      // Fallback logout
      localStorage.removeItem('userRole');
      localStorage.removeItem('isAuthenticated');
      window.location.href = '/';
    }
  };

  // Update AdminSidebar to use onLogout
  const UpdatedAdminSidebar = () => (
    <AdminSidebar activeTab={activeTab} setActiveTab={setActiveTab} />
  );

  const renderContent = () => {
    switch(activeTab) {
      case 'upload':
        return <AdminUpload />;
      case 'users':
        return (
          <div className="admin-users">
            <div className="section-header">
              <h2>User Management</h2>
              <button className="add-user-btn">+ Add User</button>
            </div>
            <div className="users-table">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Last Active</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id}>
                      <td>
                        <div className="user-cell">
                          <div className="user-avatar-small">
                            {user.name.charAt(0)}
                          </div>
                          <span>{user.name}</span>
                        </div>
                      </td>
                      <td>{user.email}</td>
                      <td><span className="role-badge">{user.role}</span></td>
                      <td>
                        <span className={`status-badge ${user.status}`}>
                          {user.status}
                        </span>
                      </td>
                      <td>{user.lastActive}</td>
                      <td>
                        <div className="action-buttons">
                          <button className="action-btn edit">Edit</button>
                          <button className="action-btn delete">Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      case 'analytics':
        return (
          <div className="admin-analytics">
            <h2>System Analytics</h2>
            <div className="analytics-grid">
              <div className="analytic-card">
                <h3>Document Processing</h3>
                <div className="chart-placeholder"></div>
              </div>
              <div className="analytic-card">
                <h3>User Activity</h3>
                <div className="chart-placeholder"></div>
              </div>
              <div className="analytic-card">
                <h3>Storage Usage</h3>
                <div className="chart-placeholder"></div>
              </div>
            </div>
          </div>
        );
      case 'settings':
        return (
          <div className="admin-settings">
            <h2>System Settings</h2>
            <div className="settings-grid">
              <div className="setting-card">
                <h3>AI Processing</h3>
                <div className="toggle-switch">
                  <span>Enable Auto-processing</span>
                  <label className="switch">
                    <input type="checkbox" defaultChecked />
                    <span className="slider"></span>
                  </label>
                </div>
              </div>
              <div className="setting-card">
                <h3>Storage</h3>
                <div className="storage-info">
                  <div className="storage-bar">
                    <div className="storage-fill" style={{ width: '65%' }}></div>
                  </div>
                  <p>4.8 GB of 10 GB used</p>
                </div>
              </div>
            </div>
          </div>
        );
      default:
        return (
          <div className="admin-overview">
            <div className="welcome-section">
              <h1>Admin Dashboard</h1>
              <p className="subtitle">Manage documents, users, and system settings</p>
            </div>

            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon admin">
                  <span>📄</span>
                </div>
                <div className="stat-content">
                  <h3>Total Documents</h3>
                  <p className="stat-number">{stats.totalDocuments}</p>
                  <p className="stat-trend">+24 this week</p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon admin">
                  <span>👥</span>
                </div>
                <div className="stat-content">
                  <h3>Active Users</h3>
                  <p className="stat-number">{stats.users}</p>
                  <p className="stat-trend">3 online now</p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon admin">
                  <span>⚡</span>
                </div>
                <div className="stat-content">
                  <h3>AI Processed</h3>
                  <p className="stat-number">{stats.processed}</p>
                  <p className="stat-trend">{stats.aiAccuracy} accuracy</p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon admin">
                  <span>⏳</span>
                </div>
                <div className="stat-content">
                  <h3>Pending</h3>
                  <p className="stat-number">{stats.pending}</p>
                  <p className="stat-trend">Requires review</p>
                </div>
              </div>
            </div>

            <div className="admin-content">
              <div className="recent-activity">
                <h3>Recent Activity</h3>
                <div className="activity-list">
                  {recentActivity.map(activity => (
                    <div key={activity.id} className="activity-item">
                      <div className={`activity-icon ${activity.type}`}>
                        {activity.type === 'upload' && '📤'}
                        {activity.type === 'processing' && '🤖'}
                        {activity.type === 'download' && '📥'}
                        {activity.type === 'user' && '👤'}
                        {activity.type === 'system' && '⚙️'}
                      </div>
                      <div className="activity-details">
                        <div className="activity-text">
                          <strong>{activity.user}</strong> {activity.action}
                        </div>
                        <div className="activity-time">{activity.time}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="quick-actions">
                <h3>Quick Actions</h3>
                <div className="actions-grid">
                  <button className="action-card" onClick={() => setActiveTab('upload')}>
                    <span className="action-icon">📤</span>
                    <span className="action-text">Upload Documents</span>
                  </button>
                  <button className="action-card" onClick={() => setActiveTab('users')}>
                    <span className="action-icon">👥</span>
                    <span className="action-text">Manage Users</span>
                  </button>
                  <button className="action-card">
                    <span className="action-icon">📊</span>
                    <span className="action-text">View Reports</span>
                  </button>
                  <button className="action-card">
                    <span className="action-icon">⚙️</span>
                    <span className="action-text">System Settings</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
    }
  };



  const handleAdminLogout = () => {
    if (onLogout) {
      onLogout(); // This will clear all states and redirect to login
    }
  };

  return (
    <div className="admin-app">
      <AdminSidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onLogout={handleAdminLogout}
      />
      <div className="admin-main-container">
        <AdminNavbar />
        <main className="admin-content-area">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;