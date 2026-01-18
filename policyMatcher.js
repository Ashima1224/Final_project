// backend/policyMatcher.js - P3P Policy Matching Engine
// Matches user preferences against P3P policies

const { PET_HIERARCHY } = require('./questionnaire');

/**
 * P3P Policies organized by service type and purpose
 * These are the existing policies that services have published
 */
const P3P_POLICIES = {
  map: {
    name: 'Map / Navigation Services',
    policies: [
      {
        id: 'map-nav-policy',
        purpose: 'Navigation',
        service: 'NaviApp',
        description: 'Turn-by-turn navigation service',
        requestedData: ['location.latitude', 'location.longitude', 'location.heading', 'location.speed'],
        minAccuracy: 10, // meters
        retention: 'stated-purpose',
        recipient: 'ours'
      },
      {
        id: 'map-traffic-policy',
        purpose: 'Traffic Detection',
        service: 'TrafficMonitor',
        description: 'Real-time traffic monitoring',
        requestedData: ['location.speed', 'location.latitude', 'location.longitude'],
        minAccuracy: 500,
        retention: 'stated-purpose',
        recipient: 'ours'
      },
      {
        id: 'map-eta-policy',
        purpose: 'ETA Improvement',
        service: 'RouteOptimizer',
        description: 'Route and ETA optimization',
        requestedData: ['location.speed', 'behavior.acceleration'],
        minAccuracy: 100,
        retention: 'stated-purpose',
        recipient: 'ours'
      },
      {
        id: 'map-poi-policy',
        purpose: 'POI / Nearby Suggestions',
        service: 'NearbyFinder',
        description: 'Nearby points of interest',
        requestedData: ['location.latitude', 'location.longitude'],
        minAccuracy: 50,
        retention: 'stated-purpose',
        recipient: 'ours'
      }
    ]
  },
  emergency: {
    name: 'Emergency Services',
    policies: [
      {
        id: 'emerg-ecall-policy',
        purpose: 'eCall / Crash Response',
        service: 'EmergencyAssist',
        description: 'Automatic crash detection and emergency services',
        requestedData: ['location.latitude', 'location.longitude', 'identity.vin', 'location.speed'],
        minAccuracy: 10,
        retention: 'legal-requirement',
        recipient: 'public'
      },
      {
        id: 'emerg-breakdown-policy',
        purpose: 'Breakdown Assistance',
        service: 'RoadsideHelp',
        description: 'Roadside assistance service',
        requestedData: ['location.latitude', 'location.longitude', 'health.fuellevel', 'health.batterylevel'],
        minAccuracy: 100,
        retention: 'stated-purpose',
        recipient: 'delivery'
      },
      {
        id: 'emerg-hazard-policy',
        purpose: 'Hazard Warnings',
        service: 'HazardAlert',
        description: 'Road hazard warning system',
        requestedData: ['location.latitude', 'location.longitude', 'environment.temperature', 'sensors.abs'],
        minAccuracy: 500,
        retention: 'stated-purpose',
        recipient: 'ours'
      },
      {
        id: 'emerg-theft-policy',
        purpose: 'Stolen Vehicle Tracking',
        service: 'VehicleRecovery',
        description: 'Stolen vehicle tracking and recovery',
        requestedData: ['location.latitude', 'location.longitude', 'identity.vin', 'location.history'],
        minAccuracy: 5,
        retention: 'legal-requirement',
        recipient: 'public'
      }
    ]
  },
  safety: {
    name: 'Safety Services',
    policies: [
      {
        id: 'safety-adas-policy',
        purpose: 'ADAS (Advanced Driver Assistance)',
        service: 'ADASSystem',
        description: 'Lane keeping and collision avoidance',
        requestedData: ['sensors.camera', 'sensors.lidar', 'sensors.radar', 'location.speed'],
        minAccuracy: null,
        retention: 'stated-purpose',
        recipient: 'ours'
      },
      {
        id: 'safety-behavior-policy',
        purpose: 'Driver Behavior Scoring',
        service: 'DriveSafe',
        description: 'Driver behavior analysis',
        requestedData: ['behavior.acceleration', 'behavior.braking', 'behavior.steering'],
        minAccuracy: null,
        retention: 'stated-purpose',
        recipient: 'ours'
      },
      {
        id: 'safety-speed-policy',
        purpose: 'Speed Alerts',
        service: 'SpeedWatch',
        description: 'Speed limit warnings',
        requestedData: ['location.speed', 'location.latitude', 'location.longitude'],
        minAccuracy: 50,
        retention: 'no-retention',
        recipient: 'ours'
      },
      {
        id: 'safety-night-policy',
        purpose: 'Night Mode / Fatigue Detection',
        service: 'FatigueMonitor',
        description: 'Driver fatigue detection',
        requestedData: ['sensors.camera.interior', 'behavior.attention', 'behavior.steering'],
        minAccuracy: null,
        retention: 'no-retention',
        recipient: 'ours'
      }
    ]
  },
  oem: {
    name: 'OEM Services',
    policies: [
      {
        id: 'oem-maintenance-policy',
        purpose: 'Predictive Maintenance',
        service: 'MaintenancePredictor',
        description: 'Predictive vehicle maintenance',
        requestedData: ['health.enginestatus', 'health.batterylevel', 'health.tirepressure', 'health.mileage'],
        minAccuracy: null,
        retention: 'indefinitely',
        recipient: 'ours'
      },
      {
        id: 'oem-ota-policy',
        purpose: 'OTA Updates',
        service: 'OTAManager',
        description: 'Over-the-air software updates',
        requestedData: ['system.softwareversion', 'system.hardwareid', 'identity.vin'],
        minAccuracy: null,
        retention: 'stated-purpose',
        recipient: 'ours'
      },
      {
        id: 'oem-analytics-policy',
        purpose: 'Usage Analytics',
        service: 'UsageAnalytics',
        description: 'Product improvement analytics',
        requestedData: ['usage.features', 'usage.infotainment', 'usage.drivingpatterns'],
        minAccuracy: null,
        retention: 'indefinitely',
        recipient: 'ours'
      },
      {
        id: 'oem-diagnostics-policy',
        purpose: 'Remote Diagnostics',
        service: 'RemoteDiag',
        description: 'Remote vehicle diagnostics',
        requestedData: ['diagnostics.dtc', 'diagnostics.logs', 'health.enginestatus'],
        minAccuracy: null,
        retention: 'stated-purpose',
        recipient: 'ours'
      }
    ]
  },
  thirdparty: {
    name: 'Third Party Services',
    policies: [
      {
        id: 'third-infotainment-policy',
        purpose: 'Infotainment Apps',
        service: 'MediaApps',
        description: 'Third-party media applications',
        requestedData: ['infotainment.mediahistory', 'infotainment.preferences', 'location.latitude'],
        minAccuracy: 1000,
        retention: 'stated-purpose',
        recipient: 'other'
      },
      {
        id: 'third-repair-policy',
        purpose: 'Independent Repair Shops',
        service: 'RepairAccess',
        description: 'Independent repair shop access',
        requestedData: ['diagnostics.dtc', 'health.enginestatus', 'identity.vin'],
        minAccuracy: null,
        retention: 'stated-purpose',
        recipient: 'other'
      },
      {
        id: 'third-insurance-policy',
        purpose: 'Insurance Telematics',
        service: 'InsuranceTracker',
        description: 'Usage-based insurance monitoring',
        requestedData: ['behavior.acceleration', 'behavior.braking', 'location.speed', 'usage.mileage'],
        minAccuracy: null,
        retention: 'indefinitely',
        recipient: 'other'
      },
      {
        id: 'third-marketing-policy',
        purpose: 'Marketing & Ads',
        service: 'AdPartners',
        description: 'Marketing and advertising',
        requestedData: ['preferences.interests', 'location.city', 'usage.features'],
        minAccuracy: 5000,
        retention: 'indefinitely',
        recipient: 'other'
      }
    ]
  },
  app: {
    name: 'App Services',
    policies: [
      {
        id: 'app-personalization-policy',
        purpose: 'App Personalization',
        service: 'CompanionApp',
        description: 'Mobile app personalization',
        requestedData: ['preferences.seating', 'preferences.climate', 'preferences.media'],
        minAccuracy: null,
        retention: 'stated-purpose',
        recipient: 'ours'
      },
      {
        id: 'app-remote-policy',
        purpose: 'Remote Control',
        service: 'RemoteControl',
        description: 'Remote vehicle control',
        requestedData: ['control.lock', 'control.climate', 'location.latitude', 'location.longitude'],
        minAccuracy: 50,
        retention: 'no-retention',
        recipient: 'ours'
      },
      {
        id: 'app-analytics-policy',
        purpose: 'App Analytics',
        service: 'AppAnalytics',
        description: 'App usage analytics',
        requestedData: ['usage.appfeatures', 'usage.sessiontime', 'usage.errors'],
        minAccuracy: null,
        retention: 'indefinitely',
        recipient: 'ours'
      },
      {
        id: 'app-voice-policy',
        purpose: 'Voice Assistant',
        service: 'VoiceAssist',
        description: 'Voice assistant processing',
        requestedData: ['voice.commands', 'voice.recordings', 'location.current'],
        minAccuracy: 100,
        retention: 'stated-purpose',
        recipient: 'ours'
      }
    ]
  },
  logistic: {
    name: 'Logistic Services',
    policies: [
      {
        id: 'logistic-tracking-policy',
        purpose: 'Fleet Tracking',
        service: 'FleetManager',
        description: 'Fleet tracking and management',
        requestedData: ['location.latitude', 'location.longitude', 'location.speed', 'location.history'],
        minAccuracy: 50,
        retention: 'indefinitely',
        recipient: 'ours'
      },
      {
        id: 'logistic-routing-policy',
        purpose: 'Route Optimization',
        service: 'RouteManager',
        description: 'Delivery route optimization',
        requestedData: ['location.destination', 'location.eta', 'traffic.current'],
        minAccuracy: 100,
        retention: 'stated-purpose',
        recipient: 'ours'
      },
      {
        id: 'logistic-compliance-policy',
        purpose: 'Compliance & Regulations',
        service: 'ComplianceTracker',
        description: 'Regulatory compliance monitoring',
        requestedData: ['compliance.drivinghours', 'compliance.restperiods', 'identity.driverid'],
        minAccuracy: null,
        retention: 'legal-requirement',
        recipient: 'public'
      },
      {
        id: 'logistic-fuel-policy',
        purpose: 'Fuel Efficiency',
        service: 'FuelTracker',
        description: 'Fuel efficiency analysis',
        requestedData: ['fuel.consumption', 'fuel.efficiency', 'behavior.acceleration'],
        minAccuracy: null,
        retention: 'stated-purpose',
        recipient: 'ours'
      }
    ]
  }
};

