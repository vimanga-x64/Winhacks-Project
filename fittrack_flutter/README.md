# FitTrack Flutter Mobile (Android)

This folder contains an Android-focused Flutter clone of the desktop web app experience.

## Included features

- Landing screen and onboarding flow with dark/red visual style
- Bio section, calorie strategy section, and 3-column tracker layout
- Summarize Day flow with backend-driven calorie estimates and recommendation text
- Recovery dashboard cards (rings, sleep, energy, nutrition, stress, AI tips)
- Local persistence for auth state, profile, and backend URL

## Prerequisites

- Flutter SDK (stable)
- Android Studio / Android SDK
- Python backend running from repository root:

```powershell
uvicorn main:app --reload
```

## Android run

```powershell
cd fittrack_flutter
flutter pub get
flutter run -d android
```

## Backend URL for Android

- Android emulator: `http://10.0.2.2:8000`
- Physical Android device: use your machine LAN IP, for example `http://192.168.1.10:8000`

You can edit and save this URL from the app Backend section.

## Build APK

```powershell
flutter build apk --debug
```

Output:

- `build/app/outputs/flutter-apk/app-debug.apk`
