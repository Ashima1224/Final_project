// src/api.js - API Helper Functions
const API_BASE = 'http://localhost:4000/api';

// Auth
export async function login(username, password) {
  const res = await fetch(`${API_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  if (!res.ok) throw new Error('Login failed');
  return res.json();
}

export async function logout() {
  const res = await fetch(`${API_BASE}/logout`, { method: 'POST' });
  return res.json();
}

// Questionnaire
export async function getQuestionnaire() {
  const res = await fetch(`${API_BASE}/questionnaire`);
  return res.json();
}

export async function getServiceQuestionnaire(serviceType) {
  const res = await fetch(`${API_BASE}/questionnaire/${serviceType}`);
  return res.json();
}

export async function getContextTypes() {
  const res = await fetch(`${API_BASE}/contexts`);
  return res.json();
}

export async function getPETHierarchy() {
  const res = await fetch(`${API_BASE}/pets`);
  return res.json();
}

// Preferences
export async function savePreferences(userId, serviceType, answers, userContexts = []) {
  const res = await fetch(`${API_BASE}/preferences`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, serviceType, answers, userContexts })
  });
  return res.json();
}

export async function getUserPreferences(userId) {
  const res = await fetch(`${API_BASE}/preferences/${userId}`);
  return res.json();
}

export async function getServicePreferences(userId, serviceType) {
  const res = await fetch(`${API_BASE}/preferences/${userId}/${serviceType}`);
  return res.json();
}

// Rules
export async function generateRule(serviceType, questionId, selectedOption, userContexts = []) {
  const res = await fetch(`${API_BASE}/rules/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ serviceType, questionId, selectedOption, userContexts })
  });
  return res.json();
}

export async function generateRuleset(serviceType, answers, userContexts = []) {
  const res = await fetch(`${API_BASE}/rules/generate-ruleset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ serviceType, answers, userContexts })
  });
  return res.json();
}

export async function getUserRules(userId) {
  const res = await fetch(`${API_BASE}/rules/${userId}`);
  return res.json();
}

// Evaluation
export async function evaluatePreferences(userId, serviceType, currentContext = {}) {
  const res = await fetch(`${API_BASE}/evaluate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, serviceType, currentContext })
  });
  return res.json();
}

export async function quickEvaluate(rule, currentContext = {}, serviceType) {
  const res = await fetch(`${API_BASE}/evaluate/quick`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rule, currentContext, serviceType })
  });
  return res.json();
}

export async function resolveConflict(rules, userChoice = null) {
  const res = await fetch(`${API_BASE}/evaluate/resolve-conflict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rules, userChoice })
  });
  return res.json();
}

// Get domain metadata for dynamic dropdowns
export async function getDomainMetadata() {
  const res = await fetch(`${API_BASE}/domain/metadata`);
  if (!res.ok) {
    throw new Error('Failed to fetch domain metadata');
  }
  return res.json();
}

// P3P Policies
export async function getP3PPolicies() {
  const res = await fetch(`${API_BASE}/p3p`);
  return res.json();
}

export async function getServiceP3P(serviceType) {
  const res = await fetch(`${API_BASE}/p3p/${serviceType}`);
  return res.json();
}

// History
export async function getEvaluationHistory(userId) {
  const res = await fetch(`${API_BASE}/history/${userId}`);
  return res.json();
}

// Data Streaming
export async function getStreamData(userId, serviceType, currentContext = {}) {
  const res = await fetch(`${API_BASE}/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, serviceType, currentContext })
  });
  return res.json();
}

// ================================================================================
// P3P COMPARISON FUNCTIONS
// ================================================================================

/**
 * Compare XPref rule against P3P policies
 */
export async function compareWithP3P(xprefRule) {
  try {
    const response = await fetch(`${API_BASE}/comparison/p3p`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ xprefRule })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to compare with P3P');
    }
    
    return await response.json();
  } catch (error) {
    console.error('P3P comparison error:', error);
    throw error;
  }
}

/**
 * Extract fields from XPref and P3P (for debugging)
 */
export async function extractComparisonFields(xprefRule) {
  try {
    const response = await fetch(`${API_BASE}/comparison/extract-fields`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ xprefRule })
    });
    
    if (!response.ok) {
      throw new Error('Failed to extract fields');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Field extraction error:', error);
    throw error;
  }
}

/**
 * Test if P3P policies are loaded correctly
 */
export async function testP3PLoading() {
  try {
    const response = await fetch(`${API_BASE}/p3p/test`);
    return await response.json();
  } catch (error) {
    console.error('P3P test error:', error);
    throw error;
  }
}