import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlayCircle, Clock, FileText, Mic } from 'lucide-react';
import { getSessions, getProfile } from '../services/api.service';
import { LEARNING_STAGE_LABELS } from '@communication-agent/types';
import type { Session, UserProfile, LearningStage } from '@communication-agent/types';

export default function DashboardPage() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    getSessions().then((s) => setSessions(s.slice(0, 3))).catch(console.error);
    getProfile().then(setProfile).catch(console.error);
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  const formatDuration = (sec: number) => {
    if (!sec) return '–';
    const m = Math.floor(sec / 60);
    return m > 0 ? `${m}m` : '<1m';
  };

  return (
    <div className="max-w-5xl mx-auto p-10">
      <h1 className="text-3xl font-light text-white mb-8">
        Good {greeting},{' '}
        <span className="font-semibold">Coach is ready.</span>
      </h1>

      {/* Quick start + stage */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="col-span-2 bg-gradient-to-br from-gray-900 to-gray-950 border border-gray-800 rounded-2xl p-8 flex flex-col justify-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <PlayCircle size={140} />
          </div>
          <h2 className="text-2xl font-medium text-white mb-2">Start a New Session</h2>
          <p className="text-gray-400 mb-8 max-w-md">
            Practice a presentation, have a mock conversation, or just speak freely.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/session')}
              className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <Mic size={18} />
              Begin Session
            </button>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">Learning Stage</h3>
          {profile ? (
            <div>
              <div className="text-4xl font-bold text-blue-400 mb-3">{profile.learningStage}</div>
              <p className="text-sm text-gray-300 font-medium mb-1">
                {LEARNING_STAGE_LABELS[profile.learningStage as LearningStage]}
              </p>
              <p className="text-xs text-gray-500 mt-3">
                {profile.totalSessions} sessions · {profile.totalMinutes} minutes total
              </p>
            </div>
          ) : (
            <div className="animate-pulse bg-gray-800 h-24 rounded-lg" />
          )}
        </div>
      </div>

      {/* Recent sessions */}
      <h3 className="text-lg font-medium text-white mb-4">Recent Sessions</h3>
      <div className="grid grid-cols-3 gap-4">
        {sessions.map((session) => (
          <div
            key={session.id}
            onClick={() => navigate(`/report/${session.id}`)}
            className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-700 cursor-pointer transition-colors"
          >
            <div className="flex justify-between items-start mb-4">
              <span className="capitalize text-sm font-medium text-gray-300 bg-gray-800 px-2 py-1 rounded">
                {session.mode}
              </span>
              <span className="text-xs text-gray-500">{formatDate(session.startedAt)}</span>
            </div>
            <div className="flex gap-4 text-sm text-gray-400">
              <span className="flex items-center gap-1">
                <Clock size={13} />
                {formatDuration(session.duration)}
              </span>
              <span className="flex items-center gap-1">
                <FileText size={13} />
                {session.wordCount || 0} words
              </span>
            </div>
          </div>
        ))}
        {sessions.length === 0 && (
          <div className="col-span-3 text-center py-16 text-gray-500 border border-dashed border-gray-800 rounded-xl">
            <Mic size={32} className="mx-auto mb-3 opacity-30" />
            <p>No sessions yet. Start your first session above!</p>
          </div>
        )}
      </div>
    </div>
  );
}
