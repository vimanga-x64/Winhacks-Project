# FitTrack App

FitTrack is a wellness and recovery assistant that brings activity tracking, nutrition insights, and progress reporting into a single, user-friendly experience. It is designed for students, employees, and anyone who wants a clear, actionable view of their health data.

## Screenshots

<img width="1919" height="938" alt="image" src="https://github.com/user-attachments/assets/2aaff91a-5181-4481-b556-b7ba06aae95a" />

<img width="1901" height="748" alt="image" src="https://github.com/user-attachments/assets/1dcd57a7-b513-4226-88ae-d6c85cd28581" />

<img width="1903" height="939" alt="image" src="https://github.com/user-attachments/assets/3cf018b5-d7c3-4892-a886-df4a4aef1c24" />

<img width="1907" height="740" alt="image" src="https://github.com/user-attachments/assets/a97a17e6-8df4-4ce8-bfa9-e119fed9f7ac" />

<img width="1902" height="888" alt="image" src="https://github.com/user-attachments/assets/58b32231-4246-4309-be5f-e3853e14ff96" />

<img width="1442" height="694" alt="image" src="https://github.com/user-attachments/assets/1265509a-ddc0-48d5-8eab-3b382871c5a8" />

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
