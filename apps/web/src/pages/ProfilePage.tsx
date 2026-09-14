import { useEffect, useState } from 'react';
import { getProfile, deleteProfileData } from '../services/api.service';
import { LEARNING_STAGE_LABELS } from '@communication-agent/types';
import type { UserProfile, LearningStage } from '@communication-agent/types';
import { Trash2, TrendingUp, Star } from 'lucide-react';

const CONFIDENCE_COLOR: Record<string, string> = {
  high: 'text-green-400 border-green-900/50 bg-green-950/20',
  medium: 'text-yellow-400 border-yellow-900/50 bg-yellow-950/20',
  low: 'text-gray-400 border-gray-800 bg-gray-900',
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    getProfile().then(setProfile).catch(console.error);
  }, []);

  const handleDelete = async () => {
    if (window.confirm('Delete all your communication data? This cannot be undone.')) {
      await deleteProfileData();
      window.location.reload();
    }
  };

  if (!profile) {
    return (
      <div className="p-10 flex items-center gap-3 text-gray-500">
        <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-blue-500" />
        Loading profile...
      </div>
    );
  }

  const stageProgress = ((profile.learningStage - 1) / 7) * 100;

  return (
    <div className="max-w-4xl mx-auto p-10">
      <h1 className="text-3xl font-semibold text-white mb-2">Your Communication Profile</h1>
      <p className="text-gray-500 text-sm mb-10">
        {profile.totalSessions} sessions · {profile.totalMinutes} minutes practiced
      </p>

      {/* Learning Stage */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 mb-8">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-xl font-medium text-white mb-1">
              Stage {profile.learningStage}: {LEARNING_STAGE_LABELS[profile.learningStage as LearningStage]}
            </h2>
            <p className="text-sm text-gray-500">Stage {profile.learningStage} of 8</p>
          </div>
          <div className="text-4xl font-bold text-blue-400">{profile.learningStage}</div>
        </div>
        <div className="w-full bg-gray-950 rounded-full h-2 mt-4">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-500"
            style={{ width: `${stageProgress}%` }}
          />
        </div>
      </div>

      {/* Strengths + Weaknesses */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        <div>
          <h3 className="text-base font-medium text-white mb-4 flex items-center gap-2">
            <Star size={16} className="text-green-400" /> Observed Strengths
          </h3>
          <div className="flex flex-wrap gap-2">
            {profile.strengths.map((s, i) => (
              <div
                key={i}
                className={`px-3 py-1.5 border rounded-md text-sm ${CONFIDENCE_COLOR[s.confidence]}`}
              >
                {s.type.replace(/_/g, ' ')}
                {s.note && <span className="text-xs ml-1 opacity-60">· {s.note}</span>}
              </div>
            ))}
            {profile.strengths.length === 0 && (
              <span className="text-gray-500 text-sm">Complete more sessions to discover your strengths.</span>
            )}
          </div>
        </div>

        <div>
          <h3 className="text-base font-medium text-white mb-4 flex items-center gap-2">
            <TrendingUp size={16} className="text-orange-400" /> Areas for Focus
          </h3>
          <div className="flex flex-wrap gap-2">
            {profile.weaknesses.map((w, i) => (
              <div
                key={i}
                className="px-3 py-1.5 bg-orange-950/20 border border-orange-900/40 rounded-md text-sm text-orange-400"
              >
                {w.type.replace(/_/g, ' ')}
                {w.note && <span className="text-xs ml-1 opacity-60">· {w.note}</span>}
              </div>
            ))}
            {profile.weaknesses.length === 0 && (
              <span className="text-gray-500 text-sm">No major weaknesses detected yet.</span>
            )}
          </div>
        </div>
      </div>

      {/* Tendencies */}
      {profile.tendencies.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-8">
          <h3 className="text-base font-medium text-white mb-4">Observed Tendencies</h3>
          <ul className="divide-y divide-gray-800">
            {profile.tendencies.map((t, i) => (
              <li key={i} className="py-3 flex justify-between items-center text-sm">
                <span className="text-gray-300">{t.pattern}</span>
                <span className={`text-xs px-2 py-0.5 rounded ${CONFIDENCE_COLOR[t.confidence]}`}>
                  {t.confidence} confidence
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Danger zone */}
      <div className="border-t border-gray-800 pt-8 mt-4">
        <h3 className="text-base font-medium text-red-500 mb-2">Danger Zone</h3>
        <p className="text-sm text-gray-500 mb-4">
          Permanently delete all session history, reports, and profile data.
        </p>
        <button
          onClick={handleDelete}
          className="flex items-center gap-2 px-4 py-2 bg-red-950/20 hover:bg-red-900/40 text-red-500 rounded-lg transition-colors border border-red-900/40 text-sm font-medium"
        >
          <Trash2 size={15} /> Delete All Data
        </button>
      </div>
    </div>
  );
}
