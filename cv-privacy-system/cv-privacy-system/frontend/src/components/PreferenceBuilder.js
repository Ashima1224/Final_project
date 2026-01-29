import React, { useState, useEffect } from 'react';
import { savePreferences } from '../api';

export default function PreferenceBuilder({ user, serviceType = 'map', serviceData, onSave, onEvaluate }) {
  const [metadata, setMetadata] = useState(null);
  const [domainConfig, setDomainConfig] = useState(null);
  const [questionAnswers, setQuestionAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDataTypes, setSelectedDataTypes] = useState([]);
  const [showDataTypeDropdown, setShowDataTypeDropdown] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showDataTypeDropdown && !event.target.closest('[data-dropdown-container]')) {
        setShowDataTypeDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDataTypeDropdown]);

  useEffect(() => {
    fetch('http://localhost:4000/api/domain/config')
      .then(res => res.json())
      .then(config => {
        setDomainConfig(config);
        setMetadata(config);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load config:', err);
        setError('Failed to load configuration');
        setLoading(false);
      });
  }, []);

  const handleSubmit = async () => {
    if (selectedDataTypes.length === 0 || Object.keys(questionAnswers).length === 0) {
      alert('Please select data types and answer at least one question');
      return;
    }

    setSubmitting(true);
    try {
      const answers = { dataTypes: selectedDataTypes, questionAnswers: questionAnswers };
      const result = await savePreferences(user.id, serviceType, answers, []);
      console.log('✓ Preferences saved:', result);
      if (onSave && result.ruleset) onSave(result);
      if (onEvaluate) onEvaluate(answers, []);
    } catch (err) {
      console.error('Failed to save preferences:', err);
      alert('Failed to save preferences: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getQuestionTextFromMappingId = (mappingId) => {
    const texts = {
      'navigation_location': 'How should navigation use your location data?',
      'navigation_speed': 'How should navigation use your speed for ETA calculations?',
      'traffic_contribution': 'Should you contribute to community traffic data?',
      'poi_location': 'How should POI suggestions use your location?',
      'personal_history': 'How should your history be used for personalization?',
      'ad_targeting': 'How should advertising use your data?',
      'sharing_precision': 'How precise should location sharing be?',
      'history_storage': 'How should your location history be stored?'
    };
    return texts[mappingId] || 'Privacy Configuration';
  };

  const getHelpTextFromMappingId = (mappingId) => {
    const texts = {
      'navigation_location': 'This controls how precise your location is when getting directions',
      'navigation_speed': 'Speed data helps calculate accurate arrival times',
      'traffic_contribution': 'Your anonymized data helps other drivers avoid congestion',
      'poi_location': 'More precise location gives more relevant nearby suggestions',
      'personal_history': 'History helps predict your favorite places and common routes',
      'ad_targeting': 'Control how ads are targeted to you',
      'sharing_precision': 'Control how accurately others can see your location',
      'history_storage': 'Control whether history is kept on your device or in the cloud'
    };
    return texts[mappingId] || '';
  };

  if (loading) return <div style={{ padding: '20px', textAlign: 'center' }}><div style={{ fontSize: '24px', marginBottom: '12px' }}>⏳</div><p>Loading configuration...</p></div>;
  if (error) return <div style={{ padding: '40px', textAlign: 'center', color: '#d20f39', background: '#f8f9fa', borderRadius: '12px', margin: '20px' }}><div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div><h3>Configuration Not Available</h3><p style={{ color: '#6c7086' }}>{error}</p></div>;
  if (!metadata) return <div style={{ padding: '20px', textAlign: 'center' }}><p>No configuration available</p></div>;

  return (
    <div style={{ background: '#ffffff', borderRadius: '12px', padding: '32px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '0 0 8px 0', color: '#1e1e2e', fontSize: '24px' }}>
          <span>{serviceData?.icon || '🗺️'}</span>{serviceData?.name || 'Map Service'} Preferences
        </h2>
        <p style={{ margin: 0, color: '#6c7086', fontSize: '14px' }}>Configure your privacy preferences.</p>
      </div>

      <div style={{ marginBottom: '28px' }}>
        <label style={{ display: 'block', marginBottom: '12px', fontWeight: '600', color: '#1e1e2e', fontSize: '15px' }}>1. What data are you willing to share?</label>
        <div style={{ position: 'relative' }} data-dropdown-container>
          <div onClick={() => setShowDataTypeDropdown(!showDataTypeDropdown)} style={{ width: '100%', minHeight: '48px', padding: '8px 40px 8px 12px', fontSize: '15px', borderRadius: '8px', border: '2px solid #e5e7eb', background: '#ffffff', cursor: 'pointer', display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', position: 'relative' }}>
            {selectedDataTypes.length === 0 ? <span style={{ color: '#9ca3af' }}>-- Select Data Types --</span> : selectedDataTypes.map(dtId => {
              const dt = metadata.dataTypes.find(d => d.id === dtId);
              return (<span key={dtId} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 8px', background: '#cba6f7', color: '#1e1e2e', borderRadius: '6px', fontSize: '13px', fontWeight: '500' }}>{dt?.icon} {dt?.displayName}<button onClick={(e) => { e.stopPropagation(); setSelectedDataTypes(prev => prev.filter(id => id !== dtId)); }} style={{ background: 'none', border: 'none', color: '#1e1e2e', cursor: 'pointer', padding: '0 4px', fontSize: '16px', lineHeight: '1' }}>×</button></span>);
            })}
            <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: '#6c7086' }}>{showDataTypeDropdown ? '▲' : '▼'}</span>
          </div>
          {showDataTypeDropdown && (<div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px', background: 'white', border: '2px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', maxHeight: '300px', overflowY: 'auto', zIndex: 1000 }}>{metadata.dataTypes.map(dt => (<label key={dt.id} style={{ display: 'flex', alignItems: 'flex-start', padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid #f3f4f6', transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = '#f8f9fa'} onMouseLeave={(e) => e.currentTarget.style.background = 'white'}><input type="checkbox" checked={selectedDataTypes.includes(dt.id)} onChange={(e) => { if (e.target.checked) setSelectedDataTypes(prev => [...prev, dt.id]); else setSelectedDataTypes(prev => prev.filter(id => id !== dt.id)); }} style={{ marginRight: '12px', marginTop: '4px', cursor: 'pointer', width: '16px', height: '16px' }} /><div style={{ flex: 1 }}><div style={{ fontWeight: '500', marginBottom: '4px' }}>{dt.icon} {dt.displayName}</div><div style={{ fontSize: '12px', color: '#6c7086', lineHeight: '1.4' }}>{dt.description}</div></div></label>))}</div>)}
        </div>
        {selectedDataTypes.length > 0 && (<p style={{ marginTop: '10px', fontSize: '13px', color: '#6c7086', fontWeight: '500' }}>{selectedDataTypes.length} data type{selectedDataTypes.length !== 1 ? 's' : ''} selected</p>)}
      </div>

      {domainConfig?.contextMappings && Object.entries(domainConfig.contextMappings).map(([mappingId, mapping], index) => {
        if (!mapping.situationRules || !Array.isArray(mapping.situationRules)) return null;
        return (<div key={mappingId} style={{ marginBottom: '32px', padding: '24px', background: '#fafbfc', borderRadius: '12px', border: '2px solid #e5e7eb' }}>
          <div style={{ fontWeight: '700', color: '#1e1e2e', fontSize: '18px', marginBottom: '8px' }}>{index + 2}. {getQuestionTextFromMappingId(mappingId)}</div>
          <p style={{ fontSize: '14px', color: '#6c7086', marginBottom: '24px', fontStyle: 'italic' }}>{getHelpTextFromMappingId(mappingId)}</p>
          {mapping.situationRules.map((situationRule) => {
            if (!situationRule || !situationRule.situationId) return null;
            const situation = domainConfig.situations?.find(s => s.id === situationRule.situationId);
            if (!situation) return null;
            const allowedActions = situationRule.allowedActions || [];
            if (allowedActions.length === 0) return null;
            const questionKey = `${mappingId}_${situationRule.situationId}`;
            return (<div key={situationRule.situationId} style={{ marginBottom: '24px', paddingLeft: '20px', borderLeft: `4px solid ${situation.color || '#cba6f7'}` }}>
              <div style={{ fontWeight: '600', fontSize: '15px', color: '#2c3e50', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}><span style={{ fontSize: '22px' }}>{situation.icon || '📍'}</span><span>{situation.displayName || situation.id}</span></div>
              {situation.explanation && <p style={{ fontSize: '13px', color: '#6c7086', marginBottom: '12px', fontStyle: 'italic' }}>{situation.explanation}</p>}
              <select value={questionAnswers[questionKey] || ''} onChange={(e) => setQuestionAnswers({ ...questionAnswers, [questionKey]: e.target.value })} style={{ width: '100%', padding: '12px 16px', fontSize: '14px', borderRadius: '8px', border: '2px solid #e5e7eb', background: '#ffffff', cursor: 'pointer', fontWeight: '500' }}>
                <option value="">-- Select Privacy Action --</option>
                {allowedActions.map(actionId => { const action = domainConfig.privacyActions?.find(a => a.id === actionId); if (!action) return null; return (<option key={actionId} value={actionId}>{action.icon || ''} {action.displayName || action.id}</option>); })}
              </select>
              {questionAnswers[questionKey] && (() => { const selectedAction = domainConfig.privacyActions?.find(a => a.id === questionAnswers[questionKey]); if (!selectedAction) return null; return (<div style={{ marginTop: '12px', padding: '12px', background: '#ffffff', borderRadius: '8px', fontSize: '13px', lineHeight: '1.5', border: '1px solid #e5e7eb' }}><div style={{ fontWeight: '600', marginBottom: '6px', color: '#2c3e50' }}>{selectedAction.displayName || selectedAction.id}</div>{selectedAction.longDescription && <div style={{ color: '#6c7086', marginBottom: '4px' }}>{selectedAction.longDescription}</div>}{selectedAction.warning && <div style={{ marginTop: '10px', padding: '10px', background: '#fff3cd', borderRadius: '6px', color: '#856404', fontSize: '13px', display: 'flex', alignItems: 'flex-start', gap: '8px' }}><span>⚠️</span><span>{selectedAction.warning}</span></div>}</div>); })()}
            </div>);
          })}
        </div>);
      })}

      <button onClick={handleSubmit} disabled={submitting || selectedDataTypes.length === 0 || Object.keys(questionAnswers).length === 0} style={{ width: '100%', padding: '16px', fontSize: '16px', fontWeight: '600', backgroundColor: (submitting || selectedDataTypes.length === 0 || Object.keys(questionAnswers).length === 0) ? '#e5e7eb' : '#cba6f7', color: (submitting || selectedDataTypes.length === 0 || Object.keys(questionAnswers).length === 0) ? '#9ca3af' : '#1e1e2e', border: 'none', borderRadius: '8px', cursor: (submitting || selectedDataTypes.length === 0 || Object.keys(questionAnswers).length === 0) ? 'not-allowed' : 'pointer', transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} onMouseEnter={(e) => { if (!submitting && selectedDataTypes.length > 0 && Object.keys(questionAnswers).length > 0) e.target.style.backgroundColor = '#b4a0e5'; }} onMouseLeave={(e) => { if (!submitting && selectedDataTypes.length > 0 && Object.keys(questionAnswers).length > 0) e.target.style.backgroundColor = '#cba6f7'; }}>{submitting ? <><span className="spinner" style={{ width: '16px', height: '16px' }}></span>Saving...</> : <><span>✓</span>Save & Generate Rules</>}</button>

      <div style={{ marginTop: '24px', padding: '16px', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '8px', fontSize: '13px', color: '#0369a1' }}><strong>💡 What happens next:</strong><ol style={{ margin: '8px 0 0 0', paddingLeft: '20px', lineHeight: '1.6' }}><li>Your preferences will be saved</li><li>XPref privacy rules will be generated automatically</li><li>View generated rules in the "Generated Rules" tab</li><li>See evaluation results in the "Evaluation Results" tab</li></ol></div>
    </div>
  );
}