// components/Sidebar.jsx
import React from 'react';
import { FileText, BarChart3, Home, Database, Bell, Settings, User, LogOut } from 'lucide-react';
import './Sidebar.css';

const Sidebar = ({ activeTab, setActiveTab }) => {
  const menuItems = [
    { id: 'dashboard', icon: Home, label: 'Dashboard' },
    { id: 'library', icon: FileText, label: 'My Documents', badge: 4 },
    { id: 'insights', icon: BarChart3, label: 'AI Insights', badge: 12 },
    { id: 'knowledge', icon: Database, label: 'Knowledge Base' },
  ];

  const secondaryItems = [
    { id: 'notifications', icon: Bell, label: 'Notifications', badge: 3 },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

  const handleLogout = () => {
    console.log('Logging out...');
    // Add logout logic here
  };

  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <h2>InfraDoc AI</h2>
        <p>Document Intelligence</p>
      </div>

      <div className="sidebar-section">
        <h3 className="section-title">MAIN</h3>
        <ul className="sidebar-nav">
          {menuItems.map((item) => (
            <li
              key={item.id}
              className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              <span className="nav-icon">
                <item.icon size={20} />
              </span>
              <span className="nav-label">{item.label}</span>
              {item.badge && <span className="nav-badge">{item.badge}</span>}
            </li>
          ))}
        </ul>
      </div>

      <div className="sidebar-section">
        <h3 className="section-title">PREFERENCES</h3>
        <ul className="sidebar-nav">
          {secondaryItems.map((item) => (
            <li
              key={item.id}
              className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              <span className="nav-icon">
                <item.icon size={20} />
              </span>
              <span className="nav-label">{item.label}</span>
              {item.badge && <span className="nav-badge">{item.badge}</span>}
            </li>
          ))}
        </ul>
      </div>

      <div className="sidebar-footer">
        <div className="user-profile">
          <div className="user-avatar">
            <User size={18} />
          </div>
          <div className="user-info">
            <span className="user-name">John Doe</span>
            <span className="user-status">Infrastructure Manager</span>
          </div>
        </div>
        <button className="logout-btn" onClick={handleLogout}>
          <LogOut size={16} style={{ marginRight: '8px' }} />
          Logout
        </button>
      </div>
    </div>
  );
};

export default Sidebar;