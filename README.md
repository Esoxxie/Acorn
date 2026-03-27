# Acorn

Acorn is a photo-first calorie counting PWA built for fast logging on a Samsung S23. It uses Firebase for auth, data, storage, and deployment, plus a Firebase Function proxy to Gemini for meal estimation.

## What is included

- React + Vite + TypeScript web app with PWA install support
- Google sign-in for production and demo sign-in for emulator work
- Photo logging with optional typed or spoken context
- Manual quick add with AI parsing plus reusable saved foods
- Library/history with thumbnails, favorites, filters, and relogging
- Profile-based TDEE estimation using Mifflin-St Jeor
- Firebase Hosting, Firestore, Storage, Functions, and Emulator Suite config
- Galaxy S23 Playwright profile for browser emulation

## Local development

1. Install dependencies:
   - `npm install`
   - `npm --prefix functions install`
2. Add your local Gemini secret in `functions/.secret.local` using `functions/.secret.local.example` as the shape.
3. Run the app and Firebase emulators together:
   - `npm run dev:full`
4. Open the Vite URL on desktop or on your S23 over the same network.

The frontend defaults to emulator mode in local development and automatically uses the current host name for emulator connections, which makes LAN testing from the S23 easier.

## Browser and S23 testing

- Desktop S23 emulation:
  - `npm run test:e2e`
- Unit tests:
  - `npm test`
- Browser preview:
  - `npm run preview`

The Playwright project uses a Galaxy S23-like mobile profile: `360 x 780`, `deviceScaleFactor 3`, touch enabled, and an Android Chrome user agent.

## Firebase setup for real deployment

1. Create or choose a Firebase project.
2. Enable:
   - Google Authentication
   - Firestore
   - Cloud Storage
   - Cloud Functions
3. Replace the demo values in `.firebaserc` and add real web app env vars from `.env.example`.
4. Set the Gemini secret:
   - `firebase functions:secrets:set GEMINI_API_KEY`
5. Optional function params:
   - `GEMINI_MODEL` defaults to `gemini-2.5-flash`
   - `MAX_DAILY_AI_CALLS` defaults to `30`
6. Deploy:
   - `npm run deploy`

## Notes

- The app stores only compressed display and thumbnail images, never the original upload.
- The Gemini key is meant to stay server-side only.
- `src/test/firestore.rules.test.ts` is wired for emulator-backed rules testing and runs when `RUN_FIREBASE_EMULATOR_TESTS=true`.
