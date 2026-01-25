// backend/policyMatcher.js - DYNAMIC P3P Policy Matching Engine
// Dynamically extracts and compares ANY fields from XPref and P3P
// No hardcoding - works with any new fields you add later

const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js'); // Run: npm install xml2js

// ============================================================================
// CONFIGURATION
// ============================================================================

const P3P_POLICIES_DIR = path.join(__dirname, 'Policies');
const P3P_COMBINED_FILE = 'connected_vehicle.xml';

// ============================================================================
// RETENTION COMPARISON - Ordered from best to worst privacy
// ============================================================================

const RETENTION_ORDER = [
  'none',        // 0 - No retention (best privacy)
  'session',     // 1 - Session only
  'on-device',   // 2 - Device only (Apple)
  '24h',         // 3 - 24 hours
  '7d',          // 4 - 7 days
  '30d',         // 5 - 30 days
  '90d',         // 6 - 90 days
  'indefinite'   // 7 - Indefinite (worst privacy)
];

// Known context fields (for flattening)
const CONTEXT_FIELDS = ['timeOfDay', 'roadType', 'homeDistance', 'emergencyStatus', 'speed', 'vehicleSpeed'];

// ============================================================================
// DYNAMIC XPREF EXTRACTION
// ============================================================================

/**
 * Extract ALL fields from an XPref rule dynamically
 * Handles any structure - contexts are flattened to "context.fieldName"
 * 
 * @param {Object} xprefRule - The XPref rule object
 * @returns {Object} Flattened key-value pairs of all fields
 */
function extractAllXPrefFields(xprefRule) {
  const fields = {};
  
  if (!xprefRule) return fields;
  
  // Iterate through all properties of the rule
  for (const [key, value] of Object.entries(xprefRule)) {
    // Skip internal/meta fields
    if (['id', 'createdAt', 'updatedAt', 'xml', 'xpathCondition', 'questionId', 'selectedOption'].includes(key)) {
      continue;
    }
    
    // Handle contexts array - flatten to context.type format
    if (key === 'contexts' && Array.isArray(value)) {
      for (const ctx of value) {
        if (ctx.type) {
          // Extract the context value (could be allowed, denied, value, etc.)
          let ctxValue = null;
          
          if (ctx.allowed && ctx.allowed.length > 0) {
            ctxValue = ctx.allowed.join(', ');
          } else if (ctx.denied && ctx.denied.length > 0) {
            ctxValue = `NOT: ${ctx.denied.join(', ')}`;
          } else if (ctx.value !== undefined) {
            ctxValue = String(ctx.value);
          } else if (ctx.minimum !== undefined) {
            ctxValue = `>= ${ctx.minimum}`;
          } else if (ctx.maximum !== undefined) {
            ctxValue = `<= ${ctx.maximum}`;
          }
          
          if (ctxValue) {
            fields[`context.${ctx.type}`] = ctxValue;
          }
        }
      }
      continue;
    }
    
    // Handle transforms array
    if (key === 'transforms' && Array.isArray(value)) {
      if (value.length > 0) {
        fields['transforms'] = value.map(t => t.type || t).join(', ');
      }
      continue;
    }
    
    // Handle dataTypes array
    if (key === 'dataTypes' && Array.isArray(value)) {
      fields['dataTypes'] = value;
      continue;
    }
    
    // Handle simple values
    if (value !== null && value !== undefined && value !== '') {
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        fields[key] = value;
      } else if (Array.isArray(value)) {
        fields[key] = value.join(', ');
      }
    }
  }
  
  return fields;
}

// ============================================================================
// DYNAMIC P3P EXTRACTION
// ============================================================================

/**
 * Extract ALL fields from a P3P statement's EXTENSION block dynamically
 * Handles any xpref:* tag
 * 
 * @param {Object} statement - Parsed P3P statement
 * @returns {Object} Key-value pairs of all extracted fields
 */
