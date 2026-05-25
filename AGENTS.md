# AGENTS.md

## Projekt

Acorn ist eine private photo-first Kalorienzaehler-PWA fuer schnelles Logging auf einem Samsung S23. Stack: React, Vite, TypeScript, Firebase Auth/Firestore/Storage/Hosting und Firebase Functions als Gemini-Proxy.

## Arbeiten im Repo

- Frontend-Code liegt in `src/`, geteilte Modelle/Logik in `shared/`, Functions in `functions/src/`.
- Bestehende UI- und Datenmuster beibehalten; keine grossen Refactors ohne klaren Auftrag.
- Bei UI-Arbeit Wert auf cleanes, hochwertiges Interface nach Best Practices legen: klare Hierarchie, gute Abstaende, konsistente Komponenten und kein unnoetiger Text.
- Secrets nie ins Repo schreiben. Lokale Gemini-Secrets gehoeren in `functions/.secret.local`.
- Lokale Entwicklung nutzt standardmaessig Firebase Emulatoren.

## Wichtige Befehle

- `npm run dev:full` startet Vite und Firebase Emulatoren.
- `npm run build` baut das Frontend.
- `npm run build:all` baut Frontend und Functions.
- `npm test` fuehrt Vitest aus.
- `npm run test:e2e` baut und startet Playwright mit S23-Profil.
- `npm --prefix functions run build` baut nur die Functions.

## Qualitaet

- Vor groesseren Aenderungen mindestens `npm test` oder den passend kleineren Test laufen lassen.
- Bei UI-Aenderungen mobile Darstellung mitdenken, besonders `360 x 780`.
- UI soll ruhig, direkt und benutzbar sein: keine erklaerenden Textbloecke, keine Deko ohne Zweck, keine ueberladenen Screens.
- Firestore-/Storage-Regeln und Functions getrennt pruefen, wenn sie betroffen sind.
