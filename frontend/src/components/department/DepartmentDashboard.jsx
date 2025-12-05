// components/department/DepartmentDashboard.jsx
import React, { useState, useEffect } from 'react';
import { FileText, AlertCircle, Calendar, CheckCircle, Download, Eye, Filter, Search, Clock, Users, Loader } from 'lucide-react';
import './DepartmentDashboard.css';

const DepartmentDashboard = ({ userProfile }) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchDepartmentDocuments();
  }, []);

  // Update the fetchDepartmentDocuments function
const fetchDepartmentDocuments = async () => {
  try {
    if (!userProfile?.department) {
      setLoading(false);
      return;
    }

    const response = await fetch(`http://localhost:5000/api/processing/department-documents/${userProfile.department}`, {
      method: 'GET',
      credentials: 'include', // Important for sending cookies
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      setDocuments(data);
    } else if (response.status === 403) {
      console.error('Access denied - check user permissions');
    } else {
      console.error('Failed to fetch documents:', response.statusText);
    }
  } catch (error) {
    console.error('Error fetching documents:', error);
  } finally {
    setLoading(false);
  }
};
  const filteredDocuments = documents.filter(doc => {
    if (filter === 'all') return true;
    if (filter === 'high') return doc.priority === 'high';
    if (filter === 'with-deadline') return doc.deadline;
    return true;
  }).filter(doc => 
    doc.original_filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.document_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'high': return 'priority-high';
      case 'medium': return 'priority-medium';
      case 'low': return 'priority-low';
      default: return '';
    }
  };

  const getPriorityIcon = (priority) => {
    switch(priority) {
      case 'high': return <AlertCircle size={16} className="priority-high-icon" />;
      case 'medium': return <Clock size={16} className="priority-medium-icon" />;
      case 'low': return <CheckCircle size={16} className="priority-low-icon" />;
      default: return null;
    }
  };

  const handleViewDocument = async (docId) => {
    try {
      const response = await fetch(`http://localhost:5000/api/processing/document/${docId}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const document = await response.json();
        openDocumentModal(document);
      }
    } catch (error) {
      console.error('Error viewing document:', error);
    }
  };

  const openDocumentModal = (document) => {
    const modalContent = `
      Document: ${document.original_filename}
      
      Summary:
      ${document.summary}
      
      Document Type: ${document.document_type}
      Department: ${document.department}
      Priority: ${document.priority}
      ${document.deadline ? `Deadline: ${document.deadline}` : ''}
      
      Key Points:
      • ${document.key_points?.join('\n• ') || 'None'}
      
      Action Items:
      • ${document.action_items?.join('\n• ') || 'None'}
    `;
    
    alert(modalContent);
  };

  const handleDownload = async (doc) => {
    try {
      const response = await fetch(`http://localhost:5000/api/documents/${doc.id}/download`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.download_url) {
          window.open(data.download_url, '_blank');
        }
      }
    } catch (error) {
      console.error('Error downloading document:', error);
      alert('Failed to download document');
    }
  };

  if (loading) {
    return (
      <div className="department-loading">
        <div className="loading-spinner"></div>
        <p>Loading department documents...</p>
      </div>
    );
  }

  const departmentName = userProfile?.department ? 
    userProfile.department.charAt(0).toUpperCase() + userProfile.department.slice(1) : 
    'Department';

  return (
    <div className="department-dashboard">
      <div className="department-header">
        <div className="department-title">
          <h2>{departmentName} Department Dashboard</h2>
          <p className="department-subtitle">
            {userProfile?.name ? `Welcome, ${userProfile.name}! ` : ''}
            Manage and access your department's processed documents
          </p>
        </div>
        <div className="department-stats">
          <div className="stat-card">
            <FileText size={24} className="stat-icon" />
            <div className="stat-content">
              <h3>Total Documents</h3>
              <p className="stat-number">{documents.length}</p>
            </div>
          </div>
          <div className="stat-card">
            <AlertCircle size={24} className="stat-icon" />
            <div className="stat-content">
              <h3>High Priority</h3>
              <p className="stat-number">
                {documents.filter(doc => doc.priority === 'high').length}
              </p>
            </div>
          </div>
          <div className="stat-card">
            <Calendar size={24} className="stat-icon" />
            <div className="stat-content">
              <h3>With Deadlines</h3>
              <p className="stat-number">
                {documents.filter(doc => doc.deadline).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="department-controls">
        <div className="search-bar">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search documents by name, type, or content..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        
        <div className="filter-buttons">
          <button 
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All Documents
          </button>
          <button 
            className={`filter-btn ${filter === 'high' ? 'active' : ''}`}
            onClick={() => setFilter('high')}
          >
            High Priority
          </button>
          <button 
            className={`filter-btn ${filter === 'with-deadline' ? 'active' : ''}`}
            onClick={() => setFilter('with-deadline')}
          >
            With Deadlines
          </button>
        </div>
      </div>

      <div className="documents-list">
        {filteredDocuments.length === 0 ? (
          <div className="no-documents">
            <FileText size={48} className="no-docs-icon" />
            <h3>No documents found</h3>
            <p>{documents.length === 0 ? 
              `No documents have been processed for the ${departmentName} department yet.` : 
              'No documents match your search criteria.'}
            </p>
          </div>
        ) : (
          <div className="documents-grid">
            {filteredDocuments.map((doc) => (
              <div key={doc.id} className="document-card">
                <div className="document-header">
                  <div className="document-type">
                    <FileText size={16} />
                    <span>{doc.document_type ? doc.document_type.replace('_', ' ') : 'Document'}</span>
                  </div>
                  <div className={`priority-badge ${getPriorityColor(doc.priority)}`}>
                    {getPriorityIcon(doc.priority)}
                    <span>{doc.priority ? doc.priority.toUpperCase() : 'NORMAL'}</span>
                  </div>
                </div>
                
                <div className="document-content">
                  <h3 className="document-title">{doc.original_filename}</h3>
                  <p className="document-summary">
                    {doc.summary || 'No summary available'}
                  </p>
                  
                  {doc.deadline && (
                    <div className="deadline-info">
                      <Calendar size={14} />
                      <span>Deadline: {doc.deadline}</span>
                    </div>
                  )}
                  
                  {doc.key_points && doc.key_points.length > 0 && (
                    <div className="key-points">
                      <h4>Key Points:</h4>
                      <ul>
                        {doc.key_points.slice(0, 3).map((point, idx) => (
                          <li key={idx}>{point}</li>
                        ))}
                        {doc.key_points.length > 3 && (
                          <li className="more-points">+{doc.key_points.length - 3} more</li>
                        )}
                      </ul>
                    </div>
                  )}
                  
                  <div className="document-meta">
                    <span className="meta-item">
                      <Users size={12} />
                      Processed by: {doc.processed_by || 'System'}
                    </span>
                    <span className="meta-item">
                      {new Date(doc.processed_date).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                
                <div className="document-actions">
                  <button 
                    className="action-btn view-btn"
                    onClick={() => handleViewDocument(doc.id)}
                    title="View document details"
                  >
                    <Eye size={16} />
                    <span>View Details</span>
                  </button>
                  <button 
                    className="action-btn download-btn"
                    onClick={() => handleDownload(doc)}
                    title="Download document"
                  >
                    <Download size={16} />
                    <span>Download</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div className="dashboard-footer">
        <p className="last-updated">
          Last updated: {new Date().toLocaleTimeString()}
        </p>
        <button 
          className="refresh-btn"
          onClick={fetchDepartmentDocuments}
          disabled={loading}
        >
          {loading ? <Loader size={16} className="spin" /> : 'Refresh'}
        </button>
      </div>
    </div>
  );
};

export default DepartmentDashboard;