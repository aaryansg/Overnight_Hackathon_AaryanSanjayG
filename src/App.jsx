// App.jsx
import React, { useState, useEffect } from 'react';
import './App.css';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import DocumentLibrary from './components/DocumentLibrary';
import InsightsDashboard from './components/InsightsDashboard';
import KnowledgeBase from './components/KnowledgeBase';
import './components/Components.css';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    // Mock API call
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
  }, []);

  const renderContent = () => {
    switch(activeTab) {
      case 'library':
        return <DocumentLibrary documents={documents} loading={loading} user={userProfile} />;
      case 'insights':
        return <InsightsDashboard documents={documents} loading={loading} />;
      case 'knowledge':
        return <KnowledgeBase documents={documents} loading={loading} />;
      case 'dashboard':
      default:
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
    }
  };

  return (
    <div className="app">
      <div className="sidebar-container">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>
      <div className="main-container">
        <Navbar userProfile={userProfile} />
        <main className="main-content-area">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

export default App;