function extractAllP3PFields(statement) {
  const fields = {};
  
  if (!statement) return fields;
  
  // Extract from EXTENSION block (all xpref:* tags)
  if (statement.EXTENSION && statement.EXTENSION[0]) {
    const extension = statement.EXTENSION[0];
    
    for (const [key, value] of Object.entries(extension)) {
      // Handle xpref: prefixed tags
      if (key.startsWith('xpref:')) {
        const fieldName = key.replace('xpref:', '');
        const fieldValue = Array.isArray(value) ? value[0] : value;
        
        // Check if it's a known context field
        if (CONTEXT_FIELDS.includes(fieldName)) {
          fields[`context.${fieldName}`] = fieldValue;
        } else {
          fields[fieldName] = fieldValue;
        }
      }
      // Handle cv: prefixed tags (connected vehicle extensions)
      else if (key.startsWith('cv:')) {
        const fieldName = key.replace('cv:', '');
        const fieldValue = Array.isArray(value) ? value[0] : value;
        fields[fieldName] = fieldValue;
      }
    }
  }
  
  // Extract data types from DATA-GROUP
  if (statement['DATA-GROUP'] && statement['DATA-GROUP'][0]) {
    const dataGroup = statement['DATA-GROUP'][0];
    const dataElements = dataGroup.DATA || [];
    
    const dataTypes = dataElements
      .map(data => {
        if (data.$ && data.$.ref) {
          return data.$.ref.replace(/^#/, '');
        }
        return null;
      })
      .filter(Boolean);
    
    if (dataTypes.length > 0) {
      fields['dataTypes'] = dataTypes;
    }
  }
  
  // Extract from RETENTION element
  if (statement.RETENTION && statement.RETENTION[0]) {
    const retention = statement.RETENTION[0];
    if (typeof retention === 'string') {
      // Try to parse retention value
      if (!fields['retention']) {
        fields['retention'] = retention;
      }
    } else if (retention['business-practices']) {
      if (!fields['retention']) {
        fields['retention'] = retention['business-practices'][0];
      }
    } else if (retention['no-retention'] !== undefined) {
      if (!fields['retention']) {
        fields['retention'] = 'none';
      }
    } else if (retention['stated-purpose']) {
      if (!fields['retention']) {
        fields['retention'] = 'session';
      }
    }
  }
  
  // Extract from PURPOSE element
  if (statement.PURPOSE && statement.PURPOSE[0] && !fields['purpose']) {
    const purpose = statement.PURPOSE[0];
    // P3P purposes: current, admin, develop, tailoring, etc.
    const purposes = Object.keys(purpose).filter(k => k !== '$');
    if (purposes.length > 0) {
      fields['p3pPurpose'] = purposes.join(', ');
    }
  }
  
  // Extract CONSEQUENCE (description)
  if (statement.CONSEQUENCE && statement.CONSEQUENCE[0]) {
    fields['description'] = statement.CONSEQUENCE[0];
  }
  
  return fields;
}

// ============================================================================
// DYNAMIC COMPARISON ENGINE
// ============================================================================

/**
 * Compare retention values with privacy-aware logic
 */
function compareRetention(userRetention, p3pRetention) {
  const userIndex = RETENTION_ORDER.indexOf(userRetention);
  const p3pIndex = RETENTION_ORDER.indexOf(p3pRetention);
  
  if (userIndex === -1 || p3pIndex === -1) {
    return userRetention === p3pRetention;
  }
  
  // P3P retention must be same or better (lower index = better privacy)
  return p3pIndex <= userIndex;
}

/**
 * Get human-readable retention comparison
 */
function getRetentionComparison(userRetention, p3pRetention) {
  const userIndex = RETENTION_ORDER.indexOf(userRetention);
  const p3pIndex = RETENTION_ORDER.indexOf(p3pRetention);
  
  if (userIndex === -1 || p3pIndex === -1) return 'unknown';
  if (p3pIndex < userIndex) return 'better';
  if (p3pIndex === userIndex) return 'equal';
  return 'worse';
}

/**
 * Compare two values dynamically based on field type
 */
function compareFieldValues(fieldName, userValue, p3pValue) {
  // Handle null/undefined
  if (userValue === null || userValue === undefined) {
    return { matches: true, reason: 'No user preference' };
  }
  if (p3pValue === null || p3pValue === undefined) {
    return { matches: false, reason: 'Not specified by service' };
  }
  
  // Special handling for retention
  if (fieldName === 'retention') {
    const acceptable = compareRetention(userValue, p3pValue);
    return {
      matches: acceptable,
      reason: acceptable ? 'Retention acceptable' : 'Retention too long',
      comparison: getRetentionComparison(userValue, p3pValue)
    };
  }
  
  // Special handling for dataTypes (array comparison)
  if (fieldName === 'dataTypes') {
    const userTypes = Array.isArray(userValue) ? userValue : [userValue];
    const p3pTypes = Array.isArray(p3pValue) ? p3pValue : [p3pValue];
    
    const matched = userTypes.filter(ut => 
      p3pTypes.some(pt => {
        if (ut === pt) return true;
        if (ut.endsWith('.*') && pt.startsWith(ut.replace('.*', ''))) return true;
        if (pt.endsWith('.*') && ut.startsWith(pt.replace('.*', ''))) return true;
        return false;
      })
    );
    
    const coverage = userTypes.length > 0 ? (matched.length / userTypes.length) * 100 : 100;
    
    return {
      matches: coverage >= 50, // At least 50% coverage
      reason: `${coverage.toFixed(0)}% data type coverage`,
      coverage,
      matched,
      missing: userTypes.filter(ut => !matched.includes(ut))
    };
  }
  
  // Special handling for context fields (flexible matching)
  if (fieldName.startsWith('context.')) {
    const userStr = String(userValue).toLowerCase();
    const p3pStr = String(p3pValue).toLowerCase();
    
    // "Any" or "All" in P3P means it accepts anything
    if (p3pStr === 'any' || p3pStr === 'all' || p3pStr === '*') {
      return { matches: true, reason: 'Service accepts any value' };
    }
    
    // Check if user value is in P3P allowed list
    const p3pValues = p3pStr.split(',').map(s => s.trim());
    const userValues = userStr.split(',').map(s => s.trim());
    
    const matches = userValues.some(uv => 
      p3pValues.some(pv => uv.includes(pv) || pv.includes(uv))
    );
    
    return {
      matches,
      reason: matches ? 'Context compatible' : 'Context mismatch'
    };
  }
  
  // Default string comparison (case-insensitive)
  const userStr = String(userValue).toLowerCase().trim();
  const p3pStr = String(p3pValue).toLowerCase().trim();
  
  const matches = userStr === p3pStr || p3pStr.includes(userStr) || userStr.includes(p3pStr);
  
  return {
    matches,
    reason: matches ? 'Values match' : 'Values differ'
  };
}

/**
 * MAIN DYNAMIC COMPARISON FUNCTION
 * Compares any XPref fields against any P3P fields
 * 
 * @param {Object} xprefFields - Flattened XPref fields
 * @param {Object} p3pFields - Flattened P3P fields
 * @returns {Object} Comparison result with matches, mismatches, and score
 */
function dynamicCompare(xprefFields, p3pFields) {
  const result = {
    matches: [],
    mismatches: [],
    notInP3P: [],
    score: 0,
    maxScore: 0,
    percentage: 0,
    fieldComparisons: {}
  };
  
  // Compare each XPref field against P3P
  for (const [fieldName, userValue] of Object.entries(xprefFields)) {
    // Skip if user didn't set a value
    if (userValue === null || userValue === undefined || userValue === '') {
      continue;
    }
    
    result.maxScore++;
    
    const p3pValue = p3pFields[fieldName];
    const comparison = compareFieldValues(fieldName, userValue, p3pValue);
    
    const comparisonResult = {
      field: fieldName,
      userValue: Array.isArray(userValue) ? userValue.join(', ') : userValue,
      serviceValue: p3pValue !== undefined 
        ? (Array.isArray(p3pValue) ? p3pValue.join(', ') : p3pValue)
        : 'N/A',
      ...comparison
    };
    
    result.fieldComparisons[fieldName] = comparisonResult;
    
    if (p3pValue === undefined) {
      result.notInP3P.push(comparisonResult);
      // Don't penalize for fields not in P3P (neutral)
      result.maxScore--;
    } else if (comparison.matches) {
      result.score++;
      result.matches.push(comparisonResult);
    } else {
      result.mismatches.push(comparisonResult);
    }
  }
  
  // Calculate percentage
  result.percentage = result.maxScore > 0 
    ? Math.round((result.score / result.maxScore) * 100) 
    : 0;
  
  return result;
}

// ============================================================================
// XML LOADING FUNCTIONS
// ============================================================================

/**
 * Load and parse the combined P3P XML file
 */
async function loadCombinedP3PFile() {
  try {
    const xmlPath = path.join(P3P_POLICIES_DIR, P3P_COMBINED_FILE);
    
    if (!fs.existsSync(xmlPath)) {
      console.error(`P3P file not found: ${xmlPath}`);
      return null;
    }
    
    const xmlContent = fs.readFileSync(xmlPath, 'utf-8');
    const parser = new xml2js.Parser({ 
      explicitArray: true,
      tagNameProcessors: [xml2js.processors.stripPrefix]
    });
    
    const result = await parser.parseStringPromise(xmlContent);
    return result;
  } catch (error) {
    console.error('Error loading P3P file:', error.message);
    return null;
  }
}

/**
 * Extract all policies from combined XML
 * Returns: { google: {...}, apple: {...}, osm: {...} }
 */
async function loadAllP3PPolicies() {
  const parsedXml = await loadCombinedP3PFile();
  
  if (!parsedXml) {
    console.warn('Could not load P3P policies, using fallback');
    return getFallbackPolicies();
  }
  
  const policies = {
    google: { name: 'Google Maps', statements: [], rawPolicy: null },
    apple: { name: 'Apple Maps', statements: [], rawPolicy: null },
    osm: { name: 'OpenStreetMap', statements: [], rawPolicy: null }
  };
  
  // Navigate the XML structure
  // Handle different possible structures
  let policyList = [];
  
  if (parsedXml.POLICIES) {
    policyList = parsedXml.POLICIES.POLICY || [];
  } else if (parsedXml.POLICY) {
    policyList = Array.isArray(parsedXml.POLICY) ? parsedXml.POLICY : [parsedXml.POLICY];
  }
  
  // Also check for nested POLICIES within POLICIES (your XML has this structure)
  if (policyList.length === 0 && parsedXml.POLICIES) {
    // Try to find nested POLICIES elements
    const nestedPolicies = findNestedPolicies(parsedXml.POLICIES);
    policyList = nestedPolicies;
  }
  
  for (const policy of policyList) {
    const policyName = policy.$ ? policy.$.name : '';
    const statements = policy.STATEMENT || [];
    
    // Determine which service this policy belongs to
    const nameLower = policyName.toLowerCase();
    
    if (nameLower.includes('google')) {
      policies.google.statements = statements;
      policies.google.rawPolicy = policy;
    } else if (nameLower.includes('apple')) {
      policies.apple.statements = statements;
      policies.apple.rawPolicy = policy;
    } else if (nameLower.includes('osm') || nameLower.includes('openstreetmap')) {
      policies.osm.statements = statements;
      policies.osm.rawPolicy = policy;
    } else if (nameLower.includes('map') || nameLower.includes('navigation')) {
      // Generic map service - try to determine from content
      if (!policies.google.rawPolicy) {
        policies.google.statements = statements;
        policies.google.rawPolicy = policy;
      }
    }
  }
  
  return policies;
}

/**
 * Helper to find nested POLICIES elements (handles your XML structure)
 */
function findNestedPolicies(obj) {
  const policies = [];
  
  function search(current) {
    if (!current || typeof current !== 'object') return;
    
    if (current.POLICY) {
      const policyArray = Array.isArray(current.POLICY) ? current.POLICY : [current.POLICY];
      policies.push(...policyArray);
    }
    
    // Search nested objects
    for (const key of Object.keys(current)) {
      if (key === 'POLICIES' || key === 'POLICY') {
        search(current[key]);
      } else if (Array.isArray(current[key])) {
        current[key].forEach(item => search(item));
      }
    }
  }
  
  search(obj);
  return policies;
}

/**
 * Fallback policies when XML loading fails
 */
function getFallbackPolicies() {
  const createFallbackStatements = (serviceName, retention) => [{
    EXTENSION: [{
      'xpref:purpose': ['Navigation'],
      'xpref:retention': [retention]
    }],
    'DATA-GROUP': [{
      DATA: [
        { $: { ref: '#location.latitude' } },
        { $: { ref: '#location.longitude' } }
      ]
    }]
  }];
  
  return {
    google: {
      name: 'Google Maps',
      statements: createFallbackStatements('Google', '90d'),
      rawPolicy: null
    },
    apple: {
      name: 'Apple Maps',
      statements: createFallbackStatements('Apple', 'session'),
      rawPolicy: null
    },
    osm: {
      name: 'OpenStreetMap',
      statements: createFallbackStatements('OSM', 'none'),
      rawPolicy: null
    }
  };
}

// ============================================================================
// SERVICE SCORING
// ============================================================================

/**
 * Find the best matching statement for a given purpose
 */
function findMatchingStatement(statements, purpose) {
  for (const statement of statements) {
    const p3pFields = extractAllP3PFields(statement);
    
    if (p3pFields.purpose && p3pFields.purpose.toLowerCase() === purpose.toLowerCase()) {
      return { statement, p3pFields };
    }
  }
  
  // If no exact match, return first statement with Navigation purpose or first statement
  for (const statement of statements) {
    const p3pFields = extractAllP3PFields(statement);
    if (p3pFields.purpose) {
      return { statement, p3pFields };
    }
  }
  
  return { statement: statements[0], p3pFields: extractAllP3PFields(statements[0]) };
}

/**
 * Calculate match score for a single service
 */
function calculateServiceScore(xprefRule, servicePolicy, serviceName) {
  if (!servicePolicy.statements || servicePolicy.statements.length === 0) {
    return {
      service: serviceName,
      matched: false,
      comparison: {
        matches: [],
        mismatches: [],
        notInP3P: [],
        score: 0,
        maxScore: 0,
        percentage: 0
      },
      p3pFields: {},
      xprefFields: {}
    };
  }
  
  // Extract XPref fields dynamically
  const xprefFields = extractAllXPrefFields(xprefRule);
  
  // Find matching statement
  const { statement, p3pFields } = findMatchingStatement(
    servicePolicy.statements, 
    xprefRule.purpose || 'Navigation'
  );
  
  // Dynamic comparison
  const comparison = dynamicCompare(xprefFields, p3pFields);
  
  return {
    service: serviceName,
    matched: comparison.percentage >= 25, // Consider matched if at least 25%
    comparison,
    p3pFields,
    xprefFields,
    matchedStatement: statement
  };
}

/**
 * Match XPref rule against all services dynamically
 */
async function matchXPrefAgainstServices(xprefRule) {
  const policies = await loadAllP3PPolicies();
  
  const googleScore = calculateServiceScore(xprefRule, policies.google, 'Google Maps');
  const appleScore = calculateServiceScore(xprefRule, policies.apple, 'Apple Maps');
  const osmScore = calculateServiceScore(xprefRule, policies.osm, 'OpenStreetMap');
  
  return {
    google: googleScore,
    apple: appleScore,
    osm: osmScore
  };
}

// ============================================================================
// COMPARISON TABLE GENERATION
// ============================================================================

/**
 * Generate dynamic comparison table for UI display
 */
function generateComparisonTable(xprefRule, serviceScores) {
  const { google, apple, osm } = serviceScores;
  
  // Get all unique fields from XPref
  const xprefFields = extractAllXPrefFields(xprefRule);
  const allFields = Object.keys(xprefFields);
  
  // Determine best service
  const services = [
    { name: 'Google Maps', score: google.comparison.percentage, data: google },
    { name: 'Apple Maps', score: apple.comparison.percentage, data: apple },
    { name: 'OpenStreetMap', score: osm.comparison.percentage, data: osm }
  ];
  services.sort((a, b) => b.score - a.score);
  const bestService = services[0];
  
  // Build dynamic comparison rows
  const rows = [];
  
  for (const fieldName of allFields) {
    const userValue = xprefFields[fieldName];
    
    // Skip empty values
    if (userValue === null || userValue === undefined || userValue === '') continue;
    
    const displayUserValue = Array.isArray(userValue) ? userValue.join(', ') : String(userValue);
    
    rows.push({
      attribute: formatFieldName(fieldName),
      fieldKey: fieldName,
      userPreference: displayUserValue,
      google: formatServiceValue(google, fieldName, userValue),
      apple: formatServiceValue(apple, fieldName, userValue),
      osm: formatServiceValue(osm, fieldName, userValue)
    });
  }
  
  return {
    xprefRule: {
      id: xprefRule.id,
      purpose: xprefRule.purpose,
      effect: xprefRule.effect,
      priority: xprefRule.priority,
      dataTypes: xprefRule.dataTypes,
      retention: xprefRule.retention,
      allFields: xprefFields
    },
    rows,
    scores: {
      google: {
        percentage: google.comparison.percentage,
        matched: google.comparison.matches.length,
        mismatched: google.comparison.mismatches.length,
        total: google.comparison.maxScore
      },
      apple: {
        percentage: apple.comparison.percentage,
        matched: apple.comparison.matches.length,
        mismatched: apple.comparison.mismatches.length,
        total: apple.comparison.maxScore
      },
      osm: {
        percentage: osm.comparison.percentage,
        matched: osm.comparison.matches.length,
        mismatched: osm.comparison.mismatches.length,
        total: osm.comparison.maxScore
      }
    },
    recommendation: {
      service: bestService.name,
      score: bestService.score,
      reason: generateRecommendationReason(bestService)
    },
    details: {
      google: google.comparison,
      apple: apple.comparison,
      osm: osm.comparison
    }
  };
}

/**
 * Format field name for display
 */
function formatFieldName(fieldName) {
  // Handle context.* fields
  if (fieldName.startsWith('context.')) {
    const ctxName = fieldName.replace('context.', '');
    return `Context: ${ctxName.replace(/([A-Z])/g, ' $1').trim()}`;
  }
  
  // Capitalize and space out camelCase
  return fieldName
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}

/**
 * Format service value for comparison table
 */
function formatServiceValue(serviceScore, fieldName, userValue) {
  const comparison = serviceScore.comparison.fieldComparisons[fieldName];
  
  if (!comparison) {
    return {
      value: 'N/A',
      matches: false,
      icon: '−',
      comparison: 'not available'
    };
  }
  
  return {
    value: comparison.serviceValue || 'N/A',
    matches: comparison.matches,
    icon: comparison.matches ? '✓' : '✗',
    comparison: comparison.comparison || comparison.reason
  };
}

/**
 * Generate recommendation reason
 */
function generateRecommendationReason(bestService) {
  const score = bestService.score;
  
  if (score >= 90) {
    return `Excellent match with ${score}% compatibility. This service aligns very well with your privacy preferences.`;
  } else if (score >= 70) {
    return `Good match with ${score}% compatibility. Most of your preferences are supported.`;
  } else if (score >= 50) {
    return `Moderate match with ${score}% compatibility. Some compromises may be needed.`;
  } else if (score >= 25) {
    return `Partial match with ${score}% compatibility. Several preferences differ from service policy.`;
  } else {
    return `Limited match with ${score}% compatibility. Consider adjusting your preferences or choosing a different service.`;
  }
}

// ============================================================================
// LEGACY COMPATIBILITY
// ============================================================================

function findMatchingPolicy(serviceType, purpose) {
  return {
    serviceType,
    purpose,
    matched: true
  };
}

function matchPolicyToPreference(rule, policy) {
  return {
    matched: true,
    compatibility: 'ALLOWED',
    message: 'Use matchXPrefAgainstServices for full comparison'
  };
}

function getAllPolicies() {
  return {
    message: 'Use loadAllP3PPolicies() for async loading'
  };
}

// Placeholder for backwards compatibility
const P3P_POLICIES = {};

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Dynamic extraction functions
  extractAllXPrefFields,
  extractAllP3PFields,
  dynamicCompare,
  
  // Main functions
  loadAllP3PPolicies,
  loadCombinedP3PFile,
  matchXPrefAgainstServices,
  generateComparisonTable,
  calculateServiceScore,
  findMatchingStatement,
  
  // Comparison helpers
  compareRetention,
  compareFieldValues,
  getRetentionComparison,
  
  // Legacy compatibility
  findMatchingPolicy,
  matchPolicyToPreference,
  getAllPolicies,
  P3P_POLICIES,
  
  // Constants
  RETENTION_ORDER,
  CONTEXT_FIELDS
};