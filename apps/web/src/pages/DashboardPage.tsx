import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, Clock, FileText, ChevronRight, TrendingUp, Star, BookOpen } from 'lucide-react';
import { getSessions, getProfile } from '../services/api.service';
import { LEARNING_STAGE_LABELS } from '@communication-agent/types';
import type { LearningStage } from '@communication-agent/types';

// Raw DB row — snake_case from backend
interface RawSession {
  id: string;
  mode: string;
  title: string;
  started_at: string;
  ended_at: string | null;
  word_count: number;
  duration_seconds: number;
  reportSnippet?: {
    oneLesson: string | null;
    scores: Record<string, string> | null;
    wellDone: string | null;
  } | null;
}

// Raw DB row for profile
interface RawProfile {
  id: number;
  learning_stage: number;
  total_sessions: number;
  total_minutes: number;
  last_session_at: string | null;
  strengths: any[];
  weaknesses: any[];
  tendencies: any[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(sec: number) {
  if (!sec) return null;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m === 0) return `${s}s`;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function formatRelativeDate(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours === 0) {
      const diffMins = Math.floor(diffMs / (1000 * 60));
      return diffMins <= 1 ? 'Just now' : `${diffMins}m ago`;
    }
    return diffHours === 1 ? '1 hour ago' : `${diffHours}h ago`;
  }
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const SCORE_COLOR: Record<string, string> = {
  strong: 'text-emerald-400',
  moderate: 'text-amber-400',
  developing: 'text-violet-400',
};

const MODE_LABEL: Record<string, string> = {
  conversation: 'Conversation',
  presentation: 'Presentation',
  practice: 'Free Speech',
};

const STAGE_FOCUS: Record<number, string> = {
  1: 'Focus: cutting filler words and speaking in complete sentences.',
  2: 'Focus: clearer sentence structure and getting to the point.',
  3: 'Focus: conciseness — say more with fewer words.',
  4: 'Focus: concrete examples and avoiding vague abstractions.',
  5: 'Focus: weaving stories into your communication.',
  6: 'Focus: timing, lightness, and natural wit.',
  7: 'Focus: audience engagement, tension, and questions.',
  8: 'Focus: developing your distinctive voice and presence.',
};

// ─── Main component ────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<RawSession[]>([]);
  const [profile, setProfile] = useState<RawProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getSessions().catch(() => []),
      getProfile().catch(() => null),
    ]).then(([s, p]) => {
      setSessions((s as unknown as RawSession[]).slice(0, 6));
      setProfile(p as unknown as RawProfile);
      setLoading(false);
    });
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Morning' : hour < 18 ? 'Afternoon' : 'Evening';

  const completedSessions = sessions.filter((s) => s.ended_at);
  const totalWords = sessions.reduce((sum, s) => sum + (s.word_count || 0), 0);
  const totalMinutes = sessions.reduce((sum, s) => sum + Math.floor((s.duration_seconds || 0) / 60), 0);
  const stage = profile?.learning_stage ?? 1;

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-7">

        {/* ── Greeting ──────────────────────────────────────────────── */}
        <div>
          <h1 className="text-2xl font-semibold text-white">
            {greeting}. <span className="text-gray-400 font-normal">Ready to practice?</span>
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            {completedSessions.length > 0
              ? `${completedSessions.length} session${completedSessions.length > 1 ? 's' : ''} completed · ${totalWords > 0 ? `${totalWords.toLocaleString()} words spoken` : 'keep going'}`
              : 'Start your first session to begin tracking your growth.'}
          </p>
        </div>

        {/* ── Start session CTA ──────────────────────────────────────── */}
        <button
          onClick={() => navigate('/session')}
          className="w-full flex items-center justify-between px-6 py-5 bg-violet-600 hover:bg-violet-500 text-white rounded-2xl transition-colors group"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
              <Mic size={20} />
            </div>
            <div className="text-left">
              <p className="font-semibold text-base">Start a new session</p>
              <p className="text-violet-200 text-sm">Conversation · Presentation · Free Speech</p>
            </div>
          </div>
          <ChevronRight size={20} className="text-violet-300 group-hover:translate-x-1 transition-transform" />
        </button>

        {/* ── Learning Stage + Stats ────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4">

          {/* Stage card */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-3">Learning Stage</p>
            {loading ? (
              <div className="animate-pulse space-y-2">
                <div className="h-8 w-16 bg-gray-800 rounded" />
                <div className="h-3 w-32 bg-gray-800 rounded" />
              </div>
            ) : (
              <>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-4xl font-bold text-violet-400">{stage}</span>
                  <span className="text-sm text-gray-500">/ 8</span>
                </div>
                <p className="text-sm font-medium text-gray-300 mb-1">
                  {LEARNING_STAGE_LABELS[stage as LearningStage] ?? 'Building foundations'}
                </p>
                <p className="text-xs text-gray-600 leading-relaxed">
                  {STAGE_FOCUS[stage] ?? ''}
                </p>
                {/* Stage progress bar */}
                <div className="mt-4 h-1 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-violet-500 rounded-full transition-all"
                    style={{ width: `${(stage / 8) * 100}%` }}
                  />
                </div>
              </>
            )}
          </div>

          {/* Stats card */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-3">All Time</p>
            {loading ? (
              <div className="animate-pulse space-y-3">
                {[1, 2, 3].map((i) => <div key={i} className="h-4 bg-gray-800 rounded" />)}
              </div>
            ) : (
              <div className="space-y-3">
                <StatRow icon={<TrendingUp size={13} />} label="Sessions" value={completedSessions.length.toString()} />
                <StatRow icon={<Clock size={13} />} label="Minutes practiced" value={totalMinutes > 0 ? `${totalMinutes}m` : '—'} />
                <StatRow icon={<FileText size={13} />} label="Words spoken" value={totalWords > 0 ? totalWords.toLocaleString() : '—'} />
                {profile?.strengths && profile.strengths.length > 0 && (
                  <StatRow icon={<Star size={13} />} label="Strengths identified" value={profile.strengths.length.toString()} />
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Recent Sessions ────────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Recent Sessions</h2>
            {sessions.length > 3 && (
              <button onClick={() => navigate('/profile')} className="text-xs text-violet-400 hover:text-violet-300 transition-colors">
                View all
              </button>
            )}
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse bg-gray-900 border border-gray-800 rounded-xl h-24" />
              ))}
            </div>
          ) : sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 border border-dashed border-gray-800 rounded-2xl text-center">
              <BookOpen size={28} className="text-gray-700 mb-3" />
              <p className="text-gray-500 text-sm">No sessions yet</p>
              <p className="text-gray-700 text-xs mt-1">Start your first session above to see your history here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => (
                <SessionCard key={session.id} session={session} onClick={() => {
                  if (session.ended_at) navigate(`/report/${session.id}`);
                }} />
              ))}
            </div>
          )}
        </div>

        <div className="pb-6" />
      </div>
    </div>
  );
}

