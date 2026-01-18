// src/components/UserDashboard.js - Main Dashboard with VS Code-like Sidebar Navigation

import React, { useState, useEffect, useCallback } from 'react';
import { getQuestionnaire, getServiceQuestionnaire, evaluatePreferences, generateRuleset } from '../api';
import PreferenceBuilder from './PreferenceBuilder';
import XPrefBuilder from './XPrefBuilder';
import ResultDisplay from './ResultDisplay';
import Results from './Results';

const SERVICE_ICONS = {
  map: '🗺️',
  emergency: '🚨',
  safety: '🛡️',
  oem: '🔧',
  thirdParty: '🔗',
  app: '📱',
  logistic: '🚚'
};

export default function UserDashboard({ user, onLogout }) {
  const [services, setServices] = useState({});
  const [selectedService, setSelectedService] = useState(null);
  const [serviceData, setServiceData] = useState(null);
  const [evaluationResult, setEvaluationResult] = useState(null);
  const [generatedRules, setGeneratedRules] = useState(null);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [conflictData, setConflictData] = useState(null);
  const [completedServices, setCompletedServices] = useState(new Set());
  const [activeTab, setActiveTab] = useState('questionnaire'); // questionnaire, rules, results, stream

  // Load all services on mount
  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      const data = await getQuestionnaire();
      setServices(data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load questionnaire:', error);
      setLoading(false);
    }
  };

  // Load specific service when selected
  const handleServiceSelect = useCallback(async (serviceType) => {
    setSelectedService(serviceType);
    setEvaluationResult(null);
    setGeneratedRules(null);
    setActiveTab('questionnaire');
    
    try {
      const data = await getServiceQuestionnaire(serviceType);
      setServiceData(data);
    } catch (error) {
      console.error('Failed to load service:', error);
    }
  }, []);

  // Handle preference save
  const handleSave = useCallback((result) => {
    if (result.ruleset) {
      setGeneratedRules(result.ruleset);
      setCompletedServices(prev => new Set([...prev, selectedService]));
    }
  }, [selectedService]);

  // Handle evaluation
  const handleEvaluate = useCallback(async (answers, userContexts) => {
    setEvaluating(true);
    
    try {
      // First generate the ruleset
      const rulesetResult = await generateRuleset(selectedService, answers, userContexts);
      setGeneratedRules(rulesetResult);
      
      // Build current context from user context settings
      const currentContext = {};
      userContexts.forEach(ctx => {
        currentContext[ctx.type] = ctx.value;
      });
      
      // Add some mock current values if not set
      if (!currentContext.timeOfDay) {
        const hour = new Date().getHours();
        if (hour >= 6 && hour < 12) currentContext.timeOfDay = 'Morning';
        else if (hour >= 12 && hour < 18) currentContext.timeOfDay = 'Afternoon';
        else if (hour >= 18 && hour < 21) currentContext.timeOfDay = 'Evening';
        else currentContext.timeOfDay = 'Night';
      }
      
      // Run evaluation
      const evalResult = await evaluatePreferences(user.id, selectedService, currentContext);
      
      // Check for conflicts
      if (evalResult.conflict && evalResult.conflictingRules) {
        setConflictData(evalResult);
        setShowConflictModal(true);
      } else {
        setEvaluationResult(evalResult);
        setActiveTab('results');
      }
      
      setCompletedServices(prev => new Set([...prev, selectedService]));
    } catch (error) {
      console.error('Evaluation failed:', error);
      alert('Evaluation failed: ' + error.message);
    } finally {
      setEvaluating(false);
    }
  }, [user.id, selectedService]);

  // Handle conflict resolution
  const handleConflictResolve = (choice) => {
    if (conflictData) {
      const resolvedResult = {
        ...conflictData,
        conflict: false,
        resolution: choice,
        finalDecision: choice === 'allow' 
          ? { effect: 'ALLOW', reason: 'User chose to allow' }
          : choice === 'deny'
          ? { effect: 'BLOCK', reason: 'User chose to deny' }
          : { effect: 'GENERALIZE', reason: 'User chose minimal protection' }
      };
      setEvaluationResult(resolvedResult);
      setShowConflictModal(false);
      setConflictData(null);
      setActiveTab('results');
    }
  };

  // Render sidebar navigation
  const renderSidebar = () => (
    <div className="sidebar">
      <div className="sidebar-header">
        <h1>
          <span>🔐</span>
          Privacy Manager
        </h1>
        <p>Connected Vehicle Privacy Preferences</p>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-section-title">Service Types</div>
        
        {Object.entries(services).map(([key, service]) => (
          <div
            key={key}
            className={`service-item ${selectedService === key ? 'active' : ''} ${completedServices.has(key) ? 'completed' : ''}`}
            onClick={() => handleServiceSelect(key)}
          >
            <span className="icon">{service.icon || SERVICE_ICONS[key] || '📋'}</span>
            <span className="name">{service.name}</span>
            {completedServices.has(key) && (
              <span className="badge">✓</span>
            )}
          </div>
        ))}
      </div>

      <div className="user-info">
        <div className="username">{user.username}</div>
        <div className="role">{user.role === 'admin' ? 'Administrator' : 'User'}</div>
        <button onClick={onLogout}>Sign Out</button>
      </div>
    </div>
  );

  // Render content tabs
  const renderTabs = () => (
    <div style={{ 
      display: 'flex', 
      gap: '4px', 
      marginBottom: '20px',
      borderBottom: '2px solid #e5e7eb',
      paddingBottom: '0'
    }}>
      <button
        className={`btn ${activeTab === 'questionnaire' ? 'btn-primary' : 'btn-secondary'}`}
        style={{ 
          borderRadius: '8px 8px 0 0',
          borderBottom: activeTab === 'questionnaire' ? '2px solid #cba6f7' : 'none',
          marginBottom: '-2px'
        }}
        onClick={() => setActiveTab('questionnaire')}
      >
        📝 Questionnaire
      </button>
      <button
        className={`btn ${activeTab === 'rules' ? 'btn-primary' : 'btn-secondary'}`}
        style={{ 
          borderRadius: '8px 8px 0 0',
          borderBottom: activeTab === 'rules' ? '2px solid #cba6f7' : 'none',
          marginBottom: '-2px'
        }}
        onClick={() => setActiveTab('rules')}
        disabled={!generatedRules}
      >
        📜 Generated Rules {generatedRules ? `(${generatedRules.rules?.length || 0})` : ''}
      </button>
      <button
        className={`btn ${activeTab === 'results' ? 'btn-primary' : 'btn-secondary'}`}
        style={{ 
          borderRadius: '8px 8px 0 0',
          borderBottom: activeTab === 'results' ? '2px solid #cba6f7' : 'none',
          marginBottom: '-2px'
        }}
        onClick={() => setActiveTab('results')}
        disabled={!evaluationResult}
      >
        📊 Evaluation Results
      </button>
      <button
        className={`btn ${activeTab === 'stream' ? 'btn-primary' : 'btn-secondary'}`}
        style={{ 
          borderRadius: '8px 8px 0 0',
          borderBottom: activeTab === 'stream' ? '2px solid #cba6f7' : 'none',
          marginBottom: '-2px'
        }}
        onClick={() => setActiveTab('stream')}
      >
        📡 Live Stream
      </button>
    </div>
  );

  // Render main content
  const renderContent = () => {
    if (!selectedService) {
      return (
        <div className="main-content">
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center',
            minHeight: '60vh',
            textAlign: 'center',
            padding: '40px'
          }}>
            <div style={{ fontSize: '80px', marginBottom: '24px' }}>🚗</div>
            <h2 style={{ fontSize: '28px', marginBottom: '12px', color: '#1e1e2e' }}>
              Welcome to Privacy Preference Manager
            </h2>
            <p style={{ fontSize: '16px', color: '#6c7086', maxWidth: '500px', lineHeight: '1.6' }}>
              Select a service type from the sidebar to configure your privacy preferences.
              Each service has specific questions to help customize how your data is shared.
            </p>
            <div style={{ 
              marginTop: '32px', 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px',
              width: '100%',
              maxWidth: '700px'
            }}>
              {Object.entries(services).slice(0, 4).map(([key, service]) => (
                <div
                  key={key}
                  onClick={() => handleServiceSelect(key)}
                  style={{
                    padding: '20px',
                    background: 'white',
                    borderRadius: '12px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    border: '2px solid transparent'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = '#cba6f7'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}
                >
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>{service.icon}</div>
                  <div style={{ fontWeight: '600', color: '#1e1e2e' }}>{service.name}</div>
                  <div style={{ fontSize: '12px', color: '#6c7086', marginTop: '4px' }}>
                    {service.questions?.length || 4} questions
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="main-content">
        {renderTabs()}
        
        {evaluating && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div style={{
              background: 'white',
              padding: '32px',
              borderRadius: '16px',
              textAlign: 'center'
            }}>
              <div className="spinner" style={{ margin: '0 auto 16px' }}></div>
              <div style={{ fontSize: '18px', fontWeight: '600' }}>Evaluating preferences...</div>
              <div style={{ color: '#6c7086', marginTop: '8px' }}>
                Running two-phase evaluation
              </div>
            </div>
          </div>
        )}

        {activeTab === 'questionnaire' && serviceData && (
          <PreferenceBuilder
            user={user}
            serviceType={selectedService}
            serviceData={serviceData}
            onSave={handleSave}
            onEvaluate={handleEvaluate}
          />
        )}

        {activeTab === 'rules' && generatedRules && (
          <XPrefBuilder
            ruleset={generatedRules}
            serviceType={selectedService}
            serviceData={serviceData}
          />
        )}

        {activeTab === 'results' && evaluationResult && (
          <ResultDisplay
            result={evaluationResult}
            serviceType={selectedService}
            serviceData={serviceData}
          />
        )}

        {activeTab === 'stream' && (
          <Results
            user={user}
            serviceType={selectedService}
            serviceData={serviceData}
            evaluationResult={evaluationResult}
          />
        )}
      </div>
    );
  };

  // Render conflict modal
  const renderConflictModal = () => {
    if (!showConflictModal || !conflictData) return null;

    return (
      <div className="modal-overlay">
        <div className="modal-content">
          <h3>⚠️ Conflict Detected</h3>
          <p style={{ color: '#6c7086', marginBottom: '20px' }}>
            Multiple rules with the same priority apply to this scenario.
            Please choose how to proceed:
          </p>
          
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ fontSize: '14px', marginBottom: '12px' }}>Conflicting Rules:</h4>
            {conflictData.conflictingRules?.map((rule, idx) => (
              <div key={idx} style={{
                padding: '12px',
                background: '#f8f9fa',
                borderRadius: '8px',
                marginBottom: '8px',
                fontSize: '13px'
              }}>
                <div><strong>Purpose:</strong> {rule.purpose}</div>
                <div><strong>Effect:</strong> <span className={`pet-badge ${rule.effect.toLowerCase()}`}>{rule.effect}</span></div>
                <div><strong>Priority:</strong> {rule.priority}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div 
              className="conflict-option"
              onClick={() => handleConflictResolve('allow')}
            >
              <div style={{ fontWeight: '600', color: '#40a02b' }}>✓ Allow Access</div>
              <div style={{ fontSize: '13px', color: '#6c7086' }}>
                Permit data sharing for this service
              </div>
            </div>
            
            <div 
              className="conflict-option"
              onClick={() => handleConflictResolve('deny')}
            >
              <div style={{ fontWeight: '600', color: '#d20f39' }}>✗ Deny Access</div>
              <div style={{ fontSize: '13px', color: '#6c7086' }}>
                Block all data sharing for this service
              </div>
            </div>
            
            <div 
              className="conflict-option"
              onClick={() => handleConflictResolve('minimal')}
            >
              <div style={{ fontWeight: '600', color: '#df8e1d' }}>⚡ Apply Minimal Protection</div>
              <div style={{ fontSize: '13px', color: '#6c7086' }}>
                Allow access with generalization applied
              </div>
            </div>
          </div>

          <button 
            className="btn btn-secondary"
            style={{ marginTop: '20px', width: '100%' }}
            onClick={() => {
              setShowConflictModal(false);
              setConflictData(null);
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="app-container">
        <div className="sidebar">
          <div className="sidebar-header">
            <h1>🔐 Privacy Manager</h1>
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
      {renderSidebar()}
      {renderContent()}
      {renderConflictModal()}
    </div>
  );
}
