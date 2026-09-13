import { Router } from 'express';
import { getDb } from '../db/database';

export const profileRouter = Router();

profileRouter.get('/', (_req, res) => {
  const db = getDb();
  const profile = db.prepare('SELECT * FROM user_profile WHERE id = 1').get() as any;

  if (profile) {
    profile.strengths = JSON.parse(profile.strengths_json || '[]');
    profile.weaknesses = JSON.parse(profile.weaknesses_json || '[]');
    profile.tendencies = JSON.parse(profile.tendencies_json || '[]');
    delete profile.strengths_json;
    delete profile.weaknesses_json;
    delete profile.tendencies_json;
  }

  res.json({ profile: profile || { strengths: [], weaknesses: [], tendencies: [], learningStage: 1, totalSessions: 0, totalMinutes: 0 } });
});

profileRouter.patch('/', (req, res) => {
  const db = getDb();
  const data = req.body;

  const updates: string[] = [];
  const values: any[] = [];

  if (data.learning_stage !== undefined) {
    updates.push('learning_stage = ?');
    values.push(data.learning_stage);
  }
  if (data.strengths) {
    updates.push('strengths_json = ?');
    values.push(JSON.stringify(data.strengths));
  }
  if (data.weaknesses) {
    updates.push('weaknesses_json = ?');
    values.push(JSON.stringify(data.weaknesses));
  }
  if (data.tendencies) {
    updates.push('tendencies_json = ?');
    values.push(JSON.stringify(data.tendencies));
  }

  if (updates.length > 0) {
    db.prepare(`UPDATE user_profile SET ${updates.join(', ')} WHERE id = 1`).run(...values);
  }

  res.json({ success: true });
});

profileRouter.delete('/data', (_req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM coaching_events').run();
  db.prepare('DELETE FROM transcript_chunks').run();
  db.prepare('DELETE FROM session_reports').run();
  db.prepare('DELETE FROM sessions').run();
  db.prepare('DELETE FROM stories').run();
  db.prepare(
    `UPDATE user_profile SET
      total_sessions = 0,
      total_minutes = 0,
      learning_stage = 1,
      strengths_json = '[]',
      weaknesses_json = '[]',
      tendencies_json = '[]'
    WHERE id = 1`
  ).run();
  res.json({ deleted: true });
});
