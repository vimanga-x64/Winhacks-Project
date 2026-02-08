# FitTrack App

FitTrack is a wellness and recovery assistant that brings activity tracking, nutrition insights, and progress reporting into a single, user-friendly experience. It is designed for students, employees, and anyone who wants a clear, actionable view of their health data.

## Rocket ISMs
**1. Growth**
The app is basically obsessed with finding those tiny, marginal gains that actually make a difference. Instead of just checking your weight, it gives you a massive amount of detail on what’s happening inside your body, with data collected via your phone and smartwatch. It helps you catch things you’d normally miss. It’s all about moving away from guessing  and using actual real data to improve your routine.

**2. Adaptability**
The system pivots based on your actual recovery state. If your heart rate variability is low or your stress is spiking, it doesn’t just push you through a pre-set plan. It will analyze the real data and create personalized advice toned in to the user's mindset. It’s constantly adjusting its logic to fit your specific physiological needs in the moment, making sure the plan is actually sustainable and tailored to how you’re feeling that day.

**3. Collaboration**
The AI Coach functions more like a partner than just a tool. It takes all the scattered data from Google Fit, nutrition logs, and self reports and stitches them together into a cohesive "Daily Analysis." By focusing on the most effective choices for your current state, like suggesting a rest day when your body is taxed, it creates the environment where you and the AI work together to navigate your health goals.

**4. Execution**
This platform is great at stripping away the complexity so you can actually get things done. It takes complicated biological markers and turns them into intuitive visuals. By distilling a ton of data into a straightforward guided plan, it removes the friction so you can spend less time analyzing charts and more time actually hitting your targets.

## Snapshots

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

