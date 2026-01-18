// backend/ruleEngine.js - Rule Engine with Conflict Resolution & Two-Phase Evaluation
// Handles rule conflicts, evaluation, and final decision making

const { PET_HIERARCHY, CONTEXT_TYPES } = require('./questionnaire');
const { findMatchingPolicy, matchPolicyToPreference } = require('./policyMatcher');

/**
 * Phase 1: Stream Evaluation (Dynamic Context Evaluation)
 * Evaluates rules against current runtime context
 */
function streamEvaluation(rules, currentContext) {
  console.log('\n=== PHASE 1: Stream Evaluation ===');
  console.log('Current Context:', currentContext);
  
  const activeRules = [];
  const inactiveRules = [];
  
  for (const rule of rules) {
    const evaluation = evaluateRuleContext(rule, currentContext);
    
    if (evaluation.active) {
      activeRules.push({
        ...rule,
        contextEvaluation: evaluation
      });
    } else {
      inactiveRules.push({
        ...rule,
        contextEvaluation: evaluation
      });
    }
  }
  
  console.log(`Active rules: ${activeRules.length}, Inactive rules: ${inactiveRules.length}`);
  
  return {
    phase: 'stream',
    currentContext,
    activeRules,
    inactiveRules,
    summary: {
      total: rules.length,
      active: activeRules.length,
      inactive: inactiveRules.length
    }
  };
}

/**
 * Evaluate if a rule is active based on current context
 */
function evaluateRuleContext(rule, currentContext) {
  if (!rule.contexts || rule.contexts.length === 0) {
    // No context restrictions - rule is always active
    return { active: true, reason: 'No context restrictions' };
  }
  
  const contextResults = [];
  
  for (const ctx of rule.contexts) {
    const result = evaluateSingleContext(ctx, currentContext);
    contextResults.push(result);
    
    if (!result.satisfied) {
      return {
        active: false,
        reason: result.reason,
        details: contextResults
      };
    }
  }
  
  return {
    active: true,
    reason: 'All context conditions satisfied',
    details: contextResults
  };
}

/**
 * Evaluate a single context condition
 */
function evaluateSingleContext(contextCondition, currentContext) {
  const { type, allowed, denied, value, minimum, maximum } = contextCondition;
  const currentValue = currentContext[type];
  
  // Check denied values
  if (denied && denied.length > 0) {
    if (denied.includes(currentValue)) {
      return {
        type,
        satisfied: false,
        reason: `Context '${type}' value '${currentValue}' is denied`
      };
    }
  }
  
  // Check allowed values
  if (allowed && allowed.length > 0) {
    if (!allowed.includes(currentValue)) {
      return {
        type,
        satisfied: false,
        reason: `Context '${type}' value '${currentValue}' not in allowed list [${allowed.join(', ')}]`
      };
    }
  }
  
  // Check boolean value
  if (value !== undefined) {
    if (currentContext[type] !== value) {
      return {
        type,
        satisfied: false,
        reason: `Context '${type}' expected '${value}', got '${currentContext[type]}'`
      };
    }
  }
  
  // Check minimum (for distance-based contexts)
  if (minimum !== undefined) {
    const numericCurrent = parseContextValue(currentContext[type]);
    const numericMin = parseContextValue(minimum);
    if (numericCurrent < numericMin) {
      return {
        type,
        satisfied: false,
        reason: `Context '${type}' value ${numericCurrent} below minimum ${numericMin}`
      };
    }
  }
  
  // Check maximum
  if (maximum !== undefined) {
    const numericCurrent = parseContextValue(currentContext[type]);
    const numericMax = parseContextValue(maximum);
    if (numericCurrent > numericMax) {
      return {
        type,
        satisfied: false,
        reason: `Context '${type}' value ${numericCurrent} above maximum ${numericMax}`
      };
    }
  }
  
  return {
    type,
    satisfied: true,
    reason: 'Condition satisfied'
  };
}

/**
 * Parse context value to numeric if needed
 */
function parseContextValue(value) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    // Handle values like '100m', '1km'
    const match = value.match(/^(\d+)(m|km)?$/);
    if (match) {
      const num = parseInt(match[1]);
      const unit = match[2];
      if (unit === 'km') return num * 1000;
      return num;
    }
  }
  return value;
}

/**
 * Phase 2: Policy Evaluation (Static P3P Matching)
 * Matches active rules against P3P policies
 */
