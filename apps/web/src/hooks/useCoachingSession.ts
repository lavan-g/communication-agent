import { useState, useCallback } from 'react';
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

  const { connected, disconnect: disconnectSSE } = useSSE<any>(sseUrl, {
    onMessage: (type, data) => {
      if (type === 'coaching' || (data && data.type === 'coaching')) {
        store.addCoachingEvent(data as CoachingEvent);
      } else if (type === 'transcript' || (data && data.type === 'transcript')) {
        store.addTranscriptChunk(data as TranscriptChunk);
      }
    },
    onError: () => {
      console.warn('SSE connection error');
    }
  });

  const speech = useSpeechRecognition({
    onInterimResult: (text) => {
      store.setLiveTranscript(text);
    },
    onFinalResult: async (text) => {
      store.setLiveTranscript('');
      const sessionId = store.currentSession?.id;
      if (sessionId) {
        try {
          await analyzeChunk(sessionId, {
            text,
            isFinal: true,
            transcriptWindow: [],
          });
        } catch (err) {
          console.error('Failed to analyze chunk', err);
        }
      }
    },
  });

  const startSession = useCallback(async (mode: SessionMode, context?: SessionContext) => {
    try {
      setError(null);
      await media.startCapture({ camera: true, mic: true });
      
      const session = await createSession({ mode, context });
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
  }, [media, speech, store]);

  const endSession = useCallback(async (): Promise<SessionReport | null> => {
    try {
      speech.stop();
      disconnectSSE();
      media.stopCapture();
      store.setSessionActive(false);
      setSseUrl(null);
      
      const sessionId = store.currentSession?.id;
      if (sessionId) {
        const report = await apiEndSession(sessionId);
        store.clearSession();
        return report;
      }
      return null;
    } catch (err: any) {
      setError(err.message || 'Failed to end session');
      return null;
    }
  }, [media, speech, store, disconnectSSE]);

  return {
    startSession,
    endSession,
    isActive: store.isSessionActive,
    sessionId: store.currentSession?.id || null,
    error: error || media.error || speech.error,
    videoRef: media.videoRef,
    toggleCamera: media.toggleCamera,
    toggleMic: media.toggleMic,
    cameraEnabled: media.cameraEnabled,
    micEnabled: media.micEnabled
  };
}
