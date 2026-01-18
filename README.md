# 🚗 Privacy Preference & Rule-Based Policy Evaluation System

A complete privacy preference management system for connected vehicles with XPref rule generation, two-phase evaluation, and live data streaming.

## 📁 Project Structure

```
cv-privacy-system/
├── backend/
│   ├── index.js           # Express server with all endpoints
│   ├── questionnaire.js   # Complete questionnaire data (7 services, 28 questions)
│   ├── ruleGenerator.js   # XPref XML rule generation
│   ├── policyMatcher.js   # P3P policy matching (28 policies)
│   ├── ruleEngine.js      # Two-phase evaluation & conflict resolution
│   └── package.json
│
└── frontend/
    ├── public/
    │   └── index.html
    ├── src/
    │   ├── App.js
    │   ├── index.js
    │   ├── index.css        # VS Code-inspired dark sidebar styling
    │   ├── api.js           # API helper functions
    │   └── components/
    │       ├── Login.js
    │       ├── UserDashboard.js
    │       ├── PreferenceBuilder.js  # Questionnaire UI
    │       ├── XPrefBuilder.js       # Rule viewer
    │       ├── ResultDisplay.js      # Evaluation results
    │       ├── Results.js            # Live data streaming
    │       └── DomainExpert.js
    └── package.json
```

## 🚀 Quick Start

### 1. Install Backend Dependencies
```bash
cd backend
npm install
```

### 2. Start Backend Server
```bash
npm start
```
Backend runs on http://localhost:4000

### 3. Install Frontend Dependencies (in new terminal)
```bash
cd frontend
npm install
```

### 4. Start Frontend
```bash
npm start
```
Frontend runs on http://localhost:3000

## 👤 Demo Accounts

| Role | Username | Password |
|------|----------|----------|
| User | alice | userpass |
| User | bob | userpass |
| Admin | admin | admin123 |

## 🎯 Features

### Service Types (7 total)
1. **Map/Navigation** - Navigation, traffic, ETA, POI
2. **Emergency** - eCall, breakdown, hazards, theft recovery
3. **Safety** - ADAS, behavior scoring, speed alerts, night mode
4. **OEM** - Maintenance, OTA updates, analytics, diagnostics
5. **Third Party** - Infotainment, repair shop, insurance, marketing
6. **App** - Personalization, remote control, analytics, voice
7. **Logistic** - Fleet tracking, routing, compliance, fuel efficiency

### Privacy-Enhancing Techniques (PETs)
- `BLOCK` - Complete data denial
- `LOCAL_ONLY` - On-device processing only
- `ANONYMIZE` - Identity removal
- `AGGREGATE` - Grouped/averaged data
- `GENERALIZE` - Reduced precision (100m accuracy)
- `REDUCE_PRECISION` - Decimal truncation
- `MASK` - Partial hiding (VIN: WBA***EP***)
- `DELAY` - Time-delayed transmission
- `ALLOW` - Full access

### Two-Phase Evaluation
1. **Phase 1: Stream Evaluation** - Context-based rule activation
2. **Phase 2: Policy Evaluation** - P3P policy matching

### Live Data Streaming
- Mock vehicle data generated every 5 seconds (configurable)
- Real-time privacy transformations applied
- Visual comparison of raw vs transformed data

## 🔧 API Endpoints

### Authentication
- `POST /api/login` - User login
- `POST /api/logout` - User logout

### Questionnaire
- `GET /api/questionnaire` - Get all service types and questions
- `GET /api/questionnaire/:serviceType` - Get specific service

### Preferences
- `POST /api/preferences` - Save user preferences
- `GET /api/preferences/:userId` - Get user preferences
- `GET /api/preferences/:userId/:serviceType` - Get service preferences

### Rules
- `POST /api/rules/generate` - Generate single XPref rule
- `POST /api/rules/generate-ruleset` - Generate complete ruleset
- `GET /api/rules/:userId` - Get saved rules

### Evaluation
- `POST /api/evaluate` - Full two-phase evaluation
- `POST /api/evaluate/quick` - Quick single rule test
- `POST /api/evaluate/resolve-conflict` - Resolve rule conflicts

### Streaming
- `POST /api/stream` - Get mock data with transformations

### P3P Policies
- `GET /api/p3p` - Get all P3P policies
- `GET /api/p3p/:serviceType` - Get service P3P policies

## 📊 User Flow

1. **Login** → Login with demo credentials
2. **Select Service** → Choose from sidebar (Map, Emergency, etc.)
3. **Answer Questions** → Select preferences using dropdowns
4. **Set Context** → Optional: time, road type, distance, emergency
5. **Save** → Generates XPref rules automatically
6. **Evaluate** → Runs two-phase evaluation
7. **View Results** → See applied PETs and transformations
8. **Live Stream** → Watch real-time data with privacy applied

## 🎨 UI Features

- VS Code-inspired dark sidebar navigation
- Catppuccin color scheme
- Progress tracking per service
- Real-time rule generation preview
- Conflict resolution modal
- Data transformation examples

## 📋 Example XPref Rule

```xml
<XPrefRuleset xmlns="http://xpref.org/schema" service="map">
  <Rule id="rule-map-navigation">
    <Purpose>Navigation</Purpose>
    <Effect>GENERALIZE</Effect>
    <Priority>80</Priority>
    <DataTypes>
      <Data ref="location.latitude"/>
      <Data ref="location.longitude"/>
    </DataTypes>
    <Contexts>
      <Context type="timeOfDay" denied="Night"/>
    </Contexts>
    <Transforms>
      <Transform type="generalize" radius="100m"/>
    </Transforms>
  </Rule>
</XPrefRuleset>
```

## 🔐 Conflict Resolution

When multiple rules conflict:
1. **Priority-based** - Highest priority wins (100 > 90 > 80...)
2. **PET Hierarchy** - More restrictive PET wins
   ```
   BLOCK > LOCAL_ONLY > ANONYMIZE > AGGREGATE > GENERALIZE > REDUCE_PRECISION > MASK > DELAY > ALLOW
   ```
3. **User Decision** - Popup for manual resolution

## 📡 Data Streaming Demo

The Live Stream tab shows:
- Raw vehicle data (location, speed, VIN, sensors)
- Transformed data based on active rules
- Effect applied (BLOCK, ANONYMIZE, GENERALIZE, etc.)
- Stream history with context changes
- Configurable interval (1s, 2s, 5s, 10s)

## 🛠️ Technologies

- **Backend**: Node.js, Express
- **Frontend**: React 18
- **Storage**: In-memory (no database required)
- **Styling**: CSS with Catppuccin theme

## 📝 Notes

- This is a demonstration system - no real vehicle data
- All data stored in memory (resets on server restart)
- Designed for privacy preference exploration and testing
- Focus on clarity and explainability of privacy decisions

## 📄 License

MIT License - Free for educational and research use.
