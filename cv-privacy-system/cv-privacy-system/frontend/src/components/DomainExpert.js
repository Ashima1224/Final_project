// src/components/DomainExpert.js - Admin/Domain Expert Interface

import React, { useState, useEffect } from 'react';
import { getQuestionnaire, getP3PPolicies, getPETHierarchy } from '../api';

export default function DomainExpert({ user, onLogout }) {
  const [services, setServices] = useState({});
  const [p3pPolicies, setP3pPolicies] = useState({});
  const [petHierarchy, setPetHierarchy] = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [questionnaire, policies, pets] = await Promise.all([
        getQuestionnaire(),
        getP3PPolicies(),
        getPETHierarchy()
      ]);
      setServices(questionnaire);
      setP3pPolicies(policies);
      setPetHierarchy(pets);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderOverview = () => (
    <div>
      <div className="content-header">
        <h2>
          <span>🔧</span>
          System Overview
        </h2>
        <p>Privacy Preference Management System Configuration</p>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="results-panel" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '36px', fontWeight: '700', color: '#cba6f7' }}>
            {Object.keys(services).length}
          </div>
          <div style={{ color: '#6c7086' }}>Service Types</div>
        </div>
        <div className="results-panel" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '36px', fontWeight: '700', color: '#89b4fa' }}>
            {Object.values(services).reduce((acc, s) => acc + (s.questions?.length || 0), 0)}
          </div>
          <div style={{ color: '#6c7086' }}>Total Questions</div>
        </div>
        <div className="results-panel" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '36px', fontWeight: '700', color: '#a6e3a1' }}>
            {Object.keys(p3pPolicies).length}
          </div>
          <div style={{ color: '#6c7086' }}>P3P Policy Sets</div>
        </div>
        <div className="results-panel" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '36px', fontWeight: '700', color: '#f9e2af' }}>
            {petHierarchy?.hierarchy?.length || 9}
          </div>
          <div style={{ color: '#6c7086' }}>PET Types</div>
        </div>
      </div>

      {/* Service Types Grid */}
      <div className="results-panel">
        <h3 style={{ marginBottom: '16px' }}>📋 Service Types</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          {Object.entries(services).map(([key, service]) => (
            <div 
              key={key}
              style={{
                padding: '16px',
                background: '#f8f9fa',
                borderRadius: '8px',
                cursor: 'pointer',
                border: '2px solid transparent',
                transition: 'all 0.2s ease'
              }}
              onClick={() => {
                setSelectedService(key);
                setActiveTab('questions');
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = '#cba6f7'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <span style={{ fontSize: '24px' }}>{service.icon}</span>
                <div>
                  <div style={{ fontWeight: '600' }}>{service.name}</div>
                  <div style={{ fontSize: '12px', color: '#6c7086' }}>{key}</div>
                </div>
              </div>
              <div style={{ fontSize: '13px', color: '#6c7086' }}>
                {service.questions?.length || 0} questions • Click to view
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* PET Hierarchy */}
      {petHierarchy && (
        <div className="results-panel" style={{ marginTop: '24px' }}>
          <h3 style={{ marginBottom: '16px' }}>🔒 Privacy-Enhancing Techniques (PET) Hierarchy</h3>
          <p style={{ fontSize: '13px', color: '#6c7086', marginBottom: '16px' }}>
            Used for conflict resolution when multiple rules apply. Higher = stronger protection.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {(petHierarchy.hierarchy || []).map((pet, idx) => (
              <div 
                key={pet}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  background: idx === 0 ? '#fef2f2' : idx === petHierarchy.hierarchy.length - 1 ? '#f0fdf4' : '#f8f9fa',
                  borderRadius: '8px'
                }}
              >
                <div style={{
                  width: '32px',
                  height: '32px',
                  background: '#1e1e2e',
                  color: 'white',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '700',
                  fontSize: '14px'
                }}>
                  {idx + 1}
                </div>
                <div>
                  <span className={`pet-badge ${pet.toLowerCase()}`}>{pet}</span>
                  <span style={{ marginLeft: '12px', fontSize: '13px', color: '#6c7086' }}>
                    {petHierarchy.descriptions?.[pet] || ''}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderQuestions = () => {
    const service = services[selectedService];
    if (!service) {
      return (
        <div className="results-panel" style={{ textAlign: 'center', padding: '40px' }}>
          <p style={{ color: '#6c7086' }}>Select a service type to view questions</p>
        </div>
      );
    }

    return (
      <div>
        <div className="content-header">
          <h2>
            <span>{service.icon}</span>
            {service.name} - Questions
          </h2>
          <p>{service.description}</p>
        </div>

        {service.questions?.map((question, idx) => (
          <div key={question.id} className="question-card" style={{ marginBottom: '16px' }}>
            <div className="purpose">{idx + 1}. {question.purpose}</div>
            <div className="question-text" style={{ marginBottom: '16px' }}>{question.questionText}</div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {Object.entries(question.options || {}).map(([key, option]) => (
                <div 
                  key={key}
                  style={{
                    padding: '12px',
                    background: '#f8f9fa',
                    borderRadius: '8px',
                    borderLeft: `4px solid ${getEffectColor(option.effect)}`
                  }}
                >
                  <div style={{ fontWeight: '600', marginBottom: '8px' }}>
                    ({key.toUpperCase()}) {option.label}
                  </div>
                  <div style={{ fontSize: '13px' }}>
                    <span className={`pet-badge ${option.effect?.toLowerCase()}`}>{option.effect}</span>
                    <span style={{ marginLeft: '8px', color: '#6c7086' }}>
                      Priority: {option.priority}
                    </span>
                  </div>
                  {option.contexts?.length > 0 && (
                    <div style={{ fontSize: '12px', color: '#6c7086', marginTop: '8px' }}>
                      <strong>Contexts:</strong> {option.contexts.map(c => c.type).join(', ')}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div style={{ marginTop: '12px', fontSize: '12px', color: '#6c7086' }}>
              <strong>Data types affected:</strong> {question.dataTypes?.join(', ')}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderPolicies = () => (
    <div>
      <div className="content-header">
        <h2>
          <span>📄</span>
          P3P Policies
        </h2>
        <p>Platform for Privacy Preferences policies by service type</p>
      </div>

      {Object.entries(p3pPolicies).map(([serviceType, policies]) => (
        <div key={serviceType} className="results-panel" style={{ marginBottom: '16px' }}>
          <h3 style={{ 
            marginBottom: '16px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px' 
          }}>
            {services[serviceType]?.icon} {services[serviceType]?.name || serviceType}
          </h3>
          
          {Array.isArray(policies) && policies.map((policy, idx) => (
            <div 
              key={idx}
              style={{
                padding: '12px',
                background: '#f8f9fa',
                borderRadius: '8px',
                marginBottom: '8px'
              }}
            >
              <div style={{ fontWeight: '600' }}>{policy.purpose}</div>
              <div style={{ fontSize: '13px', color: '#6c7086', marginTop: '4px' }}>
                <strong>Data types:</strong> {policy.dataTypes?.join(', ')}
              </div>
              {policy.retention && (
                <div style={{ fontSize: '12px', color: '#6c7086', marginTop: '4px' }}>
                  <strong>Retention:</strong> {policy.retention}
                </div>
              )}
              {policy.recipients && (
                <div style={{ fontSize: '12px', color: '#6c7086', marginTop: '4px' }}>
                  <strong>Recipients:</strong> {policy.recipients?.join(', ')}
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );

  if (loading) {
    return (
      <div className="app-container">
        <div className="sidebar">
          <div className="sidebar-header">
            <h1>🔧 Domain Expert</h1>
          </div>
        </div>
        <div className="main-content">
          <div className="loading">
            <div className="spinner"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-header">
          <h1>
            <span>🔧</span>
            Domain Expert
          </h1>
          <p>System Administration</p>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-section-title">Navigation</div>
          
          <div
            className={`service-item ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <span className="icon">📊</span>
            <span className="name">Overview</span>
          </div>
          
          <div
            className={`service-item ${activeTab === 'questions' ? 'active' : ''}`}
            onClick={() => setActiveTab('questions')}
          >
            <span className="icon">❓</span>
            <span className="name">Questions</span>
          </div>
          
          <div
            className={`service-item ${activeTab === 'policies' ? 'active' : ''}`}
            onClick={() => setActiveTab('policies')}
          >
            <span className="icon">📄</span>
            <span className="name">P3P Policies</span>
          </div>
        </div>

        {activeTab === 'questions' && (
          <div className="sidebar-section">
            <div className="sidebar-section-title">Service Types</div>
            {Object.entries(services).map(([key, service]) => (
              <div
                key={key}
                className={`service-item ${selectedService === key ? 'active' : ''}`}
                onClick={() => setSelectedService(key)}
              >
                <span className="icon">{service.icon}</span>
                <span className="name">{service.name}</span>
                <span className="badge">{service.questions?.length || 0}</span>
              </div>
            ))}
          </div>
        )}

        <div className="user-info">
          <div className="username">{user.username}</div>
          <div className="role">Administrator</div>
          <button onClick={onLogout}>Sign Out</button>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'questions' && renderQuestions()}
        {activeTab === 'policies' && renderPolicies()}
      </div>
    </div>
  );
}

function getEffectColor(effect) {
  const colors = {
    'ALLOW': '#a6e3a1',
    'BLOCK': '#f38ba8',
    'ANONYMIZE': '#94e2d5',
    'AGGREGATE': '#f9e2af',
    'GENERALIZE': '#fab387',
    'REDUCE_PRECISION': '#cba6f7',
    'LOCAL_ONLY': '#89b4fa',
    'DELAY': '#a6adc8',
    'MASK': '#f5c2e7'
  };
  return colors[effect] || '#cdd6f4';
}
