import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/database';

export const storiesRouter = Router();

storiesRouter.get('/', (_req, res) => {
  const db = getDb();
  const stories = db.prepare('SELECT * FROM stories ORDER BY created_at DESC').all();
  res.json({ stories });
});

storiesRouter.post('/', (req, res) => {
  const db = getDb();
  const id = uuidv4();
  const now = new Date().toISOString();
  const data = req.body;

  db.prepare(
    `INSERT INTO stories (id, title, situation, conflict, outcome, lesson, raw_excerpt, session_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    data.title || 'Untitled Story',
    data.situation || null,
    data.conflict || null,
    data.outcome || null,
    data.lesson || null,
    data.rawExcerpt || null,
    data.sessionId || null,
    now,
    now
  );

  const story = db.prepare('SELECT * FROM stories WHERE id = ?').get(id);
  res.status(201).json({ story });
});

storiesRouter.get('/:id', (req, res) => {
  const db = getDb();
  const story = db.prepare('SELECT * FROM stories WHERE id = ?').get(req.params.id);
  if (!story) return res.status(404).json({ error: 'Not found' });
  res.json({ story });
});

storiesRouter.patch('/:id', (req, res) => {
  const db = getDb();
  const data = req.body;
  const updates: string[] = ['updated_at = ?'];
  const values: any[] = [new Date().toISOString()];

  const fields = ['title', 'situation', 'conflict', 'stakes', 'turning_point', 'outcome', 'lesson', 'tone'];
  for (const field of fields) {
    if (data[field] !== undefined) {
      updates.push(`${field} = ?`);
      values.push(data[field]);
    }
  }

  db.prepare(`UPDATE stories SET ${updates.join(', ')} WHERE id = ?`).run(...values, req.params.id);

  const story = db.prepare('SELECT * FROM stories WHERE id = ?').get(req.params.id);
  res.json({ story });
});

storiesRouter.delete('/:id', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM stories WHERE id = ?').run(req.params.id);
  res.json({ deleted: true });
});
