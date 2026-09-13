import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { sessionRouter } from './routes/session';
import { profileRouter } from './routes/profile';
import { storiesRouter } from './routes/stories';
import { getDb } from './db/database';

const app = express();
const PORT = process.env.PORT ?? 3001;

// Initialize DB
getDb();

app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:5174'], credentials: true }));
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.use('/api/sessions', sessionRouter);
app.use('/api/profile', profileRouter);
app.use('/api/stories', storiesRouter);

app.listen(PORT, () => {
  console.log(`\n🎙️  Communication Coach API running on http://localhost:${PORT}`);
  console.log(`   Gemini API: ${process.env.GEMINI_API_KEY ? '✅ configured' : '❌ missing GEMINI_API_KEY'}`);
});
