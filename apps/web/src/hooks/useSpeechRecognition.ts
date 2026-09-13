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
  continuous?: boolean;
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
  continuous = true,
}: UseSpeechRecognitionOptions): UseSpeechRecognitionReturn {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const recognitionRef = useRef<any>(null);
  const shouldListenRef = useRef(false);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = continuous;
    recognition.interimResults = true;
    recognition.lang = language;

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      if (interimTranscript) {
        onInterimResult(interimTranscript);
      }
      if (finalTranscript) {
        onFinalResult(finalTranscript);
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error !== 'no-speech') {
        setError(event.error);
      }
    };

    recognition.onend = () => {
      if (shouldListenRef.current) {
        try {
          recognition.start();
        } catch (e) {
          // ignore already started errors
        }
      } else {
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [onInterimResult, onFinalResult, language, continuous]);

  const start = useCallback(() => {
    if (!recognitionRef.current) return;
    try {
      shouldListenRef.current = true;
      recognitionRef.current.start();
      setIsListening(true);
      setError(null);
    } catch (e: any) {
      if (e.name !== 'InvalidStateError') {
        setError(e.message);
      }
    }
  }, []);

  const stop = useCallback(() => {
    if (!recognitionRef.current) return;
    shouldListenRef.current = false;
    recognitionRef.current.stop();
    setIsListening(false);
  }, []);

  return {
    isListening,
    isSupported,
    error,
    start,
    stop,
  };
}
