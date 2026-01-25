// src/components/ResultDisplay.js - Two-Phase Evaluation Results Display

import React, { useState } from 'react';
import P3PComparisonTable from './P3PComparisonTable';

export default function ResultDisplay({ result, serviceType, serviceData, onOpenLiveStream }) {
  // 🔍 ADD THESE LINES HERE
  console.log('🔍 Full result object:', result);
  console.log('📊 Comparison table exists?', !!result?.comparisonTable);
  console.log('📊 Comparison table data:', result?.comparisonTable);
  
  const [expandedPhase, setExpandedPhase] = useState(null);
  const [showRawData, setShowRawData] = useState(false);

  if (!result) {
    return (
      //<div className="results-panel">
          <div className="result-display">
      {/* Add Live Stream Button at the top */}
      <div style={{
        marginBottom: '24px',
        padding: '16px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '12px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        color: 'white'
      }}>
        <div>
          <div style={{ fontWeight: '600', fontSize: '16px', marginBottom: '4px' }}>
            📡 View Live Data Stream
          </div>
          <div style={{ fontSize: '13px', opacity: 0.9 }}>
            See real-time vehicle data with your privacy preferences applied
          </div>
        </div>
        <button
          onClick={onOpenLiveStream}
          style={{
            padding: '12px 24px',
            background: 'white',
            color: '#667eea',
            border: 'none',
            borderRadius: '8px',
            fontWeight: '600',
            cursor: 'pointer',
            fontSize: '14px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          Open Dashboard →
        </button>
      </div>
  <div className="results-panel"></div>
        <p style={{ color: '#6c7086', textAlign: 'center', padding: '40px' }}>
          No evaluation results yet. Configure preferences and click "Evaluate Now".
        </p>
      </div>
    );
  }

  // Handle no preferences case
  if (result.noPreferences) {
    return (
      <div className="results-panel">
        <div className="result-header">
          <h3>⚠️ No Preferences Configured</h3>
        </div>
        <p style={{ color: '#6c7086', marginBottom: '20px' }}>
          You haven't configured any preferences for this service type yet.
          Please select a default action:
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {result.defaultOptions?.map(option => (
            <div 
              key={option.id}
              className="conflict-option"
              style={{ cursor: 'pointer' }}
            >
              <div style={{ fontWeight: '600' }}>
                <span className={`pet-badge ${option.effect.toLowerCase()}`}>
                  {option.effect}
                </span>
                <span style={{ marginLeft: '12px' }}>{option.label}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const getEffectStyle = (effect) => {
    const styles = {
      'ALLOW': { bg: '#d4edda', border: '#a6e3a1', color: '#155724', icon: '✓' },
      'BLOCK': { bg: '#f8d7da', border: '#f38ba8', color: '#721c24', icon: '✗' },
      'LOCAL_ONLY': { bg: '#cfe2ff', border: '#89b4fa', color: '#084298', icon: '🏠' },
      'ANONYMIZE': { bg: '#d1f7ea', border: '#94e2d5', color: '#0d5e47', icon: '👤' },
      'AGGREGATE': { bg: '#fff3cd', border: '#f9e2af', color: '#856404', icon: '📊' },
      'GENERALIZE': { bg: '#ffe5d0', border: '#fab387', color: '#8b4513', icon: '📍' },
      'REDUCE_PRECISION': { bg: '#f3e5f5', border: '#cba6f7', color: '#6a1b9a', icon: '🔢' },
      'MASK': { bg: '#fce4ec', border: '#f5c2e7', color: '#880e4f', icon: '🎭' },
      'DELAY': { bg: '#eceff1', border: '#a6adc8', color: '#455a64', icon: '⏱️' }
    };
    return styles[effect] || styles['ALLOW'];
  };

  const finalDecision = result.finalDecision || result.decision;
  const finalEffect = finalDecision?.effect || 'ALLOW';
  const effectStyle = getEffectStyle(finalEffect);

  // Generate mock data transformation examples
  const generateDataExamples = () => {
    const examples = {
      'BLOCK': [
        { field: 'Location', original: '48.7758° N, 9.1829° E', transformed: '[BLOCKED]' },
        { field: 'Speed', original: '65 km/h', transformed: '[BLOCKED]' },
        { field: 'VIN', original: 'WBA3B5C57EP123456', transformed: '[BLOCKED]' }
      ],
      'LOCAL_ONLY': [
        { field: 'Location', original: '48.7758° N, 9.1829° E', transformed: '[PROCESSED LOCALLY]' },
        { field: 'Speed', original: '65 km/h', transformed: '[PROCESSED LOCALLY]' },
        { field: 'Route', original: 'A8 → B14 → Stuttgart', transformed: '[LOCAL STORAGE ONLY]' }
      ],
      'ANONYMIZE': [
        { field: 'VIN', original: 'WBA3B5C57EP123456', transformed: '[ANON_ID_8f7a2c]' },
        { field: 'Driver ID', original: 'user_alice_123', transformed: '[ANON_DRIVER_x9k2]' },
        { field: 'Location', original: '48.7758° N, 9.1829° E', transformed: '48.77°, 9.18° [anonymized]' }
      ],
      'AGGREGATE': [
        { field: 'Speed', original: '65 km/h', transformed: 'Avg: 62 km/h (5 min window)' },
        { field: 'Location', original: '48.7758° N, 9.1829° E', transformed: 'Region: Stuttgart Metro' },
        { field: 'Fuel', original: '45.2 L', transformed: 'Fleet Avg: 43.8 L' }
      ],
      'GENERALIZE': [
        { field: 'Location', original: '48.7758° N, 9.1829° E', transformed: '48.77**, 9.18** (100m accuracy)' },
        { field: 'Time', original: '14:32:45', transformed: '14:30 (30-min block)' },
        { field: 'Speed', original: '65 km/h', transformed: '60-70 km/h range' }
      ],
      'REDUCE_PRECISION': [
        { field: 'Location', original: '48.7758129° N', transformed: '48.78° N' },
        { field: 'Speed', original: '65.4 km/h', transformed: '65 km/h' },
        { field: 'Fuel', original: '45.234 L', transformed: '45 L' }
      ],
      'MASK': [
        { field: 'VIN', original: 'WBA3B5C57EP123456', transformed: 'WBA*****EP******' },
        { field: 'Phone', original: '+49 711 1234567', transformed: '+49 711 ****567' },
        { field: 'Email', original: 'alice@example.com', transformed: 'a****@example.com' }
      ],
      'DELAY': [
        { field: 'Location', original: '48.7758° N (now)', transformed: '48.7712° N (15 min delay)' },
        { field: 'Status', original: 'Real-time', transformed: 'Delayed (consent pending)' }
      ],
      'ALLOW': [
        { field: 'Location', original: '48.7758° N, 9.1829° E', transformed: '48.7758° N, 9.1829° E ✓' },
        { field: 'Speed', original: '65 km/h', transformed: '65 km/h ✓' },
        { field: 'VIN', original: 'WBA3B5C57EP123456', transformed: 'WBA3B5C57EP123456 ✓' }
      ]
    };
    return examples[finalEffect] || examples['ALLOW'];
  };

  return (
    <div>
      {/* Header */}
      <div className="content-header">
        <h2>
          <span>📊</span>
          Evaluation Results
        </h2>
        <p>Two-phase privacy evaluation for {serviceData?.name || serviceType}</p>
      </div>

      {/* Final Decision Banner */}
      <div className="results-panel" style={{
        background: effectStyle.bg,
        border: `3px solid ${effectStyle.border}`
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{
            fontSize: '48px',
            width: '80px',
            height: '80px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'white',
            borderRadius: '50%',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            {effectStyle.icon}
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: effectStyle.color }}>
              {finalEffect}
            </div>
            <div style={{ color: effectStyle.color, marginTop: '4px' }}>
              {finalDecision?.reason || 'Privacy preference applied'}
            </div>
          </div>
        </div>
      </div>

      {/* Two-Phase Breakdown */}
      <div className="results-panel" style={{ marginTop: '20px' }}>
        <h3 style={{ marginBottom: '20px' }}>🔄 Two-Phase Evaluation Breakdown</h3>

        {/* Phase 1: Stream Evaluation */}
        <div 
          style={{
            padding: '16px',
            background: expandedPhase === 1 ? '#f8f9fa' : 'white',
            border: '2px solid #e5e7eb',
            borderRadius: '12px',
            marginBottom: '16px',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onClick={() => setExpandedPhase(expandedPhase === 1 ? null : 1)}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                background: '#89b4fa',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: '700'
              }}>1</div>
              <div>
                <div style={{ fontWeight: '600' }}>Stream Evaluation (Dynamic)</div>
                <div style={{ fontSize: '13px', color: '#6c7086' }}>
                  Context-based rule activation
                </div>
              </div>
            </div>
            <span style={{ color: '#6c7086' }}>{expandedPhase === 1 ? '▼' : '▶'}</span>
          </div>

          {expandedPhase === 1 && (
            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <h4 style={{ fontSize: '14px', color: '#40a02b', marginBottom: '8px' }}>
                    ✓ Active Rules ({result.phase1?.activeRules?.length || result.activeRules?.length || 0})
                  </h4>
                  {(result.phase1?.activeRules || result.activeRules || []).map((rule, idx) => (
                    <div key={idx} style={{
                      padding: '8px',
                      background: 'white',
                      borderRadius: '6px',
                      marginBottom: '8px',
                      fontSize: '13px',
                      border: '1px solid #a6e3a1'
                    }}>
                      <div><strong>{rule.purpose}</strong></div>
                      <div style={{ color: '#6c7086' }}>
                        Effect: <span className={`pet-badge ${rule.effect?.toLowerCase()}`}>{rule.effect}</span>
                      </div>
                    </div>
                  ))}
                  {(!result.phase1?.activeRules && !result.activeRules) && (
                    <div style={{ color: '#6c7086', fontSize: '13px' }}>No active rules</div>
                  )}
                </div>
                <div>
                  <h4 style={{ fontSize: '14px', color: '#6c7086', marginBottom: '8px' }}>
                    ○ Inactive Rules ({result.phase1?.inactiveRules?.length || result.inactiveRules?.length || 0})
                  </h4>
                  {(result.phase1?.inactiveRules || result.inactiveRules || []).slice(0, 3).map((rule, idx) => (
                    <div key={idx} style={{
                      padding: '8px',
                      background: '#f8f9fa',
                      borderRadius: '6px',
                      marginBottom: '8px',
                      fontSize: '13px',
                      opacity: 0.7
                    }}>
                      <div>{rule.purpose}</div>
                      <div style={{ color: '#6c7086', fontSize: '12px' }}>
                        Context mismatch: {rule.contextEvaluation?.failedConditions?.join(', ') || 'N/A'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: '16px' }}>
                <h4 style={{ fontSize: '14px', marginBottom: '8px' }}>Current Context:</h4>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  {Object.entries(result.currentContext || {}).map(([key, value]) => (
                    <div key={key} style={{
                      padding: '6px 12px',
                      background: '#e5e7eb',
                      borderRadius: '16px',
                      fontSize: '12px'
                    }}>
                      <strong>{key}:</strong> {String(value)}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Phase 2: Policy Evaluation */}
        <div 
          style={{
            padding: '16px',
            background: expandedPhase === 2 ? '#f8f9fa' : 'white',
            border: '2px solid #e5e7eb',
            borderRadius: '12px',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onClick={() => setExpandedPhase(expandedPhase === 2 ? null : 2)}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                background: '#cba6f7',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: '700'
              }}>2</div>
              <div>
                <div style={{ fontWeight: '600' }}>Policy Evaluation (Static)</div>
                <div style={{ fontSize: '13px', color: '#6c7086' }}>
                  P3P policy matching & PET application
                </div>
              </div>
            </div>
            <span style={{ color: '#6c7086' }}>{expandedPhase === 2 ? '▼' : '▶'}</span>
          </div>

          {expandedPhase === 2 && (
            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
              {result.phase2?.policyMatches || result.policyMatches ? (
                <div>
                  <h4 style={{ fontSize: '14px', marginBottom: '12px' }}>Policy Matches:</h4>
                  {(result.phase2?.policyMatches || result.policyMatches || []).map((match, idx) => (
                    <div key={idx} style={{
                      padding: '12px',
                      background: 'white',
                      borderRadius: '8px',
                      marginBottom: '8px',
                      border: '1px solid #e5e7eb'
                    }}>
                      <div style={{ fontWeight: '600' }}>{match.policy?.purpose || match.purpose}</div>
                      <div style={{ fontSize: '13px', color: '#6c7086', marginTop: '4px' }}>
                        Compatibility: <strong>{match.compatibility || 'COMPATIBLE'}</strong>
                      </div>
                      <div style={{ fontSize: '13px', color: '#6c7086' }}>
                        Data types: {match.policy?.dataTypes?.join(', ') || match.dataTypes?.join(', ') || 'All'}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: '#6c7086', fontSize: '13px' }}>
                  Matched against service P3P policies
                </div>
              )}

              {result.conflictResolution && (
                <div style={{ marginTop: '16px' }}>
                  <h4 style={{ fontSize: '14px', marginBottom: '8px' }}>Conflict Resolution:</h4>
                  <div style={{
                    padding: '12px',
                    background: '#fff3cd',
                    borderRadius: '8px',
                    fontSize: '13px'
                  }}>
                    <div><strong>Method:</strong> {result.conflictResolution.method}</div>
                    <div><strong>Reason:</strong> {result.conflictResolution.reason}</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Data Transformation Examples */}
      <div className="results-panel" style={{ marginTop: '20px' }}>
        <h3 style={{ marginBottom: '16px' }}>📋 Data Transformation Preview</h3>
        <p style={{ fontSize: '13px', color: '#6c7086', marginBottom: '16px' }}>
          Example of how your data would be transformed with <strong>{finalEffect}</strong> applied:
        </p>
        
        <table className="data-table">
          <thead>
            <tr>
              <th>Data Field</th>
              <th>Original Value</th>
              <th>Transformed Value</th>
            </tr>
          </thead>
          <tbody>
            {generateDataExamples().map((example, idx) => (
              <tr key={idx}>
                <td style={{ fontWeight: '500' }}>{example.field}</td>
                <td style={{ fontFamily: 'monospace', color: '#6c7086' }}>{example.original}</td>
                <td style={{ fontFamily: 'monospace' }}>
                  <span className={
                    example.transformed.includes('BLOCKED') ? 'status-blocked' :
                    example.transformed.includes('✓') ? 'status-allowed' :
                    'status-transformed'
                  }>
                    {example.transformed}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* P3P COMPARISON TABLE - ADD THIS ENTIRE SECTION */}
        {result.comparisonTable && (
  <div className="results-panel" style={{ marginTop: '20px' }}>
    <h3 style={{ marginBottom: '16px' }}>🗺️ Service Provider Comparison</h3>
    <p style={{ fontSize: '13px', color: '#6c7086', marginBottom: '16px' }}>
      Your preferences compared against Google Maps, Apple Maps, and OpenStreetMap policies:
    </p>
    
    {/* Display Comparison Table */}
    <div style={{ overflowX: 'auto' }}>
      <table className="data-table" style={{ width: '100%', marginBottom: '20px' }}>
        <thead>
          <tr>
            <th>Attribute</th>
            <th>Your Preference</th>
            <th>Google Maps</th>
            <th>Apple Maps</th>
            <th>OpenStreetMap</th>
          </tr>
        </thead>
        <tbody>
          {result.comparisonTable.rows.map((row, idx) => (
            <tr key={idx}>
              <td style={{ fontWeight: '600' }}>{row.attribute}</td>
              <td style={{ fontFamily: 'monospace' }}>{row.userPreference}</td>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '16px' }}>{row.google.icon}</span>
                  <span style={{ fontFamily: 'monospace' }}>{row.google.value}</span>
                </div>
              </td>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '16px' }}>{row.apple.icon}</span>
                  <span style={{ fontFamily: 'monospace' }}>{row.apple.value}</span>
                </div>
              </td>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '16px' }}>{row.osm.icon}</span>
                  <span style={{ fontFamily: 'monospace' }}>{row.osm.value}</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    
    {/* Display Scores */}
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginTop: '20px' }}>
      <div style={{ 
        padding: '16px', 
        background: '#f0f9ff', 
        borderRadius: '8px',
        border: '2px solid #3b82f6'
      }}>
        <div style={{ fontSize: '24px', fontWeight: '700', color: '#1e40af' }}>
          {result.comparisonTable.scores.google.percentage}%
        </div>
        <div style={{ fontSize: '14px', color: '#6c7086', marginTop: '4px' }}>
          Google Maps Match
        </div>
      </div>
      
      <div style={{ 
        padding: '16px', 
        background: '#faf5ff', 
        borderRadius: '8px',
        border: '2px solid #a855f7'
      }}>
        <div style={{ fontSize: '24px', fontWeight: '700', color: '#7c3aed' }}>
          {result.comparisonTable.scores.apple.percentage}%
        </div>
        <div style={{ fontSize: '14px', color: '#6c7086', marginTop: '4px' }}>
          Apple Maps Match
        </div>
      </div>
      
      <div style={{ 
        padding: '16px', 
        background: '#f0fdf4', 
        borderRadius: '8px',
        border: '2px solid #22c55e'
      }}>
        <div style={{ fontSize: '24px', fontWeight: '700', color: '#15803d' }}>
          {result.comparisonTable.scores.osm.percentage}%
        </div>
        <div style={{ fontSize: '14px', color: '#6c7086', marginTop: '4px' }}>
          OpenStreetMap Match
        </div>
      </div>
    </div>
    
    {/* Display Recommendation */}
    <div style={{
      marginTop: '20px',
      padding: '16px',
      background: '#d4edda',
      border: '2px solid #a6e3a1',
      borderRadius: '8px'
    }}>
      <div style={{ fontWeight: '600', marginBottom: '8px' }}>
        ✅ Recommended Service: {result.comparisonTable.recommendation.service}
      </div>
      <div style={{ fontSize: '14px', color: '#155724' }}>
        {result.comparisonTable.recommendation.reason}
      </div>
    </div>
  </div>
)}

      {/* Explanation Panel */}
      <div className="results-panel" style={{ marginTop: '20px' }}>
        <div className="explanation-panel">
          <h4>💡 Decision Explanation</h4>
          <ul>
            {finalDecision?.explanation ? (
              finalDecision.explanation.map((exp, idx) => (
                <li key={idx}>{exp}</li>
              ))
            ) : (
              <>
                <li>Your privacy preferences for {serviceData?.name || serviceType} were evaluated</li>
                <li>The evaluation considered your current context (time, location, road type)</li>
                <li>The final effect <strong>{finalEffect}</strong> was selected based on priority and PET hierarchy</li>
                {finalEffect !== 'ALLOW' && finalEffect !== 'BLOCK' && (
                  <li>Data will be transformed before sharing with the service</li>
                )}
              </>
            )}
          </ul>
        </div>
      </div>

      {/* Raw Data Toggle */}
      <div style={{ marginTop: '20px' }}>
        <button 
          className="btn btn-secondary"
          onClick={() => setShowRawData(!showRawData)}
        >
          {showRawData ? '🔼 Hide' : '🔽 Show'} Raw Evaluation Data
        </button>
        
        {showRawData && (
          <pre style={{
            marginTop: '12px',
            padding: '16px',
            background: '#1e1e2e',
            color: '#a6e3a1',
            borderRadius: '8px',
            fontSize: '12px',
            overflow: 'auto',
            maxHeight: '400px'
          }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}
