import { useEffect, useState } from 'react';
import { getProfile, deleteProfileData } from '../services/api.service';
import { LEARNING_STAGE_LABELS } from '@communication-agent/types';
import type { LearningStage } from '@communication-agent/types';
import { Trash2, TrendingUp, Star, Zap, Clock, BarChart2 } from 'lucide-react';

// Raw snake_case profile from backend
interface RawProfile {
  id: number;
  learning_stage: number;
  total_sessions: number;
  total_minutes: number;
  last_session_at: string | null;
  strengths: Array<{ type: string; confidence: string; note?: string }>;
  weaknesses: Array<{ type: string; confidence: string; note?: string }>;
  tendencies: Array<{ pattern: string; confidence: string; evidenceCount: number }>;
}

const CONFIDENCE_COLOR: Record<string, string> = {
  high:   'text-emerald-400 border-emerald-900/50 bg-emerald-950/20',
  medium: 'text-amber-400 border-amber-900/50 bg-amber-950/20',
  low:    'text-gray-400 border-gray-800 bg-gray-900/50',
};

const STAGE_FOCUS: Record<number, string> = {
  1: 'Cut filler words. Speak in complete sentences.',
  2: 'Clearer sentence structure. Get to your point.',
  3: 'Conciseness — say more with fewer words.',
  4: 'Concrete examples. Avoid vague abstractions.',
  5: 'Weave stories into your communication.',
  6: 'Timing, lightness, and natural wit.',
  7: 'Audience engagement, tension, and questions.',
  8: 'Develop your distinctive voice and presence.',
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<RawProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    getProfile()
      .then((p) => {
        setProfile(p as unknown as RawProfile);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleDelete = async () => {
    await deleteProfileData();
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full gap-3 text-gray-500">
        <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-violet-500" />
        Loading profile…
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-full text-gray-600 text-sm">
        Could not load profile. Make sure the API is running.
      </div>
    );
  }

  const stage = profile.learning_stage ?? 1;
  const stageProgress = ((stage - 1) / 7) * 100;
  const lastSession = profile.last_session_at
    ? new Date(profile.last_session_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">

        {/* ── Header ──────────────────────────────────────────────── */}
        <div>
          <h1 className="text-2xl font-semibold text-white">Your Profile</h1>
          <p className="text-sm text-gray-500 mt-1">
            Voxa builds this from your sessions over time.
          </p>
        </div>

        {/* ── Stats row ────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard icon={<BarChart2 size={14} />} label="Sessions" value={profile.total_sessions?.toString() ?? '0'} />
          <StatCard icon={<Clock size={14} />} label="Minutes practiced" value={profile.total_minutes > 0 ? `${profile.total_minutes}m` : '—'} />
          <StatCard icon={<Zap size={14} />} label="Last session" value={lastSession ?? '—'} small />
        </div>

        {/* ── Learning Stage ────────────────────────────────────────── */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">Learning Stage</p>
              <h2 className="text-lg font-semibold text-white">
                Stage {stage} — {LEARNING_STAGE_LABELS[stage as LearningStage] ?? 'Building foundations'}
              </h2>
              <p className="text-xs text-gray-500 mt-1">{STAGE_FOCUS[stage] ?? ''}</p>
            </div>
            <span className="text-3xl font-bold text-violet-400 tabular-nums">{stage}<span className="text-base text-gray-700">/8</span></span>
          </div>

          {/* Stage steps */}
          <div className="flex gap-1 mt-2">
            {Array.from({ length: 8 }, (_, i) => i + 1).map((n) => (
              <div
                key={n}
                title={`Stage ${n}: ${LEARNING_STAGE_LABELS[n as LearningStage] ?? ''}`}
                className={`flex-1 h-1.5 rounded-full transition-colors ${
                  n < stage ? 'bg-violet-500' : n === stage ? 'bg-violet-400' : 'bg-gray-800'
                }`}
              />
            ))}
          </div>
          <div className="flex justify-between text-xs text-gray-700 mt-1">
            <span>Stage 1</span><span>Stage 8</span>
          </div>
        </div>

        {/* ── Strengths + Weaknesses ────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4">

          {/* Strengths */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-300 mb-4">
              <Star size={14} className="text-emerald-400" /> Strengths
            </h3>
            {profile.strengths.length === 0 ? (
              <p className="text-xs text-gray-600 italic">Complete more sessions to discover your strengths.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {profile.strengths.map((s, i) => (
                  <span key={i} className={`px-2.5 py-1 border rounded-full text-xs font-medium capitalize ${CONFIDENCE_COLOR[s.confidence] ?? CONFIDENCE_COLOR.low}`}>
                    {s.type.replace(/_/g, ' ')}
                    {s.confidence === 'high' && <span className="ml-1 opacity-60">★</span>}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Areas to improve */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-300 mb-4">
              <TrendingUp size={14} className="text-amber-400" /> Areas to improve
            </h3>
            {profile.weaknesses.length === 0 ? (
              <p className="text-xs text-gray-600 italic">No major patterns detected yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {profile.weaknesses.map((w, i) => (
                  <span key={i} className="px-2.5 py-1 border rounded-full text-xs font-medium capitalize bg-amber-950/20 border-amber-900/40 text-amber-400">
                    {w.type.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Tendencies ───────────────────────────────────────────── */}
        {profile.tendencies.length > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-gray-300 mb-4">Observed Tendencies</h3>
            <ul className="divide-y divide-gray-800/60">
              {profile.tendencies.map((t, i) => (
                <li key={i} className="py-3 flex justify-between items-center text-sm">
                  <span className="text-gray-300 capitalize">{t.pattern.replace(/_/g, ' ')}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-600">seen {t.evidenceCount}×</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${CONFIDENCE_COLOR[t.confidence] ?? CONFIDENCE_COLOR.low}`}>
                      {t.confidence}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ── Danger zone ──────────────────────────────────────────── */}
        <div className="border-t border-gray-800 pt-6">
          <p className="text-xs text-gray-600 uppercase tracking-wider font-semibold mb-3">Data</p>
          <p className="text-sm text-gray-500 mb-4">
            Permanently delete all session history, reports, coaching events, and this profile.
          </p>
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-2 px-4 py-2 bg-red-950/20 hover:bg-red-900/30 text-red-500 rounded-lg transition-colors border border-red-900/40 text-sm font-medium"
            >
              <Trash2 size={14} /> Delete all my data
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Yes, delete everything
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        <div className="pb-8" />
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, small }: { icon: React.ReactNode; label: string; value: string; small?: boolean }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3">
      <div className="flex items-center gap-1.5 text-xs text-gray-600 mb-1">{icon}{label}</div>
      <p className={`font-semibold text-gray-200 tabular-nums ${small ? 'text-sm' : 'text-xl'}`}>{value}</p>
    </div>
  );
}
