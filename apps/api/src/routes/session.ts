import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/database';
import { contextEngine } from '../services/context-engine.service';
import { coachingDecider } from '../services/coaching-decider.service';
import { geminiService } from '../services/gemini.service';
import { sseManager } from '../services/sse.service';
import type { CoachingEvent, TranscriptChunk, SessionMode, AnalyzeChunkPayload } from '@communication-agent/types';
import { CoachingCategory, InterventionLevel } from '@communication-agent/types';

export const sessionRouter = Router();

// POST /api/sessions — create a new session
sessionRouter.post('/', (req, res) => {
  const db = getDb();
  const id = uuidv4();
  const { mode = 'conversation', title = 'New Session', context = {} } = req.body;

  db.prepare(
    `INSERT INTO sessions (id, mode, title, context_json, started_at)
     VALUES (?, ?, ?, ?, ?)`
  ).run(id, mode, title, JSON.stringify(context), new Date().toISOString());

  contextEngine.createSession(id);
  coachingDecider.createSession(id);

  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(id);
  res.status(201).json({ session });
});

// GET /api/sessions — list recent sessions with report snippet
sessionRouter.get('/', (_req, res) => {
  const db = getDb();
  const sessions = db.prepare('SELECT * FROM sessions ORDER BY started_at DESC LIMIT 20').all() as any[];

  // Mode → readable label (matches frontend MODE_LABEL map)
  const modeLabel: Record<string, string> = {
    conversation: 'Conversation',
    presentation: 'Presentation',
    practice: 'Free Speech',
  };

  // Generate a meaningful title from started_at for legacy sessions
  function autoTitle(session: any): string {
    const date = new Date(session.started_at);
    const hour = date.getHours();
    const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
    const day = date.toLocaleDateString('en-US', { weekday: 'long' });
    const label = modeLabel[session.mode] ?? 'Session';
    return `${label} — ${day} ${timeOfDay}`;
  }

  // Attach a lightweight report snippet to each session that has one
  const enriched = sessions.map((s: any) => {
    // Fix legacy 'New Session' / null titles — generate and persist a better one
    if (!s.title || s.title === 'New Session') {
      const generated = autoTitle(s);
      try {
        db.prepare("UPDATE sessions SET title = ? WHERE id = ? AND (title IS NULL OR title = 'New Session')")
          .run(generated, s.id);
      } catch { /* best-effort */ }
      s = { ...s, title: generated };
    }

    const reportRow = db.prepare(
      'SELECT report_json FROM session_reports WHERE session_id = ?'
    ).get(s.id) as any;

    let reportSnippet = null;
    if (reportRow) {
      try {
        const r = JSON.parse(reportRow.report_json);
        reportSnippet = {
          oneLesson: r.oneLesson ?? null,
          scores: r.scores ?? null,
          wellDone: r.wellDone?.[0] ?? null,
        };
      } catch { /* ignore parse errors */ }
    }

    return { ...s, reportSnippet };
  });

  res.json({ sessions: enriched });
});

// GET /api/sessions/:id — get session detail
sessionRouter.get('/:id', (req, res) => {
  const db = getDb();
  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(req.params.id);
  if (!session) return res.status(404).json({ error: 'Not found' });

  const eventCount = db.prepare('SELECT COUNT(*) as count FROM coaching_events WHERE session_id = ?').get(req.params.id) as any;
  res.json({ session: { ...session as object, coachingEventsCount: eventCount.count } });
});

// GET /api/sessions/:id/stream — SSE coaching event stream
sessionRouter.get('/:id/stream', (req, res) => {
  const sessionId = req.params.id;
  sseManager.addClient(sessionId, res);

  const interval = setInterval(() => {
    sseManager.sendHeartbeat(sessionId);
  }, 15000);

  req.on('close', () => {
    clearInterval(interval);
    sseManager.removeClient(sessionId, res);
  });
});

