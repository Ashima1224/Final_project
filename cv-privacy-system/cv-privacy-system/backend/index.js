// backend/index.js - Main Express Server
// Privacy Preference & Rule-Based Policy Evaluation System

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');

const { QUESTIONNAIRE_DATA, PET_HIERARCHY, CONTEXT_TYPES } = require('./questionnaire');
const { generateXPrefRule, generateServiceRuleset } = require('./ruleGenerator');
const { P3P_POLICIES, findMatchingPolicy, matchPolicyToPreference, getAllPolicies } = require('./policyMatcher');
const { evaluatePreferences, streamEvaluation, policyEvaluation, resolveConflicts } = require('./ruleEngine');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// In-memory storage (no JSON files as per requirements)
const storage = {
  users: [
    { id: 'u1', username: 'admin', password: 'admin123', role: 'admin' },
    { id: 'u2', username: 'alice', password: 'userpass', role: 'user' },
    { id: 'u3', username: 'bob', password: 'userpass', role: 'user' }
  ],
  userPreferences: new Map(), // userId -> { serviceType -> { questionId -> selectedOption } }
  savedRules: new Map(), // userId -> [ rules ]
  evaluationHistory: [] // Store evaluation results
};

// ================================================================================
// AUTH ENDPOINTS
// ================================================================================

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = storage.users.find(u => u.username === username && u.password === password);
  
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  res.json({
    id: user.id,
    username: user.username,
    role: user.role
  });
});

app.post('/api/logout', (req, res) => {
  res.json({ success: true });
});

// ================================================================================
// QUESTIONNAIRE ENDPOINTS
// ================================================================================

// Get all service types and their questions
app.get('/api/questionnaire', (req, res) => {
  res.json(QUESTIONNAIRE_DATA);
});

// Get questions for a specific service type
app.get('/api/questionnaire/:serviceType', (req, res) => {
  const { serviceType } = req.params;
  const service = QUESTIONNAIRE_DATA[serviceType];
  
  if (!service) {
    return res.status(404).json({ error: `Unknown service type: ${serviceType}` });
  }
  
  res.json(service);
});

// Get available contexts
app.get('/api/contexts', (req, res) => {
  res.json(CONTEXT_TYPES);
});

// Get PET hierarchy
app.get('/api/pets', (req, res) => {
  res.json({
    hierarchy: PET_HIERARCHY,
    descriptions: {
      'ALLOW': 'Full data access permitted',
      'DELAY': 'Access delayed pending user consent',
      'MASK': 'Sensitive portions hidden',
      'REDUCE_PRECISION': 'Data precision reduced',
      'GENERALIZE': 'Location/data generalized',
      'AGGREGATE': 'Only aggregated values shared',
      'ANONYMIZE': 'Identity removed',
      'LOCAL_ONLY': 'Processed on device only',
      'BLOCK': 'Access completely denied'
    }
  });
});

// ================================================================================
// PREFERENCE MANAGEMENT ENDPOINTS
// ================================================================================

// Save user preferences (questionnaire answers)
app.post('/api/preferences', (req, res) => {
  const { userId, serviceType, answers, userContexts } = req.body;
  
  if (!userId || !serviceType || !answers) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  // Validate service type
  if (!QUESTIONNAIRE_DATA[serviceType]) {
    return res.status(400).json({ error: `Unknown service type: ${serviceType}` });
  }
  
  // Validate answers
  const service = QUESTIONNAIRE_DATA[serviceType];
  for (const [questionId, option] of Object.entries(answers)) {
    const question = service.questions.find(q => q.id === questionId);
    if (!question) {
      return res.status(400).json({ error: `Unknown question: ${questionId}` });
    }
    if (!['a', 'b', 'c', 'd'].includes(option)) {
      return res.status(400).json({ error: `Invalid option for ${questionId}: ${option}` });
    }
  }
  
  // Store preferences
  if (!storage.userPreferences.has(userId)) {
    storage.userPreferences.set(userId, {});
  }
  storage.userPreferences.get(userId)[serviceType] = {
    answers,
    userContexts: userContexts || [],
    updatedAt: new Date().toISOString()
  };
  
  // Generate XPref ruleset
  const ruleset = generateServiceRuleset(serviceType, answers, userContexts || []);
  
  // Store rules
  if (!storage.savedRules.has(userId)) {
    storage.savedRules.set(userId, []);
  }
  
  // Remove old rules for this service type
  const existingRules = storage.savedRules.get(userId);
  const filteredRules = existingRules.filter(r => r.serviceType !== serviceType);
  filteredRules.push(...ruleset.rules);
  storage.savedRules.set(userId, filteredRules);
  
  res.json({
    success: true,
    serviceType,
    rulesGenerated: ruleset.rules.length,
    ruleset,
    message: `Preferences saved and ${ruleset.rules.length} XPref rules generated`
  });
});

