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

  // In DepartmentDashboard.jsx
const fetchDepartmentDocuments = async () => {
  try {
    if (!userProfile?.department) {
      setLoading(false);
      return;
    }

    // Get token from localStorage (preferred method)
    const token = localStorage.getItem('userToken');
    
    // Alternative: get credentials from localStorage
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    
    let response;
    
    // Method 1: Using Bearer token (recommended)
    if (token && token !== 'authenticated') {
      response = await fetch(`http://localhost:5000/api/processing/department-documents/${userProfile.department}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
    }
    // Method 2: Using basic auth with username/password in headers
    else if (userData.username && userData.password) {
      const authString = btoa(`${userData.username}:${userData.password}`);
      
      response = await fetch(`http://localhost:5000/api/processing/department-documents/${userProfile.department}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${authString}`
        }
      });
    }
    // Method 3: Using query parameters (for simple backend)
    else if (userData.username && userData.password) {
      const params = new URLSearchParams({
        username: userData.username,
        password: userData.password
      });
      
      response = await fetch(`http://localhost:5000/api/processing/department-documents/${userProfile.department}?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    // Method 4: Using the existing 'authenticated' token
    else if (token === 'authenticated') {
      response = await fetch(`http://localhost:5000/api/processing/department-documents/${userProfile.department}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Token': 'authenticated',
          'X-Username': userData.username || 'admin'
        }
      });
    } else {
      console.error('No authentication credentials available');
      // Use mock data for testing
      setDocuments(getMockDocuments(userProfile.department));
      setLoading(false);
      return;
    }

    if (response.ok) {
      const data = await response.json();
      setDocuments(data);
    } else if (response.status === 401) {
      console.error('Unauthorized access - invalid credentials');
      
      // Check what the error response says
      try {
        const errorData = await response.json();
        console.error('Error details:', errorData);
      } catch (e) {
        console.error('Unauthorized without error details');
      }
      
      // Show user-friendly message
      alert('Your session has expired or credentials are invalid. Please log in again.');
      
      // Optionally: Redirect to login
      // window.location.href = '/login';
      
      // Use mock data for now
      setDocuments(getMockDocuments(userProfile.department));
    } else if (response.status === 404) {
      console.error('Endpoint not found');
      // Use mock data for testing
      setDocuments(getMockDocuments(userProfile.department));
    } else {
      console.error('Failed to fetch documents:', response.statusText);
      
      try {
        const errorData = await response.json();
        console.error('Error response:', errorData);
      } catch (e) {
        console.error('Could not parse error response');
      }
      
      // Use mock data for testing
      setDocuments(getMockDocuments(userProfile.department));
    }
  } catch (error) {
    console.error('Error fetching documents:', error);
    
    // Detailed error logging
    if (error.message.includes('Failed to fetch')) {
      console.error('Network error - make sure backend server is running on port 5000');
    } else if (error.message.includes('NetworkError')) {
      console.error('Network error - check CORS settings on backend');
    }
    
    // Use mock data for testing
    setDocuments(getMockDocuments(userProfile.department));
  } finally {
    setLoading(false);
  }
};

// Helper function to get department name
const getDepartmentName = (departmentCode) => {
  const departmentMap = {
    'engineering': 'Engineering',
    'operations': 'Operations',
    'safety': 'Safety',
    'procurement': 'Procurement',
    'hr': 'Human Resources',
    'compliance': 'Compliance',
    'admin': 'Administration'
  };
  
  return departmentMap[departmentCode] || departmentCode;
};

// Add this debugging function to test the endpoint
const testEndpointConnection = async () => {
  console.log('Testing endpoint connection...');
  
  const endpoints = [
    `http://localhost:5000/api/processing/department-documents/${userProfile.department}`,
    'http://localhost:5000/api/auth/health',
    'http://localhost:5000/api/upload-s3'
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, { method: 'GET' });
      console.log(`${endpoint}: ${response.status} ${response.statusText}`);
    } catch (error) {
      console.log(`${endpoint}: ERROR - ${error.message}`);
    }
  }
};

