// src/components/XPrefBuilder.js - XPref Rule Viewer and Editor

import React, { useState, useEffect } from 'react';
import { getUserRules, generateRuleset } from '../api';

export default function XPrefBuilder({ user, serviceType, answers, userContexts, ruleset, serviceData }) {
  const [rules, setRules] = useState([]);
  const [rulesetXml, setRulesetXml] = useState('');
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('rules'); // 'rules' or 'xml'

  // If ruleset is passed directly, use it
  useEffect(() => {
    if (ruleset) {
      setRules(ruleset.rules || []);
      setRulesetXml(ruleset.rulesetXml || '');
    }
  }, [ruleset]);

  // If answers are passed, generate rules
  useEffect(() => {
    if (!ruleset && user && serviceType && Object.keys(answers || {}).length > 0) {
      generateRules();
    }
  }, [user, serviceType, answers, userContexts, ruleset]);

  const generateRules = async () => {
    if (!answers || Object.keys(answers).length === 0) return;
    
    setLoading(true);
    try {
      const result = await generateRuleset(serviceType, answers, userContexts || []);
      if (result.success) {
        setRules(result.rules);
        setRulesetXml(result.rulesetXml);
      }
    } catch (error) {
      console.error('Failed to generate rules:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserRules = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const allRules = await getUserRules(user.id);
      const serviceRules = allRules.filter(r => r.serviceType === serviceType);
      setRules(serviceRules);
    } catch (error) {
      console.error('Failed to load rules:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEffectIcon = (effect) => {
    const icons = {
      'ALLOW': '✓',
      'BLOCK': '✗',
      'ANONYMIZE': '🔒',
      'AGGREGATE': '📊',
      'GENERALIZE': '📍',
      'REDUCE_PRECISION': '📉',
      'LOCAL_ONLY': '💻',
      'DELAY': '⏱️',
      'MASK': '🎭'
    };
    return icons[effect] || '?';
  };

  const getPriorityLabel = (priority) => {
    if (priority >= 90) return 'Critical';
    if (priority >= 70) return 'High';
    if (priority >= 50) return 'Medium';
    return 'Low';
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  if (rules.length === 0) {
    return (
      <div style={{
        padding: '40px',
        textAlign: 'center',
        background: '#f8f9fa',
        borderRadius: '12px',
        color: '#6c7086'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📝</div>
        <h3 style={{ marginBottom: '8px', color: '#45475a' }}>No Rules Generated Yet</h3>
        <p>Answer the questionnaire above to generate XPref privacy rules.</p>
      </div>
    );
  }

  return (
    <div className="results-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ margin: 0 }}>
          📋 Generated XPref Rules ({rules.length})
        </h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            className={`btn ${viewMode === 'rules' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setViewMode('rules')}
            style={{ padding: '8px 16px' }}
          >
            Rules View
          </button>
          <button 
            className={`btn ${viewMode === 'xml' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setViewMode('xml')}
            style={{ padding: '8px 16px' }}
          >
            XML View
          </button>
        </div>
      </div>

      {viewMode === 'rules' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {rules.map((rule, idx) => (
            <div 
              key={rule.id || idx}
              style={{
                padding: '16px',
                background: '#f8f9fa',
                borderRadius: '8px',
                borderLeft: `4px solid ${getEffectColor(rule.effect)}`
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '20px' }}>{getEffectIcon(rule.effect)}</span>
                    <span className={`pet-badge ${rule.effect.toLowerCase()}`}>
                      {rule.effect}
                    </span>
                    <span style={{ 
                      fontSize: '12px', 
                      color: '#6c7086',
                      background: '#e5e7eb',
                      padding: '2px 8px',
                      borderRadius: '4px'
                    }}>
                      Priority: {rule.priority} ({getPriorityLabel(rule.priority)})
                    </span>
                  </div>
                  <div style={{ fontWeight: '600', color: '#1e1e2e', marginBottom: '4px' }}>
                    {rule.purpose}
                  </div>
                  <div style={{ fontSize: '13px', color: '#6c7086' }}>
                    {rule.label}
                  </div>
                </div>
              </div>

              {/* Context conditions */}
              {rule.contexts && rule.contexts.length > 0 && (
                <div style={{ 
                  marginTop: '12px', 
                  padding: '8px 12px', 
                  background: 'white', 
                  borderRadius: '6px',
                  fontSize: '12px'
                }}>
                  <strong style={{ color: '#45475a' }}>Context Conditions:</strong>
                  <div style={{ marginTop: '4px', color: '#6c7086' }}>
                    {rule.contexts.map((ctx, i) => (
                      <span key={i}>
                        {ctx.type}
                        {ctx.allowed && ` = ${ctx.allowed.join(' OR ')}`}
                        {ctx.denied && ` ≠ ${ctx.denied.join(', ')}`}
                        {ctx.value !== undefined && ` = ${ctx.value}`}
                        {ctx.minimum && ` ≥ ${ctx.minimum}`}
                        {i < rule.contexts.length - 1 && ' • '}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Data types */}
              <div style={{ 
                marginTop: '8px', 
                fontSize: '12px', 
                color: '#6c7086',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '4px'
              }}>
                {rule.dataTypes?.slice(0, 5).map((dt, i) => (
                  <span 
                    key={i}
                    style={{
                      background: '#e5e7eb',
                      padding: '2px 8px',
                      borderRadius: '4px'
                    }}
                  >
                    {dt}
                  </span>
                ))}
                {rule.dataTypes?.length > 5 && (
                  <span style={{ color: '#9ca3af' }}>+{rule.dataTypes.length - 5} more</span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="xpref-preview">
          {rulesetXml || 'No XML generated'}
        </div>
      )}

      {/* Legend */}
      <div style={{ 
        marginTop: '24px', 
        padding: '16px', 
        background: '#f8f9fa', 
        borderRadius: '8px'
      }}>
        <div style={{ fontWeight: '600', marginBottom: '12px', fontSize: '14px' }}>
          Effect Types (Privacy-Enhancing Techniques):
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {['BLOCK', 'LOCAL_ONLY', 'ANONYMIZE', 'AGGREGATE', 'GENERALIZE', 'REDUCE_PRECISION', 'MASK', 'DELAY', 'ALLOW'].map(effect => (
            <span key={effect} className={`pet-badge ${effect.toLowerCase()}`}>
              {getEffectIcon(effect)} {effect}
            </span>
          ))}
        </div>
        <div style={{ marginTop: '8px', fontSize: '12px', color: '#6c7086' }}>
          Higher in list = stronger privacy protection
        </div>
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
