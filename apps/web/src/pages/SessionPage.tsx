import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, MicOff, Video, VideoOff, Square } from 'lucide-react';
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
    toggleCamera, toggleMic, cameraEnabled, micEnabled 
  } = useCoachingSession();
  
  const [mode, setMode] = useState<SessionMode>('conversation');
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    let interval: any;
    if (isActive) {
      interval = setInterval(() => setDuration(d => d + 1), 1000);
    } else {
      setDuration(0);
    }
    return () => clearInterval(interval);
  }, [isActive]);

  const handleStart = async () => {
    await startSession(mode, {});
  };

  const handleEnd = async () => {
    const report = await endSession();
    if (report) {
      navigate(`/report/${report.sessionId}`);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  if (!isActive) {
    return (
      <div className="max-w-2xl mx-auto p-12 mt-20 bg-gray-900 border border-gray-800 rounded-2xl shadow-xl">
        <h1 className="text-3xl font-medium text-white mb-6">Session Setup</h1>
        
        <div className="space-y-6 mb-8">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Mode</label>
            <select 
              value={mode} 
              onChange={(e) => setMode(e.target.value as SessionMode)}
              className="w-full bg-gray-950 border border-gray-800 rounded-lg p-3 text-white focus:outline-none focus:border-blue-500"
            >
              <option value="conversation">Conversation</option>
              <option value="presentation">Presentation</option>
              <option value="practice">Practice / Free Speech</option>
            </select>
          </div>
        </div>

        <button 
          onClick={handleStart}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium p-4 rounded-lg transition-colors text-lg flex items-center justify-center gap-2"
        >
          <Mic size={24} />
          Begin Session
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-950 relative">
      {/* Top Bar */}
      <div className="flex-none h-16 border-b border-gray-900 px-6 flex items-center justify-between bg-gray-950/80 backdrop-blur-sm z-10">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1 bg-red-500/10 text-red-400 rounded-full border border-red-500/20">
            <div className="w-2 h-2 rounded-full bg-red-500 live-pulse" />
            <span className="text-xs font-bold tracking-widest">LIVE</span>
          </div>
          <div className="text-xl font-mono text-gray-300 font-light">{formatTime(duration)}</div>
        </div>

        <div className="flex items-center gap-4">
          <button onClick={toggleMic} className={`p-2 rounded-full border ${micEnabled ? 'bg-gray-800 border-gray-700 text-white' : 'bg-red-900/30 border-red-800 text-red-500'}`}>
            {micEnabled ? <Mic size={18} /> : <MicOff size={18} />}
          </button>
          <button onClick={toggleCamera} className={`p-2 rounded-full border ${cameraEnabled ? 'bg-gray-800 border-gray-700 text-white' : 'bg-red-900/30 border-red-800 text-red-500'}`}>
            {cameraEnabled ? <Video size={18} /> : <VideoOff size={18} />}
          </button>
          <div className="w-px h-6 bg-gray-800 mx-2" />
          <button 
            onClick={handleEnd}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors border border-gray-700 font-medium text-sm"
          >
            <Square size={14} className="fill-current" />
            End Session
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden flex flex-col relative">
        <TranscriptFeed 
          chunks={store.transcriptChunks} 
          liveText={store.liveTranscript} 
        />
        <CoachingOverlay events={store.coachingEvents} />
      </div>

      {/* Camera PIP */}
      <div className="absolute top-20 right-6 w-48 rounded-lg overflow-hidden bg-gray-900 border border-gray-800 shadow-xl z-20 aspect-video">
        <video 
          ref={videoRef} 
          autoPlay 
          muted 
          playsInline 
          className="w-full h-full object-cover"
        />
        {!cameraEnabled && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-600">
            <VideoOff size={24} />
          </div>
        )}
      </div>
    </div>
  );
}