// Get user preferences
app.get('/api/preferences/:userId', (req, res) => {
  const { userId } = req.params;
  const preferences = storage.userPreferences.get(userId) || {};
  res.json(preferences);
});

// Get user preferences for a specific service
app.get('/api/preferences/:userId/:serviceType', (req, res) => {
  const { userId, serviceType } = req.params;
  const userPrefs = storage.userPreferences.get(userId);
  
  if (!userPrefs || !userPrefs[serviceType]) {
    return res.json({ answers: {}, userContexts: [] });
  }
  
  res.json(userPrefs[serviceType]);
});

// ================================================================================
// RULE GENERATION ENDPOINTS
// ================================================================================

// Generate XPref rule for a single question
app.post('/api/rules/generate', (req, res) => {
  const { serviceType, questionId, selectedOption, userContexts } = req.body;
  
  try {
    const result = generateXPrefRule(serviceType, questionId, selectedOption, userContexts || []);
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Generate complete XPref ruleset for a service
app.post('/api/rules/generate-ruleset', (req, res) => {
  const { serviceType, answers, userContexts } = req.body;
  
  try {
    const ruleset = generateServiceRuleset(serviceType, answers, userContexts || []);
    res.json({
      success: true,
      ...ruleset
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Get saved rules for a user
app.get('/api/rules/:userId', (req, res) => {
  const { userId } = req.params;
  const rules = storage.savedRules.get(userId) || [];
  res.json(rules);
});

// ================================================================================
// EVALUATION ENDPOINTS
// ================================================================================

// Full two-phase evaluation
app.post('/api/evaluate', (req, res) => {
  const { userId, serviceType, currentContext } = req.body;
  
  // Get user's rules
  const rules = storage.savedRules.get(userId) || [];
  const serviceRules = rules.filter(r => r.serviceType === serviceType);
  
  if (serviceRules.length === 0) {
    return res.json({
      success: true,
      noPreferences: true,
      message: 'No preferences configured for this service type',
      defaultOptions: [
        { id: 'default-allow', label: 'Allow', effect: 'ALLOW' },
        { id: 'default-deny', label: 'Deny', effect: 'BLOCK' },
        { id: 'minimal-pet', label: 'Apply Minimal Protection', effect: 'GENERALIZE' }
      ]
    });
  }
  
  // Run evaluation
  const result = evaluatePreferences(serviceRules, serviceType, currentContext || {});
  
  // Store in history
  storage.evaluationHistory.push({
    id: uuidv4(),
    userId,
    serviceType,
    currentContext,
    result,
    timestamp: new Date().toISOString()
  });
  
  res.json({
    success: true,
    ...result
  });
});

// Quick evaluation (single rule test)
app.post('/api/evaluate/quick', (req, res) => {
  const { rule, currentContext, serviceType } = req.body;
  
  // Find matching policy
  const policy = findMatchingPolicy(serviceType, rule.purpose);
  const policyMatch = matchPolicyToPreference(rule, policy);
  
  // Run stream evaluation
  const streamResult = streamEvaluation([rule], currentContext || {});
  
  res.json({
    success: true,
    rule,
    isActive: streamResult.activeRules.length > 0,
    contextEvaluation: streamResult.activeRules[0]?.contextEvaluation || streamResult.inactiveRules[0]?.contextEvaluation,
    policyMatch,
    effect: rule.effect
  });
});

// Resolve conflict between rules
app.post('/api/evaluate/resolve-conflict', (req, res) => {
  const { rules, userChoice } = req.body;
  
  if (userChoice) {
    // User made a choice
    const selectedRule = rules.find(r => r.id === userChoice);
    if (selectedRule) {
      res.json({
        success: true,
        resolution: 'USER_CHOICE',
        winner: selectedRule
      });
      return;
    }
  }
  
  // Auto-resolve
  const resolution = resolveConflicts(rules);
  res.json({
    success: true,
    ...resolution
  });
});

// ================================================================================
// P3P POLICY ENDPOINTS
// ================================================================================

// Get all P3P policies
app.get('/api/p3p', (req, res) => {
  res.json(getAllPolicies());
});

// Get P3P policies for a service type
app.get('/api/p3p/:serviceType', (req, res) => {
  const { serviceType } = req.params;
  const policies = P3P_POLICIES[serviceType];
  
  if (!policies) {
    return res.status(404).json({ error: `No policies found for: ${serviceType}` });
  }
  
  res.json(policies);
});

// ================================================================================
// EVALUATION HISTORY
// ================================================================================

app.get('/api/history/:userId', (req, res) => {
  const { userId } = req.params;
  const history = storage.evaluationHistory.filter(h => h.userId === userId);
  res.json(history.slice(-50)); // Last 50 evaluations
});

// ================================================================================
// DATA STREAMING SIMULATION
// ================================================================================

// Generate mock vehicle data
function generateMockVehicleData() {
  const roadTypes = ['Highway', 'Regional', 'Urban', 'Residential'];
  const timeOfDay = (() => {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) return 'Morning';
    if (hour >= 12 && hour < 18) return 'Afternoon';
    if (hour >= 18 && hour < 21) return 'Evening';
    return 'Night';
  })();
  
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
    },
    sensors: {
      tirePressure: [2.2 + Math.random() * 0.3, 2.2 + Math.random() * 0.3, 2.2 + Math.random() * 0.3, 2.2 + Math.random() * 0.3],
      brakePadWear: Math.floor(Math.random() * 100),
      batteryVoltage: 12.4 + Math.random() * 0.8
    }
  };
}

// Apply PET transformations to data
function applyPETTransformation(data, effect, transforms = []) {
  const transformed = JSON.parse(JSON.stringify(data)); // Deep clone
  
  switch (effect) {
    case 'BLOCK':
      return {
        timestamp: data.timestamp,
        status: 'BLOCKED',
        message: 'Data access denied by privacy preference'
      };
      
    case 'LOCAL_ONLY':
      return {
        timestamp: data.timestamp,
        status: 'LOCAL_ONLY',
        message: 'Data processed locally, not transmitted',
        localSummary: {
          speedCategory: data.speed.value > 100 ? 'High' : data.speed.value > 60 ? 'Medium' : 'Low',
          engineStatus: data.engine.temperature < 100 ? 'Normal' : 'Warning'
        }
      };
      
    case 'ANONYMIZE':
      transformed.vehicle.vin = '[ANON_' + Math.random().toString(36).substring(2, 8) + ']';
      transformed.vehicle.make = '[ANONYMIZED]';
      transformed.vehicle.model = '[ANONYMIZED]';
      transformed.location.latitude = Math.round(transformed.location.latitude * 100) / 100;
      transformed.location.longitude = Math.round(transformed.location.longitude * 100) / 100;
      transformed._transformation = 'ANONYMIZED';
      break;
      
    case 'AGGREGATE':
      return {
        timestamp: data.timestamp,
        status: 'AGGREGATED',
        aggregatedData: {
          avgSpeed: Math.round(data.speed.value / 10) * 10 + ' km/h (10 km/h buckets)',
          region: 'Stuttgart Metro Area',
          timeWindow: '5 minute average',
          vehicleCount: Math.floor(Math.random() * 50) + 10 + ' vehicles in area'
        }
      };
      
    case 'GENERALIZE':
      transformed.location.latitude = Math.round(transformed.location.latitude * 100) / 100;
      transformed.location.longitude = Math.round(transformed.location.longitude * 100) / 100;
      transformed.speed.value = Math.round(transformed.speed.value / 10) * 10;
      transformed.location.heading = Math.round(transformed.location.heading / 45) * 45;
      transformed._transformation = 'GENERALIZED (100m accuracy)';
      break;
      
    case 'REDUCE_PRECISION':
      transformed.location.latitude = Math.round(transformed.location.latitude * 10) / 10;
      transformed.location.longitude = Math.round(transformed.location.longitude * 10) / 10;
      transformed.speed.value = Math.round(transformed.speed.value);
      delete transformed.acceleration;
      delete transformed.sensors;
      transformed._transformation = 'REDUCED_PRECISION';
      break;
      
    case 'MASK':
      transformed.vehicle.vin = transformed.vehicle.vin.substring(0, 5) + '*****' + transformed.vehicle.vin.substring(10);
      transformed._transformation = 'MASKED';
      break;
      
    case 'DELAY':
      transformed._transformation = 'DELAYED (15 minute delay)';
      transformed._originalTimestamp = transformed.timestamp;
      transformed.timestamp = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      break;
      
    case 'ALLOW':
    default:
      transformed._transformation = 'ALLOWED (Full Access)';
      break;
  }
  
  return transformed;
}

// Stream endpoint - returns current mock data with transformations applied
app.post('/api/stream', (req, res) => {
  const { userId, serviceType, currentContext } = req.body;
  
  // Generate mock data
  const rawData = generateMockVehicleData();
  
  // Get user's rules for this service
  const rules = storage.savedRules.get(userId) || [];
  const serviceRules = rules.filter(r => r.serviceType === serviceType);
  
  // If no rules, return raw data with default effect
  if (serviceRules.length === 0) {
    res.json({
      success: true,
      rawData,
      transformedData: rawData,
      effect: 'ALLOW',
      reason: 'No privacy preferences configured - using default allow',
      activeRules: [],
      context: rawData.context
    });
    return;
  }
  
  // Run stream evaluation
  const evalContext = currentContext || rawData.context;
  const streamResult = streamEvaluation(serviceRules, evalContext);
  
  // Get the winning rule
  let effect = 'ALLOW';
  let reason = 'No active rules for current context';
  let winningRule = null;
  
  if (streamResult.activeRules.length > 0) {
    // Resolve conflicts if multiple rules
    if (streamResult.activeRules.length > 1) {
      const resolution = resolveConflicts(streamResult.activeRules);
      winningRule = resolution.winner;
      effect = winningRule.effect;
      reason = `Conflict resolved: ${resolution.method} - ${resolution.reason}`;
    } else {
      winningRule = streamResult.activeRules[0];
      effect = winningRule.effect;
      reason = `Rule matched: ${winningRule.purpose} (Priority: ${winningRule.priority})`;
    }
  }
  
  // Apply transformation
  const transformedData = applyPETTransformation(rawData, effect, winningRule?.transforms);
  
  res.json({
    success: true,
    rawData,
    transformedData,
    effect,
    reason,
    winningRule: winningRule ? {
      id: winningRule.id,
      purpose: winningRule.purpose,
      effect: winningRule.effect,
      priority: winningRule.priority,
      label: winningRule.label
    } : null,
    activeRules: streamResult.activeRules.length,
    inactiveRules: streamResult.inactiveRules.length,
    context: evalContext
  });
});

// ================================================================================
// DEBUG/ADMIN ENDPOINTS
// ================================================================================

app.get('/api/debug/storage', (req, res) => {
  res.json({
    usersCount: storage.users.length,
    preferencesCount: storage.userPreferences.size,
    rulesCount: Array.from(storage.savedRules.values()).flat().length,
    historyCount: storage.evaluationHistory.length
  });
});

// ================================================================================
// SERVER START
// ================================================================================

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log('🚗 Privacy Preference & Rule-Based Policy Evaluation System');
  console.log('='.repeat(60));
  console.log(`Server running on port ${PORT}`);
  console.log('\nAvailable Service Types:');
  Object.entries(QUESTIONNAIRE_DATA).forEach(([key, service]) => {
    console.log(`  ${service.icon} ${service.name} (${key})`);
  });
  console.log('\nEndpoints:');
  console.log('  POST /api/login');
  console.log('  GET  /api/questionnaire');
  console.log('  GET  /api/questionnaire/:serviceType');
  console.log('  POST /api/preferences');
  console.log('  GET  /api/preferences/:userId');
  console.log('  POST /api/rules/generate');
  console.log('  POST /api/evaluate');
  console.log('  POST /api/evaluate/quick');
  console.log('  GET  /api/p3p');
  console.log('  GET  /api/contexts');
  console.log('  GET  /api/pets');
  console.log('='.repeat(60));
});
