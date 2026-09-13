import Database, { type Database as DatabaseType } from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const dbPath = process.env.DB_PATH || './data/coach.db';
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db: DatabaseType = new Database(dbPath);

db.exec(`
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  mode TEXT NOT NULL,
  title TEXT,
  context_json TEXT,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  word_count INTEGER DEFAULT 0,
  duration_seconds INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS transcript_chunks (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id),
  text TEXT NOT NULL,
  is_final INTEGER NOT NULL DEFAULT 1,
  speaker TEXT NOT NULL DEFAULT 'user',
  timestamp TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS coaching_events (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id),
  level INTEGER NOT NULL,
  category TEXT NOT NULL,
  message TEXT NOT NULL,
  principle TEXT NOT NULL,
  trigger_text TEXT,
  suggested_version TEXT,
  timestamp TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_profile (
  id INTEGER PRIMARY KEY DEFAULT 1,
  strengths_json TEXT NOT NULL DEFAULT '[]',
  weaknesses_json TEXT NOT NULL DEFAULT '[]',
  tendencies_json TEXT NOT NULL DEFAULT '[]',
  learning_stage INTEGER NOT NULL DEFAULT 1,
  total_sessions INTEGER NOT NULL DEFAULT 0,
  total_minutes INTEGER NOT NULL DEFAULT 0,
  last_session_at TEXT
);

CREATE TABLE IF NOT EXISTS stories (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  situation TEXT,
  characters TEXT,
  conflict TEXT,
  stakes TEXT,
  turning_point TEXT,
  outcome TEXT,
  lesson TEXT,
  tone TEXT,
  topics_json TEXT NOT NULL DEFAULT '[]',
  audience_types_json TEXT NOT NULL DEFAULT '[]',
  usable_situations_json TEXT NOT NULL DEFAULT '[]',
  memorable_lines_json TEXT NOT NULL DEFAULT '[]',
  alternative_openings_json TEXT NOT NULL DEFAULT '[]',
  alternative_endings_json TEXT NOT NULL DEFAULT '[]',
  raw_excerpt TEXT,
  session_id TEXT REFERENCES sessions(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS session_reports (
  session_id TEXT PRIMARY KEY REFERENCES sessions(id),
  report_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
`);

db.exec(`INSERT OR IGNORE INTO user_profile (id) VALUES (1);`);

export const getDb = (): DatabaseType => db;
