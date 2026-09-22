# Nuvora

Nuvora is a privacy-first, non-diagnostic academic workload and microlearning support application for neurodivergent students. It turns a short daily check-in into a transparent workload-pressure band and adjusts the suggested next step without shame or punitive streaks.

## Included

- Responsive mobile-first React/Next.js interface based on the approved prototype
- Firebase email/password authentication and per-user Firestore storage
- Fully usable local demo mode when Firebase variables are absent
- Tasks, deadlines, automatic micro-step creation and completion
- Five-question daily check-in and explainable, client-side rule-based scoring
- Low, Moderate and Higher workload-pressure support
- Overwhelmed Mode, calm mode, reduced motion and adjustable text size
- Microlearning resets, progress trends and user-controlled support summary
- Firestore ownership rules, validation and unit tests

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. With no `.env.local`, the app runs immediately in private browser-local demo mode. To use the real backend, create a Firebase project, enable Email/Password Authentication and Firestore, copy `.env.example` to `.env.local`, add the Firebase web configuration values, and deploy `firestore.rules`.

## Scoring model

`score = workload feeling × 30% + task initiation difficulty × 25% + focus difficulty × 20% + low rest × 15% + low confidence × 10%`

- 0–33: Low
- 34–66: Moderate
- 67–100: Higher

This is academic-support information only. It is not a medical score, diagnosis or emergency assessment.

## Evidence and ethics boundary

The software can be developed and tested with synthetic/demo data. Do not collect participant data or conduct usability interviews/surveys until formal ethics approval is confirmed. If a survey is later approved, use the university-required Jisc route.
