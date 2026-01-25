import React, { useState, useEffect } from 'react';
import { Play, Pause, Activity } from 'lucide-react';

const LiveStreamDashboard = ({ user, serviceType, evaluationResult }) => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentData, setCurrentData] = useState(null);
  const [streamHistory, setStreamHistory] = useState([]);
  
  // Get the evaluated effect from evaluation results
  const appliedEffect = evaluationResult?.phases?.conflict?.winner?.effect || 
                       evaluationResult?.finalOutcome?.effect || 
                       evaluationResult?.effect || 
                       'ALLOW';
  
  const selectedService = serviceType || 'map';
  const refreshInterval = 2000; // Fixed 2 second refresh

  const serviceNames = {
    map: 'MAP Navigation',
    emergency: 'Emergency Services',
    safety: 'Safety Features',
    oem: 'OEM Services',
    thirdparty: 'Third Party',
    app: 'Applications',
    logistic: 'Logistics'
  };

  const PETEffects = {
    ALLOW: { color: '#10b981', label: 'Full Access', icon: '✓' },
    BLOCK: { color: '#ef4444', label: 'Blocked', icon: '✗' },
    GENERALIZE: { color: '#f59e0b', label: 'Generalized', icon: '◐' },
    ANONYMIZE: { color: '#8b5cf6', label: 'Anonymized', icon: '👤' },
    AGGREGATE: { color: '#3b82f6', label: 'Aggregated', icon: '📊' },
    LOCAL_ONLY: { color: '#6366f1', label: 'Local Only', icon: '📱' },
    MASK: { color: '#ec4899', label: 'Masked', icon: '****' },
    REDUCE_PRECISION: { color: '#14b8a6', label: 'Reduced', icon: '~' },
    DELAY: { color: '#f97316', label: 'Delayed', icon: '⏱️' }
  };

  // Mock data generator
  const generateVehicleData = () => {
    const roadTypes = ['Highway', 'Regional', 'Urban', 'Residential'];
    const hour = new Date().getHours();
    let timeOfDay = 'Morning';
    if (hour >= 12 && hour < 18) timeOfDay = 'Afternoon';
    else if (hour >= 18 && hour < 21) timeOfDay = 'Evening';
    else if (hour >= 21 || hour < 6) timeOfDay = 'Night';

    return {
      timestamp: new Date().toISOString(),
      vehicle: {
        vin: 'WBA3B5C57EP' + Math.floor(Math.random() * 900000 + 100000),
        make: 'BMW',
        model: '3 Series'
      },
      location: {
        latitude: 48.7758 + (Math.random() - 0.5) * 0.1,
        longitude: 9.1829 + (Math.random() - 0.5) * 0.1,
        heading: Math.floor(Math.random() * 360),
        altitude: 250 + Math.floor(Math.random() * 100)
      },
      speed: {
        value: Math.floor(Math.random() * 130) + 20,
        unit: 'km/h'
      },
      acceleration: {
        x: (Math.random() - 0.5) * 2,
        y: (Math.random() - 0.5) * 2,
        z: (Math.random() - 0.5) * 0.5
      },
      engine: {
        rpm: Math.floor(Math.random() * 4000) + 1000,
        temperature: 85 + Math.floor(Math.random() * 15),
        fuelLevel: Math.floor(Math.random() * 100)
      },
      context: {
        roadType: roadTypes[Math.floor(Math.random() * roadTypes.length)],
        timeOfDay,
        homeDistance: Math.random() > 0.3 ? 'Far' : 'Near',
        emergencyStatus: Math.random() > 0.95
      }
    };
  };

  // Apply PET transformation
  const applyTransformation = (data, effect) => {
    const transformed = JSON.parse(JSON.stringify(data));

    switch (effect) {
      case 'BLOCK':
        return {
          timestamp: data.timestamp,
          status: 'BLOCKED',
          message: '🚫 Data access denied by privacy preference'
        };

      case 'ANONYMIZE':
        transformed.vehicle.vin = '[ANON_' + Math.random().toString(36).substring(2, 8).toUpperCase() + ']';
        transformed.vehicle.make = '[ANONYMIZED]';
        transformed.vehicle.model = '[ANONYMIZED]';
        transformed.location.latitude = Math.round(transformed.location.latitude * 100) / 100;
        transformed.location.longitude = Math.round(transformed.location.longitude * 100) / 100;
        break;

      case 'GENERALIZE':
        transformed.location.latitude = Math.round(transformed.location.latitude * 100) / 100;
        transformed.location.longitude = Math.round(transformed.location.longitude * 100) / 100;
        transformed.speed.value = Math.round(transformed.speed.value / 10) * 10;
        transformed.location.heading = Math.round(transformed.location.heading / 45) * 45;
        break;

      case 'AGGREGATE':
        return {
          timestamp: data.timestamp,
          status: 'AGGREGATED',
          region: 'Stuttgart Metro Area',
          avgSpeed: Math.round(data.speed.value / 10) * 10 + ' km/h',
          vehicleCount: Math.floor(Math.random() * 50) + 10,
          timeWindow: '5 minute average'
        };

      case 'LOCAL_ONLY':
        return {
          timestamp: data.timestamp,
          status: 'LOCAL_ONLY',
          message: '📱 Data processed locally, not transmitted',
          localSummary: {
            speedCategory: data.speed.value > 100 ? 'High' : data.speed.value > 60 ? 'Medium' : 'Low',
            engineStatus: data.engine.temperature < 100 ? 'Normal' : 'Warning'
          }
        };

      case 'MASK':
        transformed.vehicle.vin = transformed.vehicle.vin.substring(0, 5) + '*****' + transformed.vehicle.vin.substring(10);
        break;

      case 'REDUCE_PRECISION':
        transformed.location.latitude = Math.round(transformed.location.latitude * 10) / 10;
        transformed.location.longitude = Math.round(transformed.location.longitude * 10) / 10;
        transformed.speed.value = Math.round(transformed.speed.value);
        delete transformed.acceleration;
        break;

      case 'DELAY':
        transformed._delayedUntil = new Date(Date.now() + 15 * 60 * 1000).toLocaleTimeString();
        break;

      default:
        break;
    }

    return transformed;
  };

  // Auto-refresh streaming
  useEffect(() => {
    let interval;
    if (isStreaming) {
      interval = setInterval(() => {
        const rawData = generateVehicleData();
        const transformedData = applyTransformation(rawData, appliedEffect);
        
        const newData = {
          raw: rawData,
          transformed: transformedData,
          effect: appliedEffect,
          timestamp: new Date().toISOString()
        };
        
        setCurrentData(newData);
        setStreamHistory(prev => [newData, ...prev.slice(0, 9)]);
      }, refreshInterval);
    }
    return () => clearInterval(interval);
  }, [isStreaming, appliedEffect, refreshInterval]);

  const toggleStreaming = () => {
    if (!isStreaming) {
      // Start immediately
      const rawData = generateVehicleData();
      const transformedData = applyTransformation(rawData, appliedEffect);
      const newData = {
        raw: rawData,
        transformed: transformedData,
        effect: appliedEffect,
        timestamp: new Date().toISOString()
      };
      setCurrentData(newData);
      setStreamHistory([newData]);
    }
    setIsStreaming(!isStreaming);
  };

  const renderDataValue = (data, isTransformed = false) => {
    if (!data) return null;

    if (data.status === 'BLOCKED') {
      return (
        <div style={{ 
          padding: '40px', 
          textAlign: 'center',
          background: '#fee2e2',
          borderRadius: '12px',
          border: '2px solid #ef4444'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚫</div>
          <div style={{ fontSize: '18px', fontWeight: '600', color: '#991b1b' }}>
            Data Access Blocked
          </div>
          <div style={{ color: '#7f1d1d', marginTop: '8px' }}>
            {data.message}
          </div>
        </div>
      );
    }

    if (data.status === 'LOCAL_ONLY') {
      return (
        <div style={{ 
          padding: '40px', 
          textAlign: 'center',
          background: '#dbeafe',
          borderRadius: '12px',
          border: '2px solid #3b82f6'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📱</div>
          <div style={{ fontSize: '18px', fontWeight: '600', color: '#1e40af' }}>
            Local Processing Only
          </div>
          <div style={{ color: '#1e3a8a', marginTop: '8px' }}>
            {data.message}
          </div>
          <div style={{ 
            marginTop: '20px', 
            padding: '16px', 
            background: 'white',
            borderRadius: '8px',
            textAlign: 'left'
          }}>
            <div style={{ fontWeight: '600', marginBottom: '8px' }}>Local Summary:</div>
            {Object.entries(data.localSummary).map(([key, value]) => (
              <div key={key} style={{ fontSize: '14px', marginTop: '4px' }}>
                <span style={{ color: '#64748b' }}>{key}:</span> {value}
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (data.status === 'AGGREGATED') {
      return (
        <div style={{ padding: '20px' }}>
          <div style={{ fontWeight: '600', marginBottom: '12px', color: '#3b82f6' }}>
            📊 Aggregated Data
          </div>
          {Object.entries(data).filter(([key]) => key !== 'status').map(([key, value]) => (
            <div key={key} style={{ 
              padding: '8px 12px', 
              background: '#f1f5f9',
              borderRadius: '6px',
              marginBottom: '6px',
              fontSize: '14px'
            }}>
              <span style={{ color: '#64748b' }}>{key}:</span> {String(value)}
            </div>
          ))}
        </div>
      );
    }

    return (
      <pre style={{ 
        margin: 0, 
        fontSize: '12px', 
        lineHeight: '1.5',
        color: isTransformed ? '#7c3aed' : '#334155',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word'
      }}>
        {JSON.stringify(data, null, 2)}
      </pre>
    );
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px'
    }}>
      {/* Header */}
      <div style={{ 
        maxWidth: '1400px', 
        margin: '0 auto',
        marginBottom: '20px'
      }}>
        <div style={{ 
          background: 'white',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h1 style={{ 
                margin: 0, 
                fontSize: '32px', 
                fontWeight: '700',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                🚗 Live Stream Dashboard
              </h1>
              <p style={{ margin: '8px 0 0 0', color: '#64748b' }}>
                Real-time connected vehicle data with privacy protection
              </p>
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <Activity size={24} color={isStreaming ? '#10b981' : '#94a3b8'} />
              <span style={{ 
                fontSize: '14px', 
                fontWeight: '600',
                color: isStreaming ? '#10b981' : '#94a3b8'
              }}>
                {isStreaming ? 'LIVE' : 'OFFLINE'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Applied Settings Banner */}
      <div style={{ 
        maxWidth: '1400px', 
        margin: '0 auto 20px'
      }}>
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '16px 24px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <div>
              <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Service Type</div>
              <div style={{ fontWeight: '600', fontSize: '16px' }}>{serviceNames[selectedService] || selectedService}</div>
            </div>
            <div style={{ width: '1px', height: '40px', background: '#e5e7eb' }}></div>
            <div>
              <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Privacy Effect</div>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                fontWeight: '600',
                fontSize: '16px',
                color: PETEffects[appliedEffect]?.color
              }}>
                <span style={{ fontSize: '20px' }}>{PETEffects[appliedEffect]?.icon}</span>
                {PETEffects[appliedEffect]?.label}
              </div>
            </div>
          </div>
          <button
            onClick={toggleStreaming}
            style={{
              padding: '12px 32px',
              borderRadius: '8px',
              border: 'none',
              background: isStreaming 
                ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: 'white',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontSize: '16px',
              transition: 'all 0.2s',
              minWidth: '140px'
            }}
          >
            {isStreaming ? <><Pause size={20} /> Stop</> : <><Play size={20} /> Start</>}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ 
        maxWidth: '1400px', 
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '20px'
      }}>
        {/* Raw Data */}
        <div style={{ 
          background: 'white',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          maxHeight: '600px',
          overflow: 'auto'
        }}>
          <h3 style={{ 
            margin: '0 0 16px 0', 
            fontSize: '18px', 
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            📡 Raw Vehicle Data
            <span style={{
              fontSize: '12px',
              background: '#f1f5f9',
              padding: '4px 8px',
              borderRadius: '6px',
              color: '#64748b',
              fontWeight: '500'
            }}>
              Original
            </span>
          </h3>
          {currentData ? renderDataValue(currentData.raw) : (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
              <Activity size={48} style={{ margin: '0 auto 16px' }} />
              <div style={{ fontSize: '16px', fontWeight: '500' }}>No data streaming</div>
              <div style={{ fontSize: '14px', marginTop: '8px' }}>
                Click "Start" to begin
              </div>
            </div>
          )}
        </div>

        {/* Transformed Data */}
        <div style={{ 
          background: 'white',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          maxHeight: '600px',
          overflow: 'auto',
          border: `3px solid ${PETEffects[appliedEffect]?.color || '#e2e8f0'}`
        }}>
          <h3 style={{ 
            margin: '0 0 16px 0', 
            fontSize: '18px', 
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            🔒 Protected Data
            <span style={{
              fontSize: '12px',
              background: PETEffects[appliedEffect]?.color || '#f1f5f9',
              color: 'white',
              padding: '4px 8px',
              borderRadius: '6px',
              fontWeight: '500'
            }}>
              {PETEffects[appliedEffect]?.label}
            </span>
          </h3>
          {currentData ? renderDataValue(currentData.transformed, true) : (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
              <Activity size={48} style={{ margin: '0 auto 16px' }} />
              <div style={{ fontSize: '16px', fontWeight: '500' }}>No data streaming</div>
              <div style={{ fontSize: '14px', marginTop: '8px' }}>
                Click "Start" to begin
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stream History */}
      {streamHistory.length > 0 && (
        <div style={{ 
          maxWidth: '1400px', 
          margin: '20px auto 0',
          background: 'white',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ 
            margin: '0 0 16px 0', 
            fontSize: '18px', 
            fontWeight: '600'
          }}>
            📊 Stream History (Last 10 Records)
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {streamHistory.map((record, idx) => (
              <div key={idx} style={{
                padding: '12px 16px',
                background: '#f8fafc',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '14px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ 
                    fontWeight: '600',
                    color: '#64748b',
                    fontFamily: 'monospace'
                  }}>
                    #{streamHistory.length - idx}
                  </span>
                  <span style={{ color: '#94a3b8' }}>
                    {new Date(record.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <span style={{
                  padding: '4px 12px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: '500',
                  background: PETEffects[record.effect]?.color,
                  color: 'white'
                }}>
                  {PETEffects[record.effect]?.icon} {PETEffects[record.effect]?.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveStreamDashboard;