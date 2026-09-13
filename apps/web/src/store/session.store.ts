import { create } from 'zustand';
import type { Session, TranscriptChunk, CoachingEvent, SessionMode, SessionContext } from '@communication-agent/types';

interface SessionStore {
  // State
  currentSession: Session | null;
  isSessionActive: boolean;
  transcriptChunks: TranscriptChunk[];
  coachingEvents: CoachingEvent[];
  liveTranscript: string;
  sessionMode: SessionMode;
  sessionContext: SessionContext;
  isAnalyzing: boolean;
  
  // Actions
  setCurrentSession: (session: Session | null) => void;
  setSessionActive: (active: boolean) => void;
  addTranscriptChunk: (chunk: TranscriptChunk) => void;
  addCoachingEvent: (event: CoachingEvent) => void;
  setLiveTranscript: (text: string) => void;
  setSessionMode: (mode: SessionMode) => void;
  setSessionContext: (ctx: SessionContext) => void;
  setAnalyzing: (v: boolean) => void;
  clearSession: () => void;
}

export const useSessionStore = create<SessionStore>((set) => ({
  currentSession: null,
  isSessionActive: false,
  transcriptChunks: [],
  coachingEvents: [],
  liveTranscript: '',
  sessionMode: 'conversation' as SessionMode,
  sessionContext: {},
  isAnalyzing: false,

  setCurrentSession: (session) => set({ currentSession: session }),
  setSessionActive: (active) => set({ isSessionActive: active }),
  addTranscriptChunk: (chunk) => set((state) => ({ transcriptChunks: [...state.transcriptChunks, chunk] })),
  addCoachingEvent: (event) => set((state) => ({ coachingEvents: [...state.coachingEvents, event] })),
  setLiveTranscript: (text) => set({ liveTranscript: text }),
  setSessionMode: (mode) => set({ sessionMode: mode }),
  setSessionContext: (ctx) => set({ sessionContext: ctx }),
  setAnalyzing: (v) => set({ isAnalyzing: v }),
  clearSession: () => set({
    currentSession: null,
    isSessionActive: false,
    transcriptChunks: [],
    coachingEvents: [],
    liveTranscript: '',
    isAnalyzing: false,
  }),
}));
