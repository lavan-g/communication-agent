import { TranscriptChunk } from '@communication-agent/types';

export interface SessionContextState {
  sessionId: string;
  transcriptWindow: TranscriptChunk[]; // rolling last 20 chunks
  fillerWordCounts: Record<string, number>;
  totalFillerWords: number;
  repeatedPhrases: Map<string, number>;
  wordCount: number;
  lastConcretePointAt: number; // timestamp ms
  consecutiveSentencesWithoutPoint: number;
  lastAnalysisAt: number;
}

export interface ContextAnalysis {
  fillerWordsDetected: string[];
  repetitionsDetected: string[];
  isRambling: boolean; // true if 60+ seconds with no clear point (estimated)
  shouldTriggerAnalysis: boolean; // true if sentence boundary + conditions met
  transcriptWindowText: string; // last 20 chunks joined
}

const FILLER_WORDS = [
  'um', 'uh', 'er', 'ah', 'like', 'you know', 'basically', 'literally',
  'actually', 'obviously', 'honestly', 'right', 'sort of', 'kind of',
  'i mean', 'so', 'anyway', 'well', 'okay so', 'and um', 'but um',
];

export class ContextEngine {
  private states = new Map<string, SessionContextState>();

  createSession(sessionId: string): void {
    this.states.set(sessionId, {
      sessionId,
      transcriptWindow: [],
      fillerWordCounts: {},
      totalFillerWords: 0,
      repeatedPhrases: new Map(),
      wordCount: 0,
      lastConcretePointAt: Date.now(),
      consecutiveSentencesWithoutPoint: 0,
      lastAnalysisAt: 0,
    });
  }

  destroySession(sessionId: string): void {
    this.states.delete(sessionId);
  }

  processChunk(sessionId: string, chunk: TranscriptChunk): ContextAnalysis {
    const state = this.states.get(sessionId);
    if (!state) throw new Error('Session not found in context engine');

    state.transcriptWindow.push(chunk);
    if (state.transcriptWindow.length > 20) {
      state.transcriptWindow.shift();
    }

    const words = chunk.text.trim().split(/\s+/).length;
    state.wordCount += words;
    
    // Simplistic filler word detection
    const fillerWordsDetected: string[] = [];
    const textLower = chunk.text.toLowerCase();
    FILLER_WORDS.forEach(fw => {
      if (textLower.includes(fw)) {
        state.fillerWordCounts[fw] = (state.fillerWordCounts[fw] || 0) + 1;
        state.totalFillerWords++;
        fillerWordsDetected.push(fw);
      }
    });

    const isSentenceBoundary = /[.!?]$/.test(chunk.text.trim());
    const now = Date.now();
    const timeSinceAnalysis = now - state.lastAnalysisAt;
    let shouldTriggerAnalysis = false;

    if (chunk.isFinal && isSentenceBoundary && timeSinceAnalysis > 10000) {
      shouldTriggerAnalysis = true;
      state.lastAnalysisAt = now;
    }

    // Rambling check
    state.lastConcretePointAt = now; // For MVP, resetting on chunk
    const isRambling = (now - state.lastConcretePointAt) > 60000;

    return {
      fillerWordsDetected,
      repetitionsDetected: [],
      isRambling,
      shouldTriggerAnalysis,
      transcriptWindowText: state.transcriptWindow.map(c => c.text).join(' '),
    };
  }

  getState(sessionId: string): SessionContextState | undefined {
    return this.states.get(sessionId);
  }

  getFillerReport(sessionId: string): { counts: Record<string, number>; total: number } {
    const state = this.states.get(sessionId);
    if (!state) return { counts: {}, total: 0 };
    return { counts: state.fillerWordCounts, total: state.totalFillerWords };
  }

  getRepetitions(sessionId: string): string[] {
    return [];
  }
}

export const contextEngine = new ContextEngine();
