// backend/ruleGenerator.js - XPref Rule Generator (XPath-based)
// Generates XPref rules using XPath expressions instead of nested XML

const { v4: uuidv4 } = require('uuid');
const { QUESTIONNAIRE_DATA, PET_HIERARCHY } = require('./questionnaire');

/**
 * Generate XPref rule with XPath condition from questionnaire answer
 * This follows the XPref specification from the research paper
 */
function generateXPrefRule(serviceType, questionId, selectedOption, userContexts = []) {
  const service = QUESTIONNAIRE_DATA[serviceType];
  if (!service) {
    throw new Error(`Unknown service type: ${serviceType}`);
  }

  const question = service.questions.find(q => q.id === questionId);
  if (!question) {
    throw new Error(`Unknown question: ${questionId}`);
  }

  const option = question.options[selectedOption];
  if (!option) {
    throw new Error(`Unknown option: ${selectedOption}`);
  }

  const ruleId = `rule-${uuidv4().substring(0, 8)}`;
  
  // Build XPath condition based on effect and contexts
  const xpathCondition = buildXPathCondition(question, option, userContexts);
  
  const rule = {
    id: ruleId,
    serviceType: serviceType,
    purpose: question.purpose,
    questionId: questionId,
    selectedOption: selectedOption,
    effect: option.effect,
    priority: option.priority,
    dataTypes: question.dataTypes,
    contexts: mergeContexts(option.contexts, userContexts),
    transforms: option.transforms,
    label: option.label,
    xpathCondition: xpathCondition,
    createdAt: new Date().toISOString()
  };

  // Generate XPref XML representation
  const xml = buildXPrefRuleXML(rule);
  
  return {
    rule,
    xml
  };
}

/**
 * Build XPath condition following XPref specification
 * XPref uses XPath expressions instead of nested XML structure
 */
function buildXPathCondition(question, option, userContexts = []) {
  const { effect, contexts, transforms } = option;
  const dataTypes = question.dataTypes;
  
  // Start building XPath from root
  let xpath = '/POLICY/STATEMENT';
  
  const conditions = [];
  
  // Add purpose matching
  conditions.push(`PURPOSE/*[name(.) = '${question.purpose.toLowerCase().replace(/\s+/g, '-')}']`);
  
  // Add context conditions using XPath predicates
  const mergedContexts = mergeContexts(contexts, userContexts);
  
  for (const ctx of mergedContexts) {
    const contextCondition = buildContextCondition(ctx);
    if (contextCondition) {
      conditions.push(contextCondition);
    }
  }
  
  // Add data type conditions
  if (dataTypes && dataTypes.length > 0) {
    const dataConditions = dataTypes.map(dt => 
      `DATA-GROUP/DATA[@ref='#${dt}']`
    ).join(' or ');
    
    if (dataConditions) {
      conditions.push(`(${dataConditions})`);
    }
  }
  
  // Combine conditions based on effect
  if (effect === 'BLOCK') {
    // For BLOCK: match if ANY unacceptable condition exists
    xpath += `[${conditions.join(' and ')}]`;
  } else if (effect === 'ALLOW') {
    // For ALLOW: verify all statements match acceptable conditions
    if (contexts.length > 0) {
      xpath += `[${conditions.join(' and ')}]`;
    } else {
      xpath += `[${conditions.join(' and ')}]`;
    }
  } else {
    // For transforms (ANONYMIZE, GENERALIZE, etc.): match and apply
    xpath += `[${conditions.join(' and ')}]`;
  }
  
  return xpath;
}

/**
 * Build XPath condition for a single context
 */
function buildContextCondition(context) {
  const { type, allowed, denied, value, minimum, maximum } = context;
  
  switch (type) {
    case 'timeOfDay':
      if (denied && denied.length > 0) {
        return denied.map(d => `not(@time-of-day='${d}')`).join(' and ');
      }
      if (allowed && allowed.length > 0) {
        return `(${allowed.map(a => `@time-of-day='${a}'`).join(' or ')})`;
      }
      break;
      
    case 'roadType':
      if (denied && denied.length > 0) {
        return denied.map(d => `not(@road-type='${d}')`).join(' and ');
      }
      if (allowed && allowed.length > 0) {
        return `(${allowed.map(a => `@road-type='${a}'`).join(' or ')})`;
      }
      break;
      
    case 'emergencyStatus':
      if (value !== undefined) {
        return `@emergency='${value}'`;
      }
      break;
      
    case 'homeDistance':
      if (minimum) {
        return `@distance >= ${parseDistance(minimum)}`;
      }
      break;
      
    default:
      return null;
  }
  
  return null;
}