/**
 * Find matching P3P policy for a given user preference rule
 */
function findMatchingPolicy(serviceType, purpose) {
  const serviceGroup = P3P_POLICIES[serviceType];
  if (!serviceGroup) {
    return null;
  }

  return serviceGroup.policies.find(p => p.purpose === purpose) || null;
}

/**
 * Match user preference rules against P3P policies
 * Returns compatibility analysis
 */
function matchPolicyToPreference(rule, policy) {
  if (!policy) {
    return {
      matched: false,
      compatibility: 'NO_POLICY',
      message: 'No matching P3P policy found'
    };
  }

  const compatibility = {
    matched: true,
    policyId: policy.id,
    policyService: policy.service,
    analysis: {
      dataMatch: analyzeDataMatch(rule.dataTypes, policy.requestedData),
      effectCompatibility: analyzeEffectCompatibility(rule.effect, policy),
      contextRestrictions: rule.contexts,
      transformsApplied: rule.transforms
    }
  };

  // Determine overall compatibility
  if (rule.effect === 'BLOCK') {
    compatibility.compatibility = 'BLOCKED';
    compatibility.message = 'User preference blocks this data access';
  } else if (rule.effect === 'LOCAL_ONLY') {
    compatibility.compatibility = 'LOCAL_ONLY';
    compatibility.message = 'Data must be processed locally';
  } else if (rule.effect === 'ANONYMIZE' || rule.effect === 'AGGREGATE') {
    compatibility.compatibility = 'TRANSFORMED';
    compatibility.message = 'Data will be anonymized/aggregated before sharing';
  } else if (rule.effect === 'GENERALIZE' || rule.effect === 'REDUCE_PRECISION') {
    compatibility.compatibility = 'REDUCED';
    compatibility.message = 'Data precision will be reduced';
  } else if (rule.effect === 'DELAY') {
    compatibility.compatibility = 'CONSENT_REQUIRED';
    compatibility.message = 'User consent required for each access';
  } else {
    compatibility.compatibility = 'ALLOWED';
    compatibility.message = 'Data access permitted';
  }

  return compatibility;
}

