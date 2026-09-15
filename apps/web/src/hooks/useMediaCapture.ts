import { useState, useRef, useCallback, useEffect, type RefObject } from 'react';

interface UseMediaCaptureReturn {
  stream: MediaStream | null;
  cameraEnabled: boolean;
  micEnabled: boolean;
  error: string | null;
  isLoading: boolean;
  startCapture: (options?: { camera?: boolean; mic?: boolean }) => Promise<void>;
  stopCapture: () => void;
  toggleCamera: () => void;
  toggleMic: () => void;
  videoRef: RefObject<HTMLVideoElement>;
}

export function useMediaCapture(): UseMediaCaptureReturn {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [micEnabled, setMicEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Whenever we get a new stream AND the video element is mounted, attach it.
  // This runs after React re-renders so the <video> element is guaranteed to exist.
  useEffect(() => {
    if (stream && videoRef.current && cameraEnabled) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {
        // autoplay may be blocked — the `autoPlay` prop on <video> handles this
      });
    }
  }, [stream, cameraEnabled]);

  const startCapture = useCallback(async (options?: { camera?: boolean; mic?: boolean }) => {
    const { camera = false, mic = true } = options || {};
    setIsLoading(true);
    setError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: camera,
        audio: mic,
      });
      setStream(mediaStream);
      setCameraEnabled(camera);
      setMicEnabled(mic);
      // NOTE: We do NOT assign videoRef.current.srcObject here because the
      // <video> element may not be in the DOM yet (rendered after session becomes active).
      // The useEffect above handles the assignment after React re-renders.
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        setError('Camera/microphone permissions denied. Please allow access and try again.');
      } else if (err.name === 'NotFoundError') {
        setError('Camera or microphone not found on this device.');
      } else {
        setError(err.message || 'Error accessing media devices.');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const stopCapture = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    setStream(null);
    setCameraEnabled(false);
    setMicEnabled(false);
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [stream]);

  const toggleCamera = useCallback(() => {
    if (stream) {
      const videoTracks = stream.getVideoTracks();
      if (videoTracks.length > 0) {
        const enabled = !videoTracks[0].enabled;
        videoTracks[0].enabled = enabled;
        setCameraEnabled(enabled);
        // If re-enabling, re-attach srcObject in case it was cleared
        if (enabled && videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }
    }
  }, [stream]);

  const toggleMic = useCallback(() => {
    if (stream) {
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length > 0) {
        const enabled = !audioTracks[0].enabled;
        audioTracks[0].enabled = enabled;
        setMicEnabled(enabled);
      }
    }
  }, [stream]);

  return {
    stream,
    cameraEnabled,
    micEnabled,
    error,
    isLoading,
    startCapture,
    stopCapture,
    toggleCamera,
    toggleMic,
    videoRef,
  };
}
