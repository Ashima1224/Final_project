// src/components/P3PComparisonTable.js - Dynamic P3P Comparison Display
// Works with any fields - automatically displays whatever is compared

import React, { useState, useEffect } from 'react';
import { compareWithP3P } from '../api';

export default function P3PComparisonTable({ xprefRule }) {
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (xprefRule) {
      loadComparison();
    }
  }, [xprefRule]);

  const loadComparison = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await compareWithP3P(xprefRule);
      setComparison(result.comparisonTable);
    } catch (err) {
      console.error('Failed to load comparison:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid #e5e7eb',
          borderTop: '4px solid #667eea',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto'
        }} />
        <p style={{ marginTop: '16px', color: '#6c7086' }}>
          Comparing with P3P policies...
        </p>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div style={{
        padding: '24px',
        background: '#fef2f2',
        border: '1px solid #fecaca',
        borderRadius: '8px',
        color: '#dc2626'
      }}>
        <strong>⚠️ Error:</strong> {error}
        <button 
          onClick={loadComparison}
          style={{
            marginLeft: '16px',
            padding: '8px 16px',
            background: '#dc2626',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  // No data state
  if (!comparison) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: '#6c7086' }}>
        No comparison data available
      </div>
    );
  }

  const { rows, scores, recommendation } = comparison;

  return (
    <div style={{ padding: '24px' }}>
      
      {/* RECOMMENDATION BANNER */}
      <div style={{
        padding: '20px',
        background: 'linear-gradient(135deg, #a6e3a1 0%, #40a02b 100%)',
        borderRadius: '12px',
        marginBottom: '24px',
        color: 'white'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <span style={{ fontSize: '24px' }}>🏆</span>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
            Best Match: {recommendation.service}
          </h3>
          <span style={{
            background: 'rgba(255,255,255,0.3)',
            padding: '4px 12px',
            borderRadius: '16px',
            fontSize: '14px',
            fontWeight: '600'
          }}>
            {recommendation.score}%
          </span>
        </div>
        <p style={{ margin: 0, fontSize: '14px', opacity: 0.95 }}>
          {recommendation.reason}
        </p>
      </div>

      {/* SCORES OVERVIEW */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <ScoreCard 
          name="Google Maps" 
          score={scores.google} 
          isHighest={recommendation.service === 'Google Maps'}
        />
        <ScoreCard 
          name="Apple Maps" 
          score={scores.apple} 
          isHighest={recommendation.service === 'Apple Maps'}
        />
        <ScoreCard 
          name="OpenStreetMap" 
          score={scores.osm} 
          isHighest={recommendation.service === 'OpenStreetMap'}
        />
      </div>

      {/* DYNAMIC COMPARISON TABLE */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        overflow: 'hidden',
        border: '1px solid #e5e7eb'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #e5e7eb' }}>
              <th style={thStyle}>Field</th>
              <th style={thStyle}>Your Preference</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>Google Maps</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>Apple Maps</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>OpenStreetMap</th>
            </tr>
          </thead>
          <tbody>
            {rows && rows.length > 0 ? (
              rows.map((row, idx) => (
                <tr 
                  key={idx} 
                  style={{ borderBottom: '1px solid #e5e7eb' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#f8f9fa'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                >
                  <td style={{ ...tdStyle, fontWeight: '500' }}>{row.attribute}</td>
                  <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: '13px' }}>
                    {truncate(row.userPreference, 30)}
                  </td>
                  <ServiceCell value={row.google} />
                  <ServiceCell value={row.apple} />
                  <ServiceCell value={row.osm} />
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: '#6c7086' }}>
                  No fields to compare. Make sure your XPref rule has data.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* INFO NOTE */}
      <div style={{
        marginTop: '16px',
        padding: '12px 16px',
        background: '#f0f9ff',
        borderRadius: '8px',
        fontSize: '13px',
        color: '#0369a1',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <span>ℹ️</span>
        <span>
          Comparing <strong>{rows?.length || 0}</strong> fields dynamically. 
          Add more questions or contexts to increase comparison coverage.
        </span>
      </div>

    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function ScoreCard({ name, score, isHighest }) {
  const pct = score?.percentage || 0;
  
  return (
    <div style={{
      padding: '20px',
      background: 'white',
      borderRadius: '12px',
      border: isHighest ? '2px solid #40a02b' : '2px solid #e5e7eb',
      textAlign: 'center',
      boxShadow: isHighest ? '0 4px 12px rgba(64, 160, 43, 0.2)' : 'none',
      position: 'relative'
    }}>
      {isHighest && (
        <div style={{
          position: 'absolute',
          top: '-10px',
          right: '-10px',
          background: '#40a02b',
          color: 'white',
          borderRadius: '50%',
          width: '24px',
          height: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '14px'
        }}>★</div>
      )}
      
      <div style={{ fontSize: '14px', color: '#6c7086', marginBottom: '8px' }}>
        {name}
      </div>
      <div style={{
        fontSize: '36px',
        fontWeight: '700',
        color: getScoreColor(pct)
      }}>
        {pct}%
      </div>
      <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
        {getScoreLabel(pct)}
      </div>
      
      {/* Match counts */}
      <div style={{
        marginTop: '12px',
        paddingTop: '12px',
        borderTop: '1px solid #e5e7eb',
        display: 'flex',
        justifyContent: 'center',
        gap: '16px',
        fontSize: '12px'
      }}>
        <span style={{ color: '#40a02b' }}>✓ {score?.matched || 0}</span>
        <span style={{ color: '#dc2626' }}>✗ {score?.mismatched || 0}</span>
      </div>
    </div>
  );
}

function ServiceCell({ value }) {
  if (!value) {
    return <td style={{ ...tdStyle, textAlign: 'center', color: '#9ca3af' }}>N/A</td>;
  }
  
  return (
    <td style={{ ...tdStyle, textAlign: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
        <span style={{ 
          fontSize: '16px',
          color: value.matches ? '#40a02b' : (value.icon === '−' ? '#9ca3af' : '#dc2626')
        }}>
          {value.icon || (value.matches ? '✓' : '✗')}
        </span>
        <span style={{ 
          color: value.matches ? '#40a02b' : '#6c7086',
          fontFamily: 'monospace',
          fontSize: '12px',
          maxWidth: '100px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          {truncate(value.value, 20)}
        </span>
      </div>
      {value.comparison && !['Match', 'Mismatch', 'Not compared'].includes(value.reason) && (
        <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '2px' }}>
          ({value.comparison || value.reason})
        </div>
      )}
    </td>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

const thStyle = {
  padding: '14px 16px',
  textAlign: 'left',
  fontWeight: '600',
  color: '#1e1e2e',
  fontSize: '13px'
};

const tdStyle = {
  padding: '14px 16px',
  color: '#374151'
};

function getScoreColor(pct) {
  if (pct >= 80) return '#40a02b';
  if (pct >= 60) return '#ca8a04';
  if (pct >= 40) return '#ea580c';
  return '#dc2626';
}

function getScoreLabel(pct) {
  if (pct >= 90) return 'Excellent';
  if (pct >= 70) return 'Good';
  if (pct >= 50) return 'Fair';
  if (pct >= 25) return 'Partial';
  return 'Poor';
}

function truncate(str, len) {
  if (!str) return 'N/A';
  const s = String(str);
  return s.length > len ? s.substring(0, len - 3) + '...' : s;
}