function policyEvaluation(streamResult, serviceType) {
  console.log('\n=== PHASE 2: Policy Evaluation ===');
  
  const { activeRules } = streamResult;
  const policyMatches = [];
  
  for (const rule of activeRules) {
    const policy = findMatchingPolicy(serviceType, rule.purpose);
    const match = matchPolicyToPreference(rule, policy);
    
    policyMatches.push({
      rule,
      policy,
      match
    });
  }
  
  return {
    phase: 'policy',
    serviceType,
    policyMatches,
    summary: {
      total: policyMatches.length,
      matched: policyMatches.filter(m => m.match.matched).length,
      blocked: policyMatches.filter(m => m.match.compatibility === 'BLOCKED').length
    }
  };
}

/**
 * Resolve conflicts between multiple active rules
 * Returns the winning rule based on priority and PET hierarchy
 */
function resolveConflicts(rules) {
  console.log('\n=== Conflict Resolution ===');
  console.log(`Resolving conflicts for ${rules.length} rules`);
  
  if (rules.length === 0) {
    return {
      winner: null,
      conflict: false,
      resolution: 'NO_RULES',
      allRules: []
    };
  }
  
  if (rules.length === 1) {
    return {
      winner: rules[0],
      conflict: false,
      resolution: 'SINGLE_RULE',
      allRules: rules
    };
  }
  
  // Sort by priority (highest first)
  const sortedByPriority = [...rules].sort((a, b) => b.priority - a.priority);
  
  // Check if there are rules with the same highest priority
  const highestPriority = sortedByPriority[0].priority;
  const sameHighestPriority = sortedByPriority.filter(r => r.priority === highestPriority);
  
  if (sameHighestPriority.length === 1) {
    // Clear winner by priority
    console.log(`Winner by priority: ${sortedByPriority[0].id} (priority: ${highestPriority})`);
    return {
      winner: sortedByPriority[0],
      conflict: false,
      resolution: 'PRIORITY',
      allRules: sortedByPriority
    };
  }
  
  // Multiple rules with same priority - use PET hierarchy
  console.log(`${sameHighestPriority.length} rules with same priority ${highestPriority}, using PET hierarchy`);
  
  const sortedByPET = sameHighestPriority.sort((a, b) => {
    const petA = PET_HIERARCHY.indexOf(a.effect);
    const petB = PET_HIERARCHY.indexOf(b.effect);
    return petB - petA; // Higher PET index = more protective = wins
  });
  
  const highestPETIndex = PET_HIERARCHY.indexOf(sortedByPET[0].effect);
  const sameHighestPET = sortedByPET.filter(r => PET_HIERARCHY.indexOf(r.effect) === highestPETIndex);
  
  if (sameHighestPET.length === 1) {
    console.log(`Winner by PET hierarchy: ${sortedByPET[0].id} (effect: ${sortedByPET[0].effect})`);
    return {
      winner: sortedByPET[0],
      conflict: false,
      resolution: 'PET_HIERARCHY',
      allRules: sortedByPriority
    };
  }
  
  // Still unresolved - flag for user decision
  console.log(`Conflict unresolved: ${sameHighestPET.length} rules with same priority and PET level`);
  return {
    winner: null,
    conflict: true,
    conflictingRules: sameHighestPET,
    resolution: 'USER_DECISION_REQUIRED',
    allRules: sortedByPriority,
    message: 'Multiple rules with same priority and protection level. User decision required.'
  };
}

/**
 * Handle no-match case
 * Returns options for the user
 */
function handleNoMatch(serviceType, purpose) {
  return {
    noMatch: true,
    serviceType,
    purpose,
    options: [
      {
        id: 'default-allow',
        label: 'Default Allow',
        effect: 'ALLOW',
        description: 'Allow data access with no restrictions'
      },
      {
        id: 'default-deny',
        label: 'Default Deny',
        effect: 'BLOCK',
        description: 'Block all data access'
      },
      {
        id: 'minimal-pet',
        label: 'Apply Minimal PET',
        effect: 'GENERALIZE',
        description: 'Allow with basic privacy protection (generalization)'
      }
    ]
  };
}

/**
 * Generate final decision output
 * Combines all evaluation phases into a final result
 */
