// backend/questionnaire.js - Complete Questionnaire Data Model
// Each service type has 4 questions, each question has 4 options (a-d)
// Options internally map to: effect (PET), contexts, priority

const QUESTIONNAIRE_DATA = {
  // ============================================================================
  // SERVICE TYPE 1: MAP / NAVIGATION
  // ============================================================================
  map: {
    id: 'map',
    name: 'Map / Navigation',
    icon: '🗺️',
    description: 'Navigation, traffic, and location-based services',
    questions: [
      {
        id: 'map-navigation',
        purpose: 'Navigation',
        questionText: 'For Navigation, how should the service access your location?',
        dataTypes: ['location.latitude', 'location.longitude', 'location.heading', 'location.speed'],
        options: {
          a: {
            label: 'Allow precise location always',
            effect: 'ALLOW',
            contexts: [],
            priority: 40,
            transforms: []
          },
          b: {
            label: 'Allow precise location only on Highway/Regional roads (deny in Residential)',
            effect: 'ALLOW',
            contexts: [{ type: 'roadType', allowed: ['Highway', 'Regional'], denied: ['Residential'] }],
            priority: 60,
            transforms: []
          },
          c: {
            label: 'Generalize location to 100m, deny at night',
            effect: 'GENERALIZE',
            contexts: [{ type: 'timeOfDay', denied: ['Night'] }],
            priority: 80,
            transforms: [{ type: 'generalize', radius: '100m' }]
          },
          d: {
            label: 'Local-only routing, share only destination category',
            effect: 'LOCAL_ONLY',
            contexts: [],
            priority: 90,
            transforms: [{ type: 'localOnly' }]
          }
        }
      },
      {
        id: 'map-traffic',
        purpose: 'Traffic Detection',
        questionText: 'For traffic detection, what do you want to share?',
        dataTypes: ['location.speed', 'location.latitude', 'location.longitude'],
        options: {
          a: {
            label: 'Allow speed + precise location',
            effect: 'ALLOW',
            contexts: [],
            priority: 40,
            transforms: []
          },
          b: {
            label: 'Allow speed + generalized location (1km)',
            effect: 'GENERALIZE',
            contexts: [],
            priority: 60,
            transforms: [{ type: 'generalize', radius: '1km' }]
          },
          c: {
            label: 'Anonymize/aggregate: average speed per 5min + road segment only',
            effect: 'AGGREGATE',
            contexts: [],
            priority: 80,
            transforms: [{ type: 'aggregate', interval: '5min', scope: 'road-segment' }, { type: 'anonymize' }]
          },
          d: {
            label: 'Deny traffic data sharing completely',
            effect: 'BLOCK',
            contexts: [],
            priority: 90,
            transforms: []
          }
        }
      },
      {
        id: 'map-eta',
        purpose: 'ETA Improvement',
        questionText: 'To improve ETA accuracy, what can be used?',
        dataTypes: ['location.speed', 'behavior.acceleration', 'behavior.braking'],
        options: {
          a: {
            label: 'Allow speed + acceleration always',
            effect: 'ALLOW',
            contexts: [],
            priority: 40,
            transforms: []
          },
          b: {
            label: 'Allow only speed (deny acceleration/braking)',
            effect: 'REDUCE_PRECISION',
            contexts: [],
            priority: 60,
            transforms: [{ type: 'deny', dataRef: ['behavior.acceleration', 'behavior.braking'] }]
          },
          c: {
            label: 'Aggregate only: speed buckets (Low/Medium/High)',
            effect: 'AGGREGATE',
            contexts: [],
            priority: 80,
            transforms: [{ type: 'aggregate', buckets: ['Low', 'Medium', 'High'] }]
          },
          d: {
            label: 'Allow only during daytime (Morning/Afternoon)',
            effect: 'ALLOW',
            contexts: [{ type: 'timeOfDay', allowed: ['Morning', 'Afternoon'], denied: ['Evening', 'Night'] }],
            priority: 60,
            transforms: []
          }
        }
      },
      {
        id: 'map-poi',
        purpose: 'POI / Nearby Suggestions',
        questionText: 'For nearby suggestions (restaurants/charging), what location access is OK?',
        dataTypes: ['location.latitude', 'location.longitude', 'location.city', 'location.area'],
        options: {
          a: {
            label: 'Allow precise location',
            effect: 'ALLOW',
            contexts: [],
            priority: 40,
            transforms: []
          },
          b: {
            label: 'Generalize to city/area only',
            effect: 'GENERALIZE',
            contexts: [],
            priority: 70,
            transforms: [{ type: 'generalize', level: 'city' }]
          },
          c: {
            label: 'Allow only when 100m+ away from home',
            effect: 'ALLOW',
            contexts: [{ type: 'homeDistance', minimum: '100m' }],
            priority: 60,
            transforms: []
          },
          d: {
            label: 'Deny suggestions (no location used)',
            effect: 'BLOCK',
            contexts: [],
            priority: 90,
            transforms: []
          }
        }
      }
    ]
  },

  // ============================================================================
  // SERVICE TYPE 2: EMERGENCY
  // ============================================================================
  emergency: {
    id: 'emergency',
    name: 'Emergency',
    icon: '🚨',
    description: 'Emergency response, crash detection, and roadside assistance',
    questions: [
      {
        id: 'emerg-ecall',
        purpose: 'eCall / Crash Response',
        questionText: 'In a crash/emergency, what should be shared automatically?',
        dataTypes: ['location.latitude', 'location.longitude', 'identity.vin', 'location.speed'],
        options: {
          a: {
            label: 'Allow precise location + VIN + speed (emergency only)',
            effect: 'ALLOW',
            contexts: [{ type: 'emergencyStatus', value: true }],
            priority: 100,
            transforms: []
          },
          b: {
            label: 'Allow precise location only, pseudonym ID',
            effect: 'ANONYMIZE',
            contexts: [{ type: 'emergencyStatus', value: true }],
            priority: 90,
            transforms: [{ type: 'pseudonymize', dataRef: 'identity.vin' }]
          },
          c: {
            label: 'Ask consent each time (may delay response)',
            effect: 'DELAY',
            contexts: [],
            priority: 70,
            transforms: [{ type: 'requireConsent' }]
          },
          d: {
            label: 'Deny automatic emergency sharing (not recommended)',
            effect: 'BLOCK',
            contexts: [],
            priority: 60,
            transforms: []
          }
        }
      },
      {
        id: 'emerg-breakdown',
        purpose: 'Breakdown Assistance',
        questionText: 'For roadside help, what do you want to share?',
        dataTypes: ['location.latitude', 'location.longitude', 'health.fuellevel', 'health.batterylevel', 'health.rpm'],
        options: {
          a: {
            label: 'Allow location + vehicle health data',
            effect: 'ALLOW',
            contexts: [],
            priority: 40,
            transforms: []
          },
          b: {
            label: 'Allow only location (health denied)',
            effect: 'REDUCE_PRECISION',
            contexts: [],
            priority: 60,
            transforms: [{ type: 'deny', dataRef: ['health.*'] }]
          },
          c: {
            label: 'Generalize location to 1km + allow health',
            effect: 'GENERALIZE',
            contexts: [],
            priority: 70,
            transforms: [{ type: 'generalize', radius: '1km' }]
          },
          d: {
            label: 'Deny unless I manually request',
            effect: 'BLOCK',
            contexts: [],
            priority: 90,
            transforms: [{ type: 'requireConsent' }]
          }
        }
      },
      {
        id: 'emerg-hazard',
        purpose: 'Hazard Warnings',
        questionText: 'For hazard warnings (icy roads, accidents ahead), what should be shared?',
        dataTypes: ['location.latitude', 'location.longitude', 'environment.temperature', 'sensors.abs'],
        options: {
          a: {
            label: 'Allow all sensor data + precise location',
            effect: 'ALLOW',
            contexts: [],
            priority: 40,
            transforms: []
          },
          b: {
            label: 'Allow generalized location (500m) + temperature',
            effect: 'GENERALIZE',
            contexts: [],
            priority: 60,
            transforms: [{ type: 'generalize', radius: '500m' }]
          },
          c: {
            label: 'Anonymize and aggregate with nearby vehicles',
            effect: 'AGGREGATE',
            contexts: [],
            priority: 80,
            transforms: [{ type: 'anonymize' }, { type: 'aggregate', scope: 'area' }]
          },
          d: {
            label: 'Only receive warnings, never contribute data',
            effect: 'BLOCK',
            contexts: [],
            priority: 90,
            transforms: []
          }
        }
      },
      {
        id: 'emerg-theft',
        purpose: 'Stolen Vehicle Tracking',
        questionText: 'If your vehicle is reported stolen, what tracking is allowed?',
        dataTypes: ['location.latitude', 'location.longitude', 'identity.vin', 'location.history'],
        options: {
          a: {
            label: 'Allow precise real-time tracking when theft reported',
            effect: 'ALLOW',
            contexts: [{ type: 'theftStatus', value: true }],
            priority: 100,
            transforms: []
          },
          b: {
            label: 'Allow tracking only with police request + VIN verification',
            effect: 'ALLOW',
            contexts: [{ type: 'policeRequest', value: true }],
            priority: 90,
            transforms: []
          },
          c: {
            label: 'Share last known location only (no real-time)',
            effect: 'REDUCE_PRECISION',
            contexts: [],
            priority: 70,
            transforms: [{ type: 'snapshot', timing: 'lastKnown' }]
          },
          d: {
            label: 'Disable all tracking (accept recovery risk)',
            effect: 'BLOCK',
            contexts: [],
            priority: 60,
            transforms: []
          }
        }
      }
    ]
  },

  // ============================================================================
  // SERVICE TYPE 3: SAFETY
  // ============================================================================
  safety: {
    id: 'safety',
    name: 'Safety',
    icon: '🛡️',
    description: 'ADAS, driver behavior, and safety monitoring',
    questions: [
      {
        id: 'safety-adas',
        purpose: 'ADAS (Advanced Driver Assistance)',
        questionText: 'For ADAS features (lane keeping, collision avoidance), what data access is OK?',
        dataTypes: ['sensors.camera', 'sensors.lidar', 'sensors.radar', 'location.speed', 'behavior.steering'],
        options: {
          a: {
            label: 'Allow all sensor data for full ADAS functionality',
            effect: 'ALLOW',
            contexts: [],
            priority: 40,
            transforms: []
          },
          b: {
            label: 'Allow sensor data but process locally only',
            effect: 'LOCAL_ONLY',
            contexts: [],
            priority: 80,
            transforms: [{ type: 'localOnly' }]
          },
          c: {
            label: 'Allow only speed and basic sensors (no camera)',
            effect: 'REDUCE_PRECISION',
            contexts: [],
            priority: 60,
            transforms: [{ type: 'deny', dataRef: ['sensors.camera'] }]
          },
          d: {
            label: 'Disable cloud-connected ADAS (basic only)',
            effect: 'BLOCK',
            contexts: [],
            priority: 90,
            transforms: []
          }
        }
      },
      {
        id: 'safety-behavior',
        purpose: 'Driver Behavior Scoring',
        questionText: 'For driver behavior analysis (smooth driving, alertness), what is acceptable?',
        dataTypes: ['behavior.acceleration', 'behavior.braking', 'behavior.steering', 'behavior.attention'],
        options: {
          a: {
            label: 'Allow full behavior monitoring for safety tips',
            effect: 'ALLOW',
            contexts: [],
            priority: 40,
            transforms: []
          },
          b: {
            label: 'Allow aggregated scores only (no raw data)',
            effect: 'AGGREGATE',
            contexts: [],
            priority: 70,
            transforms: [{ type: 'aggregate', output: 'score' }]
          },
          c: {
            label: 'Allow only during work hours (deny personal time)',
            effect: 'ALLOW',
            contexts: [{ type: 'timeOfDay', allowed: ['Morning', 'Afternoon'] }],
            priority: 60,
            transforms: []
          },
          d: {
            label: 'Block all behavior monitoring',
            effect: 'BLOCK',
            contexts: [],
            priority: 90,
            transforms: []
          }
        }
      },
      {
        id: 'safety-speed',
        purpose: 'Speed Alerts',
        questionText: 'For speed limit warnings, what location data can be used?',
        dataTypes: ['location.speed', 'location.latitude', 'location.longitude', 'location.roadsegment'],
        options: {
          a: {
            label: 'Allow precise location for accurate speed limits',
            effect: 'ALLOW',
            contexts: [],
            priority: 40,
            transforms: []
          },
          b: {
            label: 'Allow road segment only (no precise coordinates)',
            effect: 'GENERALIZE',
            contexts: [],
            priority: 60,
            transforms: [{ type: 'generalize', level: 'road-segment' }]
          },
          c: {
            label: 'Use local map database (no cloud queries)',
            effect: 'LOCAL_ONLY',
            contexts: [],
            priority: 80,
            transforms: [{ type: 'localOnly' }]
          },
          d: {
            label: 'Disable speed warnings',
            effect: 'BLOCK',
            contexts: [],
            priority: 90,
            transforms: []
          }
        }
      },
      {
        id: 'safety-night',
        purpose: 'Night Mode / Fatigue Detection',
        questionText: 'For fatigue/drowsiness detection at night, what monitoring is OK?',
        dataTypes: ['sensors.camera.interior', 'behavior.attention', 'behavior.steering', 'location.time'],
        options: {
          a: {
            label: 'Allow driver camera + behavior monitoring',
            effect: 'ALLOW',
            contexts: [{ type: 'timeOfDay', allowed: ['Night', 'Evening'] }],
            priority: 40,
            transforms: []
          },
          b: {
            label: 'Allow behavior monitoring only (no camera)',
            effect: 'REDUCE_PRECISION',
            contexts: [{ type: 'timeOfDay', allowed: ['Night', 'Evening'] }],
            priority: 60,
            transforms: [{ type: 'deny', dataRef: ['sensors.camera.interior'] }]
          },
          c: {
            label: 'Process locally, only alert if fatigue detected',
            effect: 'LOCAL_ONLY',
            contexts: [],
            priority: 80,
            transforms: [{ type: 'localOnly' }, { type: 'alertOnly' }]
          },
          d: {
            label: 'Disable fatigue detection',
            effect: 'BLOCK',
            contexts: [],
            priority: 90,
            transforms: []
          }
        }
      }
    ]
  },

  // ============================================================================
  // SERVICE TYPE 4: OEM (Original Equipment Manufacturer)
  // ============================================================================
  oem: {
    id: 'oem',
    name: 'OEM',
    icon: '🏭',
    description: 'Manufacturer services, updates, and diagnostics',
    questions: [
      {
        id: 'oem-maintenance',
        purpose: 'Predictive Maintenance',
        questionText: 'For predictive maintenance alerts, what vehicle data can the manufacturer access?',
        dataTypes: ['health.enginestatus', 'health.batterylevel', 'health.tirepressure', 'health.oillevel', 'health.mileage'],
        options: {
          a: {
            label: 'Allow all vehicle health data for proactive alerts',
            effect: 'ALLOW',
            contexts: [],
            priority: 40,
            transforms: []
          },
          b: {
            label: 'Allow only critical health indicators (engine, battery)',
            effect: 'REDUCE_PRECISION',
            contexts: [],
            priority: 60,
            transforms: [{ type: 'deny', dataRef: ['health.tirepressure', 'health.oillevel'] }]
          },
          c: {
            label: 'Share anonymized/aggregated data for fleet analysis',
            effect: 'ANONYMIZE',
            contexts: [],
            priority: 80,
            transforms: [{ type: 'anonymize' }, { type: 'aggregate' }]
          },
          d: {
            label: 'Deny all remote health monitoring',
            effect: 'BLOCK',
            contexts: [],
            priority: 90,
            transforms: []
          }
        }
      },
      {
        id: 'oem-ota',
        purpose: 'OTA Updates',
        questionText: 'For over-the-air software updates, what information sharing is acceptable?',
        dataTypes: ['system.softwareversion', 'system.hardwareid', 'identity.vin', 'system.errors'],
        options: {
          a: {
            label: 'Allow automatic updates with full telemetry',
            effect: 'ALLOW',
            contexts: [],
            priority: 40,
            transforms: []
          },
          b: {
            label: 'Allow updates but minimize telemetry',
            effect: 'REDUCE_PRECISION',
            contexts: [],
            priority: 60,
            transforms: [{ type: 'deny', dataRef: ['system.errors'] }]
          },
          c: {
            label: 'Manual approval required for each update',
            effect: 'DELAY',
            contexts: [],
            priority: 70,
            transforms: [{ type: 'requireConsent' }]
          },
          d: {
            label: 'Disable OTA (dealer updates only)',
            effect: 'BLOCK',
            contexts: [],
            priority: 90,
            transforms: []
          }
        }
      },
      {
        id: 'oem-analytics',
        purpose: 'Usage Analytics',
        questionText: 'For product improvement analytics, what usage data can be collected?',
        dataTypes: ['usage.features', 'usage.infotainment', 'usage.climate', 'usage.drivingpatterns'],
        options: {
          a: {
            label: 'Allow full usage analytics for product improvement',
            effect: 'ALLOW',
            contexts: [],
            priority: 40,
            transforms: []
          },
          b: {
            label: 'Allow only feature usage (no driving patterns)',
            effect: 'REDUCE_PRECISION',
            contexts: [],
            priority: 60,
            transforms: [{ type: 'deny', dataRef: ['usage.drivingpatterns'] }]
          },
          c: {
            label: 'Share only aggregated/anonymized statistics',
            effect: 'AGGREGATE',
            contexts: [],
            priority: 80,
            transforms: [{ type: 'anonymize' }, { type: 'aggregate', scope: 'monthly' }]
          },
          d: {
            label: 'Opt out of all analytics',
            effect: 'BLOCK',
            contexts: [],
            priority: 90,
            transforms: []
          }
        }
      },
      {
        id: 'oem-diagnostics',
        purpose: 'Remote Diagnostics',
        questionText: 'For remote diagnostics when issues arise, what access is permitted?',
        dataTypes: ['diagnostics.dtc', 'diagnostics.logs', 'health.enginestatus', 'system.errors'],
        options: {
          a: {
            label: 'Allow full remote diagnostics access',
            effect: 'ALLOW',
            contexts: [],
            priority: 40,
            transforms: []
          },
          b: {
            label: 'Allow only error codes (no detailed logs)',
            effect: 'REDUCE_PRECISION',
            contexts: [],
            priority: 60,
            transforms: [{ type: 'deny', dataRef: ['diagnostics.logs'] }]
          },
          c: {
            label: 'Require explicit consent for each diagnostic session',
            effect: 'DELAY',
            contexts: [],
            priority: 70,
            transforms: [{ type: 'requireConsent' }]
          },
          d: {
            label: 'Dealer diagnostics only (no remote)',
            effect: 'BLOCK',
            contexts: [],
            priority: 90,
            transforms: []
          }
        }
      }
    ]
  },

  // ============================================================================
  // SERVICE TYPE 5: THIRD PARTY
  // ============================================================================
  thirdparty: {
    id: 'thirdparty',
    name: 'Third Party',
    icon: '🤝',
    description: 'Insurance, repair shops, and external services',
    questions: [
      {
        id: 'third-infotainment',
        purpose: 'Infotainment Apps',
        questionText: 'For third-party infotainment apps (Spotify, podcasts), what data access is OK?',
        dataTypes: ['infotainment.mediahistory', 'infotainment.preferences', 'location.latitude', 'location.longitude'],
        options: {
          a: {
            label: 'Allow full access including location for personalization',
            effect: 'ALLOW',
            contexts: [],
            priority: 40,
            transforms: []
          },
          b: {
            label: 'Allow media preferences only (no location)',
            effect: 'REDUCE_PRECISION',
            contexts: [],
            priority: 60,
            transforms: [{ type: 'deny', dataRef: ['location.*'] }]
          },
          c: {
            label: 'Anonymize preferences, no history retention',
            effect: 'ANONYMIZE',
            contexts: [],
            priority: 80,
            transforms: [{ type: 'anonymize' }, { type: 'noRetention' }]
          },
          d: {
            label: 'Block third-party app data access',
            effect: 'BLOCK',
            contexts: [],
            priority: 90,
            transforms: []
          }
        }
      },
      {
        id: 'third-repair',
        purpose: 'Independent Repair Shops',
        questionText: 'For independent repair shops (non-dealer), what vehicle data can be shared?',
        dataTypes: ['diagnostics.dtc', 'health.enginestatus', 'identity.vin', 'health.mileage'],
        options: {
          a: {
            label: 'Allow full diagnostic data access',
            effect: 'ALLOW',
            contexts: [],
            priority: 40,
            transforms: []
          },
          b: {
            label: 'Allow error codes only (no detailed health)',
            effect: 'REDUCE_PRECISION',
            contexts: [],
            priority: 60,
            transforms: [{ type: 'deny', dataRef: ['health.*'] }]
          },
          c: {
            label: 'Require explicit authorization each time',
            effect: 'DELAY',
            contexts: [],
            priority: 70,
            transforms: [{ type: 'requireConsent' }]
          },
          d: {
            label: 'Deny access (dealer service only)',
            effect: 'BLOCK',
            contexts: [],
            priority: 90,
            transforms: []
          }
        }
      },
      {
        id: 'third-insurance',
        purpose: 'Insurance Telematics',
        questionText: 'For usage-based insurance, what driving data can be shared with insurers?',
        dataTypes: ['behavior.acceleration', 'behavior.braking', 'location.speed', 'usage.mileage', 'usage.triphistory'],
        options: {
          a: {
            label: 'Allow full telematics for potential premium discounts',
            effect: 'ALLOW',
            contexts: [],
            priority: 40,
            transforms: []
          },
          b: {
            label: 'Allow only mileage and general driving score',
            effect: 'AGGREGATE',
            contexts: [],
            priority: 60,
            transforms: [{ type: 'aggregate', output: 'score' }]
          },
          c: {
            label: 'Share anonymized data (no trip history)',
            effect: 'ANONYMIZE',
            contexts: [],
            priority: 80,
            transforms: [{ type: 'anonymize' }, { type: 'deny', dataRef: ['usage.triphistory'] }]
          },
          d: {
            label: 'Opt out of all insurance telematics',
            effect: 'BLOCK',
            contexts: [],
            priority: 90,
            transforms: []
          }
        }
      },
      {
        id: 'third-marketing',
        purpose: 'Marketing & Ads',
        questionText: 'For marketing and personalized offers, what information sharing is acceptable?',
        dataTypes: ['preferences.interests', 'location.city', 'usage.features', 'demographics.estimated'],
        options: {
          a: {
            label: 'Allow personalized marketing based on usage',
            effect: 'ALLOW',
            contexts: [],
            priority: 40,
            transforms: []
          },
          b: {
            label: 'Allow only non-location-based marketing',
            effect: 'REDUCE_PRECISION',
            contexts: [],
            priority: 60,
            transforms: [{ type: 'deny', dataRef: ['location.*'] }]
          },
          c: {
            label: 'Allow only aggregated demographic data',
            effect: 'AGGREGATE',
            contexts: [],
            priority: 80,
            transforms: [{ type: 'aggregate' }, { type: 'anonymize' }]
          },
          d: {
            label: 'Block all marketing data sharing',
            effect: 'BLOCK',
            contexts: [],
            priority: 90,
            transforms: []
          }
        }
      }
    ]
  },

  // ============================================================================
  // SERVICE TYPE 6: APP (Vehicle Companion Apps)
  // ============================================================================
  app: {
    id: 'app',
    name: 'App',
    icon: '📱',
    description: 'Mobile companion apps and remote features',
    questions: [
      {
        id: 'app-personalization',
        purpose: 'App Personalization',
        questionText: 'For personalizing your companion app experience, what data can be used?',
        dataTypes: ['preferences.seating', 'preferences.climate', 'preferences.media', 'usage.apphistory'],
        options: {
          a: {
            label: 'Allow full personalization based on all preferences',
            effect: 'ALLOW',
            contexts: [],
            priority: 40,
            transforms: []
          },
          b: {
            label: 'Allow only comfort preferences (seating, climate)',
            effect: 'REDUCE_PRECISION',
            contexts: [],
            priority: 60,
            transforms: [{ type: 'deny', dataRef: ['preferences.media', 'usage.apphistory'] }]
          },
          c: {
            label: 'Store preferences locally on device only',
            effect: 'LOCAL_ONLY',
            contexts: [],
            priority: 80,
            transforms: [{ type: 'localOnly' }]
          },
          d: {
            label: 'No personalization (manual settings each time)',
            effect: 'BLOCK',
            contexts: [],
            priority: 90,
            transforms: []
          }
        }
      },
      {
        id: 'app-remote',
        purpose: 'Remote Control',
        questionText: 'For remote vehicle control (lock/unlock, climate), what access is needed?',
        dataTypes: ['control.lock', 'control.climate', 'control.lights', 'location.latitude', 'location.longitude'],
        options: {
          a: {
            label: 'Allow full remote control with location',
            effect: 'ALLOW',
            contexts: [],
            priority: 40,
            transforms: []
          },
          b: {
            label: 'Allow remote control without location tracking',
            effect: 'REDUCE_PRECISION',
            contexts: [],
            priority: 60,
            transforms: [{ type: 'deny', dataRef: ['location.*'] }]
          },
          c: {
            label: 'Allow only lock/unlock (no climate/lights)',
            effect: 'REDUCE_PRECISION',
            contexts: [],
            priority: 70,
            transforms: [{ type: 'deny', dataRef: ['control.climate', 'control.lights'] }]
          },
          d: {
            label: 'Disable all remote control features',
            effect: 'BLOCK',
            contexts: [],
            priority: 90,
            transforms: []
          }
        }
      },
      {
        id: 'app-analytics',
        purpose: 'App Analytics',
        questionText: 'For improving the app experience, what usage data can be collected?',
        dataTypes: ['usage.appfeatures', 'usage.sessiontime', 'usage.errors', 'device.type'],
        options: {
          a: {
            label: 'Allow full app analytics',
            effect: 'ALLOW',
            contexts: [],
            priority: 40,
            transforms: []
          },
          b: {
            label: 'Allow only crash reports and errors',
            effect: 'REDUCE_PRECISION',
            contexts: [],
            priority: 60,
            transforms: [{ type: 'deny', dataRef: ['usage.appfeatures', 'usage.sessiontime'] }]
          },
          c: {
            label: 'Allow only aggregated/anonymized analytics',
            effect: 'AGGREGATE',
            contexts: [],
            priority: 80,
            transforms: [{ type: 'anonymize' }, { type: 'aggregate' }]
          },
          d: {
            label: 'Opt out of all app analytics',
            effect: 'BLOCK',
            contexts: [],
            priority: 90,
            transforms: []
          }
        }
      },
      {
        id: 'app-voice',
        purpose: 'Voice Assistant',
        questionText: 'For voice assistant features, what data processing is acceptable?',
        dataTypes: ['voice.commands', 'voice.recordings', 'preferences.assistant', 'location.current'],
        options: {
          a: {
            label: 'Allow cloud processing for best accuracy',
            effect: 'ALLOW',
            contexts: [],
            priority: 40,
            transforms: []
          },
          b: {
            label: 'Allow cloud processing but no recording retention',
            effect: 'REDUCE_PRECISION',
            contexts: [],
            priority: 60,
            transforms: [{ type: 'noRetention', dataRef: ['voice.recordings'] }]
          },
          c: {
            label: 'Local voice processing only (reduced accuracy)',
            effect: 'LOCAL_ONLY',
            contexts: [],
            priority: 80,
            transforms: [{ type: 'localOnly' }]
          },
          d: {
            label: 'Disable voice assistant',
            effect: 'BLOCK',
            contexts: [],
            priority: 90,
            transforms: []
          }
        }
      }
    ]
  },

  // ============================================================================
  // SERVICE TYPE 7: LOGISTIC (Fleet & Commercial)
  // ============================================================================
  logistic: {
    id: 'logistic',
    name: 'Logistic',
    icon: '🚛',
    description: 'Fleet management, routing, and compliance',
    questions: [
      {
        id: 'logistic-tracking',
        purpose: 'Fleet Tracking',
        questionText: 'For fleet tracking and management, what location data can be shared?',
        dataTypes: ['location.latitude', 'location.longitude', 'location.speed', 'location.history'],
        options: {
          a: {
            label: 'Allow real-time precise tracking during work hours',
            effect: 'ALLOW',
            contexts: [{ type: 'workHours', value: true }],
            priority: 40,
            transforms: []
          },
          b: {
            label: 'Allow tracking only on designated routes',
            effect: 'ALLOW',
            contexts: [{ type: 'routeType', allowed: ['Designated'] }],
            priority: 60,
            transforms: []
          },
          c: {
            label: 'Generalize location to city/region level',
            effect: 'GENERALIZE',
            contexts: [],
            priority: 70,
            transforms: [{ type: 'generalize', level: 'city' }]
          },
          d: {
            label: 'Track only start/end points (no route tracking)',
            effect: 'REDUCE_PRECISION',
            contexts: [],
            priority: 80,
            transforms: [{ type: 'snapshot', points: ['start', 'end'] }]
          }
        }
      },
      {
        id: 'logistic-routing',
        purpose: 'Route Optimization',
        questionText: 'For route optimization and delivery efficiency, what data access is OK?',
        dataTypes: ['location.destination', 'location.eta', 'traffic.current', 'location.history'],
        options: {
          a: {
            label: 'Allow full route data for optimization',
            effect: 'ALLOW',
            contexts: [],
            priority: 40,
            transforms: []
          },
          b: {
            label: 'Allow destination and ETA only (no history)',
            effect: 'REDUCE_PRECISION',
            contexts: [],
            priority: 60,
            transforms: [{ type: 'deny', dataRef: ['location.history'] }]
          },
          c: {
            label: 'Allow only aggregated fleet-level routing data',
            effect: 'AGGREGATE',
            contexts: [],
            priority: 80,
            transforms: [{ type: 'aggregate', scope: 'fleet' }]
          },
          d: {
            label: 'Disable route optimization features',
            effect: 'BLOCK',
            contexts: [],
            priority: 90,
            transforms: []
          }
        }
      },
      {
        id: 'logistic-compliance',
        purpose: 'Compliance & Regulations',
        questionText: 'For regulatory compliance (driving hours, rest periods), what monitoring is acceptable?',
        dataTypes: ['compliance.drivinghours', 'compliance.restperiods', 'compliance.speedviolations', 'identity.driverid'],
        options: {
          a: {
            label: 'Allow full compliance monitoring (legally required)',
            effect: 'ALLOW',
            contexts: [],
            priority: 100,
            transforms: []
          },
          b: {
            label: 'Allow only legally mandated data',
            effect: 'REDUCE_PRECISION',
            contexts: [],
            priority: 80,
            transforms: [{ type: 'legalMinimum' }]
          },
          c: {
            label: 'Anonymize driver identity where possible',
            effect: 'ANONYMIZE',
            contexts: [],
            priority: 70,
            transforms: [{ type: 'anonymize', dataRef: ['identity.driverid'] }]
          },
          d: {
            label: 'Manual logging only (no automatic monitoring)',
            effect: 'BLOCK',
            contexts: [],
            priority: 60,
            transforms: []
          }
        }
      },
      {
        id: 'logistic-fuel',
        purpose: 'Fuel Efficiency',
        questionText: 'For fuel efficiency analysis and cost reduction, what data can be used?',
        dataTypes: ['fuel.consumption', 'fuel.efficiency', 'behavior.acceleration', 'behavior.idling'],
        options: {
          a: {
            label: 'Allow full fuel and driving behavior analysis',
            effect: 'ALLOW',
            contexts: [],
            priority: 40,
            transforms: []
          },
          b: {
            label: 'Allow fuel data only (no behavior analysis)',
            effect: 'REDUCE_PRECISION',
            contexts: [],
            priority: 60,
            transforms: [{ type: 'deny', dataRef: ['behavior.*'] }]
          },
          c: {
            label: 'Share only aggregated fleet fuel statistics',
            effect: 'AGGREGATE',
            contexts: [],
            priority: 80,
            transforms: [{ type: 'aggregate', scope: 'fleet' }]
          },
          d: {
            label: 'Disable fuel efficiency tracking',
            effect: 'BLOCK',
            contexts: [],
            priority: 90,
            transforms: []
          }
        }
      }
    ]
  }
};

// PET Hierarchy for conflict resolution (higher index = stronger protection)
const PET_HIERARCHY = [
  'ALLOW',           // 0 - Least protective
  'DELAY',           // 1
  'MASK',            // 2
  'REDUCE_PRECISION',// 3
  'GENERALIZE',      // 4
  'AGGREGATE',       // 5
  'ANONYMIZE',       // 6
  'LOCAL_ONLY',      // 7
  'BLOCK'            // 8 - Most protective
];

// Context types and their possible values
const CONTEXT_TYPES = {
  timeOfDay: ['Morning', 'Afternoon', 'Evening', 'Night'],
  roadType: ['Highway', 'Regional', 'Urban', 'Residential'],
  homeDistance: ['Near', 'Far'], // Near = < threshold, Far = >= threshold
  emergencyStatus: [true, false],
  theftStatus: [true, false],
  policeRequest: [true, false],
  workHours: [true, false],
  speed: ['Low', 'Medium', 'High'] // Speed categories
};

module.exports = {
  QUESTIONNAIRE_DATA,
  PET_HIERARCHY,
  CONTEXT_TYPES
};
