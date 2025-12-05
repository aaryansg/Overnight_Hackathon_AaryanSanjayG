// components/admin/AdminDashboard.jsx
import React, { useState, useEffect } from 'react';
import AdminSidebar from './AdminSidebar';
import AdminNavbar from './AdminNavbar';
import AdminUploadS3 from './AdminUploadS3';
import './AdminDashboard.css';

const AdminDashboard = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState({
    totalDocuments: 0,
    users: 0,
    processed: 0,
    pending: 0,
    storageUsed: '0 GB',
    departments: []
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeTab === 'dashboard') {
      fetchDashboardData();
    } else if (activeTab === 'users') {
      fetchUsers();
    }
  }, [activeTab]);

  const fetchDashboardData = async () => {
    try {
      const [docsResponse, usersResponse, processingResponse] = await Promise.all([
        fetch('http://localhost:5000/api/documents', { credentials: 'include' }),
        fetch('http://localhost:5000/api/auth/users', { credentials: 'include' }),
        fetch('http://localhost:5000/api/processing/documents/summary', { credentials: 'include' })
      ]);

      if (docsResponse.ok && usersResponse.ok) {
        const documents = await docsResponse.json();
        const userList = await usersResponse.json();
        
        const processedDocs = documents.filter(doc => doc.status === 'processed');
        const pendingDocs = documents.filter(doc => doc.status === 'pending');
        
        // Calculate storage used (assuming average 2MB per document)
        const storageMB = documents.length * 2;
        const storageUsed = storageMB > 1024 ? 
          `${(storageMB / 1024).toFixed(1)} GB` : 
          `${storageMB} MB`;

        // Get unique departments
        const departments = [...new Set(documents.map(doc => doc.department))].filter(Boolean);

        setStats({
          totalDocuments: documents.length,
          users: userList.length,
          processed: processedDocs.length,
          pending: pendingDocs.length,
          storageUsed,
          departments
        });

        // Create recent activity from documents
        const activity = documents.slice(0, 5).map(doc => ({
          id: doc.id,
          user: doc.uploaded_by_name || 'System',
          action: `Uploaded ${doc.title || doc.filename}`,
          time: new Date(doc.created_at || doc.uploaded_at).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          }),
          type: 'upload'
        }));
        
        setRecentActivity(activity);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/auth/users', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const userList = await response.json();
        setUsers(userList);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleAdminLogout = () => {
    if (onLogout) {
      onLogout();
    }
  };

  const handleUserAction = async (userId, action, userData) => {
    try {
      let response;
      
      if (action === 'edit') {
        // Implement edit functionality
        console.log('Edit user:', userId, userData);
      } else if (action === 'delete') {
        response = await fetch(`http://localhost:5000/api/auth/users/${userId}`, {
          method: 'DELETE',
          credentials: 'include'
        });
        
        if (response.ok) {
          setUsers(users.filter(user => user.id !== userId));
        }
      } else if (action === 'toggle_active') {
        response = await fetch(`http://localhost:5000/api/auth/users/${userId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            is_active: !userData.is_active
          })
        });
        
        if (response.ok) {
          const updatedUser = await response.json();
          setUsers(users.map(user => 
            user.id === userId ? updatedUser.user : user
          ));
        }
      }
    } catch (error) {
      console.error('Error performing user action:', error);
    }
  };

  const renderContent = () => {
    switch(activeTab) {
      case 'upload':
        return <AdminUploadS3 />;
      case 'users':
        return (
          <div className="admin-users">
            <div className="section-header">
              <h2>User Management</h2>
              <button className="add-user-btn" onClick={() => {/* Implement add user */}}>
                + Add User
              </button>
            </div>
            {users.length === 0 ? (
              <div className="no-data">
                <p>No users found</p>
              </div>
            ) : (
              <div className="users-table">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Department</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Joined</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(user => (
                      <tr key={user.id}>
                        <td>
                          <div className="user-cell">
                            <div className="user-avatar-small">
                              {user.username?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            <span>{user.username}</span>
                          </div>
                        </td>
                        <td>{user.email}</td>
                        <td>
                          <span className="dept-badge">{user.department}</span>
                        </td>
                        <td>
                          <span className={`role-badge ${user.role}`}>
                            {user.role}
                          </span>
                        </td>
                        <td>
                          <span className={`status-badge ${user.is_active ? 'active' : 'inactive'}`}>
                            {user.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          {user.created_at ? 
                            new Date(user.created_at).toLocaleDateString() : 
                            'N/A'
                          }
                        </td>
                        <td>
                          <div className="action-buttons">
                            <button 
                              className="action-btn edit"
                              onClick={() => handleUserAction(user.id, 'edit', user)}
                            >
                              Edit
                            </button>
                            <button 
                              className="action-btn toggle-status"
                              onClick={() => handleUserAction(user.id, 'toggle_active', user)}
                            >
                              {user.is_active ? 'Deactivate' : 'Activate'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      case 'analytics':
        return (
          <div className="admin-analytics">
            <h2>System Analytics</h2>
            <div className="analytics-grid">
              <div className="analytic-card">
                <h3>Document Processing</h3>
                <div className="chart-placeholder">
                  <p>Documents Processed: {stats.processed}</p>
                  <p>Pending: {stats.pending}</p>
                  <p>Success Rate: {stats.totalDocuments > 0 ? 
                    Math.round((stats.processed / stats.totalDocuments) * 100) : 0}%
                  </p>
                </div>
              </div>
              <div className="analytic-card">
                <h3>Department Distribution</h3>
                <div className="chart-placeholder">
                  {stats.departments.map(dept => (
                    <div key={dept} className="dept-distribution">
                      <span>{dept}:</span>
                      <span>{/* You can add count here */}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="analytic-card">
                <h3>Storage Usage</h3>
                <div className="chart-placeholder">
                  <p>Total Storage Used: {stats.storageUsed}</p>
                  <div className="storage-bar">
                    <div 
                      className="storage-fill" 
                      style={{ 
                        width: `${Math.min(100, (parseFloat(stats.storageUsed) / 10) * 100)}%` 
                      }}
                    ></div>
                  </div>
                  <p>10 GB Limit</p>
                </div>
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
                <h3>Document Processing</h3>
                <div className="toggle-switch">
                  <span>Enable AI Auto-processing</span>
                  <label className="switch">
                    <input type="checkbox" defaultChecked />
                    <span className="slider"></span>
                  </label>
                </div>
                <div className="toggle-switch">
                  <span>Enable Email Notifications</span>
                  <label className="switch">
                    <input type="checkbox" defaultChecked />
                    <span className="slider"></span>
                  </label>
                </div>
              </div>
              <div className="setting-card">
                <h3>Storage Configuration</h3>
                <div className="storage-config">
                  <div className="storage-setting">
                    <label>Maximum File Size:</label>
                    <select defaultValue="100">
                      <option value="50">50 MB</option>
                      <option value="100">100 MB</option>
                      <option value="200">200 MB</option>
                    </select>
                  </div>
                  <div className="storage-setting">
                    <label>Allowed File Types:</label>
                    <div className="file-types">
                      <span className="file-type-tag">PDF</span>
                      <span className="file-type-tag">DOCX</span>
                      <span className="file-type-tag">XLSX</span>
                      <span className="file-type-tag">Images</span>
                    </div>
                  </div>
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
                  <p className="stat-trend">
                    {stats.processed > 0 ? 
                      `${Math.round((stats.processed / stats.totalDocuments) * 100)}% processed` : 
                      'No documents processed yet'}
                  </p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon admin">
                  <span>👥</span>
                </div>
                <div className="stat-content">
                  <h3>Active Users</h3>
                  <p className="stat-number">{stats.users}</p>
                  <p className="stat-trend">
                    {stats.departments.length} departments
                  </p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon admin">
                  <span>⚡</span>
                </div>
                <div className="stat-content">
                  <h3>AI Processed</h3>
                  <p className="stat-number">{stats.processed}</p>
                  <p className="stat-trend">
                    {stats.pending} pending
                  </p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon admin">
                  <span>💾</span>
                </div>
                <div className="stat-content">
                  <h3>Storage Used</h3>
                  <p className="stat-number">{stats.storageUsed}</p>
                  <p className="stat-trend">
                    of 10 GB total
                  </p>
                </div>
              </div>
            </div>

            <div className="admin-content">
              <div className="recent-activity">
                <div className="section-header">
                  <h3>Recent Activity</h3>
                  <button className="refresh-btn" onClick={fetchDashboardData}>
                    Refresh
                  </button>
                </div>
                {recentActivity.length === 0 ? (
                  <div className="no-activity">
                    <p>No recent activity</p>
                  </div>
                ) : (
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
                )}
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
                  <button className="action-card" onClick={() => setActiveTab('analytics')}>
                    <span className="action-icon">📊</span>
                    <span className="action-text">View Analytics</span>
                  </button>
                  <button className="action-card" onClick={() => setActiveTab('settings')}>
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