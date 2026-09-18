import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, MicOff, Video, VideoOff, Square, Radio } from 'lucide-react';
import { useCoachingSession } from '../hooks/useCoachingSession';
import { useSessionStore } from '../store/session.store';
import TranscriptFeed from '../components/coaching/TranscriptFeed';
import CoachingOverlay from '../components/coaching/CoachingOverlay';
import type { SessionMode } from '@communication-agent/types';

export default function SessionPage() {
  const navigate = useNavigate();
  const store = useSessionStore();
  const {
    startSession, endSession, isActive, videoRef,
    toggleCamera, toggleMic, cameraEnabled, micEnabled, error,
  } = useCoachingSession();

  const [mode, setMode] = useState<SessionMode>('conversation');
  const [duration, setDuration] = useState(0);
  // Camera is OFF by default — user opts in before starting
  const [wantCamera, setWantCamera] = useState(false);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isActive) {
      interval = setInterval(() => setDuration((d) => d + 1), 1000);
    } else {
      setDuration(0);
    }
    return () => clearInterval(interval);
  }, [isActive]);

  const handleStart = async () => {
    await startSession(mode, { camera: wantCamera });
  };

  const handleEnd = async () => {
    const result = await endSession();
    if (result?.sessionId) {
      navigate(`/report/${result.sessionId}`);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // ─── Pre-session setup screen ─────────────────────────────────────────────
  if (!isActive) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-full max-w-lg p-10 bg-gray-900 border border-gray-800 rounded-2xl shadow-xl">
          <h1 className="text-2xl font-semibold text-white mb-1">New Session</h1>
          <p className="text-sm text-gray-500 mb-8">Configure your session before starting.</p>

          {error && (
            <div className="mb-6 px-4 py-3 bg-red-950/40 border border-red-900/50 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Mode selector */}
          <div className="mb-6">
            <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
              Mode
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['conversation', 'presentation', 'practice'] as SessionMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`py-2.5 rounded-lg text-sm font-medium capitalize border transition-colors ${
                    mode === m
                      ? 'bg-violet-600/20 border-violet-500/50 text-violet-300'
                      : 'bg-gray-950 border-gray-800 text-gray-400 hover:border-gray-700 hover:text-gray-300'
                  }`}
                >
                  {m === 'practice' ? 'Free Speech' : m.charAt(0).toUpperCase() + m.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Camera toggle */}
          <div className="mb-8">
            <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
              Camera
            </label>
            <button
              onClick={() => setWantCamera((v) => !v)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border text-sm transition-colors ${
                wantCamera
                  ? 'bg-violet-600/10 border-violet-500/40 text-violet-300'
                  : 'bg-gray-950 border-gray-800 text-gray-400 hover:border-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                {wantCamera ? <Video size={16} /> : <VideoOff size={16} />}
                {wantCamera ? "Camera on \u2014 you'll see yourself during the session" : 'Camera off \u2014 mic only'}
              </div>
              <div className={`w-10 h-5 rounded-full transition-colors relative ${wantCamera ? 'bg-violet-600' : 'bg-gray-700'}`}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${wantCamera ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </div>
            </button>
          </div>

          <button
            onClick={handleStart}
            className="w-full bg-violet-600 hover:bg-violet-500 text-white font-medium p-4 rounded-xl transition-colors text-base flex items-center justify-center gap-2"
          >
            <Mic size={20} />
            Begin Session
          </button>
        </div>
      </div>
    );
  }

  // ─── Active session screen ────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-gray-950 relative">

      {/* Top bar */}
      <div className="flex-none h-16 border-b border-gray-900 px-6 flex items-center justify-between bg-gray-950/90 backdrop-blur-sm z-10">
        <div className="flex items-center gap-3">
          {/* LIVE badge */}
          <div className="flex items-center gap-1.5 px-3 py-1 bg-red-500/10 text-red-400 rounded-full border border-red-500/20">
            <div className="w-2 h-2 rounded-full bg-red-500 live-pulse" />
            <span className="text-xs font-bold tracking-widest">LIVE</span>
          </div>
          {/* Timer */}
          <div className="text-lg font-mono text-gray-300 tabular-nums">{formatTime(duration)}</div>
          {/* Recording status indicator */}
          <RecordingIndicator isListening={store.liveTranscript.length > 0 || store.transcriptChunks.length > 0} />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleMic}
            title={micEnabled ? 'Mute mic' : 'Unmute mic'}
            className={`p-2 rounded-full border transition-colors ${
              micEnabled ? 'bg-gray-800 border-gray-700 text-white' : 'bg-red-900/30 border-red-800 text-red-400'
            }`}
          >
            {micEnabled ? <Mic size={16} /> : <MicOff size={16} />}
          </button>
          <button
            onClick={toggleCamera}
            title={cameraEnabled ? 'Turn off camera' : 'Turn on camera'}
            className={`p-2 rounded-full border transition-colors ${
              cameraEnabled ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-900 border-gray-800 text-gray-500'
            }`}
          >
            {cameraEnabled ? <Video size={16} /> : <VideoOff size={16} />}
          </button>
          <div className="w-px h-5 bg-gray-800 mx-1" />
          <button
            onClick={handleEnd}
            className="flex items-center gap-2 px-4 py-2 bg-red-950/50 hover:bg-red-900/60 text-red-400 rounded-lg border border-red-900/50 font-medium text-sm transition-colors"
          >
            <Square size={13} className="fill-current" />
            End Session
          </button>
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 overflow-hidden flex flex-col relative">
        <TranscriptFeed
          chunks={store.transcriptChunks}
          liveText={store.liveTranscript}
        />
        <CoachingOverlay events={store.coachingEvents} />
      </div>

      {/* Camera PiP — only shown when camera is on */}
      {cameraEnabled && (
        <div className="absolute top-20 right-6 w-44 rounded-xl overflow-hidden bg-gray-900 border border-gray-800 shadow-2xl z-20 aspect-video">
          <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
        </div>
      )}
    </div>
  );
}

// ─── Small component: shows whether Voxa is hearing you ────────────────────
function RecordingIndicator({ isListening }: { isListening: boolean }) {
  const { isListening: speechActive } = useSessionStoreListening();

  return (
    <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border transition-colors ${
      speechActive
        ? 'text-green-400 border-green-900/50 bg-green-950/20'
        : 'text-gray-600 border-gray-800 bg-transparent'
    }`}>
      <Radio size={11} />
      {speechActive ? 'Hearing you' : 'Listening...'}
    </div>
  );
}

// Small hook to read live speech status from the store
function useSessionStoreListening() {
  const liveTranscript = useSessionStore((s) => s.liveTranscript);
  return { isListening: liveTranscript.length > 0 };
}
