import React, { useState, useEffect } from 'react';
import { getDomainMetadata, savePreferences } from '../api';

export default function PreferenceBuilder({ user, serviceType = 'map', serviceData, onSave, onEvaluate }) {
  const [metadata, setMetadata] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // User selections
  const [selectedDataType, setSelectedDataType] = useState('');
  const [privacyPriority, setPrivacyPriority] = useState('');
  const [retention, setRetention] = useState('');
  
  const [submitting, setSubmitting] = useState(false);

  // Fetch metadata on component mount
  useEffect(() => {
    getDomainMetadata()
      .then(data => {
        setMetadata(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load metadata:', err);
        setError('Failed to load configuration. Please ensure domain expert has uploaded configuration.');
        setLoading(false);
      });
  }, []);

  const handleSubmit = async () => {
    if (!selectedDataType || !privacyPriority || !retention) {
      alert('Please answer all questions');
      return;
    }

    setSubmitting(true);
    
    try {
      // Convert selections to traditional answers format expected by backend
      const answers = {
        'map-data-type': selectedDataType,
        'map-privacy': privacyPriority,
        'map-retention': retention
      };

      const userContexts = []; // No context selection for now

      // Save preferences using existing backend endpoint
      const result = await savePreferences(user.id, serviceType, answers, userContexts);
      
      console.log('✓ Preferences saved:', result);

      // Call onSave callback with ruleset (for XPrefBuilder tab)
      if (onSave && result.ruleset) {
        onSave(result);
      }

      // Call onEvaluate callback (for Results tab)
      if (onEvaluate) {
        onEvaluate(answers, userContexts);
      }
      
    } catch (err) {
      console.error('Failed to save preferences:', err);
      alert('Failed to save preferences: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div style={{ fontSize: '24px', marginBottom: '12px' }}>⏳</div>
        <p>Loading configuration...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        padding: '40px', 
        textAlign: 'center',
        color: '#d20f39',
        background: '#f8f9fa',
        borderRadius: '12px',
        margin: '20px'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
        <h3 style={{ marginBottom: '12px' }}>Configuration Not Available</h3>
        <p style={{ color: '#6c7086', maxWidth: '500px', margin: '0 auto' }}>
          {error}
        </p>
      </div>
    );
  }

  if (!metadata) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>No configuration available</p>
      </div>
    );
  }

  return (
    <div style={{ 
      background: '#ffffff',
      borderRadius: '12px',
      padding: '32px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
    }}>
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px',
          margin: '0 0 8px 0',
          color: '#1e1e2e',
          fontSize: '24px'
        }}>
          <span>{serviceData?.icon || '🗺️'}</span>
          {serviceData?.name || 'Map Service'} Preferences
        </h2>
        <p style={{ margin: 0, color: '#6c7086', fontSize: '14px' }}>
          Configure your privacy preferences using the simplified questionnaire below.
        </p>
      </div>
      
      {/* Question 1: Data Types - DROPDOWN */}
      <div style={{ marginBottom: '28px' }}>
        <label style={{ 
          display: 'block', 
          marginBottom: '12px', 
          fontWeight: '600',
          color: '#1e1e2e',
          fontSize: '15px'
        }}>
          1. What data are you willing to share?
        </label>
        <select 
          value={selectedDataType} 
          onChange={(e) => setSelectedDataType(e.target.value)}
          style={{ 
            width: '100%', 
            padding: '12px 16px', 
            fontSize: '15px',
            borderRadius: '8px',
            border: '2px solid #e5e7eb',
            outline: 'none',
            transition: 'border-color 0.2s',
            background: '#ffffff',
            cursor: 'pointer'
          }}
          onFocus={(e) => e.target.style.borderColor = '#cba6f7'}
          onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
        >
          <option value="">-- Select Data Type --</option>
          {metadata.dataTypes.map(dt => (
            <option key={dt.id} value={dt.id}>
              {dt.name}
            </option>
          ))}
        </select>
        {selectedDataType && (
          <p style={{ 
            marginTop: '10px', 
            fontSize: '13px', 
            color: '#6c7086',
            padding: '12px',
            background: '#f8f9fa',
            borderRadius: '6px',
            lineHeight: '1.5'
          }}>
            ℹ️ {metadata.dataTypes.find(dt => dt.id === selectedDataType)?.description}
          </p>
        )}
      </div>

      {/* Question 2: Privacy Priority - DROPDOWN */}
      <div style={{ marginBottom: '28px' }}>
        <label style={{ 
          display: 'block', 
          marginBottom: '12px', 
          fontWeight: '600',
          color: '#1e1e2e',
          fontSize: '15px'
        }}>
          2. What is most important to you?
        </label>
        <select 
          value={privacyPriority} 
          onChange={(e) => setPrivacyPriority(e.target.value)}
          style={{ 
            width: '100%', 
            padding: '12px 16px', 
            fontSize: '15px',
            borderRadius: '8px',
            border: '2px solid #e5e7eb',
            outline: 'none',
            transition: 'border-color 0.2s',
            background: '#ffffff',
            cursor: 'pointer'
          }}
          onFocus={(e) => e.target.style.borderColor = '#cba6f7'}
          onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
        >
          <option value="">-- Select Privacy Priority --</option>
          {metadata.privacyLevels.map(pl => (
            <option key={pl.id} value={pl.id}>
              {pl.name}
            </option>
          ))}
        </select>
      </div>

      {/* Question 3: Retention - DROPDOWN */}
      <div style={{ marginBottom: '32px' }}>
        <label style={{ 
          display: 'block', 
          marginBottom: '12px', 
          fontWeight: '600',
          color: '#1e1e2e',
          fontSize: '15px'
        }}>
          3. How long can your data be stored?
        </label>
        <select 
          value={retention} 
          onChange={(e) => setRetention(e.target.value)}
          style={{ 
            width: '100%', 
            padding: '12px 16px', 
            fontSize: '15px',
            borderRadius: '8px',
            border: '2px solid #e5e7eb',
            outline: 'none',
            transition: 'border-color 0.2s',
            background: '#ffffff',
            cursor: 'pointer'
          }}
          onFocus={(e) => e.target.style.borderColor = '#cba6f7'}
          onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
        >
          <option value="">-- Select Retention Period --</option>
          {metadata.retentionOptions.map(ro => (
            <option key={ro.id} value={ro.id}>
              {ro.name}
            </option>
          ))}
        </select>
        {retention && (
          <p style={{ 
            marginTop: '10px', 
            fontSize: '13px', 
            color: '#6c7086',
            padding: '12px',
            background: '#f8f9fa',
            borderRadius: '6px',
            lineHeight: '1.5'
          }}>
            ℹ️ {metadata.retentionOptions.find(ro => ro.id === retention)?.description}
          </p>
        )}
      </div>

      {/* Submit Button */}
      <button 
        onClick={handleSubmit}
        disabled={submitting || !selectedDataType || !privacyPriority || !retention}
        style={{
          width: '100%',
          padding: '16px',
          fontSize: '16px',
          fontWeight: '600',
          backgroundColor: (submitting || !selectedDataType || !privacyPriority || !retention) 
            ? '#e5e7eb' 
            : '#cba6f7',
          color: (submitting || !selectedDataType || !privacyPriority || !retention)
            ? '#9ca3af'
            : '#1e1e2e',
          border: 'none',
          borderRadius: '8px',
          cursor: (submitting || !selectedDataType || !privacyPriority || !retention) 
            ? 'not-allowed' 
            : 'pointer',
          transition: 'all 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px'
        }}
        onMouseEnter={(e) => {
          if (!submitting && selectedDataType && privacyPriority && retention) {
            e.target.style.backgroundColor = '#b4a0e5';
          }
        }}
        onMouseLeave={(e) => {
          if (!submitting && selectedDataType && privacyPriority && retention) {
            e.target.style.backgroundColor = '#cba6f7';
          }
        }}
      >
        {submitting ? (
          <>
            <span className="spinner" style={{ width: '16px', height: '16px' }}></span>
            Saving Preferences...
          </>
        ) : (
          <>
            <span>✓</span>
            Save & Generate Rules
          </>
        )}
      </button>

      {/* Info Box */}
      <div style={{
        marginTop: '24px',
        padding: '16px',
        background: '#f0f9ff',
        border: '1px solid #bae6fd',
        borderRadius: '8px',
        fontSize: '13px',
        color: '#0369a1'
      }}>
        <strong>💡 What happens next:</strong>
        <ol style={{ margin: '8px 0 0 0', paddingLeft: '20px', lineHeight: '1.6' }}>
          <li>Your preferences will be saved</li>
          <li>XPref privacy rules will be generated automatically</li>
          <li>View generated rules in the "Generated Rules" tab</li>
          <li>See evaluation results in the "Evaluation Results" tab</li>
        </ol>
      </div>
    </div>
  );
}