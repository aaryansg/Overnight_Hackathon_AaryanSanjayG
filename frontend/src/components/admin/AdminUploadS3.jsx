// components/admin/AdminUploadS3.jsx
import React, { useState } from 'react';
import { Upload, File, X, AlertCircle, CheckCircle, Loader, Database, Shield } from 'lucide-react';
import axios from 'axios';
import apiClient from './apiClient';
import './AdminUploadS3.css';

const AdminUploadS3 = () => {
  const [files, setFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [processingResults, setProcessingResults] = useState(null);

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    const newFiles = selectedFiles.map(file => ({
      id: Date.now() + Math.random(),
      name: file.name,
      size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
      type: file.type,
      file: file,
      status: 'pending',
      progress: 0
    }));
    setFiles([...files, ...newFiles]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    const newFiles = droppedFiles.map(file => ({
      id: Date.now() + Math.random(),
      name: file.name,
      size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
      type: file.type,
      file: file,
      status: 'pending',
      progress: 0
    }));
    setFiles([...files, ...newFiles]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const removeFile = (id) => {
    setFiles(files.filter(file => file.id !== id));
  };
const uploadFileToS3 = async (file) => {
  const formData = new FormData();
  formData.append('file', file.file);
  formData.append('title', file.name);
  formData.append('description', `Uploaded via Admin Dashboard - ${new Date().toLocaleString()}`);

  try {
    const response = await apiClient.post('/upload-s3', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        setFiles(prevFiles => prevFiles.map(f => 
          f.id === file.id ? { ...f, progress, status: 'uploading' } : f
        ));
      }
    });

    return { success: true, data: response.data };
  } catch (error) {
    console.error('Upload error:', error);
    return { 
      success: false, 
      error: error.response?.data?.error || error.message || 'Upload failed' 
    };
  }
};

// Add a function to check session before upload
const checkSessionBeforeUpload = async () => {
  try {
    const response = await fetch('http://localhost:5000/api/auth/check-session', {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      // Session invalid, redirect to login
      alert('Please login again to continue.');
      window.location.href = '/login';
      return false;
    }
    
    const data = await response.json();
    if (!data.authenticated || data.user.role !== 'admin') {
      alert('Admin access required. Please login as admin.');
      window.location.href = '/login';
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Session check failed:', error);
    return false;
  }
};


  const triggerLLMProcessing = async () => {
  try {
    const response = await fetch('http://localhost:5000/api/processing/trigger-processing', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({})
    });

    if (response.ok) {
      const results = await response.json();
      setProcessingResults(results);
      return results;
    } else {
      const errorText = await response.text();
      console.error('Processing failed:', errorText);
      throw new Error(`Processing failed: ${response.status} ${errorText}`);
    }
  } catch (error) {
    console.error('Processing error:', error);
    setUploadStatus(`Processing error: ${error.message}`);
    return null;
  }
};

const handleUpload = async () => {
  if (files.length === 0) return;
  
  // Check session first
  const sessionValid = await checkSessionBeforeUpload();
  if (!sessionValid) return;
  
  setUploading(true);
  setUploadStatus('Starting upload to AWS S3...');
  
  const results = [];
  
  for (const file of files) {
    setUploadStatus(`Uploading: ${file.name}`);
    const result = await uploadFileToS3(file);
    results.push(result);
    
    if (result.success) {
      setFiles(prevFiles => prevFiles.map(f => 
        f.id === file.id ? { ...f, status: 'success', progress: 100 } : f
      ));
    } else {
      setFiles(prevFiles => prevFiles.map(f => 
        f.id === file.id ? { ...f, status: 'error', error: result.error } : f
      ));
    }
  }
  
  setUploading(false);
  
  const successfulUploads = results.filter(r => r.success).length;
  const failedUploads = results.filter(r => !r.success).length;
  
  if (successfulUploads > 0) {
    setUploadStatus(`Successfully uploaded ${successfulUploads} file(s) to S3`);
    
    // Trigger processing after successful upload
    try {
      const processResponse = await fetch('http://localhost:5000/api/processing/trigger-processing', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({})
      });

      if (processResponse.ok) {
        const processResult = await processResponse.json();
        setProcessingResults(processResult.result);
        setUploadStatus(`AI processing started for ${successfulUploads} document(s)`);
      }
    } catch (error) {
      console.error('Processing trigger failed:', error);
    }
  }
  
  if (failedUploads > 0) {
    setUploadStatus(`Uploaded ${successfulUploads} files, failed: ${failedUploads}`);
  }
  
  // Clear files after delay
  setTimeout(() => {
    if (failedUploads === 0) {
      setFiles([]);
      setUploadStatus('');
    }
  }, 5000);
};

  const getStatusColor = (status) => {
    switch(status) {
      case 'success': return 'success-color';
      case 'error': return 'error-color';
      case 'uploading': return 'uploading-color';
      default: return '';
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'success': return <CheckCircle size={16} className="success-color" />;
      case 'error': return <AlertCircle size={16} className="error-color" />;
      case 'uploading': return <Loader size={16} className="uploading-color spin" />;
      default: return null;
    }
  };

  return (
    <div className="admin-upload-s3">
      <div className="admin-upload-header">
        <div className="header-icon">
          <Database size={32} />
        </div>
        <div>
          <h2>Upload Documents to AWS S3</h2>
          <p className="upload-subtitle">
            Upload documents to AWS S3. AI will automatically analyze, categorize, 
            and route them to appropriate departments
          </p>
        </div>
      </div>

      <div className="upload-instructions">
        <div className="instruction-card">
          <Shield size={20} />
          <div>
            <h4>AI-Powered Processing</h4>
            <p>The system will automatically extract metadata, categorize documents, 
            determine priority, and route to correct departments.</p>
          </div>
        </div>
      </div>

      <div className="upload-content">
        <div className="upload-section">
          <div 
            className={`admin-upload-dropzone ${isDragging ? 'active' : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => document.getElementById('s3-file-input').click()}
          >
            <input
              id="s3-file-input"
              type="file"
              multiple
              className="upload-input"
              onChange={handleFileSelect}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png"
            />
            <Upload size={48} className="dropzone-icon" />
            <h3>Drop files here or click to browse</h3>
            <p>
              Supports PDF, DOCX, XLSX, PPT, Images up to 100MB each
            </p>
            <p className="s3-note">
              Files will be uploaded to AWS S3 and processed by AI
            </p>
          </div>

          {files.length > 0 && (
            <div className="admin-files-list">
              <h4>Selected Files ({files.length})</h4>
              <div className="admin-files-grid">
                {files.map(file => (
                  <div key={file.id} className="admin-file-item">
                    <File size={20} className="file-icon" />
                    <div className="file-info">
                      <span className="file-name">{file.name}</span>
                      <span className="file-size">{file.size}</span>
                      {file.status !== 'pending' && (
                        <div className="file-status">
                          {getStatusIcon(file.status)}
                          <span className={getStatusColor(file.status)}>
                            {file.status === 'uploading' ? `${file.progress}%` : file.status}
                          </span>
                        </div>
                      )}
                    </div>
                    {file.status === 'pending' && (
                      <button 
                        className="remove-btn"
                        onClick={() => removeFile(file.id)}
                        disabled={uploading}
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="admin-upload-actions">
            <button 
              className="admin-upload-btn"
              onClick={handleUpload}
              disabled={files.length === 0 || uploading}
            >
              {uploading ? 'Uploading & Processing...' : `Upload & Process ${files.length} Files`}
            </button>
            
            {uploadStatus && (
              <div className={`upload-status ${uploading ? 'processing' : ''}`}>
                <AlertCircle size={16} />
                <span>{uploadStatus}</span>
              </div>
            )}
          </div>
        </div>

        {processingResults && (
          <div className="processing-results">
            <h3>AI Processing Results</h3>
            <div className="results-summary">
              <div className="result-stat">
                <h4>Total Processed</h4>
                <p className="result-number">{processingResults.summary?.total_processed || 0}</p>
              </div>
              <div className="result-stat">
                <h4>Departments</h4>
                <p className="result-number">
                  {Object.keys(processingResults.summary?.by_department || {}).length}
                </p>
              </div>
              <div className="result-stat">
                <h4>Processing Time</h4>
                <p className="result-number">~3-5s per doc</p>
              </div>
            </div>
            
            <div className="department-breakdown">
              <h4>Documents by Department:</h4>
              {Object.entries(processingResults.summary?.by_department || {}).map(([dept, count]) => (
                <div key={dept} className="dept-item">
                  <span className="dept-name">{dept}</span>
                  <span className="dept-count">{count} documents</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminUploadS3;