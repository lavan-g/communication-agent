# Voxa

> **Your voice, elevated.** — AI-powered communication, storytelling & public speaking coach.

Voxa is a real-time coaching application that listens as you speak, gives live nudges via Gemini 2.0 Flash, and generates a detailed post-session report to help you improve over time.

---

## What Voxa does

- 🎙️ **Live session coaching** — speaks back to you with micro-interventions as you talk (filler words, rambling, weak structure, storytelling gaps)
- 📊 **Post-session reports** — full breakdown of clarity, structure, storytelling, engagement, conciseness, and confidence
- 📖 **Story Bank** — catalogue your best personal stories with structured fields so you can deploy them in any conversation
- 🧠 **Learning Stages 1–8** — Voxa adapts what it coaches you on based on where you are in your journey
- 👤 **Profile tracking** — your strengths, weaknesses, and tendencies are tracked across sessions

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vite + React 18 + TypeScript + Tailwind CSS v4 |
| State | Zustand |
| Backend | Express + TypeScript + SQLite (better-sqlite3) |
| AI | Gemini 2.0 Flash (`@google/genai`) |
| Realtime | Web Speech API + Server-Sent Events |

---

## Run locally

```bash
cd communication-agent
npm install
npm run dev
```

- **Frontend:** http://localhost:5173
- **API:** http://localhost:3001
- **Health:** http://localhost:3001/health

---

## Project structure

```
communication-agent/
├── packages/types/          # Shared TypeScript types & enums
├── apps/api/                # Express backend
│   ├── src/db/              # SQLite schema
│   ├── src/services/        # Gemini, context engine, coaching decider, SSE
│   └── src/routes/          # session, profile, stories
└── apps/web/                # React frontend
    ├── src/hooks/           # useCoachingSession, useSpeechRecognition, useSSE
    ├── src/pages/           # Dashboard, Session, Report, Profile, Stories
    └── src/components/      # CoachingOverlay, TranscriptFeed, Sidebar
```
