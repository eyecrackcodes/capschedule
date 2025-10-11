# CAP Training Schedule Generator

An intelligent web application for generating optimized training schedules for underperforming life insurance agents based on CAP (Combined Agent Performance) metrics.

## Overview

This application helps call center managers efficiently schedule training for agents who need performance improvement, while minimizing operational disruption during peak call volume times.

## Features

### 📊 Data Analysis
- Upload CSV/TSV files with agent performance data
- Automatic calculation of company-wide average CAP scores
- 50th percentile benchmarking for Close Rate, Annual Premium, and Place Rate
- Intelligent filtering of agents needing training

### 🗓️ Smart Scheduling
- **Location-aware scheduling**: Separate handling for Charlotte (CLT) and Austin (ATX) locations
- **Time zone support**: CLT operates 9-6 EST, ATX operates 8-5 CST
- **Peak hour avoidance**: No training during lunch (12-1 PM) or high-volume periods
- **Site alternation**: Ensures both locations aren't training simultaneously
- **Cohort management**: 2-5 agents per training class for optimal learning

### 📚 Targeted Training
- **Monday/Friday**: Zero CAP Score remediation for critical cases
- **Tuesday**: Close Rate training for agents below 50th percentile
- **Wednesday**: Annual Premium training for underperformers
- **Thursday**: Place Rate training for agents needing improvement

### 🎯 Key Business Rules
- Agents with tenure ≤ 1.9 years are excluded from all calculations
- Zero CAP score agents excluded from average calculations but prioritized for training
- Maximum 5 agents off phones per location per hour
- 95% agent availability maintained during peak hours

### 📱 UI Features
- Interactive dashboard with real-time statistics
- Multiple schedule views (Calendar, Location Separation, Manager View)
- Visual warnings for cohorts below minimum size
- Export capabilities (PDF, CSV, Email-ready format)
- Responsive design for mobile and desktop

## Technical Stack

- **Frontend**: Next.js 14+ with TypeScript
- **Styling**: Tailwind CSS
- **Components**: Custom UI components with Radix UI primitives
- **Data Processing**: Papa Parse for CSV/TSV parsing
- **Export**: jsPDF for PDF generation

## Installation

1. Clone the repository:
```bash
git clone https://github.com/eyecrackcodes/capschedule.git
cd capschedule
```

2. Install dependencies:
```bash
npm install
# or
pnpm install
```

3. Run the development server:
```bash
npm run dev
# or
pnpm dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

1. **Upload Data**: Drag and drop or select your CAP performance CSV/TSV file
2. **Review Analysis**: Check the dashboard for agent statistics and training needs
3. **Generate Schedule**: The system automatically creates an optimized training schedule
4. **Export Results**: Download the schedule as PDF or CSV, or copy for email

## File Format

The application expects a TSV (Tab-Separated Values) file with the following columns:
- Column 0: Tenure
- Column 1: Tier (P/S)
- Column 2: Site (CHA/AUS)
- Column 3: Manager
- Column 8: Agent Name
- Column 9: CAP Score
- Column 11: Close Rate (%)
- Column 12: Annual Premium ($)
- Column 13: Place Rate (%)

## Development

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is proprietary software. All rights reserved.

## Support

For questions or issues, please open an issue on GitHub or contact the development team.