// ─── Session card ──────────────────────────────────────────────────────────────

function SessionCard({ session, onClick }: { session: RawSession; onClick: () => void }) {
  const hasReport = !!session.reportSnippet;
  const isCompleted = !!session.ended_at;
  const duration = formatDuration(session.duration_seconds);

  return (
    <div
      onClick={isCompleted ? onClick : undefined}
      className={`bg-gray-900 border border-gray-800 rounded-xl p-4 transition-colors ${
        isCompleted ? 'hover:border-gray-700 cursor-pointer' : 'opacity-60 cursor-default'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Top row: mode badge + date */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-800 text-gray-300 border border-gray-700">
              {MODE_LABEL[session.mode] ?? session.mode}
            </span>
            <span className="text-xs text-gray-600">
              {formatRelativeDate(session.started_at)}
            </span>
            {!isCompleted && (
              <span className="text-xs text-amber-600 bg-amber-950/30 border border-amber-900/30 px-2 py-0.5 rounded-full">
                not ended
              </span>
            )}
          </div>

          {/* Metrics row */}
          <div className="flex items-center gap-4 text-xs text-gray-500">
            {duration && (
              <span className="flex items-center gap-1">
                <Clock size={11} />
                {duration}
              </span>
            )}
            {session.word_count > 0 && (
              <span className="flex items-center gap-1">
                <FileText size={11} />
                {session.word_count} words
              </span>
            )}
            {!duration && !session.word_count && (
              <span className="italic text-gray-700">No speech captured</span>
            )}
          </div>

          {/* Top insight from report */}
          {hasReport && session.reportSnippet?.oneLesson && (
            <p className="mt-2 text-xs text-gray-500 leading-relaxed line-clamp-2">
              <span className="text-violet-500 font-medium">Lesson: </span>
              {session.reportSnippet.oneLesson}
            </p>
          )}
        </div>

        {/* Scores mini-badges */}
        {hasReport && session.reportSnippet?.scores && (
          <div className="flex flex-col gap-1 flex-shrink-0">
            {Object.entries(session.reportSnippet.scores).slice(0, 3).map(([key, val]) => (
              <span
                key={key}
                className={`text-xs capitalize tabular-nums font-medium text-right ${SCORE_COLOR[val] ?? 'text-gray-500'}`}
              >
                {val}
              </span>
            ))}
          </div>
        )}

        {isCompleted && (
          <ChevronRight size={15} className="text-gray-700 flex-shrink-0 mt-0.5" />
        )}
      </div>
    </div>
  );
}

// ─── Tiny stat row ─────────────────────────────────────────────────────────────

function StatRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1.5 text-xs text-gray-500">
        <span className="text-gray-600">{icon}</span>
        {label}
      </div>
      <span className="text-sm font-semibold text-gray-300 tabular-nums">{value}</span>
    </div>
  );
}
