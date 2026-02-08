# SmartTrack App

SmartTrack is a wellness and recovery assistant that brings activity tracking, nutrition insights, and progress reporting into a single, user-friendly experience. It is designed for students, employees, and anyone who wants a clear, actionable view of their health data.

## Screenshots
Place screenshots in `assets/screenshots/` and reference them below. Recommended size: 1200px wide, PNG.

![Landing Page](assets/screenshots/landing.png)
![Dashboard](assets/screenshots/dashboard.png)
![Report](assets/screenshots/report.png)

## Features
- Personalized recovery dashboard with daily metrics
- Nutrition and activity summaries based on simulated or connected data
- PDF report generation for progress tracking
- Authentication flow with a clean onboarding experience

## Tech Stack
- React
- TypeScript
- Vite
- Tailwind CSS
- FastAPI

## Getting Started
### Prerequisites
- Node.js 18+ (recommended)
- Python 3.10+

### Install
```bash
npm install
pip install -r requirements.txt
```

### Run (Frontend)
```bash
npm run dev
```

### Run (Backend)
```bash
uvicorn main:app --reload
```

### Build
```bash
npm run build
```

## Project Structure
- `src/` app source
- `public/` static assets
- `assets/screenshots/` screenshots used in README
- `scripts/` data generation utilities

## Notes
- If you add new screenshots, keep filenames short and update the `Screenshots` section above.
- If you change API routes, update `openai_service.py` and any client calls in `src/`.
