import { useEffect, useRef, useState, useCallback } from 'react';

interface UseSpeechRecognitionReturn {
  isListening: boolean;
  isSupported: boolean;
  error: string | null;
  start: () => void;
  stop: () => void;
}

interface UseSpeechRecognitionOptions {
  onInterimResult: (text: string) => void;
  onFinalResult: (text: string) => void;
  language?: string;
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export function useSpeechRecognition({
  onInterimResult,
  onFinalResult,
  language = 'en-US',
}: UseSpeechRecognitionOptions): UseSpeechRecognitionReturn {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const shouldListenRef = useRef(false);

  // ─── Store callbacks in refs so the recognition instance is NEVER recreated ──
  // The root cause of lost transcripts: the useEffect had [onInterimResult, onFinalResult]
  // as deps. Because these are inline arrow functions in the parent hook, they're new
  // objects on every render → useEffect tears down and rebuilds SpeechRecognition
  // constantly, dropping results mid-utterance.
  const onInterimRef = useRef(onInterimResult);
  const onFinalRef = useRef(onFinalResult);

  // Keep refs up to date without recreating the recognition instance
  useEffect(() => { onInterimRef.current = onInterimResult; }, [onInterimResult]);
  useEffect(() => { onFinalRef.current = onFinalResult; }, [onFinalResult]);

  // ─── Build recognition ONCE on mount ─────────────────────────────────────────
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
      setError('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;      // keep listening across pauses
    recognition.interimResults = true;  // show words as they're spoken
    recognition.lang = language;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (interimTranscript.trim()) {
        onInterimRef.current(interimTranscript.trim());
      }
      if (finalTranscript.trim()) {
        // Send final result to backend for analysis
        onFinalRef.current(finalTranscript.trim());
      }
    };

    recognition.onerror = (event: any) => {
      // 'no-speech' and 'aborted' are normal — don't surface them as errors
      if (event.error === 'no-speech' || event.error === 'aborted') return;
      if (event.error === 'not-allowed') {
        setError('Microphone access denied. Please allow mic permission and try again.');
        shouldListenRef.current = false;
        setIsListening(false);
        return;
      }
      console.warn('Speech recognition error:', event.error);
      setError(event.error);
    };

    recognition.onend = () => {
      // Auto-restart if we're still supposed to be listening
      if (shouldListenRef.current) {
        try {
          recognition.start();
        } catch {
          // Ignore "already started" race conditions
        }
      } else {
        setIsListening(false);
      }
    };

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognitionRef.current = recognition;

    return () => {
      shouldListenRef.current = false;
      try {
        recognition.stop();
      } catch {
        // ignore
      }
    };
  // ─── Empty deps = build ONCE. Callbacks come from refs. ──────────────────────
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const start = useCallback(() => {
    if (!recognitionRef.current) return;
    shouldListenRef.current = true;
    setError(null);
    try {
      recognitionRef.current.start();
    } catch (e: any) {
      if (e.name !== 'InvalidStateError') {
        setError(e.message);
      }
    }
  }, []);

  const stop = useCallback(() => {
    shouldListenRef.current = false;
    try {
      recognitionRef.current?.stop();
    } catch {
      // ignore
    }
    setIsListening(false);
  }, []);

  return { isListening, isSupported, error, start, stop };
}