/**
 * Build XPref XML rule following the specification
 * XPref rules have: behavior, condition (XPath), and description
 */
function buildXPrefRuleXML(rule) {
  const behavior = getBehaviorFromEffect(rule.effect);
  
  return `
  <RULE id="${rule.id}" 
        behavior="${behavior}"
        condition="${escapeXml(rule.xpathCondition)}"
        description="${escapeXml(rule.label)}">
    <META>
      <PRIORITY>${rule.priority}</PRIORITY>
      <EFFECT>${rule.effect}</EFFECT>
      <PURPOSE>${escapeXml(rule.purpose)}</PURPOSE>
      <SERVICE-TYPE>${rule.serviceType}</SERVICE-TYPE>
      <CREATED>${rule.createdAt}</CREATED>
    </META>
    ${buildTransformsXML(rule.transforms)}
  </RULE>`.trim();
}

/**
 * Map PET effect to XPref behavior
 */
function getBehaviorFromEffect(effect) {
  switch (effect) {
    case 'ALLOW':
      return 'request';
    case 'BLOCK':
      return 'block';
    case 'DELAY':
      return 'limited';
    default:
      // All transformations are 'limited' in XPref
      return 'limited';
  }
}

/**
 * Build transforms XML section
 */
function buildTransformsXML(transforms) {
  if (!transforms || transforms.length === 0) {
    return '<TRANSFORMS/>';
  }

  const transformElements = transforms.map(t => {
    const attrs = Object.entries(t)
      .filter(([key]) => key !== 'type')
      .map(([key, value]) => {
        if (Array.isArray(value)) {
          return `${key}="${value.join(',')}"`;
        }
        return `${key}="${value}"`;
      })
      .join(' ');

    return `    <TRANSFORM type="${t.type}" ${attrs}/>`;
  });

  return `<TRANSFORMS>
${transformElements.join('\n')}
  </TRANSFORMS>`;
}

