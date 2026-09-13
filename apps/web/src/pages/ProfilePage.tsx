import { useEffect, useState } from 'react';
import { getProfile, deleteProfileData } from '../services/api.service';
import type { UserProfile } from '@communication-agent/types';
import { Trash2 } from 'lucide-react';

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    getProfile().then(setProfile).catch(console.error);
  }, []);

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete all your communication data? This cannot be undone.')) {
      await deleteProfileData();
      window.location.reload();
    }
  };

  if (!profile) return <div className="p-10 text-gray-500">Loading profile...</div>;

  return (
    <div className="max-w-4xl mx-auto p-10">
      <h1 className="text-3xl font-semibold text-white mb-8">Your Communication Profile</h1>
      
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 mb-8">
        <h2 className="text-xl font-medium text-white mb-2">Learning Stage {profile.learningStage}</h2>
        <div className="w-full bg-gray-950 rounded-full h-2.5 mt-4 mb-2">
          <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${(profile.learningStage / 8) * 100}%` }}></div>
        </div>
        <p className="text-sm text-gray-500 text-right">Stage {profile.learningStage} of 8</p>
      </div>

      <div className="grid grid-cols-2 gap-8 mb-12">
        <div>
          <h3 className="text-lg font-medium text-white mb-4">Observed Strengths</h3>
          <div className="flex flex-wrap gap-2">
            {profile.strengths.map((s, i) => (
              <div key={i} className="px-3 py-1.5 bg-green-950/30 border border-green-900/50 rounded-md text-sm text-green-400">
                {s.pattern}
              </div>
            ))}
            {profile.strengths.length === 0 && <span className="text-gray-500 text-sm">Need more data...</span>}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-medium text-white mb-4">Areas for Focus</h3>
          <div className="flex flex-wrap gap-2">
            {profile.weaknesses.map((w, i) => (
              <div key={i} className="px-3 py-1.5 bg-orange-950/30 border border-orange-900/50 rounded-md text-sm text-orange-400">
                {w.pattern}
              </div>
            ))}
            {profile.weaknesses.length === 0 && <span className="text-gray-500 text-sm">Need more data...</span>}
          </div>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 mb-12">
        <h3 className="text-lg font-medium text-white mb-4">Tendencies</h3>
        <ul className="space-y-3">
          {profile.tendencies.map((t, i) => (
            <li key={i} className="text-gray-300 text-sm flex justify-between border-b border-gray-800 pb-2">
              <span>{t.pattern}</span>
              <span className="text-gray-500">{Math.round(t.confidence * 100)}% confidence</span>
            </li>
          ))}
          {profile.tendencies.length === 0 && <span className="text-gray-500 text-sm">No strong tendencies identified yet.</span>}
        </ul>
      </div>

      <div className="border-t border-gray-800 pt-8 mt-12">
        <h3 className="text-lg font-medium text-red-500 mb-2">Danger Zone</h3>
        <p className="text-sm text-gray-500 mb-4">Permanently delete all your session history, reports, and personalized profile data.</p>
        <button 
          onClick={handleDelete}
          className="flex items-center gap-2 px-4 py-2 bg-red-950/30 hover:bg-red-900/50 text-red-500 rounded-lg transition-colors border border-red-900/50 text-sm font-medium"
        >
          <Trash2 size={16} /> Delete All Data
        </button>
      </div>
    </div>
  );
}
