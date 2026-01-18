// src/components/Results.js - Live Data Streaming with Privacy Transformations

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getStreamData } from '../api';

export default function Results({ user, serviceType, serviceData, evaluationResult }) {
  const [streaming, setStreaming] = useState(false);
  const [streamData, setStreamData] = useState(null);
  const [streamHistory, setStreamHistory] = useState([]);
  const [intervalTime, setIntervalTime] = useState(5000); // 5 seconds default
  const [showRawData, setShowRawData] = useState(false);
  const streamRef = useRef(null);

  // Stop streaming on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        clearInterval(streamRef.current);
      }
    };
  }, []);

  // Fetch stream data
  const fetchStreamData = useCallback(async () => {
    if (!user || !serviceType) return;
    
    try {
      const result = await getStreamData(user.id, serviceType);
      if (result.success) {
        setStreamData(result);
        setStreamHistory(prev => {
          const newHistory = [...prev, result];
          return newHistory.slice(-20); // Keep last 20 entries
        });
      }
    } catch (error) {
      console.error('Stream error:', error);
    }
  }, [user, serviceType]);

  // Start/stop streaming
  const toggleStreaming = useCallback(() => {
    if (streaming) {
      // Stop
      if (streamRef.current) {
        clearInterval(streamRef.current);
        streamRef.current = null;
      }
      setStreaming(false);
    } else {
      // Start
      fetchStreamData(); // Immediate first fetch
      streamRef.current = setInterval(fetchStreamData, intervalTime);
      setStreaming(true);
    }
  }, [streaming, intervalTime, fetchStreamData]);

  // Update interval
  const handleIntervalChange = (newInterval) => {
    setIntervalTime(newInterval);
    if (streaming && streamRef.current) {
      clearInterval(streamRef.current);
      streamRef.current = setInterval(fetchStreamData, newInterval);
    }
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

  const getEffectIcon = (effect) => {
    const icons = {
      'ALLOW': '✓',
      'BLOCK': '✗',
      'ANONYMIZE': '👤',
      'AGGREGATE': '📊',
      'GENERALIZE': '📍',
      'REDUCE_PRECISION': '🔢',
      'LOCAL_ONLY': '🏠',
      'DELAY': '⏱️',
      'MASK': '🎭'
    };
    return icons[effect] || '?';
  };

  // Render data comparison table
  const renderDataComparison = () => {
    if (!streamData) return null;

    const { rawData, transformedData, effect } = streamData;

    return (
      <div style={{ marginTop: '20px' }}>
        <h4 style={{ marginBottom: '12px' }}>📊 Data Comparison (Raw vs Transformed)</h4>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* Raw Data */}
          <div style={{
            padding: '16px',
            background: '#fff',
            borderRadius: '8px',
            border: '2px solid #e5e7eb'
          }}>
            <div style={{ 
              fontWeight: '600', 
              marginBottom: '12px',
              padding: '8px',
              background: '#f8f9fa',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{ fontSize: '20px' }}>📡</span>
              Raw Vehicle Data
            </div>
            
            <div style={{ fontSize: '12px', fontFamily: 'monospace' }}>
              <div style={{ marginBottom: '8px' }}>
                <strong>VIN:</strong> {rawData.vehicle?.vin}
              </div>
              <div style={{ marginBottom: '8px' }}>
                <strong>Location:</strong> {rawData.location?.latitude?.toFixed(6)}°N, {rawData.location?.longitude?.toFixed(6)}°E
              </div>
              <div style={{ marginBottom: '8px' }}>
                <strong>Speed:</strong> {rawData.speed?.value} {rawData.speed?.unit}
              </div>
              <div style={{ marginBottom: '8px' }}>
                <strong>Heading:</strong> {rawData.location?.heading}°
              </div>
              <div style={{ marginBottom: '8px' }}>
                <strong>Engine RPM:</strong> {rawData.engine?.rpm}
              </div>
              <div style={{ marginBottom: '8px' }}>
                <strong>Context:</strong> {rawData.context?.roadType}, {rawData.context?.timeOfDay}
              </div>
            </div>
          </div>

          {/* Transformed Data */}
          <div style={{
            padding: '16px',
            background: '#fff',
            borderRadius: '8px',
            border: `2px solid ${getEffectColor(effect)}`
          }}>
            <div style={{ 
              fontWeight: '600', 
              marginBottom: '12px',
              padding: '8px',
              background: getEffectColor(effect) + '40',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{ fontSize: '20px' }}>{getEffectIcon(effect)}</span>
              Transformed Data ({effect})
            </div>
            
            <div style={{ fontSize: '12px', fontFamily: 'monospace' }}>
              {effect === 'BLOCK' ? (
                <div style={{ color: '#d20f39', padding: '20px', textAlign: 'center' }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>🚫</div>
                  <strong>DATA BLOCKED</strong>
                  <div style={{ marginTop: '8px', fontSize: '11px' }}>
                    Access denied by privacy preference
                  </div>
                </div>
              ) : effect === 'LOCAL_ONLY' ? (
                <div style={{ color: '#1e66f5', padding: '20px', textAlign: 'center' }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>🏠</div>
                  <strong>LOCAL PROCESSING ONLY</strong>
                  <div style={{ marginTop: '8px', fontSize: '11px' }}>
                    Data processed on device, not transmitted
                  </div>
                  {transformedData.localSummary && (
                    <div style={{ marginTop: '12px', textAlign: 'left', padding: '8px', background: '#cfe2ff', borderRadius: '4px' }}>
                      <div><strong>Speed Category:</strong> {transformedData.localSummary.speedCategory}</div>
                      <div><strong>Engine Status:</strong> {transformedData.localSummary.engineStatus}</div>
                    </div>
                  )}
                </div>
              ) : effect === 'AGGREGATE' ? (
                <div style={{ color: '#df8e1d' }}>
                  <div style={{ marginBottom: '8px' }}>
                    <strong>Aggregated Data:</strong>
                  </div>
                  {transformedData.aggregatedData && Object.entries(transformedData.aggregatedData).map(([key, value]) => (
                    <div key={key} style={{ marginBottom: '4px' }}>
                      <strong>{key}:</strong> {value}
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <div style={{ marginBottom: '8px' }}>
                    <strong>VIN:</strong> {transformedData.vehicle?.vin}
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <strong>Location:</strong> {transformedData.location?.latitude?.toFixed?.(6) || transformedData.location?.latitude}°N, {transformedData.location?.longitude?.toFixed?.(6) || transformedData.location?.longitude}°E
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <strong>Speed:</strong> {transformedData.speed?.value} {transformedData.speed?.unit}
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <strong>Heading:</strong> {transformedData.location?.heading}°
                  </div>
                  {transformedData._transformation && (
                    <div style={{ 
                      marginTop: '12px', 
                      padding: '8px', 
                      background: getEffectColor(effect) + '40',
                      borderRadius: '4px',
                      fontSize: '11px'
                    }}>
                      ℹ️ {transformedData._transformation}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render stream history
  const renderStreamHistory = () => {
    if (streamHistory.length === 0) return null;

    return (
      <div style={{ marginTop: '20px' }}>
        <h4 style={{ marginBottom: '12px' }}>📜 Stream History (Last 20)</h4>
        <div style={{ 
          maxHeight: '200px', 
          overflowY: 'auto', 
          border: '1px solid #e5e7eb',
          borderRadius: '8px'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: '#f8f9fa', position: 'sticky', top: 0 }}>
                <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Time</th>
                <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Speed</th>
                <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Context</th>
                <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Effect</th>
                <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Active Rules</th>
              </tr>
            </thead>
            <tbody>
              {streamHistory.slice().reverse().map((entry, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '8px' }}>
                    {new Date(entry.rawData?.timestamp).toLocaleTimeString()}
                  </td>
                  <td style={{ padding: '8px' }}>
                    {entry.rawData?.speed?.value} km/h
                  </td>
                  <td style={{ padding: '8px' }}>
                    {entry.context?.roadType}, {entry.context?.timeOfDay}
                  </td>
                  <td style={{ padding: '8px' }}>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '12px',
                      background: getEffectColor(entry.effect),
                      fontSize: '11px',
                      fontWeight: '600'
                    }}>
                      {entry.effect}
                    </span>
                  </td>
                  <td style={{ padding: '8px' }}>
                    {entry.activeRules} / {entry.activeRules + entry.inactiveRules}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* Header */}
      <div className="content-header">
        <h2>
          <span>📡</span>
          Live Data Stream
        </h2>
        <p>Real-time vehicle data with privacy transformations for {serviceData?.name || serviceType}</p>
      </div>

      {/* Stream Controls */}
      <div className="results-panel" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              className={`btn ${streaming ? 'btn-danger' : 'btn-success'}`}
              onClick={toggleStreaming}
              style={{ minWidth: '150px' }}
            >
              {streaming ? '⏹️ Stop Stream' : '▶️ Start Stream'}
            </button>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ fontSize: '14px', color: '#6c7086' }}>Interval:</label>
              <select
                value={intervalTime}
                onChange={(e) => handleIntervalChange(Number(e.target.value))}
                style={{ padding: '8px', borderRadius: '4px', border: '1px solid #e5e7eb' }}
              >
                <option value={1000}>1 second</option>
                <option value={2000}>2 seconds</option>
                <option value={5000}>5 seconds</option>
                <option value={10000}>10 seconds</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {streaming && (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                padding: '8px 16px',
                background: '#d4edda',
                borderRadius: '20px',
                fontSize: '13px'
              }}>
                <div style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: '#40a02b',
                  animation: 'pulse 1s infinite'
                }}></div>
                LIVE
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Current Stream Data */}
      {streamData && (
        <div className="results-panel">
          {/* Effect Banner */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            padding: '16px',
            background: getEffectColor(streamData.effect) + '30',
            borderRadius: '12px',
            marginBottom: '20px',
            border: `2px solid ${getEffectColor(streamData.effect)}`
          }}>
            <div style={{
              width: '60px',
              height: '60px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '32px',
              background: 'white',
              borderRadius: '50%',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
              {getEffectIcon(streamData.effect)}
            </div>
            <div>
              <div style={{ fontSize: '20px', fontWeight: '700' }}>
                Current Effect: {streamData.effect}
              </div>
              <div style={{ fontSize: '14px', color: '#6c7086', marginTop: '4px' }}>
                {streamData.reason}
              </div>
            </div>
          </div>

          {/* Winning Rule Info */}
          {streamData.winningRule && (
            <div style={{
              padding: '12px 16px',
              background: '#f8f9fa',
              borderRadius: '8px',
              marginBottom: '20px',
              fontSize: '13px'
            }}>
              <div style={{ fontWeight: '600', marginBottom: '8px' }}>🎯 Active Rule:</div>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <div><strong>Purpose:</strong> {streamData.winningRule.purpose}</div>
                <div><strong>Priority:</strong> {streamData.winningRule.priority}</div>
                <div><strong>Effect:</strong> <span className={`pet-badge ${streamData.winningRule.effect.toLowerCase()}`}>{streamData.winningRule.effect}</span></div>
              </div>
              <div style={{ marginTop: '8px', color: '#6c7086' }}>
                {streamData.winningRule.label}
              </div>
            </div>
          )}

          {/* Data Comparison */}
          {renderDataComparison()}
        </div>
      )}

      {/* No Stream Data Yet */}
      {!streamData && !streaming && (
        <div className="results-panel" style={{ textAlign: 'center', padding: '60px' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>📡</div>
          <h3 style={{ marginBottom: '8px' }}>No Stream Data Yet</h3>
          <p style={{ color: '#6c7086' }}>
            Click "Start Stream" to begin receiving mock vehicle data with privacy transformations applied.
          </p>
          <p style={{ fontSize: '13px', color: '#9ca3af', marginTop: '16px' }}>
            Make sure you have configured privacy preferences for this service type first.
          </p>
        </div>
      )}

      {/* Stream History */}
      {renderStreamHistory()}

      {/* Raw Data Toggle */}
      {streamData && (
        <div style={{ marginTop: '20px' }}>
          <button
            className="btn btn-secondary"
            onClick={() => setShowRawData(!showRawData)}
          >
            {showRawData ? '🔼 Hide' : '🔽 Show'} Raw JSON Data
          </button>
          
          {showRawData && (
            <pre style={{
              marginTop: '12px',
              padding: '16px',
              background: '#1e1e2e',
              color: '#a6e3a1',
              borderRadius: '8px',
              fontSize: '11px',
              overflow: 'auto',
              maxHeight: '400px'
            }}>
              {JSON.stringify(streamData, null, 2)}
            </pre>
          )}
        </div>
      )}

      {/* CSS for pulse animation */}
      <style>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
