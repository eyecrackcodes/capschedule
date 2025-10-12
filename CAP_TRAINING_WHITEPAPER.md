# CAP Training Schedule System: Technical White Paper

## Executive Summary

The CAP (Combined Agent Performance) Training Schedule System is an intelligent workforce optimization solution designed to improve underperforming life insurance agents while minimizing operational disruption. This white paper details the methodology, business logic, and technical implementation that enables data-driven training assignment and scheduling.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Performance Metrics & Calculations](#performance-metrics--calculations)
3. [Training Assignment Logic](#training-assignment-logic)
4. [Scheduling Algorithm](#scheduling-algorithm)
5. [Operational Safeguards](#operational-safeguards)
6. [Implementation Details](#implementation-details)
7. [Business Impact](#business-impact)
8. [Future Enhancements](#future-enhancements)

---

## System Overview

### Problem Statement

Life insurance call centers face the challenge of improving agent performance without compromising service levels. Traditional training approaches often:

- Pull too many agents off phones simultaneously
- Fail to target specific performance gaps
- Ignore peak call volume patterns
- Don't account for multi-site operations

### Solution Architecture

Our system addresses these challenges through:

- **Data-driven agent selection** based on performance metrics
- **Intelligent scheduling** that avoids peak hours
- **Site alternation** to maintain coverage
- **Targeted training** based on specific metric deficiencies

---

## Performance Metrics & Calculations

### 1. CAP Score Calculation

The Combined Agent Performance (CAP) score serves as the primary performance indicator. Key considerations:

- **Tenure Filtering**: Agents with ≤1.9 years tenure are excluded from all calculations
- **Zero Score Handling**: Agents with CAP score = 0 are excluded from average calculations but prioritized for immediate intervention
- **Company Average**: Calculated using only eligible agents with non-zero CAP scores

```
Company Average CAP = Sum(CAP scores where score > 0) / Count(agents where score > 0)
```

### 2. Metric Percentiles

We calculate 50th percentiles (medians) for three key metrics:

#### Close Rate (Tuesday Training Focus)

- Measures: Percentage of calls resulting in closed sales
- 50th Percentile Calculation: Median of all non-zero close rates
- Training Trigger: Agent close rate < 50th percentile

#### Annual Premium per Sale (Wednesday Training Focus)

- Measures: Average dollar value of policies sold
- 50th Percentile Calculation: Median of all non-zero annual premiums
- Training Trigger: Agent annual premium < 50th percentile

#### Place Rate (Thursday Training Focus)

- Measures: Percentage of quotes that convert to placed policies
- 50th Percentile Calculation: Median of all non-zero place rates
- Training Trigger: Agent place rate < 50th percentile

### 3. Performance Categorization

Agents are categorized into priority levels:

```
HIGH PRIORITY:   CAP Score 20+ points below average
MEDIUM PRIORITY: CAP Score 10-19 points below average
LOW PRIORITY:    CAP Score 1-9 points below average
CRITICAL:        CAP Score = 0 (immediate intervention)
```

---

## Training Assignment Logic

### Day-Specific Training Allocation

The system implements a strategic weekly training schedule:

```
Tuesday:   Close Rate Training - Sales technique improvement
Wednesday: Annual Premium Training - Value optimization strategies
Thursday:  Place Rate Training - Quote-to-placement conversion
Friday:    Zero CAP Remediation - Critical intervention for non-performing agents
```

### Multi-Factor Assignment Process

1. **Primary Filter**: CAP Score < Company Average OR CAP Score = 0
2. **Secondary Filter**: Performance below 50th percentile in specific metrics
3. **Tertiary Consideration**: Even agents above average CAP may need specific metric training

Example:

- Agent A: CAP Score 85 (above average 80) but Close Rate 10% (below 50th percentile of 13.1%)
- Result: Assigned to Tuesday Close Rate Training despite above-average CAP

### Cohort Formation Rules

```
Minimum Cohort Size: 2 agents (ensures peer learning)
Maximum Cohort Size: 5 agents (maintains personalized attention)
Optimal Size: 3-4 agents (best engagement balance)
```

**Intelligent Grouping**:

- Agents grouped by location first
- Mixed tiers (Performance/Standard) when possible
- Sorted by severity (lowest CAP scores first)

---

## Scheduling Algorithm

### 1. Time Slot Prioritization

```javascript
HIGH PRIORITY SLOTS:
- 8:00-9:00 AM CST / 9:00-10:00 AM EST (Pre-peak ramp up)
- 2:00-3:00 PM CST / 3:00-4:00 PM EST (Post-lunch lull)

MEDIUM PRIORITY SLOTS:
- 9:00-10:00 AM CST / 10:00-11:00 AM EST (Early morning)
- 3:00-4:00 PM CST / 4:00-5:00 PM EST (Afternoon dip)

LOW PRIORITY SLOTS:
- 10:00-11:00 AM CST / 11:00 AM-12:00 PM EST (Approaching peak)
- 4:00-5:00 PM CST / 5:00-6:00 PM EST (Before evening peak)
```

### 2. Site Alternation Strategy

The algorithm ensures operational continuity through strict alternation:

```
For each time slot:
  1. Check last scheduled location
  2. Attempt to schedule opposite location
  3. If no opposite location cohort available, proceed with same location
  4. Flag consecutive same-site scheduling as warning
```

### 3. Peak Hour Avoidance

**Blackout Periods**:

- 11:00 AM - 1:00 PM (lunch hour in each time zone)
- 10:00 AM - 11:00 AM (morning peak)
- 4:00 PM - 6:00 PM (evening peak)

**Smart Scheduling**: The system automatically skips these time slots or assigns them lowest priority.

---

## Operational Safeguards

### 1. Capacity Constraints

```
Maximum agents in training per location per hour: 5
Minimum site availability maintained: 95%
Maximum weekly training hours per agent: 5 (1 hour/day)
```

### 2. Multi-Site Coordination

**Charlotte (CLT)**:

- Operating Hours: 9:00 AM - 6:00 PM EST
- Time Zone: Eastern Standard Time
- Peak Protection: 12:00-1:00 PM EST

**Austin (ATX)**:

- Operating Hours: 8:00 AM - 5:00 PM CST
- Time Zone: Central Standard Time
- Peak Protection: 12:00-1:00 PM CST

### 3. Validation Rules

The system performs real-time validation:

- ❌ Conflicts: Both sites scheduled simultaneously
- ⚠️ Warnings: Cohorts below minimum size
- ⚠️ Warnings: Unbalanced location distribution
- ❌ Errors: Training during lunch hours
- ❌ Errors: Cohorts exceeding 5 agents

---

## Implementation Details

### Data Processing Pipeline

```
1. FILE UPLOAD
   ↓ Validate TSV/CSV format
   ↓ Parse columns (tenure, tier, site, metrics)

2. DATA FILTERING
   ↓ Exclude tenure ≤ 1.9 years
   ↓ Calculate company average (excluding zeros)
   ↓ Calculate metric percentiles

3. AGENT CATEGORIZATION
   ↓ Identify training needs
   ↓ Assign priority levels
   ↓ Tag recommended training types

4. COHORT FORMATION
   ↓ Group by location and tier
   ↓ Apply size constraints
   ↓ Sort by priority

5. SCHEDULE GENERATION
   ↓ Apply day-specific filtering
   ↓ Implement site alternation
   ↓ Avoid peak hours

6. VALIDATION & OUTPUT
   ↓ Check for conflicts
   ↓ Generate warnings
   ↓ Export schedules
```

### Algorithm Complexity

- **Time Complexity**: O(n log n) where n = number of agents
- **Space Complexity**: O(n) for storing agent records and cohorts
- **Optimization**: Pre-sorted cohorts reduce scheduling iterations

---

## Business Impact

### Quantifiable Benefits

1. **Operational Efficiency**

   - 95%+ agent availability maintained during peak hours
   - Zero simultaneous site outages
   - Predictable staffing levels

2. **Training Effectiveness**

   - Targeted interventions based on specific weaknesses
   - Peer learning through optimal cohort sizes
   - Immediate attention for critical cases (0 CAP)

3. **Performance Improvement**
   - Bottom 20% prioritized for Week 1 training
   - Metric-specific improvements tracked week-over-week
   - Reduced time-to-competency for underperformers

### Risk Mitigation

- **Service Level Protection**: Peak hours remain fully staffed
- **Site Redundancy**: One location always at full capacity
- **Flexible Scheduling**: Accommodates varying training needs

---

## Future Enhancements

### Phase 2 Features

1. **Predictive Analytics**

   - ML models to predict training effectiveness
   - Optimal training duration recommendations
   - Performance trajectory forecasting

2. **Dynamic Scheduling**

   - Real-time call volume integration
   - Automatic rescheduling based on absence
   - Skills-based routing consideration

3. **Enhanced Metrics**
   - Customer satisfaction correlation
   - Training ROI calculations
   - Certification tracking integration

### Technical Roadmap

```
Q1 2025: Database integration for historical tracking
Q2 2025: API development for real-time updates
Q3 2025: Machine learning model implementation
Q4 2025: Mobile app for manager access
```

---

## Conclusion

The CAP Training Schedule System represents a significant advancement in workforce optimization for life insurance call centers. By combining data-driven agent selection, intelligent scheduling algorithms, and operational safeguards, the system enables continuous performance improvement without compromising service levels.

Key success factors:

- **Data-Driven Decisions**: Every scheduling decision backed by metrics
- **Operational Balance**: Training needs balanced with business requirements
- **Scalable Architecture**: Handles multiple sites with timezone awareness
- **Measurable Impact**: Clear KPIs for tracking improvement

The system transforms training from a disruptive necessity into a strategic advantage, ensuring that performance improvement and operational excellence work in harmony.

---

## Appendix A: Technical Specifications

### Input File Format (TSV)

```
Column 0:  Tenure (years)
Column 1:  Tier (P/S)
Column 2:  Site (CHA/AUS)
Column 3:  Manager Name
Column 8:  Agent Name
Column 9:  CAP Score
Column 11: Close Rate (%)
Column 12: Annual Premium ($)
Column 13: Place Rate (%)
```

### Technology Stack

- Frontend: Next.js 14+ with TypeScript
- UI Framework: Tailwind CSS
- Data Processing: Papa Parse
- Export: jsPDF, CSV generation
- State Management: React hooks
- Deployment: Vercel/Netlify compatible

### System Requirements

- Modern web browser (Chrome, Firefox, Safari, Edge)
- JavaScript enabled
- Minimum 4GB RAM for optimal performance
- Network connectivity for web app access

---

_Document Version: 1.0_  
_Last Updated: January 2025_  
_System Design: CAP Schedule Development Team_
