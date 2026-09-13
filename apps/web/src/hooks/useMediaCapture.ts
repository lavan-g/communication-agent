import { useState, useRef, useCallback } from 'react';

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
  videoRef: React.RefObject<HTMLVideoElement | null>;
}

export function useMediaCapture(): UseMediaCaptureReturn {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [micEnabled, setMicEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

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
      
      if (videoRef.current && camera) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        setError('Permissions denied. Please allow camera/microphone access.');
      } else if (err.name === 'NotFoundError') {
        setError('Camera or microphone not found.');
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
      setStream(null);
      setCameraEnabled(false);
      setMicEnabled(false);
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }
  }, [stream]);

  const toggleCamera = useCallback(() => {
    if (stream) {
      const videoTracks = stream.getVideoTracks();
      if (videoTracks.length > 0) {
        const enabled = !videoTracks[0].enabled;
        videoTracks[0].enabled = enabled;
        setCameraEnabled(enabled);
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
