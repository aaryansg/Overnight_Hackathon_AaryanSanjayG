// App.jsx
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import DocumentLibrary from './components/DocumentLibrary';
import InsightsDashboard from './components/InsightsDashboard';
import KnowledgeBase from './components/KnowledgeBase';
import Login from './components/Login';
import Register from './components/Register';
import ForgotPassword from './components/ForgotPassword';
import AdminDashboard from './components/admin/AdminDashboard';
import DepartmentDashboard from './components/department/DepartmentDashboard';
import './components/Components.css';

function App() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState('user'); // 'user' or 'admin'

  useEffect(() => {
    // Check if user is authenticated (e.g., from localStorage)
    const token = localStorage.getItem('userToken');
    const role = localStorage.getItem('userRole');
    
    if (token) {
      setIsAuthenticated(true);
      setUserRole(role || 'user');
      // Fetch user profile and documents based on role
      if (role === 'admin') {
        // Redirect to admin dashboard will be handled by router
        fetchAdminData();
      } else {
        fetchUserData();
      }
    }
  }, []);

  const fetchUserData = () => {
    // Mock API call for regular user
    setTimeout(() => {
      setUserProfile({
        name: 'John Doe',
        role: 'Infrastructure Manager',
        department: 'Operations',
        email: 'john.doe@infraco.com',
        userId: 'INF-OP-2024-001'
      });
      
      setDocuments([
        {
          id: 1,
          name: 'Bridge Inspection Report - Q4 2024.pdf',
          type: 'Engineering',
          category: 'Safety Audit',
          size: '4.2 MB',
          uploadedAt: '2024-11-20T10:30:00Z',
          uploadedBy: 'Admin User',
          status: 'processed',
          summary: 'Structural assessment of Main Street Bridge reveals minor corrosion on support beams. Recommended maintenance within 6 months.',
          insights: [
            { type: 'safety', text: 'Corrosion detected on beam #4', priority: 'medium' },
            { type: 'deadline', text: 'Next inspection due: May 15, 2025', priority: 'high' }
          ],
          processingTime: '3.2s',
          tags: ['Infrastructure', 'Safety', 'Maintenance'],
          aiScore: 94
        },
        {
          id: 2,
          name: 'Electrical Systems Annual Audit.docx',
          type: 'Compliance',
          category: 'Annual Audit',
          size: '2.8 MB',
          uploadedAt: '2024-11-19T14:45:00Z',
          uploadedBy: 'System Admin',
          status: 'processed',
          summary: 'Annual electrical systems audit shows compliance with all safety regulations. Minor recommendations for cable management improvements.',
          insights: [
            { type: 'compliance', text: 'Fully compliant with IEC 60364', priority: 'low' },
            { type: 'recommendation', text: 'Update cable routing in Section B', priority: 'medium' }
          ],
          processingTime: '2.8s',
          tags: ['Electrical', 'Compliance', 'Audit'],
          aiScore: 96
        }
      ]);
      setLoading(false);
    }, 1000);
  };

  const fetchAdminData = () => {
    // For admin, we don't need regular user data
    setTimeout(() => {
      setUserProfile({
        name: 'Administrator',
        role: 'System Administrator',
        department: 'IT',
        email: 'admin@infraco.com',
        userId: 'ADMIN-001'
      });
      setLoading(false);
    }, 500);
  };

  const handleLogin = (userData, role = 'user') => {
    localStorage.setItem('userToken', 'mock-jwt-token');
    localStorage.setItem('userRole', role);
    setIsAuthenticated(true);
    setUserRole(role);
    setUserProfile(userData);
    
    if (role === 'admin') {
      fetchAdminData();
    } else {
      fetchUserData();
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('userToken');
    localStorage.removeItem('userRole');
    localStorage.removeItem('isAuthenticated');
  
  // Clear session storage
    sessionStorage.clear();
  
  // Clear app state
    setIsAuthenticated(false);
    setUserRole('user');
    setUserProfile(null);
    setDocuments([]);
  };

  // Dashboard component for regular users
  const Dashboard = () => {
    if (!isAuthenticated || userRole === 'admin') {
      return <Navigate to={userRole === 'admin' ? '/admin/dashboard' : '/login'} />;
    }

    return (
      <div className="dashboard-overview">
        <div className="welcome-section">
          <h2>Welcome back, {userProfile?.name || 'User'}! 👋</h2>
          <p className="welcome-subtitle">
            Here's an overview of your infrastructure documents and AI insights
          </p>
        </div>
        
        <div className="stats-grid">
          <div className="stat-card">
            <h3>Total Documents</h3>
            <p className="stat-number">{documents.length}</p>
            <p className="stat-subtext">Available in your library</p>
          </div>
          <div className="stat-card">
            <h3>AI Processed</h3>
            <p className="stat-number">{documents.filter(d => d.status === 'processed').length}</p>
            <p className="stat-subtext">Documents analyzed</p>
          </div>
          <div className="stat-card">
            <h3>High Priority</h3>
            <p className="stat-number">
              {documents.reduce((count, doc) => 
                count + doc.insights?.filter(i => i.priority === 'high').length, 0
              )}
            </p>
            <p className="stat-subtext">Critical insights</p>
          </div>
          <div className="stat-card">
            <h3>AI Accuracy</h3>
            <p className="stat-number">96.7%</p>
            <p className="stat-subtext">Based on document analysis</p>
          </div>
        </div>
        
        <div className="recent-documents" style={{ marginTop: '2rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>Recent Documents</h3>
          <div style={{ 
            background: 'white', 
            borderRadius: '0.75rem', 
            border: '1px solid #e5e7eb',
            padding: '1.5rem'
          }}>
            <p style={{ color: '#6b7280' }}>Your recently accessed documents will appear here</p>
          </div>
        </div>
      </div>
    );
  };

  // Protected Route wrapper
  const ProtectedRoute = ({ children, adminOnly = false }) => {
    if (!isAuthenticated) {
      return <Navigate to="/login" />;
    }
    
    if (adminOnly && userRole !== 'admin') {
      return <Navigate to="/dashboard" />;
    }
    
    if (!adminOnly && userRole === 'admin') {
      return <Navigate to="/admin/dashboard" />;
    }
    
    return children;
  };

  const AdminProtectedRoute = ({ children }) => {
    return <ProtectedRoute adminOnly={true}>{children}</ProtectedRoute>;
  };

  return (
    <Router>
      <div className="app">
        <Routes>
          {/* Auth Routes */}
          <Route path="/login" element={
            isAuthenticated ? (
              <Navigate to={userRole === 'admin' ? '/admin/dashboard' : '/dashboard'} />
            ) : (
              <Login onLogin={handleLogin} />
            )
          } />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          
          {/* Regular User Routes */}
          <Route path="/" element={
            isAuthenticated ? (
              <Navigate to={userRole === 'admin' ? '/admin/dashboard' : '/dashboard'} />
            ) : (
              <Navigate to="/login" />
            )
          } />
          
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <>
                <div className="sidebar-container">
                  <Sidebar onLogout={handleLogout} userProfile={userProfile} />
                </div>
                <div className="main-container">
                  <Navbar userProfile={userProfile} />
                  <main className="main-content-area">
                    <Dashboard />
                  </main>
                </div>
              </>
            </ProtectedRoute>
          } />
          <Route path="/department-dashboard" element={
            <ProtectedRoute>
              <>
                <div className="sidebar-container">
                  <Sidebar onLogout={handleLogout} userProfile={userProfile} />
                </div>
                <div className="main-container">
                  <Navbar userProfile={userProfile} />
                  <main className="main-content-area">
                    <DepartmentDashboard userProfile={userProfile} />
                  </main>
                </div>
              </>
            </ProtectedRoute>
          } />
          <Route path="/library" element={
            <ProtectedRoute>
              <>
                <div className="sidebar-container">
                  <Sidebar onLogout={handleLogout} userProfile={userProfile} />
                </div>
                <div className="main-container">
                  <Navbar userProfile={userProfile} />
                  <main className="main-content-area">
                    <DocumentLibrary documents={documents} loading={loading} user={userProfile} />
                  </main>
                </div>
              </>
            </ProtectedRoute>
          } />
          
          <Route path="/insights" element={
            <ProtectedRoute>
              <>
                <div className="sidebar-container">
                  <Sidebar onLogout={handleLogout} userProfile={userProfile} />
                </div>
                <div className="main-container">
                  <Navbar userProfile={userProfile} />
                  <main className="main-content-area">
                    <InsightsDashboard documents={documents} loading={loading} />
                  </main>
                </div>
              </>
            </ProtectedRoute>
          } />
          
          <Route path="/knowledge" element={
            <ProtectedRoute>
              <>
                <div className="sidebar-container">
                  <Sidebar onLogout={handleLogout} userProfile={userProfile} />
                </div>
                <div className="main-container">
                  <Navbar userProfile={userProfile} />
                  <main className="main-content-area">
                    <KnowledgeBase documents={documents} loading={loading} />
                  </main>
                </div>
              </>
            </ProtectedRoute>
          } />
          
          {/* Admin Routes */}
          <Route path="/admin/*" element={
            <AdminProtectedRoute>
              <AdminDashboard onLogout={handleLogout} />
            </AdminProtectedRoute>
          } />
          
          {/* Fallback route */}
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;