/**
 * Analyze data type matching between preference and policy
 */
function analyzeDataMatch(preferenceData, policyData) {
  const requested = new Set(policyData);
  const allowed = new Set(preferenceData);
  
  const matchedData = [...requested].filter(d => {
    // Check exact match
    if (allowed.has(d)) return true;
    // Check wildcard match (e.g., 'location.*' matches 'location.latitude')
    for (const a of allowed) {
      if (a.endsWith('.*')) {
        const prefix = a.replace('.*', '');
        if (d.startsWith(prefix)) return true;
      }
    }
    return false;
  });
  
  const deniedData = [...requested].filter(d => !matchedData.includes(d));
  
  return {
    requested: [...requested],
    allowed: matchedData,
    denied: deniedData,
    coverage: matchedData.length / requested.size
  };
}

/**
 * Analyze effect compatibility with policy requirements
 */
function analyzeEffectCompatibility(effect, policy) {
  // Some services require minimum data quality
  const restrictiveEffects = ['BLOCK', 'LOCAL_ONLY', 'ANONYMIZE'];
  
  if (restrictiveEffects.includes(effect)) {
    // Check if policy can work with restricted data
    if (policy.minAccuracy !== null && effect === 'GENERALIZE') {
      return {
        compatible: false,
        reason: `Service requires ${policy.minAccuracy}m accuracy`
      };
    }
  }
  
  return {
    compatible: true,
    effect: effect,
    petLevel: PET_HIERARCHY.indexOf(effect)
  };
}

/**
 * Get all policies for a service type
 */
function getPoliciesForService(serviceType) {
  const serviceGroup = P3P_POLICIES[serviceType];
  return serviceGroup ? serviceGroup.policies : [];
}

/**
 * Get all available P3P policies
 */
function getAllPolicies() {
  return P3P_POLICIES;
}

module.exports = {
  P3P_POLICIES,
  findMatchingPolicy,
  matchPolicyToPreference,
  analyzeDataMatch,
  analyzeEffectCompatibility,
  getPoliciesForService,
  getAllPolicies
};