function generateFinalDecision(streamResult, policyResult, conflictResult) {
  console.log('\n=== Generating Final Decision ===');
  
  const decision = {
    timestamp: new Date().toISOString(),
    phases: {
      stream: streamResult,
      policy: policyResult,
      conflict: conflictResult
    },
    finalOutcome: null,
    appliedPETs: [],
    filteredData: [],
    explanation: []
  };
  
  // Determine final outcome
  if (conflictResult.noMatch) {
    decision.finalOutcome = {
      status: 'NO_PREFERENCE',
      message: 'No user preference found for this request',
      requiresUserInput: true,
      options: conflictResult.options
    };
    decision.explanation.push('No matching preference rule found.');
    return decision;
  }
  
  if (conflictResult.conflict) {
    decision.finalOutcome = {
      status: 'CONFLICT',
      message: conflictResult.message,
      requiresUserInput: true,
      conflictingRules: conflictResult.conflictingRules.map(r => ({
        id: r.id,
        effect: r.effect,
        priority: r.priority,
        purpose: r.purpose
      }))
    };
    decision.explanation.push('Multiple conflicting rules detected.');
    return decision;
  }
  
  const winningRule = conflictResult.winner;
  
  // Apply the winning rule
  decision.finalOutcome = {
    status: 'RESOLVED',
    effect: winningRule.effect,
    priority: winningRule.priority,
    ruleId: winningRule.id,
    message: getEffectMessage(winningRule.effect)
  };
  
  // Determine applied PETs
  decision.appliedPETs = getAppliedPETs(winningRule);
  
  // Generate filtered data view
  decision.filteredData = generateFilteredDataView(winningRule, policyResult);
  
  // Build explanation
  decision.explanation = buildExplanation(winningRule, streamResult, policyResult, conflictResult);
  
  console.log('Final decision:', decision.finalOutcome.status, '-', decision.finalOutcome.effect);
  
  return decision;
}

/**
 * Get human-readable message for effect
 */
function getEffectMessage(effect) {
  const messages = {
    'ALLOW': 'Data access permitted with no restrictions',
    'BLOCK': 'Data access blocked',
    'MASK': 'Data will be masked before sharing',
    'REDUCE_PRECISION': 'Data precision will be reduced',
    'AGGREGATE': 'Only aggregated data will be shared',
    'GENERALIZE': 'Location/data will be generalized',
    'DELAY': 'Access delayed pending user consent',
    'ANONYMIZE': 'Data will be anonymized before sharing',
    'LOCAL_ONLY': 'Data processed locally, not shared with cloud'
  };
  return messages[effect] || `Effect: ${effect}`;
}

/**
 * Get all PETs that will be applied based on the rule
 */
function getAppliedPETs(rule) {
  const pets = [];
  
  // Primary effect
  if (rule.effect !== 'ALLOW') {
    pets.push({
      type: rule.effect,
      primary: true,
      description: getEffectMessage(rule.effect)
    });
  }
  
  // Additional transforms
  if (rule.transforms) {
    for (const transform of rule.transforms) {
      if (transform.type !== rule.effect.toLowerCase()) {
        pets.push({
          type: transform.type.toUpperCase(),
          primary: false,
          params: transform,
          description: `Transform: ${transform.type}`
        });
      }
    }
  }
  
  return pets;
}

/**
 * Generate filtered data view showing what data is available
 */
function generateFilteredDataView(rule, policyResult) {
  const filteredData = [];
  
  if (!rule.dataTypes) return filteredData;
  
  for (const dataType of rule.dataTypes) {
    const dataItem = {
      type: dataType,
      status: 'available',
      transformation: null,
      originalExample: getExampleValue(dataType),
      filteredExample: null
    };
    
    // Apply effect to determine filtered state
    switch (rule.effect) {
      case 'BLOCK':
        dataItem.status = 'blocked';
        dataItem.filteredExample = '[BLOCKED]';
        break;
      case 'ANONYMIZE':
        dataItem.status = 'anonymized';
        dataItem.transformation = 'anonymize';
        dataItem.filteredExample = getAnonymizedValue(dataType);
        break;
      case 'GENERALIZE':
        dataItem.status = 'generalized';
        dataItem.transformation = 'generalize';
        dataItem.filteredExample = getGeneralizedValue(dataType);
        break;
      case 'AGGREGATE':
        dataItem.status = 'aggregated';
        dataItem.transformation = 'aggregate';
        dataItem.filteredExample = getAggregatedValue(dataType);
        break;
      case 'REDUCE_PRECISION':
        dataItem.status = 'reduced';
        dataItem.transformation = 'reduce_precision';
        dataItem.filteredExample = getReducedValue(dataType);
        break;
      case 'MASK':
        dataItem.status = 'masked';
        dataItem.transformation = 'mask';
        dataItem.filteredExample = getMaskedValue(dataType);
        break;
      case 'LOCAL_ONLY':
        dataItem.status = 'local_only';
        dataItem.filteredExample = '[PROCESSED LOCALLY]';
        break;
      default:
        dataItem.filteredExample = dataItem.originalExample;
    }
    
    filteredData.push(dataItem);
  }
  
  return filteredData;
}

