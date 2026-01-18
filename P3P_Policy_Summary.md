# Connected Vehicle P3P Privacy Policies - Complete Reference

## Summary Statistics

| Metric | Count |
|--------|-------|
| **Service Types** | 7 |
| **Purposes** | 28 (4 per service) |
| **Policy Options** | 112 (4 per purpose) |
| **Total STATEMENTS** | 112 |

---

## Service Type Mapping

| # | Service Type | Policy Name | Purposes |
|---|--------------|-------------|----------|
| 1 | Map/Navigation | `MapNavigationService` | Navigation, Traffic Detection, ETA Improvement, Nearby Suggestions (POI) |
| 2 | Emergency | `EmergencyService` | eCall/Crash, Breakdown Assistance, Hazard Warning, Stolen Vehicle Tracking |
| 3 | Safety/ADAS | `SafetyADASService` | Driver Assistance, Behavior Scoring, Speed Alerts, Night Safety Mode |
| 4 | OEM | `OEMService` | Predictive Maintenance, Software Updates (OTA), Product Analytics, Warranty/Diagnostics |
| 5 | Third Party | `ThirdPartyService` | Infotainment Sharing, Repair Shop Access, Insurance Profile, Marketing/Resale |
| 6 | App | `AppService` | Personalization, Remote Control, App Analytics, Voice Assistant |
| 7 | Logistic | `LogisticService` | Fleet Tracking, Route Optimization, Behavior Compliance, Fuel Efficiency |

---

## Answering Your Questions

### Q1: Do we have to write a SERVICE TYPE in P3P?

**Answer: No, P3P does not have a native `<SERVICE>` element.**

P3P 1.0 (W3C Recommendation) uses `<POLICY>` as the top-level container, not service types. However, we can:

1. **Use the `name` attribute** on `<POLICY>` to indicate service type:
   ```xml
   <POLICY name="MapNavigationService">
   ```

2. **Group related STATEMENTs** within a single POLICY by service type

3. **Use EXTENSION elements** (namespaced) to add service type metadata:
   ```xml
   <EXTENSION>
     <cv:serviceType>Map</cv:serviceType>
   </EXTENSION>
   ```

The approach in our implementation uses **separate POLICY elements per service type**, which is clean and directly mappable to your XPref evaluator.

---

### Q2: Is this P3P functional?

**Answer: Yes, with caveats.**

#### What's P3P-Compliant (Core):
- ✅ `<POLICY>`, `<STATEMENT>`, `<PURPOSE>`, `<RECIPIENT>`, `<RETENTION>`, `<DATA-GROUP>`, `<DATA>`
- ✅ Standard purposes: `<navigation/>`, `<current/>`, `<develop/>`, `<tailoring/>`, `<admin/>`, `<marketing/>`
- ✅ Standard retention: `<no-retention/>`, `<stated-purpose/>`, `<indefinitely/>`, `<legal-requirement/>`
- ✅ Standard recipients: `<ours/>`, `<delivery/>`, `<public/>`, `<other-recipient/>`

#### What's Extended (cv: namespace):
These are **non-standard but valid P3P extensions** (P3P allows `<EXTENSION>` blocks):

| Extension | Purpose | Example |
|-----------|---------|---------|
| `<cv:context>` | Runtime conditions | `<cv:timeOfDay denied="Night"/>` |
| `<cv:transform>` | Data transformations | `<cv:generalize radius="1km"/>`, `<cv:pseudonymize/>`, `<cv:anonymize/>` |
| `<cv:processing>` | Processing modes | `<cv:localOnly>true</cv:localOnly>`, `<cv:deny>true</cv:deny>` |
| `<cv:priority>` | Conflict resolution | `<cv:priority>80</cv:priority>` |
| `<cv:optionId>` | Option identifier | `<cv:optionId>map-nav-a</cv:optionId>` |

**Key Point:** A standard P3P user-agent (like the old IE P3P parser) would:
1. Parse the core P3P elements correctly
2. Ignore the `cv:` extensions it doesn't understand

Your XPref evaluator can use the extensions to implement PET logic.

---

## Priority Scale (For XPref Conflict Resolution)

| Priority | Effect | Description |
|----------|--------|-------------|
| 100 | Emergency Override | Safety-critical, highest precedence |
| 90 | Deny / Local-only | Strong privacy protection |
| 85 | Local logs only | Data never leaves vehicle |
| 80 | Anonymize / Aggregate | Irreversible de-identification |
| 70 | Pseudonymize | Reversible de-identification |
| 60 | Generalize / Context-restricted | Reduced precision or conditional |
| 40 | Allow Precise | Full data access |

