// components/DocumentLibrary.jsx
// components/DocumentLibrary.jsx
import React, { useState } from 'react';
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
  Search  // ← ADD THIS!
} from 'lucide-react';

const DocumentLibrary = ({ documents, loading, user }) => {
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredDocuments = documents.filter(doc => {
    if (filter === 'all') return true;
    if (filter === 'processed') return doc.status === 'processed';
    if (filter === 'processing') return doc.status === 'processing';
    if (filter === 'high') return doc.insights?.some(i => i.priority === 'high');
    return true;
  }).filter(doc => 
    doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'processed': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'processing': return <Clock className="w-4 h-4 text-blue-600" />;
      default: return <AlertCircle className="w-4 h-4 text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <div className="document-library">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading your documents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="document-library">
      <div className="library-header">
        <div>
          <h2>My Documents</h2>
          <p className="library-subtitle">
            {documents.length} documents available • Last updated: Today, 10:30 AM
          </p>
        </div>
        <div className="library-actions">
          <button className="action-btn primary">
            <Download size={16} />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      <div className="library-controls">
        <div className="search-box">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search documents by name, type, or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="filter-tabs">
          {['all', 'processed', 'processing', 'high'].map((tab) => (
            <button
              key={tab}
              className={`filter-tab ${filter === tab ? 'active' : ''}`}
              onClick={() => setFilter(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {tab === 'high' && (
                <span className="tab-badge">
                  {documents.reduce((count, doc) => 
                    count + doc.insights?.filter(i => i.priority === 'high').length, 0
                  )}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="documents-grid">
        {filteredDocuments.map((doc) => (
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
                  <span className="doc-status">
                    {getStatusIcon(doc.status)}
                    {doc.status === 'processed' ? 'AI Analyzed' : 'Processing'}
                  </span>
                </div>
              </div>
              <div className="document-actions">
                <button className="icon-btn" title="View">
                  <Eye size={18} />
                </button>
                <button className="icon-btn" title="Download">
                  <Download size={18} />
                </button>
                <button className="icon-btn" title="Share">
                  <Share2 size={18} />
                </button>
              </div>
            </div>

            <div className="document-summary">
              <p>{doc.summary}</p>
            </div>

            <div className="document-insights">
              <h4>AI Insights:</h4>
              <div className="insights-list">
                {doc.insights?.slice(0, 3).map((insight, idx) => (
                  <div 
                    key={idx} 
                    className={`insight-item ${getPriorityColor(insight.priority)}`}
                  >
                    <AlertCircle size={14} />
                    <span>{insight.text}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="document-footer">
              <div className="doc-tags">
                {doc.tags?.map((tag, idx) => (
                  <span key={idx} className="tag">
                    <Tag size={12} />
                    {tag}
                  </span>
                ))}
              </div>
              <div className="doc-info">
                <span className="upload-info">
                  <User size={12} />
                  Uploaded by: {doc.uploadedBy}
                </span>
                <span className="upload-date">
                  <Calendar size={12} />
                  {new Date(doc.uploadedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredDocuments.length === 0 && (
        <div className="empty-state">
          <FileText size={48} />
          <h3>No documents found</h3>
          <p>Try adjusting your search or filter criteria</p>
        </div>
      )}
    </div>
  );
};

export default DocumentLibrary;