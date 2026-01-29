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
    id: 'map-navigation-location',
    purpose: 'Navigation',
    questionText: 'How should navigation use your location data?',
    helpText: 'This controls how precise your location is when getting directions',
    contextMappingId: 'navigation_location',
    affectsDataTypes: ['location_precise_gps', 'location_heading', 'route_origin', 'route_destination']
  },
  {
    id: 'map-navigation-speed',
    purpose: 'Navigation',
    questionText: 'How should navigation use your speed for ETA calculations?',
    helpText: 'Speed data helps calculate accurate arrival times',
    contextMappingId: 'navigation_speed',
    affectsDataTypes: ['speed_current']
  },
  {
    id: 'map-traffic',
    purpose: 'Traffic Analytics',
    questionText: 'Should you contribute to community traffic data?',
    helpText: 'Your anonymized data helps other drivers avoid congestion',
    contextMappingId: 'traffic_contribution',
    affectsDataTypes: ['location_precise_gps', 'speed_current', 'timestamp']
  },
  {
    id: 'map-poi',
    purpose: 'POI Recommendations',
    questionText: 'How should POI suggestions use your location?',
    helpText: 'More precise location gives more relevant nearby suggestions',
    contextMappingId: 'poi_location',
    affectsDataTypes: ['location_precise_gps', 'location_coarse']
  },
  {
    id: 'map-personalization',
    purpose: 'Personalization',
    questionText: 'How should your history be used for personalization?',
    helpText: 'History helps predict your favorite places and common routes',
    contextMappingId: 'personal_history',
    affectsDataTypes: ['visited_places', 'search_history', 'route_origin', 'route_destination']
  },
  {
    id: 'map-ads',
    purpose: 'Advertisement',
    questionText: 'How should advertising use your data?',
    helpText: 'Control how ads are targeted to you based on your location and behavior',
    contextMappingId: 'ad_targeting',
    affectsDataTypes: ['location_precise_gps', 'location_coarse', 'search_history', 'device_identifier']
  },
  {
    id: 'map-sharing',
    purpose: 'Location Sharing',
    questionText: 'How precise should location sharing be?',
    helpText: 'Control how accurately others can see your location',
    contextMappingId: 'sharing_precision',
    affectsDataTypes: ['location_precise_gps', 'timestamp']
  },
  {
  id: 'map-retention',
  purpose: 'Data Retention',
  questionText: 'How long should your data be kept?',
  helpText: 'Control how long services can store your location and activity data',
  contextMappingId: 'data_retention',
  affectsDataTypes: ['visited_places', 'search_history', 'location_precise_gps', 'timestamp']
},
  {
    id: 'map-history',
    purpose: 'Location History',
    questionText: 'How should your location history be stored?',
    helpText: 'Control whether history is kept on your device or in the cloud',
    contextMappingId: 'history_storage',
    affectsDataTypes: ['visited_places', 'location_precise_gps', 'route_origin', 'route_destination', 'timestamp']
  }
]
  }
}

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