---

## Data Reference Schema

The `ref` attributes in `<DATA>` elements follow a hierarchical schema:

```
#location.latitude
#location.longitude
#location.speed
#location.heading
#location.roadtype
#location.area
#location.city
#location.roadsegment

#identity.vin
#identity.pseudonymid
#identity.pseudonymvin

#health.fuellevel
#health.batterylevel
#health.rpm
#health.engineload
#health.faultcodes
#health.summary
#health.weeklysummary

#behavior.acceleration
#behavior.braking
#behavior.steeringangle
#behavior.safetyscore
#behavior.categories
#behavior.dailysummary
#behavior.weeklysafetyscore

#infotainment.mediasource
#infotainment.userinput
#infotainment.navigationdestination
#infotainment.voiceaudio
#infotainment.voicecommand
#infotainment.voiceintent
#infotainment.preferences

#control.remotecommands

#software.version

#safety.hazardtype

#traffic.level

#trip.data
#trip.dailysummary
#trip.fuelsummary

#fleet.statistics

#aggregate.statistics

#app.usagelogs
#app.aggregatestatistics
```

---

## Context Conditions Reference

| Context | Values | Example |
|---------|--------|---------|
| `timeOfDay` | Morning, Afternoon, Evening, Night | `<cv:timeOfDay denied="Night"/>` |
| `roadType` | Highway, Regional, Residential | `<cv:roadType allowed="Highway,Regional"/>` |
| `homeDistance` | minimum="100m" | `<cv:homeDistance minimum="100m"/>` |
| `emergencyStatus` | true/false | `<cv:emergencyStatus>true</cv:emergencyStatus>` |
| `theftStatus` | true/false | `<cv:theftStatus>true</cv:theftStatus>` |
| `minSpeed` | value (km/h) | `<cv:minSpeed value="60"/>` |
| `fuelLevel` | operator, value | `<cv:fuelLevel operator="lt" value="20"/>` |
| `batteryLevel` | operator, value | `<cv:batteryLevel operator="lt" value="20"/>` |
| `authenticated` | true/false | `<cv:authenticated>true</cv:authenticated>` |
| `timeLimit` | duration | `<cv:timeLimit duration="24h"/>` |

---

## Mapping to XPref Rules

Each STATEMENT maps directly to an XPref rule:

```
P3P STATEMENT                    →    XPref Rule
─────────────────────────────────────────────────────
cv:optionId                      →    ruleId
PURPOSE                          →    purpose
cv:priority                      →    priority
cv:processing/cv:deny            →    effect: DENY
cv:transform/cv:generalize       →    effect: GENERALIZE
cv:transform/cv:pseudonymize     →    effect: PSEUDONYMIZE
cv:transform/cv:anonymize        →    effect: ANONYMIZE
cv:processing/cv:localOnly       →    effect: LOCAL_ONLY
cv:processing/cv:aggregate       →    effect: AGGREGATE
DATA-GROUP/DATA                  →    dataCategories
cv:context/*                     →    conditions
```

---

## Regulatory Alignment

| Regulation/Guideline | How Addressed |
|---------------------|---------------|
| **EDPB Connected Vehicles Guidelines** | Data minimization via deny/generalize options; explicit consent options |
| **GDPR Art. 5(1)(c)** - Data Minimization | Every purpose has deny and aggregate options |
| **GDPR Art. 25** - Privacy by Design | Local-only processing options; pseudonymization defaults |
| **ACEA Principles** | User choice for third-party sharing; proportionality in marketing |
| **eCall Regulation (EU) 2015/758** | Emergency service with mandatory data requirements |

---

## Next Steps (Recommended)

1. **Generate XSD Schema** - Formal validation for the cv: extensions
2. **Create XPref Converter** - Auto-generate XPref rules from this P3P
3. **Add Legal Basis Annotations** - GDPR consent vs. legitimate interest
4. **Frontend Integration** - Map optionIds to UI components

---

## File Structure

```
connected_vehicle_p3p_policies.xml
├── MapNavigationService (4 purposes × 4 options = 16 statements)
├── EmergencyService (4 purposes × 4 options = 16 statements)
├── SafetyADASService (4 purposes × 4 options = 16 statements)
├── OEMService (4 purposes × 4 options = 16 statements)
├── ThirdPartyService (4 purposes × 4 options = 16 statements)
├── AppService (4 purposes × 4 options = 16 statements)
└── LogisticService (4 purposes × 4 options = 16 statements)
    ────────────────────────────────────────────────────────
    TOTAL: 7 services × 4 purposes × 4 options = 112 statements
```
