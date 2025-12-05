// components/DocumentLibrary.jsx
import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  Eye, 
  Share2, 
  Calendar, 
  User, 
  Tag, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  Search,
  Loader,
  Filter,
  ChevronDown
} from 'lucide-react';

const DocumentLibrary = ({ user }) => {
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      
      // Get authentication credentials
      const token = localStorage.getItem('userToken');
      const userData = JSON.parse(localStorage.getItem('userData') || '{}');
      
      let endpoint = 'http://localhost:5000/api/documents/documents';
      let headers = {
        'Content-Type': 'application/json'
      };
      
      // Add authentication
      if (token && token !== 'null' && token !== 'authenticated') {
        headers['Authorization'] = `Bearer ${token}`;
      } else if (userData.username && userData.password) {
        // For 'authenticated' token or no token, use basic auth
        const authString = btoa(`${userData.username}:${userData.password}`);
        headers['Authorization'] = `Basic ${authString}`;
      } else if (token === 'authenticated') {
        // Use custom header for authenticated token
        headers['X-Auth-Token'] = 'authenticated';
        headers['X-Username'] = userData.username || 'admin';
      }
      
      // Add query parameters for filtering
      const params = new URLSearchParams();
      if (selectedDepartment !== 'all') {
        params.append('department', selectedDepartment);
      }
      if (selectedType !== 'all') {
        params.append('category', selectedType);
      }
      if (searchQuery) {
        params.append('search', searchQuery);
      }
      
      const url = params.toString() ? `${endpoint}?${params.toString()}` : endpoint;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: headers
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Format the documents for display
        const formattedDocs = data.map(doc => ({
          id: doc.id,
          name: doc.title || doc.filename || 'Untitled Document',
          type: doc.category || doc.file_type || 'document',
          category: doc.category || 'general',
          size: doc.file_size ? `${(doc.file_size / 1024 / 1024).toFixed(2)} MB` : 'Unknown',
          uploadedAt: doc.created_at || doc.uploaded_date || new Date().toISOString(),
          uploadedBy: doc.uploader_name || 'System',
          status: 'processed', // Assuming all fetched documents are processed
          summary: doc.description || 'No description available',
          insights: doc.insights || [
            { type: 'info', text: 'Document stored in system', priority: 'low' }
          ],
          processingTime: 'processed',
          tags: doc.tags ? doc.tags.split(',').map(tag => tag.trim()) : [],
          aiScore: 85,
          file_path: doc.file_path,
          department: doc.department,
          download_url: doc.download_url
        }));
        
        setDocuments(formattedDocs);
      } else {
        console.error('Failed to fetch documents:', response.status);
        // Fallback to mock data or show empty state
        setDocuments([]);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
      // Fallback to API endpoint for department documents
      fetchDepartmentDocuments();
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartmentDocuments = async () => {
    try {
      const userData = JSON.parse(localStorage.getItem('userData') || '{}');
      const department = userData.department || 'engineering';
      
      const endpoint = `http://localhost:5000/api/processing/department-documents/${department}`;
      const authString = btoa(`${userData.username}:${userData.password}`);
      
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${authString}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        const formattedDocs = data.map(doc => ({
          id: doc.id || Math.random().toString(36).substr(2, 9),
          name: doc.original_filename || 'Document',
          type: doc.document_type || 'document',
          category: doc.document_type || 'general',
          size: doc.file_size || 'Unknown',
          uploadedAt: doc.processed_date || new Date().toISOString(),
          uploadedBy: doc.uploaded_by || 'System',
          status: doc.status || 'processed',
          summary: doc.summary || 'No summary available',
          insights: doc.key_points ? doc.key_points.map(point => ({
            type: 'key_point',
            text: point,
            priority: doc.priority || 'medium'
          })) : [],
          processingTime: 'processed',
          tags: doc.tags || [doc.document_type],
          aiScore: 90,
          file_path: doc.file_path,
          department: doc.department,
          download_url: doc.s3_url,
          s3_key: doc.s3_key
        }));
        
        setDocuments(formattedDocs);
      }
    } catch (error) {
      console.error('Error fetching department documents:', error);
    }
  };

  // Extract unique departments and types for filters
  const departments = ['all', ...new Set(documents.map(doc => doc.department).filter(Boolean))];
  const documentTypes = ['all', ...new Set(documents.map(doc => doc.type).filter(Boolean))];

  const filteredDocuments = documents
    .filter(doc => {
      if (filter === 'all') return true;
      if (filter === 'processed') return doc.status === 'processed';
      if (filter === 'high') {
        return doc.insights?.some(i => i.priority === 'high') || 
               doc.priority === 'high';
      }
      return true;
    })
    .filter(doc => {
      if (selectedDepartment !== 'all' && doc.department !== selectedDepartment) return false;
      if (selectedType !== 'all' && doc.type !== selectedType) return false;
      if (!searchQuery) return true;
      
      const query = searchQuery.toLowerCase();
      return (
        doc.name.toLowerCase().includes(query) ||
        doc.summary.toLowerCase().includes(query) ||
        doc.type.toLowerCase().includes(query) ||
        doc.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.uploadedAt) - new Date(a.uploadedAt);
        case 'oldest':
          return new Date(a.uploadedAt) - new Date(b.uploadedAt);
        case 'name':
          return a.name.localeCompare(b.name);
        case 'size':
          return (parseFloat(b.size) || 0) - (parseFloat(a.size) || 0);
        default:
          return 0;
      }
    });

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'high': return 'priority-high';
      case 'medium': return 'priority-medium';
      case 'low': return 'priority-low';
      default: return '';
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'processed': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'processing': return <Clock className="w-4 h-4 text-blue-600" />;
      default: return <AlertCircle className="w-4 h-4 text-gray-600" />;
    }
  };

  const handleViewDocument = async (doc) => {
    try {
      if (doc.s3_url) {
        window.open(doc.s3_url, '_blank');
        return;
      }
      
      // Try to get document details from API
      const userData = JSON.parse(localStorage.getItem('userData') || '{}');
      const authString = btoa(`${userData.username}:${userData.password}`);
      
      const response = await fetch(`http://localhost:5000/api/documents/documents/${doc.id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${authString}`
        }
      });
      
      if (response.ok) {
        const document = await response.json();
        
        // Show document details in modal or alert
        const modalContent = `
          Document: ${document.title || document.filename}
          
          Description: ${document.description || 'No description'}
          
          Department: ${document.department}
          Category: ${document.category || 'N/A'}
          File Type: ${document.file_type}
          Size: ${(document.file_size / 1024 / 1024).toFixed(2)} MB
          
          Uploaded: ${new Date(document.created_at).toLocaleDateString()}
          Uploaded by: ${document.uploader_name || 'System'}
          
          ${document.tags ? `Tags: ${document.tags}` : ''}
          
          ${doc.s3_url ? `S3 URL: ${doc.s3_url}` : ''}
        `;
        
        alert(modalContent);
      } else {
        // Fallback to showing local document info
        const modalContent = `
          Document: ${doc.name}
          
          Summary: ${doc.summary}
          
          Type: ${doc.type}
          Department: ${doc.department}
          Size: ${doc.size}
          
          Uploaded: ${new Date(doc.uploadedAt).toLocaleDateString()}
          Uploaded by: ${doc.uploadedBy}
          
          ${doc.s3_url ? `S3 URL: ${doc.s3_url}` : ''}
        `;
        
        alert(modalContent);
      }
    } catch (error) {
      console.error('Error viewing document:', error);
      alert('Failed to load document details');
    }
  };

  const handleDownload = async (doc) => {
    try {
      if (doc.s3_url) {
        window.open(doc.s3_url, '_blank');
        return;
      }
      
      if (doc.id) {
        const userData = JSON.parse(localStorage.getItem('userData') || '{}');
        const authString = btoa(`${userData.username}:${userData.password}`);
        
        const response = await fetch(`http://localhost:5000/api/documents/documents/${doc.id}/download`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${authString}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.download_url) {
            window.open(data.download_url, '_blank');
            return;
          } else if (data.presigned_url) {
            window.open(data.presigned_url, '_blank');
            return;
          }
        }
      }
      
      alert('Download URL not available for this document');
    } catch (error) {
      console.error('Error downloading document:', error);
      alert('Failed to download document');
    }
  };

  const handleShare = (doc) => {
    const shareUrl = doc.s3_url || window.location.origin + `/document/${doc.id}`;
    
    if (navigator.share) {
      navigator.share({
        title: doc.name,
        text: doc.summary,
        url: shareUrl,
      });
    } else {
      navigator.clipboard.writeText(shareUrl);
      alert('Link copied to clipboard!');
    }
  };

  if (loading) {
    return (
      <div className="document-library loading">
        <div className="loading-state">
          <Loader className="loading-spinner" size={48} />
          <p>Loading your documents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="document-library">
      <div className="library-header">
        <div>
          <h2>Document Library</h2>
          <p className="library-subtitle">
            {documents.length} documents available • {filteredDocuments.length} filtered
          </p>
        </div>
        <div className="library-actions">
          <button 
            className="action-btn primary"
            onClick={fetchDocuments}
            disabled={loading}
          >
            {loading ? <Loader size={16} className="spin" /> : <Download size={16} />}
            <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      <div className="library-controls">
        <div className="search-box">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search documents by name, content, or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && fetchDocuments()}
          />
          <button 
            className="search-btn"
            onClick={fetchDocuments}
          >
            Search
          </button>
        </div>
        
        <div className="advanced-filters">
          <div className="filter-group">
            <label>Department:</label>
            <div className="select-wrapper">
              <select 
                value={selectedDepartment} 
                onChange={(e) => setSelectedDepartment(e.target.value)}
              >
                {departments.map(dept => (
                  <option key={dept} value={dept}>
                    {dept === 'all' ? 'All Departments' : dept.charAt(0).toUpperCase() + dept.slice(1)}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} />
            </div>
          </div>
          
          <div className="filter-group">
            <label>Type:</label>
            <div className="select-wrapper">
              <select 
                value={selectedType} 
                onChange={(e) => setSelectedType(e.target.value)}
              >
                {documentTypes.map(type => (
                  <option key={type} value={type}>
                    {type === 'all' ? 'All Types' : type}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} />
            </div>
          </div>
          
          <div className="filter-group">
            <label>Sort by:</label>
            <div className="select-wrapper">
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="name">Name (A-Z)</option>
                <option value="size">Size (Large to Small)</option>
              </select>
              <ChevronDown size={14} />
            </div>
          </div>
        </div>
        
        <div className="filter-tabs">
          {[
            { key: 'all', label: 'All Documents', count: documents.length },
            { key: 'processed', label: 'Processed', count: documents.filter(d => d.status === 'processed').length },
            { key: 'high', label: 'High Priority', count: documents.filter(d => 
              d.insights?.some(i => i.priority === 'high') || d.priority === 'high').length }
          ].map((tab) => (
            <button
              key={tab.key}
              className={`filter-tab ${filter === tab.key ? 'active' : ''}`}
              onClick={() => setFilter(tab.key)}
            >
              {tab.label}
              <span className="tab-badge">{tab.count}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="documents-grid">
        {filteredDocuments.length === 0 ? (
          <div className="empty-state">
            <FileText size={48} />
            <h3>No documents found</h3>
            <p>Try adjusting your search or filter criteria</p>
            <button 
              className="action-btn secondary"
              onClick={fetchDocuments}
            >
              Reload Documents
            </button>
          </div>
        ) : (
          filteredDocuments.map((doc) => (
            <div key={doc.id} className="document-card">
              <div className="document-header">
                <div className="document-icon">
                  <FileText size={24} />
                </div>
                <div className="document-title">
                  <h3>{doc.name}</h3>
                  <div className="document-meta">
                    <span className="doc-type">{doc.type}</span>
                    <span className="doc-size">{doc.size}</span>
                    <span className="doc-department">{doc.department}</span>
                    <span className="doc-status">
                      {getStatusIcon(doc.status)}
                      {doc.status === 'processed' ? 'AI Analyzed' : 'Processing'}
                    </span>
                  </div>
                </div>
                <div className="document-actions">
                  <button 
                    className="icon-btn" 
                    title="View Details"
                    onClick={() => handleViewDocument(doc)}
                  >
                    <Eye size={18} />
                  </button>
                  <button 
                    className="icon-btn" 
                    title="Download"
                    onClick={() => handleDownload(doc)}
                  >
                    <Download size={18} />
                  </button>
                  <button 
                    className="icon-btn" 
                    title="Share"
                    onClick={() => handleShare(doc)}
                  >
                    <Share2 size={18} />
                  </button>
                </div>
              </div>

              <div className="document-summary">
                <p>{doc.summary}</p>
              </div>

              {doc.insights && doc.insights.length > 0 && (
                <div className="document-insights">
                  <h4>Key Points:</h4>
                  <div className="insights-list">
                    {doc.insights.slice(0, 3).map((insight, idx) => (
                      <div 
                        key={idx} 
                        className={`insight-item ${getPriorityColor(insight.priority)}`}
                      >
                        <AlertCircle size={14} />
                        <span>{insight.text}</span>
                      </div>
                    ))}
                    {doc.insights.length > 3 && (
                      <div className="insight-more">
                        +{doc.insights.length - 3} more insights
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="document-footer">
                {doc.tags && doc.tags.length > 0 && (
                  <div className="doc-tags">
                    {doc.tags.slice(0, 3).map((tag, idx) => (
                      <span key={idx} className="tag">
                        <Tag size={12} />
                        {tag}
                      </span>
                    ))}
                    {doc.tags.length > 3 && (
                      <span className="tag-more">+{doc.tags.length - 3}</span>
                    )}
                  </div>
                )}
                <div className="doc-info">
                  <span className="upload-info">
                    <User size={12} />
                    {doc.uploadedBy}
                  </span>
                  <span className="upload-date">
                    <Calendar size={12} />
                    {new Date(doc.uploadedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default DocumentLibrary;