// Example value generators for demonstration
function getExampleValue(dataType) {
  const examples = {
    'location.latitude': '48.7758',
    'location.longitude': '9.1829',
    'location.speed': '65 km/h',
    'identity.vin': 'WBA3B5C57EP123456',
    'behavior.acceleration': '2.5 m/s²',
    'health.batterylevel': '78%'
  };
  return examples[dataType] || `[${dataType}]`;
}

function getAnonymizedValue(dataType) {
  if (dataType.includes('identity')) return '[ANONYMIZED_ID_****]';
  if (dataType.includes('location')) return '[LOCATION_ANONYMIZED]';
  return '[ANONYMIZED]';
}

function getGeneralizedValue(dataType) {
  if (dataType.includes('latitude')) return '48.77**';
  if (dataType.includes('longitude')) return '9.18**';
  if (dataType.includes('speed')) return '60-70 km/h';
  return '[GENERALIZED]';
}

function getAggregatedValue(dataType) {
  if (dataType.includes('speed')) return 'Avg: 62 km/h (5 min)';
  return '[AGGREGATED]';
}

function getReducedValue(dataType) {
  if (dataType.includes('latitude')) return '48.8';
  if (dataType.includes('longitude')) return '9.2';
  return '[REDUCED]';
}

function getMaskedValue(dataType) {
  if (dataType.includes('vin')) return 'WBA****EP123456';
  return '[****]';
}

/**
 * Build human-readable explanation of the decision
 */
function buildExplanation(rule, streamResult, policyResult, conflictResult) {
  const explanation = [];
  
  // Context evaluation explanation
  if (streamResult.activeRules.length !== streamResult.summary.total) {
    explanation.push(
      `${streamResult.summary.inactive} rules were deactivated due to context conditions (e.g., time of day, road type).`
    );
  }
  
  // Conflict resolution explanation
  if (conflictResult.resolution === 'PRIORITY') {
    explanation.push(
      `Rule "${rule.id}" was selected because it has the highest priority (${rule.priority}).`
    );
  } else if (conflictResult.resolution === 'PET_HIERARCHY') {
    explanation.push(
      `Rule "${rule.id}" was selected because it provides the strongest privacy protection (${rule.effect}).`
    );
  }
  
  // Effect explanation
  explanation.push(
    `Your preference "${rule.label || rule.purpose}" will ${rule.effect === 'BLOCK' ? 'block' : 'apply'} ${rule.effect !== 'BLOCK' ? rule.effect.toLowerCase() : ''} to the requested data.`
  );
  
  // Policy compatibility
  if (policyResult.summary.blocked > 0) {
    explanation.push(
      `${policyResult.summary.blocked} service request(s) will be blocked based on your preferences.`
    );
  }
  
  return explanation;
}

/**
 * Full evaluation pipeline
 */
function evaluatePreferences(rules, serviceType, currentContext) {
  // Phase 1: Stream evaluation
  const streamResult = streamEvaluation(rules, currentContext);
  
  // Phase 2: Policy evaluation
  const policyResult = policyEvaluation(streamResult, serviceType);
  
  // Conflict resolution
  let conflictResult;
  if (streamResult.activeRules.length === 0) {
    conflictResult = handleNoMatch(serviceType, rules[0]?.purpose || 'Unknown');
  } else {
    conflictResult = resolveConflicts(streamResult.activeRules);
  }
  
  // Generate final decision
  const finalDecision = generateFinalDecision(streamResult, policyResult, conflictResult);
  
  return finalDecision;
}

module.exports = {
  streamEvaluation,
  policyEvaluation,
  resolveConflicts,
  handleNoMatch,
  generateFinalDecision,
  evaluatePreferences,
  evaluateRuleContext,
  PET_HIERARCHY
};
