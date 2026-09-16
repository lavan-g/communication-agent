import { useState, useCallback, useRef } from 'react';
import { useSessionStore } from '../store/session.store';
import { useMediaCapture } from './useMediaCapture';
import { useSpeechRecognition } from './useSpeechRecognition';
import { useSSE } from './useSSE';
import { createSession, endSession as apiEndSession, analyzeChunk } from '../services/api.service';
import type { SessionMode, SessionContext, SessionReport, CoachingEvent, TranscriptChunk } from '@communication-agent/types';

export function useCoachingSession() {
  const store = useSessionStore();
  const media = useMediaCapture();
  const [error, setError] = useState<string | null>(null);
  const [sseUrl, setSseUrl] = useState<string | null>(null);

  // ─── FIX: Store sessionId in a ref so it survives state mutations ──────────
  // store.currentSession can become null during React re-renders triggered by
  // setSessionActive(false). The ref always holds the live value.
  const activeSessionIdRef = useRef<string | null>(null);

  const { disconnect: disconnectSSE } = useSSE<any>(sseUrl, {
    onMessage: (type, data) => {
      if (type === 'coaching') {
        store.addCoachingEvent(data as CoachingEvent);
      } else if (type === 'transcript') {
        store.addTranscriptChunk(data as TranscriptChunk);
      }
    },
    onError: () => {
      console.warn('SSE connection error — will auto-reconnect');
    },
  });

  const speech = useSpeechRecognition({
    onInterimResult: (text) => {
      store.setLiveTranscript(text);
    },
    onFinalResult: async (text) => {
      store.setLiveTranscript('');
      const sessionId = activeSessionIdRef.current;
      if (!sessionId) return;
      try {
        await analyzeChunk(sessionId, {
          text,
          isFinal: true,
          transcriptWindow: [],
        });
      } catch (err) {
        console.error('Failed to analyze chunk:', err);
      }
    },
  });

  const startSession = useCallback(
    async (mode: SessionMode, context?: SessionContext) => {
      try {
        setError(null);
        await media.startCapture({ camera: true, mic: true });

        const session = await createSession({ mode, context });

        // ─── Store the ID in the ref immediately so it's always accessible ───
        activeSessionIdRef.current = session.id;

        store.setCurrentSession(session);
        store.setSessionMode(mode);
        if (context) store.setSessionContext(context);

        setSseUrl(`/api/sessions/${session.id}/stream`);
        store.setSessionActive(true);
        speech.start();
      } catch (err: any) {
        setError(err.message || 'Failed to start session');
        media.stopCapture();
      }
    },
    [media, speech, store],
  );

  const endSession = useCallback(async (): Promise<{ sessionId: string; report: SessionReport } | null> => {
    // ─── FIX: Capture sessionId FIRST, before any state mutations ────────────
    const sessionId = activeSessionIdRef.current ?? store.currentSession?.id;

    try {
      // Stop all streams immediately
      speech.stop();
      disconnectSSE();
      media.stopCapture();

      if (!sessionId) {
        setError('No active session to end.');
        return null;
      }

      // ─── FIX: Don't call setSessionActive(false) yet — it wipes the session
      // UI before we finish the API call, which can cause re-renders that
      // lose the sessionId. We clear state AFTER the API call returns.
      setSseUrl(null);

      const report = await apiEndSession(sessionId);

      // Now safe to clear all state
      activeSessionIdRef.current = null;
      store.clearSession(); // clears currentSession + setSessionActive(false)

      return { sessionId, report };
    } catch (err: any) {
      console.error('endSession error:', err);
      setError(err.message || 'Failed to end session');

      // Still clear local state even on error
      activeSessionIdRef.current = null;
      store.clearSession();

      // Return partial result so we can still navigate to the session report page
      // (the backend may have saved the report before the error occurred)
      return sessionId ? { sessionId, report: null as any } : null;
    }
  }, [media, speech, store, disconnectSSE]);

  return {
    startSession,
    endSession,
    isActive: store.isSessionActive,
    sessionId: activeSessionIdRef.current ?? store.currentSession?.id ?? null,
    error: error || media.error || speech.error,
    videoRef: media.videoRef,
    toggleCamera: media.toggleCamera,
    toggleMic: media.toggleMic,
    cameraEnabled: media.cameraEnabled,
    micEnabled: media.micEnabled,
  };
}