// Call this once on component mount to debug
useEffect(() => {
  console.log('User Profile:', userProfile);
  console.log('Department:', userProfile?.department);
  console.log('Token:', localStorage.getItem('userToken'));
  console.log('User Data:', JSON.parse(localStorage.getItem('userData') || '{}'));
  
  // Uncomment to test connection on mount
  // testEndpointConnection();
  
  fetchDepartmentDocuments();
}, [userProfile?.department]); // Re-fetch when department changes

  const getMockDocuments = (department) => {
  const departmentName = getDepartmentName(department);
  
  // Base mock documents that vary by department
  const baseDocs = [
    {
      id: 1,
      original_filename: `${departmentName} Quarterly Report.pdf`,
      document_type: 'quarterly_report',
      department: department,
      summary: `Quarterly performance report for the ${departmentName} department showing key metrics and achievements.`,
      key_points: [
        'All quarterly targets met',
        'Budget utilization at 92%',
        'Team performance rating: 4.2/5'
      ],
      action_items: [
        'Prepare annual budget forecast',
        'Schedule team review meeting',
        'Update department procedures'
      ],
      priority: 'high',
      deadline: '2024-12-31',
      processed_date: new Date().toISOString(),
      file_path: `/documents/${department}-quarterly-report.pdf`,
      file_size: '2.4 MB',
      uploaded_by: 'System Admin',
      tags: ['quarterly', 'report', 'metrics']
    },
    {
      id: 2,
      original_filename: `${departmentName} Safety Checklist.docx`,
      document_type: 'safety_checklist',
      department: department,
      summary: `Monthly safety checklist for ${departmentName} department equipment and procedures.`,
      key_points: [
        'All safety equipment inspected',
        'No violations found',
        'Staff training up to date'
      ],
      action_items: [
        'Replace two fire extinguishers',
        'Schedule safety drill',
        'Update emergency contact list'
      ],
      priority: 'medium',
      deadline: '2024-11-30',
      processed_date: new Date(Date.now() - 86400000).toISOString(), // Yesterday
      file_path: `/documents/${department}-safety-checklist.docx`,
      file_size: '1.8 MB',
      uploaded_by: 'Safety Officer',
      tags: ['safety', 'checklist', 'compliance']
    }
  ];
  
  // Department-specific additional documents
  const departmentSpecificDocs = {
    engineering: [
      {
        id: 3,
        original_filename: 'Bridge Inspection Report - Q4 2024.pdf',
        document_type: 'engineering_report',
        department: 'engineering',
        summary: 'Detailed structural assessment of Main Street Bridge with findings and recommendations.',
        key_points: [
          'Minor corrosion on support beams',
          'Load capacity within limits',
          'Recommended maintenance within 6 months'
        ],
        action_items: [
          'Schedule beam maintenance',
          'Order replacement parts',
          'Notify transportation department'
        ],
        priority: 'high',
        deadline: '2025-05-15',
        processed_date: '2024-11-20T10:30:00Z',
        file_path: '/documents/bridge-inspection-q4-2024.pdf',
        file_size: '4.2 MB',
        uploaded_by: 'Chief Engineer',
        tags: ['bridge', 'inspection', 'structural']
      }
    ],
    operations: [
      {
        id: 3,
        original_filename: 'Operations Daily Log - November.pdf',
        document_type: 'operations_log',
        department: 'operations',
        summary: 'Daily operations log showing equipment status, incidents, and maintenance activities.',
        key_points: [
          'All equipment operational',
          'No major incidents reported',
          'Preventive maintenance completed'
        ],
        action_items: [
          'Schedule generator testing',
          'Order replacement filters',
          'Update shift schedules'
        ],
        priority: 'low',
        deadline: null,
        processed_date: new Date().toISOString(),
        file_path: '/documents/ops-daily-log-nov.pdf',
        file_size: '3.1 MB',
        uploaded_by: 'Operations Manager',
        tags: ['operations', 'log', 'daily']
      }
    ]
  };
  
  return [
    ...baseDocs,
    ...(departmentSpecificDocs[department] || [])
  ];
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
      // Get credentials
      const userData = JSON.parse(localStorage.getItem('userData') || '{}');
      const credentials = {
        username: userData.username,
        password: userData.password
      };

      const response = await fetch(`http://localhost:5000/api/processing/document/${docId}?` + 
        new URLSearchParams(credentials), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
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
      // Get credentials
      const userData = JSON.parse(localStorage.getItem('userData') || '{}');
      const credentials = {
        username: userData.username,
        password: userData.password
      };

      const response = await fetch(`http://localhost:5000/api/processing/download-document/${doc.id}?` + 
        new URLSearchParams(credentials), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
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
                      Processed by: System
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