// POST /api/sessions/:id/analyze — receive transcript chunk and trigger analysis
sessionRouter.post('/:id/analyze', async (req, res) => {
  const sessionId = req.params.id;
  const payload = req.body as AnalyzeChunkPayload;
  const db = getDb();

  // Build a TranscriptChunk from the payload for DB storage and context engine
  const chunkId = uuidv4();
  const chunkTimestamp = new Date().toISOString();
  const chunk: TranscriptChunk = {
    id: chunkId,
    sessionId,
    text: payload.text,
    isFinal: payload.isFinal,
    speaker: 'user',
    timestamp: chunkTimestamp,
  };

  try {
    db.prepare(
      `INSERT OR IGNORE INTO transcript_chunks (id, session_id, text, is_final, speaker, timestamp)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(chunkId, sessionId, chunk.text, chunk.isFinal ? 1 : 0, chunk.speaker || 'user', chunkTimestamp);
  } catch (err) {
    console.warn('Transcript insert warning:', err);
  }

  let contextAnalysis;
  try {
    contextAnalysis = contextEngine.processChunk(sessionId, { ...chunk, id: chunkId, timestamp: chunkTimestamp });
  } catch {
    // Session may not exist in context engine (e.g. server restart) — re-create it
    contextEngine.createSession(sessionId);
    coachingDecider.createSession(sessionId);
    contextAnalysis = contextEngine.processChunk(sessionId, { ...chunk, id: chunkId, timestamp: chunkTimestamp });
  }

  // Fetch profile once — used by both analysis and story detection
  const userProfile = db.prepare('SELECT * FROM user_profile WHERE id = 1').get() as any;

  let allEvents: CoachingEvent[] = [];

  if (contextAnalysis.shouldTriggerAnalysis) {
    // Local filler word detection (fast, no AI needed)
    if (contextAnalysis.fillerWordsDetected.length > 0) {
      const fillerList = contextAnalysis.fillerWordsDetected.slice(0, 3).join(', ');
      allEvents.push({
        id: uuidv4(),
        sessionId,
        level: InterventionLevel.Passive,
        category: CoachingCategory.FillerWords,
        message: `Filler ${contextAnalysis.fillerWordsDetected.length > 1 ? 'words' : 'word'}: "${fillerList}"`,
        principle: 'A deliberate pause is more powerful than a filler word. Silence signals confidence.',
        triggerText: chunk.text,
        timestamp: new Date().toISOString(),
      });
    }

    // Rambling detection
    if (contextAnalysis.isRambling) {
      allEvents.push({
        id: uuidv4(),
        sessionId,
        level: InterventionLevel.Gentle,
        category: CoachingCategory.Rambling,
        message: "You've been speaking for a while — what's the point?",
        principle: 'Every speech needs a clear destination. State it, then support it.',
        timestamp: new Date().toISOString(),
      });
    }

    // Gemini AI analysis — backend context engine window takes priority;
    // fall back to frontend's transcriptWindow when engine window is empty
    // (e.g. first chunk, or after server restart recovery)
    const frontendWindowText = (payload.transcriptWindow ?? [])
      .map((c) => c.text)
      .join(' ');
    const effectiveWindow = contextAnalysis.transcriptWindowText || frontendWindowText;

    const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId) as any;

    const aiEvents = await geminiService.analyzeTranscript({
      transcript: chunk.text,
      transcriptWindow: effectiveWindow,
      sessionMode: (session?.mode || 'conversation') as SessionMode,
      userProfile: userProfile,
      learningStage: (userProfile?.learning_stage || 1) as any,
      cooldownActive: coachingDecider.isCooldownActive(sessionId),
      sessionId,
    });

    allEvents = [...allEvents, ...aiEvents];

    // Select the single highest-value event
    const topEvent = coachingDecider.prioritizeEvents(allEvents);

    if (topEvent && coachingDecider.shouldSurface(sessionId, topEvent)) {
      try {
        db.prepare(
          `INSERT INTO coaching_events (id, session_id, level, category, message, principle, trigger_text, suggested_version, timestamp)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(
          topEvent.id,
          sessionId,
          topEvent.level,
          topEvent.category,
          topEvent.message,
          topEvent.principle,
          topEvent.triggerText || null,
          topEvent.suggestedVersion || null,
          topEvent.timestamp,
        );
      } catch (err) {
        console.warn('Coaching event insert warning:', err);
      }

      sseManager.sendEvent(sessionId, 'coaching', topEvent);
      coachingDecider.recordIntervention(sessionId, topEvent.level);
    }
  }

  // ── Story opportunity detection ────────────────────────────────────────────
  // Only run for Stage 5+ users (storytelling coaching becomes active there).
  // Fire-and-forget: runs in parallel, never blocks the response.
  const storyDetectionAllowed = (userProfile?.learning_stage ?? 1) >= 5;
  if (storyDetectionAllowed && chunk.text.length > 40) {
    geminiService.detectStoryOpportunity(chunk.text).then((result) => {
      if (!result.detected || !result.prompt) return;

      // Save detected story opportunity to the stories table
      const storyId = uuidv4();
      const now = new Date().toISOString();
      try {
        db.prepare(
          `INSERT INTO stories (id, title, raw_excerpt, session_id, topics_json, audience_types_json,
           usable_situations_json, memorable_lines_json, alternative_openings_json, alternative_endings_json,
           created_at, updated_at)
           VALUES (?, ?, ?, ?, '[]', '[]', '[]', '[]', '[]', '[]', ?, ?)`
        ).run(
          storyId,
          `Detected story — ${new Date().toLocaleDateString()}`,
          chunk.text,
          sessionId,
          now,
          now,
        );
      } catch (err) {
        console.warn('Story insert warning:', err);
      }

      // Push a Gentle coaching event so user sees it in the overlay
      const storyEvent: CoachingEvent = {
        id: uuidv4(),
        sessionId,
        level: InterventionLevel.Gentle,
        category: CoachingCategory.Storytelling,
        message: result.prompt,
        principle: 'Stories are remembered 22× longer than facts. Give us the narrative.',
        triggerText: chunk.text,
        timestamp: now,
      };

      // Save event to DB + surface via SSE
      try {
        db.prepare(
          `INSERT INTO coaching_events (id, session_id, level, category, message, principle, trigger_text, suggested_version, timestamp)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(
          storyEvent.id, sessionId, storyEvent.level, storyEvent.category,
          storyEvent.message, storyEvent.principle, storyEvent.triggerText ?? null, null, now,
        );
      } catch { /* ignore duplicate inserts */ }

      sseManager.sendEvent(sessionId, 'coaching', storyEvent);
    }).catch((err) => console.warn('Story detection error:', err));
  }

  // Always echo transcript chunk via SSE for live display
  sseManager.sendEvent(sessionId, 'transcript', { ...chunk, id: chunkId });

  res.json({ received: true, queued: contextAnalysis.shouldTriggerAnalysis });
});

// POST /api/sessions/:id/end — end session and generate report
sessionRouter.post('/:id/end', async (req, res) => {
  const sessionId = req.params.id;
  const db = getDb();

  const endedAt = new Date().toISOString();
  db.prepare('UPDATE sessions SET ended_at = ? WHERE id = ?').run(endedAt, sessionId);

  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId) as any;
  const transcripts = db.prepare('SELECT * FROM transcript_chunks WHERE session_id = ? ORDER BY timestamp ASC').all(sessionId) as any[];
  const events = db.prepare('SELECT * FROM coaching_events WHERE session_id = ? ORDER BY timestamp ASC').all(sessionId) as any[];
  const userProfile = db.prepare('SELECT * FROM user_profile WHERE id = 1').get() as any;

  // Compute word count and duration from transcript + timestamps
  const fullText = transcripts.map((c: any) => c.text).join(' ');
  const wordCount = fullText.trim() ? fullText.trim().split(/\s+/).length : 0;
  const startedAt = session?.started_at ? new Date(session.started_at).getTime() : 0;
  const endedAtMs = new Date(endedAt).getTime();
  const durationSeconds = startedAt ? Math.round((endedAtMs - startedAt) / 1000) : 0;

  db.prepare('UPDATE sessions SET word_count = ?, duration_seconds = ? WHERE id = ?').run(
    wordCount, durationSeconds, sessionId
  );

  // ── Silent session guard ──────────────────────────────────────────────────
  // If no transcript was captured, skip Gemini entirely — the frontend shows
  // a dedicated "Voxa didn't hear anything" screen for null reports.
  if (wordCount === 0) {
    console.log(`[session/${sessionId}] No transcript — skipping Gemini report generation.`);

    // Still update profile session count + timestamp (the user tried, that counts)
    const durationMinutes = Math.max(1, Math.round(durationSeconds / 60));
    db.prepare(`
      UPDATE user_profile SET
        total_sessions = total_sessions + 1,
        total_minutes  = total_minutes + ?,
        last_session_at = ?
      WHERE id = 1
    `).run(durationMinutes, endedAt);

    contextEngine.destroySession(sessionId);
    coachingDecider.destroySession(sessionId);

    // Return null report — frontend will show the silent session screen
    return res.json({ report: null, silent: true });
  }

  const report = await geminiService.generatePostSessionReport({
    session,
    transcript: transcripts,
    coachingEvents: events,
    userProfile,
  });

  db.prepare('INSERT OR REPLACE INTO session_reports (session_id, report_json, created_at) VALUES (?, ?, ?)').run(
    sessionId,
    JSON.stringify(report),
    new Date().toISOString(),
  );

  // Update user profile — increment sessions + minutes, record last session timestamp
  const durationMinutes = Math.max(1, Math.round(durationSeconds / 60)); // min 1 minute credit
  db.prepare(`
    UPDATE user_profile SET
      total_sessions = total_sessions + 1,
      total_minutes  = total_minutes + ?,
      last_session_at = ?
    WHERE id = 1
  `).run(durationMinutes, endedAt);

  // Clean up in-memory state
  contextEngine.destroySession(sessionId);
  coachingDecider.destroySession(sessionId);

  res.json({ report });
});

// GET /api/sessions/:id/report — fetch stored post-session report + transcript + session meta
sessionRouter.get('/:id/report', (req, res) => {
  const db = getDb();
  const row = db.prepare('SELECT * FROM session_reports WHERE session_id = ?').get(req.params.id) as any;

  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(req.params.id);

  // Silent session: no report was generated — return session metadata so the
  // frontend can render the "Voxa didn't hear anything" screen immediately
  // without burning through its retry loop.
  if (!row) {
    if (!session) return res.status(404).json({ error: 'Session not found' });
    return res.json({ report: null, session, transcripts: [], coachingEvents: [], silent: true });
  }

  const transcripts = db.prepare(
    'SELECT * FROM transcript_chunks WHERE session_id = ? ORDER BY timestamp ASC'
  ).all(req.params.id);
  const coachingEvents = db.prepare(
    'SELECT * FROM coaching_events WHERE session_id = ? ORDER BY timestamp ASC'
  ).all(req.params.id);

  res.json({
    report: JSON.parse(row.report_json),
    session,
    transcripts,
    coachingEvents,
  });
});