/**
 * Generate complete XPref ruleset for a service
 */
  function generateServiceRuleset(serviceType, answers, userContexts = []) {
  const service = QUESTIONNAIRE_DATA[serviceType];
  if (!service) {
    throw new Error(`Unknown service type: ${serviceType}`);
  }

  const rules = [];
  
  // ========================================
  // CHECK IF SIMPLE 3-QUESTION FORMAT
  // ========================================
  if (answers['map-data-type'] && answers['map-privacy'] && answers['map-retention']) {
    console.log('📝 Processing simple questionnaire format');
    
    // Get data types (already individual fields, no expansion needed)
    const dataTypes = Array.isArray(answers['map-data-type']) 
      ? answers['map-data-type'] 
      : [answers['map-data-type']];
    
    console.log('📊 Data types to protect:', dataTypes);
    
    const privacyLevel = answers['map-privacy'];
    const retention = answers['map-retention'];
    
    // Map privacy level to PET effect and priority
    const privacyMapping = {
      'high': { 
        effect: 'ANONYMIZE', 
        priority: 90,
        description: 'Strong privacy protection with data anonymization'
      },
      'medium': { 
        effect: 'GENERALIZE', 
        priority: 70,
        description: 'Moderate privacy with data generalization'
      },
      'low': { 
        effect: 'ALLOW', 
        priority: 40,
        description: 'Basic privacy with minimal restrictions'
      }
    };
    
    const privacy = privacyMapping[privacyLevel] || privacyMapping['medium'];
    
    // Generate unique rule ID
    const { v4: uuidv4 } = require('uuid');
    const ruleId = `rule-${uuidv4().substring(0, 8)}`;
    
    // Build transforms based on privacy effect
    const transforms = [];
    if (privacy.effect === 'ANONYMIZE') {
      transforms.push({ 
        type: 'anonymize', 
        method: 'k-anonymity', 
        k: 10,
        description: 'Ensure at least 10 users share same characteristics'
      });
    } else if (privacy.effect === 'GENERALIZE') {
      transforms.push({ 
        type: 'generalize', 
        level: 'moderate',
        description: 'Reduce precision while maintaining utility'
      });
    } else if (privacy.effect === 'REDUCE_PRECISION') {
      transforms.push({
        type: 'reduce_precision',
        decimals: 2,
        description: 'Reduce numerical precision'
      });
    }
    
    // Build XPath condition for multiple data types
    const dataConditions = dataTypes.map(dt => 
      `DATA-GROUP/DATA[@ref='#${dt}']`
    ).join(' or ');
    
    const xpathCondition = `/POLICY/STATEMENT[(${dataConditions})]`;
    
    // Create the combined rule
    const rule = {
      id: ruleId,
      serviceType: serviceType,
      purpose: 'User Privacy Preferences',
      questionId: 'simple-questionnaire',
      selectedOption: privacyLevel,
      effect: privacy.effect,
      priority: privacy.priority,
      dataTypes: dataTypes,
      contexts: userContexts,
      transforms: transforms,
      retention: retention,
      label: `${privacy.effect} - ${dataTypes.length} data type(s)`,
      description: privacy.description,
      xpathCondition: xpathCondition,
      createdAt: new Date().toISOString(),
      // Additional metadata for UI display
      userSelections: {
        dataTypes: dataTypes,
        privacyLevel: privacyLevel,
        retention: retention
      }
    };
    
    // Generate XML representation
    const xml = buildXPrefRuleXML(rule);
    
    rules.push({ ...rule, xml });
    
    console.log('✅ Generated combined rule:', {
      id: ruleId,
      effect: privacy.effect,
      priority: privacy.priority,
      dataTypeCount: dataTypes.length
    });
    
  } else {
    // ========================================
    // TRADITIONAL QUESTIONNAIRE FORMAT
    // ========================================
    console.log('📝 Processing traditional questionnaire format');
    
    for (const [questionId, selectedOption] of Object.entries(answers)) {
      try {
        const { rule, xml } = generateXPrefRule(serviceType, questionId, selectedOption, userContexts);
        rules.push({ ...rule, xml });
      } catch (error) {
        console.error(`Error generating rule for ${questionId}:`, error.message);
      }
    }
  }

  // Sort rules by priority (higher priority first)
  rules.sort((a, b) => b.priority - a.priority);

  // Generate complete XPref ruleset XML
  const rulesetXml = buildXPrefRulesetXML(serviceType, rules);

  return {
    serviceType,
    serviceName: service.name,
    rules,
    rulesetXml,
    createdAt: new Date().toISOString()
  };
}

/**
 * Build complete XPref RULESET XML
 */
function buildXPrefRulesetXML(serviceType, rules) {
  const service = QUESTIONNAIRE_DATA[serviceType];
  const rulesXml = rules.map(r => r.xml).join('\n\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<RULESET xmlns="http://www.w3.org/2002/01/P3Pv1" 
         service-type="${serviceType}"
         service-name="${escapeXml(service.name)}"
         version="1.0"
         created="${new Date().toISOString()}">
  
  <DESCRIPTION>
    XPref privacy preferences for ${escapeXml(service.name)}
    Generated from questionnaire-based preference builder
  </DESCRIPTION>
  
${rulesXml}

</RULESET>`;
}

/**
 * Merge user-provided contexts with option's default contexts
 */
function mergeContexts(optionContexts, userContexts) {
  const merged = [...optionContexts];
  
  for (const userCtx of userContexts) {
    const existingIdx = merged.findIndex(c => c.type === userCtx.type);
    if (existingIdx >= 0) {
      merged[existingIdx] = {
        ...merged[existingIdx],
        ...userCtx,
        allowed: [...new Set([
          ...(merged[existingIdx].allowed || []),
          ...(userCtx.allowed || [])
        ])].filter(Boolean),
        denied: [...new Set([
          ...(merged[existingIdx].denied || []),
          ...(userCtx.denied || [])
        ])].filter(Boolean)
      };
    } else {
      merged.push(userCtx);
    }
  }
  
  return merged;
}

// Helper functions
function escapeXml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function parseDistance(distance) {
  if (typeof distance === 'number') return distance;
  const match = distance.match(/^(\d+)(m|km)?$/);
  if (match) {
    const num = parseInt(match[1]);
    const unit = match[2];
    if (unit === 'km') return num * 1000;
    return num;
  }
  return distance;
}

module.exports = {
  generateXPrefRule,
  generateServiceRuleset,
  buildXPathCondition,
  buildXPrefRuleXML,
  buildXPrefRulesetXML
};
