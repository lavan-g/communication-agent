# Communication Agent

> **A Real-Time AI Communication, Storytelling & Public Speaking Coach**

Built with Gemini 2.0 Flash multimodal intelligence. The goal isn't to generate better text for you — it's to make **you** a dramatically better communicator.

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure API key
cp apps/api/.env.example apps/api/.env
# Edit apps/api/.env and add your GEMINI_API_KEY

# 3. Start both servers
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

---

## Architecture

```
communication-agent/
├── apps/
│   ├── web/      # Vite + React 18 + TypeScript + Tailwind CSS
│   └── api/      # Express + TypeScript + SQLite + Gemini
└── packages/
    └── types/    # Shared TypeScript types
```

## Phase 1 — MVP Features

- ✅ Live microphone capture + real-time transcription
- ✅ Camera feed (for presence awareness)
- ✅ Gemini-powered communication analysis
- ✅ 4-level intervention hierarchy (no constant interruption)
- ✅ Live coaching overlay (low distraction)
- ✅ Post-session reports
- ✅ Communication profile
- ✅ Story Bank (scaffold for Phase 3)

## Privacy

- Audio is transcribed locally via Web Speech API — no audio recorded to disk
- Transcripts stored locally in SQLite on your machine
- Gemini receives text only (not raw audio/video)
- Full data deletion available from the Profile page
