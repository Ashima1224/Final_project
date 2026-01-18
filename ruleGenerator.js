// backend/ruleGenerator.js - XPref Rule Generator
// Converts questionnaire answers into XPref XML rules

const { v4: uuidv4 } = require('uuid');
const { QUESTIONNAIRE_DATA, PET_HIERARCHY } = require('./questionnaire');

/**
 * Generate XPref XML rule from a single questionnaire answer
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

  // Merge user-provided contexts with option's default contexts
  const mergedContexts = mergeContexts(option.contexts, userContexts);
  
  // Build the rule XML
  const ruleId = `rule-${uuidv4().substring(0, 8)}`;
  
  const rule = {
    id: ruleId,
    serviceType: serviceType,
    purpose: question.purpose,
    questionId: questionId,
    selectedOption: selectedOption,
    effect: option.effect,
    priority: option.priority,
    dataTypes: question.dataTypes,
    contexts: mergedContexts,
    transforms: option.transforms,
    label: option.label,
    createdAt: new Date().toISOString()
  };

  // Generate XML representation
  const xml = buildRuleXML(rule);
  
  return {
    rule,
    xml
  };
}

/**
 * Generate a complete XPref ruleset from all questionnaire answers for a service
 */
function generateServiceRuleset(serviceType, answers, userContexts = []) {
  const service = QUESTIONNAIRE_DATA[serviceType];
  if (!service) {
    throw new Error(`Unknown service type: ${serviceType}`);
  }

  const rules = [];
  
  for (const [questionId, selectedOption] of Object.entries(answers)) {
    try {
      const { rule, xml } = generateXPrefRule(serviceType, questionId, selectedOption, userContexts);
      rules.push({ ...rule, xml });
    } catch (error) {
      console.error(`Error generating rule for ${questionId}:`, error.message);
    }
  }

  // Sort rules by priority (higher priority first)
  rules.sort((a, b) => b.priority - a.priority);

  // Generate complete ruleset XML
  const rulesetXml = buildRulesetXML(serviceType, rules);

  return {
    serviceType,
    serviceName: service.name,
    rules,
    rulesetXml,
    createdAt: new Date().toISOString()
  };
}

/**
 * Merge user-provided contexts with option's default contexts
 */
function mergeContexts(optionContexts, userContexts) {
  const merged = [...optionContexts];
  
  for (const userCtx of userContexts) {
    const existingIdx = merged.findIndex(c => c.type === userCtx.type);
    if (existingIdx >= 0) {
      // Merge with existing context
      merged[existingIdx] = {
        ...merged[existingIdx],
        ...userCtx,
        // Combine allowed/denied arrays if both exist
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

/**
 * Build XML for a single rule
 */
function buildRuleXML(rule) {
  const contextXml = buildContextXML(rule.contexts);
  const transformXml = buildTransformXML(rule.transforms);
  const dataXml = buildDataXML(rule.dataTypes);
  
  return `
  <Rule id="${rule.id}">
    <Purpose>${escapeXml(rule.purpose)}</Purpose>
    <Effect>${rule.effect}</Effect>
    <Priority>${rule.priority}</Priority>
    ${dataXml}
    ${contextXml}
    ${transformXml}
    <Description>${escapeXml(rule.label)}</Description>
  </Rule>`.trim();
}

/**
 * Build XML for contexts
 */
function buildContextXML(contexts) {
  if (!contexts || contexts.length === 0) {
    return '<Context />';
  }

  const contextElements = contexts.map(ctx => {
    const attrs = [];
    
    if (ctx.allowed && ctx.allowed.length > 0) {
      attrs.push(`allowed="${ctx.allowed.join(',')}"`);
    }
    if (ctx.denied && ctx.denied.length > 0) {
      attrs.push(`denied="${ctx.denied.join(',')}"`);
    }
    if (ctx.value !== undefined) {
      attrs.push(`value="${ctx.value}"`);
    }
    if (ctx.minimum) {
      attrs.push(`minimum="${ctx.minimum}"`);
    }
    if (ctx.maximum) {
      attrs.push(`maximum="${ctx.maximum}"`);
    }

    return `    <${capitalizeFirst(ctx.type)} ${attrs.join(' ')} />`;
  });

  return `<Context>
${contextElements.join('\n')}
    </Context>`;
}

/**
 * Build XML for transforms/PETs
 */
function buildTransformXML(transforms) {
  if (!transforms || transforms.length === 0) {
    return '<Transform />';
  }

  const transformElements = transforms.map(t => {
    const attrs = Object.entries(t)
      .filter(([key]) => key !== 'type')
      .map(([key, value]) => {
        if (Array.isArray(value)) {
          return `${key}="${value.join(',')}"`;
        }
        return `${key}="${value}"`;
      });

    return `    <${capitalizeFirst(t.type)} ${attrs.join(' ')} />`;
  });

  return `<Transform>
${transformElements.join('\n')}
    </Transform>`;
}

/**
 * Build XML for data types
 */
function buildDataXML(dataTypes) {
  if (!dataTypes || dataTypes.length === 0) {
    return '<Data />';
  }

  const dataElements = dataTypes.map(dt => `    <DataRef type="${dt}" />`);

  return `<Data>
${dataElements.join('\n')}
    </Data>`;
}

/**
 * Build complete ruleset XML
 */
function buildRulesetXML(serviceType, rules) {
  const service = QUESTIONNAIRE_DATA[serviceType];
  const rulesXml = rules.map(r => r.xml).join('\n\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<XPrefRuleset 
  xmlns="urn:xpref:privacy:rules"
  serviceType="${serviceType}"
  serviceName="${escapeXml(service.name)}"
  version="1.0"
  createdAt="${new Date().toISOString()}">
  
${rulesXml}

</XPrefRuleset>`;
}

/**
 * Parse XPref XML back to rule objects
 */
function parseXPrefRuleset(xml) {
  // Simple XML parsing (in production, use a proper XML parser)
  const rules = [];
  const ruleRegex = /<Rule[^>]*id="([^"]+)"[^>]*>([\s\S]*?)<\/Rule>/g;
  
  let match;
  while ((match = ruleRegex.exec(xml)) !== null) {
    const ruleId = match[1];
    const ruleContent = match[2];
    
    // Extract elements
    const purposeMatch = ruleContent.match(/<Purpose>([^<]+)<\/Purpose>/);
    const effectMatch = ruleContent.match(/<Effect>([^<]+)<\/Effect>/);
    const priorityMatch = ruleContent.match(/<Priority>(\d+)<\/Priority>/);
    const descMatch = ruleContent.match(/<Description>([^<]+)<\/Description>/);
    
    rules.push({
      id: ruleId,
      purpose: purposeMatch ? purposeMatch[1] : '',
      effect: effectMatch ? effectMatch[1] : 'BLOCK',
      priority: priorityMatch ? parseInt(priorityMatch[1]) : 50,
      description: descMatch ? descMatch[1] : ''
    });
  }
  
  return rules;
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

function capitalizeFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

module.exports = {
  generateXPrefRule,
  generateServiceRuleset,
  parseXPrefRuleset,
  buildRuleXML,
  buildRulesetXML
};
