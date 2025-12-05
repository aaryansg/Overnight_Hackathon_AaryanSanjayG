// components/admin/AdminUploadS3.jsx
import React, { useState } from 'react';
import { Upload, File, X, AlertCircle, Folder, Eye, EyeOff, Users, CheckCircle, Loader } from 'lucide-react';
import axios from 'axios';
import './AdminUploadS3.css';

const AdminUploadS3 = () => {
  const [files, setFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [uploadSettings, setUploadSettings] = useState({
    autoProcess: true,
    visibility: 'private',
    category: 'engineering',
    notifyUsers: false,
    department: 'engineering'
  });
  const [uploadStatus, setUploadStatus] = useState('');

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

  const handleSettingChange = (key, value) => {
    setUploadSettings({
      ...uploadSettings,
      [key]: value
    });
  };

  const uploadFileToS3 = async (file) => {
    const formData = new FormData();
    formData.append('file', file.file);
    formData.append('title', file.name);
    formData.append('department', uploadSettings.department);
    formData.append('category', uploadSettings.category);
    formData.append('tags', 'uploaded-from-admin');
    formData.append('description', `Uploaded via Admin Dashboard - ${new Date().toLocaleString()}`);

    try {
      const response = await axios.post('http://localhost:5000/api/upload-s3', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        withCredentials: true, // Important for session cookies
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
        error: error.response?.data?.error || 'Upload failed' 
      };
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    
    setUploading(true);
    setUploadStatus('Starting upload...');
    
    const results = [];
    
    for (const file of files) {
      setUploadStatus(`Uploading: ${file.name}`);
      const result = await uploadFileToS3(file);
      results.push(result);
      
      // Update file status
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
    
    setUploadStatus(`Upload complete! ${successfulUploads} successful, ${failedUploads} failed`);
    
    // Clear files after 5 seconds if all successful
    if (failedUploads === 0) {
      setTimeout(() => {
        setFiles([]);
        setUploadStatus('');
      }, 5000);
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'success': return 'text-green-600';
      case 'error': return 'text-red-600';
      case 'uploading': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'success': return <CheckCircle size={16} className="text-green-600" />;
      case 'error': return <AlertCircle size={16} className="text-red-600" />;
      case 'uploading': return <Loader size={16} className="text-blue-600 animate-spin" />;
      default: return null;
    }
  };

  return (
    <div className="admin-upload-s3">
      <div className="admin-upload-header">
        <h2>Upload Documents to AWS S3</h2>
        <p className="upload-subtitle">
          Upload infrastructure documents directly to AWS S3 for secure storage and AI processing
        </p>
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
            <Upload size={48} style={{ color: '#6b7280', marginBottom: '1rem' }} />
            <h3 style={{ marginBottom: '0.5rem', color: '#1f2937' }}>
              Drop files here or click to browse
            </h3>
            <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
              Supports PDF, DOCX, XLSX, PPT, Images up to 100MB each
            </p>
            <p style={{ color: '#3b82f6', fontSize: '0.75rem', marginTop: '0.5rem' }}>
              Files will be uploaded to AWS S3 Bucket
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
              {uploading ? 'Uploading to S3...' : `Upload ${files.length} Files to S3`}
            </button>
            
            {uploadStatus && (
              <div className="upload-status">
                <AlertCircle size={16} />
                <span>{uploadStatus}</span>
              </div>
            )}
          </div>
        </div>

        <div className="upload-settings">
          <h3>Upload Settings</h3>
          
          <div className="setting-group">
            <h4>Department</h4>
            <select 
              className="category-select"
              value={uploadSettings.department}
              onChange={(e) => handleSettingChange('department', e.target.value)}
            >
              <option value="engineering">Engineering</option>
              <option value="operations">Operations</option>
              <option value="procurement">Procurement</option>
              <option value="safety">Safety</option>
              <option value="compliance">Compliance</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div className="setting-group">
            <h4>Category</h4>
            <select 
              className="category-select"
              value={uploadSettings.category}
              onChange={(e) => handleSettingChange('category', e.target.value)}
            >
              <option value="engineering">Engineering Reports</option>
              <option value="compliance">Compliance Documents</option>
              <option value="safety">Safety Audits</option>
              <option value="maintenance">Maintenance Records</option>
              <option value="planning">Planning Documents</option>
              <option value="financial">Financial Reports</option>
            </select>
          </div>

          <div className="setting-group">
            <h4>Document Visibility</h4>
            <div className="visibility-options">
              <label className={`visibility-option ${uploadSettings.visibility === 'public' ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="visibility"
                  value="public"
                  checked={uploadSettings.visibility === 'public'}
                  onChange={(e) => handleSettingChange('visibility', e.target.value)}
                />
                <Eye size={16} />
                <span>Public (All users)</span>
              </label>
              <label className={`visibility-option ${uploadSettings.visibility === 'private' ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="visibility"
                  value="private"
                  checked={uploadSettings.visibility === 'private'}
                  onChange={(e) => handleSettingChange('visibility', e.target.value)}
                />
                <EyeOff size={16} />
                <span>Private (Admin only)</span>
              </label>
              <label className={`visibility-option ${uploadSettings.visibility === 'restricted' ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="visibility"
                  value="restricted"
                  checked={uploadSettings.visibility === 'restricted'}
                  onChange={(e) => handleSettingChange('visibility', e.target.value)}
                />
                <Users size={16} />
                <span>Restricted (Department only)</span>
              </label>
            </div>
          </div>

          <div className="setting-group">
            <h4>Processing Options</h4>
            <label className="setting-label">
              <input
                type="checkbox"
                checked={uploadSettings.autoProcess}
                onChange={(e) => handleSettingChange('autoProcess', e.target.checked)}
              />
              <span>Enable AI auto-processing</span>
            </label>
            <label className="setting-label">
              <input
                type="checkbox"
                checked={uploadSettings.notifyUsers}
                onChange={(e) => handleSettingChange('notifyUsers', e.target.checked)}
              />
              <span>Notify relevant users via email</span>
            </label>
          </div>

          <div className="setting-summary">
            <h4>S3 Upload Summary</h4>
            <ul>
              <li>• Files are encrypted at rest in S3</li>
              <li>• Automatic versioning enabled</li>
              <li>• 99.9% durability guarantee</li>
              <li>• Files are accessible via secure URLs</li>
              <li>• AI processing starts after upload</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminUploadS3;