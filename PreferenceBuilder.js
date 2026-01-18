// src/components/PreferenceBuilder.js - Questionnaire-based Preference Builder

import React, { useState, useEffect } from 'react';
import { savePreferences, getServicePreferences } from '../api';

export default function PreferenceBuilder({ 
  user, 
  serviceType, 
  serviceData, 
  onSave,
  onEvaluate 
}) {
  const [answers, setAnswers] = useState({});
  const [userContexts, setUserContexts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  // Load existing preferences when service changes
  useEffect(() => {
    if (user && serviceType) {
      loadExistingPreferences();
    }
  }, [user, serviceType]);

  const loadExistingPreferences = async () => {
    try {
      const prefs = await getServicePreferences(user.id, serviceType);
      if (prefs.answers) {
        setAnswers(prefs.answers);
        setUserContexts(prefs.userContexts || []);
      } else {
        setAnswers({});
        setUserContexts([]);
      }
      setSaved(false);
    } catch (error) {
      console.error('Failed to load preferences:', error);
    }
  };

  const handleAnswerChange = (questionId, option) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: option
    }));
    setSaved(false);
  };

  const handleContextChange = (contextType, value) => {
    setUserContexts(prev => {
      const existing = prev.find(c => c.type === contextType);
      if (existing) {
        return prev.map(c => 
          c.type === contextType ? { ...c, value } : c
        );
      }
      return [...prev, { type: contextType, value }];
    });
    setSaved(false);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const result = await savePreferences(user.id, serviceType, answers, userContexts);
      setSaved(true);
      if (onSave) {
        onSave(result);
      }
    } catch (error) {
      console.error('Failed to save preferences:', error);
      alert('Failed to save preferences');
    } finally {
      setLoading(false);
    }
  };

  const handleEvaluate = () => {
    if (onEvaluate) {
      onEvaluate(answers, userContexts);
    }
  };

  const getOptionLabel = (option) => {
    return `(${option.toUpperCase()})`;
  };

  const getEffectColor = (effect) => {
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
  };

  const answeredCount = Object.keys(answers).length;
  const totalQuestions = serviceData?.questions?.length || 0;
  const progress = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;

  if (!serviceData) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="content-header">
        <h2>
          <span>{serviceData.icon}</span>
          {serviceData.name}
        </h2>
        <p>{serviceData.description}</p>
        
        {/* Progress */}
        <div style={{ marginTop: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#6c7086' }}>
            <span>{answeredCount} of {totalQuestions} questions answered</span>
            <span>{Math.round(progress)}% complete</span>
          </div>
          <div className="progress-bar">
            <div className="fill" style={{ width: `${progress}%` }}></div>
          </div>
        </div>
      </div>

      {/* Questions */}
      <div>
        {serviceData.questions.map((question, idx) => (
          <div key={question.id} className="question-card">
            <div className="purpose">
              {idx + 1}. {question.purpose}
            </div>
            <div className="question-text">
              {question.questionText}
            </div>
            
            <select
              className={`option-select ${answers[question.id] ? 'selected' : ''}`}
              value={answers[question.id] || ''}
              onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            >
              <option value="">-- Select your preference --</option>
              {Object.entries(question.options).map(([key, option]) => (
                <option key={key} value={key}>
                  {getOptionLabel(key)} {option.label}
                </option>
              ))}
            </select>

            {/* Show selected option details */}
            {answers[question.id] && (
              <div style={{ 
                marginTop: '12px', 
                padding: '12px', 
                background: '#f8f9fa', 
                borderRadius: '8px',
                fontSize: '13px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span className={`pet-badge ${question.options[answers[question.id]].effect.toLowerCase()}`}>
                    {question.options[answers[question.id]].effect}
                  </span>
                  <span style={{ color: '#6c7086' }}>
                    Priority: {question.options[answers[question.id]].priority}
                  </span>
                </div>
                
                {/* Show context restrictions if any */}
                {question.options[answers[question.id]].contexts.length > 0 && (
                  <div style={{ color: '#45475a', marginTop: '4px' }}>
                    <strong>Context restrictions:</strong>{' '}
                    {question.options[answers[question.id]].contexts.map((ctx, i) => (
                      <span key={i}>
                        {ctx.type}: {ctx.allowed?.join(', ') || ctx.denied?.map(d => `NOT ${d}`).join(', ') || ctx.value}
                        {i < question.options[answers[question.id]].contexts.length - 1 && ', '}
                      </span>
                    ))}
                  </div>
                )}
                
                {/* Show data types affected */}
                <div style={{ color: '#6c7086', marginTop: '4px' }}>
                  <strong>Data affected:</strong> {question.dataTypes.slice(0, 3).join(', ')}
                  {question.dataTypes.length > 3 && ` +${question.dataTypes.length - 3} more`}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Context Settings */}
      <div className="context-panel">
        <h3>
          <span>⚙️</span>
          Additional Context Settings
        </h3>
        <p style={{ fontSize: '13px', color: '#6c7086', marginBottom: '16px' }}>
          These settings help evaluate your preferences against current conditions
        </p>
        
        <div className="context-grid">
          <div className="context-item">
            <label>Time of Day</label>
            <select 
              value={userContexts.find(c => c.type === 'timeOfDay')?.value || ''}
              onChange={(e) => handleContextChange('timeOfDay', e.target.value)}
            >
              <option value="">Any time</option>
              <option value="Morning">Morning (6am-12pm)</option>
              <option value="Afternoon">Afternoon (12pm-6pm)</option>
              <option value="Evening">Evening (6pm-9pm)</option>
              <option value="Night">Night (9pm-6am)</option>
            </select>
          </div>

          <div className="context-item">
            <label>Road Type</label>
            <select
              value={userContexts.find(c => c.type === 'roadType')?.value || ''}
              onChange={(e) => handleContextChange('roadType', e.target.value)}
            >
              <option value="">Any road</option>
              <option value="Highway">Highway</option>
              <option value="Regional">Regional Road</option>
              <option value="Urban">Urban</option>
              <option value="Residential">Residential</option>
            </select>
          </div>

          <div className="context-item">
            <label>Distance from Home</label>
            <select
              value={userContexts.find(c => c.type === 'homeDistance')?.value || ''}
              onChange={(e) => handleContextChange('homeDistance', e.target.value)}
            >
              <option value="">Any distance</option>
              <option value="Near">Near home (&lt;100m)</option>
              <option value="Far">Far from home (&gt;100m)</option>
            </select>
          </div>

          <div className="context-item">
            <label>Emergency Status</label>
            <select
              value={userContexts.find(c => c.type === 'emergencyStatus')?.value?.toString() || ''}
              onChange={(e) => handleContextChange('emergencyStatus', e.target.value === 'true')}
            >
              <option value="">Normal</option>
              <option value="true">Emergency Active</option>
              <option value="false">No Emergency</option>
            </select>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="action-bar">
        <button 
          className="btn btn-primary"
          onClick={handleSave}
          disabled={loading || answeredCount === 0}
        >
          {loading ? 'Saving...' : saved ? '✓ Saved' : '💾 Save Preferences'}
        </button>
        
        <button 
          className="btn btn-success"
          onClick={handleEvaluate}
          disabled={answeredCount === 0}
        >
          🔍 Evaluate Now
        </button>

        <button 
          className="btn btn-secondary"
          onClick={() => {
            setAnswers({});
            setUserContexts([]);
            setSaved(false);
          }}
        >
          🔄 Reset
        </button>
      </div>

      {saved && (
        <div style={{
          marginTop: '16px',
          padding: '12px 16px',
          background: '#f0fdf4',
          border: '1px solid #a6e3a1',
          borderRadius: '8px',
          color: '#166534',
          fontSize: '14px'
        }}>
          ✓ Preferences saved successfully! XPref rules have been generated.
        </div>
      )}
    </div>
  );
}
