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
