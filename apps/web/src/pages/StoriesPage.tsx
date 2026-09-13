import { useEffect, useState } from 'react';
import { getStories, deleteStory } from '../services/api.service';
import type { Story } from '@communication-agent/types';
import { Trash2, ChevronDown, ChevronUp, Plus } from 'lucide-react';

export default function StoriesPage() {
  const [stories, setStories] = useState<Story[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchStories = async () => {
    try {
      const data = await getStories();
      setStories(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchStories();
  }, []);

  const handleDelete = async (id: string) => {
    if (window.confirm('Delete this story?')) {
      await deleteStory(id);
      setStories(stories.filter(s => s.id !== id));
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-semibold text-white">Story Bank</h1>
        <button className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm transition-colors border border-gray-700">
          <Plus size={16} /> Add Story Manually
        </button>
      </div>

      {stories.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
          <div className="text-4xl mb-4">📚</div>
          <h3 className="text-lg font-medium text-white mb-2">No stories yet</h3>
          <p className="text-gray-400 max-w-md mx-auto">
            Your stories will appear here as you speak. When the coach detects a story worth saving, it will be added automatically.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {stories.map(story => (
            <div key={story.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden transition-all">
              <div 
                className="p-5 cursor-pointer flex justify-between items-center hover:bg-gray-800/50"
                onClick={() => setExpandedId(expandedId === story.id ? null : story.id)}
              >
                <div>
                  <h3 className="font-medium text-white text-lg mb-1">{story.title}</h3>
                  <div className="flex gap-2 items-center text-xs text-gray-500">
                    <span className="px-2 py-0.5 bg-gray-800 rounded text-gray-300 capitalize">{story.tone}</span>
                    <span>•</span>
                    <span>{story.topics.join(', ')}</span>
                  </div>
                </div>
                <div className="text-gray-500">
                  {expandedId === story.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
              </div>

              {expandedId === story.id && (
                <div className="p-5 border-t border-gray-800 bg-gray-950/50 space-y-4 text-sm text-gray-300">
                  <div>
                    <strong className="text-gray-500 block mb-1 uppercase text-xs tracking-wider">Situation</strong>
                    <p className="leading-relaxed">{story.situation}</p>
                  </div>
                  <div>
                    <strong className="text-gray-500 block mb-1 uppercase text-xs tracking-wider">Conflict</strong>
                    <p className="leading-relaxed">{story.conflict}</p>
                  </div>
                  <div>
                    <strong className="text-gray-500 block mb-1 uppercase text-xs tracking-wider">Outcome</strong>
                    <p className="leading-relaxed">{story.outcome}</p>
                  </div>
                  <div className="bg-blue-900/10 border border-blue-900/30 p-3 rounded-lg">
                    <strong className="text-blue-500 block mb-1 uppercase text-xs tracking-wider">Core Lesson</strong>
                    <p className="text-blue-100">{story.lesson}</p>
                  </div>
                  
                  <div className="pt-4 flex justify-end">
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDelete(story.id!); }}
                      className="text-red-500 hover:text-red-400 flex items-center gap-1 text-xs"
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
