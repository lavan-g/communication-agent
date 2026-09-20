import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/database';
import { contextEngine } from '../services/context-engine.service';
import { coachingDecider } from '../services/coaching-decider.service';
import { geminiService } from '../services/gemini.service';
import { sseManager } from '../services/sse.service';
import type { CoachingEvent, TranscriptChunk, SessionMode } from '@communication-agent/types';
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

// GET /api/sessions — list recent sessions
sessionRouter.get('/', (_req, res) => {
  const db = getDb();
  const sessions = db.prepare('SELECT * FROM sessions ORDER BY started_at DESC LIMIT 20').all();
  res.json({ sessions });
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
  const chunk = req.body as TranscriptChunk;
  const db = getDb();

  // Ensure chunk has required fields
  const chunkId = chunk.id || uuidv4();
  const chunkTimestamp = chunk.timestamp || new Date().toISOString();

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

    // Gemini AI analysis
    const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId) as any;
    const userProfile = db.prepare('SELECT * FROM user_profile WHERE id = 1').get() as any;

    const aiEvents = await geminiService.analyzeTranscript({
      transcript: chunk.text,
      transcriptWindow: contextAnalysis.transcriptWindowText,
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

  db.prepare('UPDATE user_profile SET total_sessions = total_sessions + 1 WHERE id = 1').run();

  // Clean up in-memory state
  contextEngine.destroySession(sessionId);
  coachingDecider.destroySession(sessionId);

  res.json({ report });
});

// GET /api/sessions/:id/report — fetch stored post-session report + transcript + session meta
sessionRouter.get('/:id/report', (req, res) => {
  const db = getDb();
  const row = db.prepare('SELECT * FROM session_reports WHERE session_id = ?').get(req.params.id) as any;
  if (!row) return res.status(404).json({ error: 'Report not found' });

  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(req.params.id);
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
