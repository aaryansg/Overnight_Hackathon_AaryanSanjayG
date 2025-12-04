// src/components/InsightsDashboard.jsx
import React, { useState } from 'react';
import { Brain, TrendingUp, AlertTriangle, Calendar, FileText, BarChart, Download, Filter } from 'lucide-react';

const InsightsDashboard = ({ documents, loading }) => {
  const [timeRange, setTimeRange] = useState('month');
  const [insightType, setInsightType] = useState('all');

  if (loading) {
    return (
      <div className="insights-dashboard loading">
        <div className="loading-spinner"></div>
        <p>Loading insights...</p>
      </div>
    );
  }

  // Calculate insights from documents
  const allInsights = documents.flatMap(doc => 
    doc.insights?.map(insight => ({
      ...insight,
      documentName: doc.name,
      documentType: doc.type,
      date: doc.uploadedAt
    })) || []
  );

  const highPriorityInsights = allInsights.filter(i => i.priority === 'high');
  const mediumPriorityInsights = allInsights.filter(i => i.priority === 'medium');
  const lowPriorityInsights = allInsights.filter(i => i.priority === 'low');

  const insightsByType = {
    safety: allInsights.filter(i => i.type === 'safety'),
    compliance: allInsights.filter(i => i.type === 'compliance'),
    deadline: allInsights.filter(i => i.type === 'deadline'),
    cost: allInsights.filter(i => i.type === 'cost'),
    action: allInsights.filter(i => i.type === 'action')
  };

  return (
    <div className="insights-dashboard">
      <div className="dashboard-header">
        <div>
          <h2>AI Insights Dashboard</h2>
          <p className="dashboard-subtitle">
            Intelligent analysis of your infrastructure documents
          </p>
        </div>
        <div className="header-actions">
          <div className="time-filter">
            <Filter size={16} />
            <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)}>
              <option value="week">Last 7 days</option>
              <option value="month">Last 30 days</option>
              <option value="quarter">Last 90 days</option>
              <option value="year">Last year</option>
            </select>
          </div>
          <button className="export-btn">
            <Download size={16} />
            <span>Export Insights</span>
          </button>
        </div>
      </div>

      <div className="insights-stats">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#dbeafe' }}>
            <Brain size={24} color="#1d4ed8" />
          </div>
          <div className="stat-content">
            <h3>Total Insights</h3>
            <p className="stat-number">{allInsights.length}</p>
            <p className="stat-trend">+12% from last month</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fef3c7' }}>
            <AlertTriangle size={24} color="#d97706" />
          </div>
          <div className="stat-content">
            <h3>High Priority</h3>
            <p className="stat-number">{highPriorityInsights.length}</p>
            <p className="stat-trend">Require immediate attention</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#dcfce7' }}>
            <Calendar size={24} color="#16a34a" />
          </div>
          <div className="stat-content">
            <h3>Upcoming Deadlines</h3>
            <p className="stat-number">{insightsByType.deadline.length}</p>
            <p className="stat-trend">Next deadline in 14 days</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#f3e8ff' }}>
            <TrendingUp size={24} color="#7c3aed" />
          </div>
          <div className="stat-content">
            <h3>AI Accuracy</h3>
            <p className="stat-number">96.7%</p>
            <p className="stat-trend">Based on 1,240 documents</p>
          </div>
        </div>
      </div>

      <div className="insights-content">
        <div className="insights-main">
          <div className="section-header">
            <h3>Recent Critical Insights</h3>
            <div className="type-filter">
              {['all', 'safety', 'compliance', 'deadline', 'action'].map(type => (
                <button
                  key={type}
                  className={`type-btn ${insightType === type ? 'active' : ''}`}
                  onClick={() => setInsightType(type)}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="insights-list">
            {allInsights
              .filter(insight => insightType === 'all' || insight.type === insightType)
              .sort((a, b) => {
                const priorityOrder = { high: 3, medium: 2, low: 1 };
                return priorityOrder[b.priority] - priorityOrder[a.priority];
              })
              .slice(0, 8)
              .map((insight, index) => (
                <div key={index} className="insight-card">
                  <div className="insight-header">
                    <div className={`priority-indicator ${insight.priority}`}></div>
                    <div className="insight-type">{insight.type}</div>
                    <div className="insight-document">
                      <FileText size={14} />
                      {insight.documentName.substring(0, 30)}...
                    </div>
                  </div>
                  <div className="insight-text">{insight.text}</div>
                  <div className="insight-footer">
                    <span className="insight-date">
                      {new Date(insight.date).toLocaleDateString()}
                    </span>
                    <span className={`priority-badge ${insight.priority}`}>
                      {insight.priority.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>

        <div className="insights-sidebar">
          <div className="sidebar-section">
            <h4>Insights by Type</h4>
            <div className="type-distribution">
              {Object.entries(insightsByType).map(([type, insights]) => (
                <div key={type} className="type-item">
                  <div className="type-label">
                    <div className="type-color" style={{ backgroundColor: getTypeColor(type) }}></div>
                    <span>{type.charAt(0).toUpperCase() + type.slice(1)}</span>
                  </div>
                  <div className="type-count">{insights.length}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="sidebar-section">
            <h4>Priority Distribution</h4>
            <div className="priority-chart">
              <div className="chart-bar high" style={{ width: `${(highPriorityInsights.length / allInsights.length) * 100 || 0}%` }}>
                High ({highPriorityInsights.length})
              </div>
              <div className="chart-bar medium" style={{ width: `${(mediumPriorityInsights.length / allInsights.length) * 100 || 0}%` }}>
                Medium ({mediumPriorityInsights.length})
              </div>
              <div className="chart-bar low" style={{ width: `${(lowPriorityInsights.length / allInsights.length) * 100 || 0}%` }}>
                Low ({lowPriorityInsights.length})
              </div>
            </div>
          </div>

          <div className="sidebar-section">
            <h4>Top Document Types</h4>
            <div className="doc-types">
              {Array.from(new Set(documents.map(d => d.type))).slice(0, 5).map(type => (
                <div key={type} className="doc-type-item">
                  <span>{type}</span>
                  <span>{documents.filter(d => d.type === type).length} docs</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const getTypeColor = (type) => {
  const colors = {
    safety: '#ef4444',
    compliance: '#3b82f6',
    deadline: '#f59e0b',
    cost: '#10b981',
    action: '#8b5cf6'
  };
  return colors[type] || '#6b7280';
};

export default InsightsDashboard;