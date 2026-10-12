import { useEffect, useState } from 'react';
import { getStories, createStory, deleteStory, updateStory } from '../services/api.service';
import type { Story, StoryTone } from '@communication-agent/types';
import { Trash2, ChevronDown, ChevronUp, Plus, BookOpen, X, Sparkles, PenLine } from 'lucide-react';

// ─── Add Story Modal ────────────────────────────────────────────────────────

interface AddStoryModalProps {
  onClose: () => void;
  onSave: (story: Story) => void;
}

function AddStoryModal({ onClose, onSave }: AddStoryModalProps) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: '',
    situation: '',
    conflict: '',
    outcome: '',
    lesson: '',
    tone: 'inspiring' as StoryTone,
    topics: '',
  });

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const story = await createStory({
        title: form.title.trim(),
        situation: form.situation.trim() || undefined,
        conflict: form.conflict.trim() || undefined,
        outcome: form.outcome.trim() || undefined,
        lesson: form.lesson.trim() || undefined,
        tone: form.tone,
        topics: form.topics ? form.topics.split(',').map((t) => t.trim()).filter(Boolean) : [],
        characters: undefined,
        stakes: undefined,
        turningPoint: undefined,
        audienceTypes: [],
        usableSituations: [],
        memorableLines: [],
        alternativeOpenings: [],
        alternativeEndings: [],
        rawExcerpt: undefined,
        sessionId: undefined,
      });
      onSave(story);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <h2 className="text-lg font-semibold text-white">Add a Story</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <Field label="Title *">
            <input value={form.title} onChange={set('title')} placeholder="Give your story a name…" autoFocus
              className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500 transition-colors" />
          </Field>

          <Field label="Situation" hint="Where were you? What was happening?">
            <textarea value={form.situation} onChange={set('situation')} rows={2} placeholder="Set the scene…"
              className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500 transition-colors resize-none" />
          </Field>

          <Field label="Conflict or challenge">
            <textarea value={form.conflict} onChange={set('conflict')} rows={2} placeholder="What was the problem or tension?"
              className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500 transition-colors resize-none" />
          </Field>

          <Field label="Outcome">
            <textarea value={form.outcome} onChange={set('outcome')} rows={2} placeholder="How did it end?"
              className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500 transition-colors resize-none" />
          </Field>

          <Field label="Core lesson">
            <input value={form.lesson} onChange={set('lesson')} placeholder="What's the one thing to take away?"
              className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500 transition-colors" />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Tone">
              <select value={form.tone} onChange={set('tone')}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500 transition-colors">
                {(['inspiring', 'funny', 'vulnerable', 'dramatic', 'reflective', 'cautionary'] as StoryTone[]).map((t) => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
            </Field>

            <Field label="Topics" hint="comma-separated">
              <input value={form.topics} onChange={set('topics')} placeholder="leadership, failure, growth"
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500 transition-colors" />
            </Field>
          </div>
        </div>

        <div className="flex gap-3 p-6 border-t border-gray-800">
          <button onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm font-medium transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} disabled={!form.title.trim() || saving}
            className="flex-1 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium transition-colors">
            {saving ? 'Saving…' : 'Save Story'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1.5">
        {label} {hint && <span className="text-gray-700 font-normal">· {hint}</span>}
      </label>
      {children}
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

// ─── Complete Story Modal (for auto-detected stubs) ─────────────────────────

interface CompleteStoryModalProps {
  story: Story;
  onClose: () => void;
  onSave: (story: Story) => void;
}

function CompleteStoryModal({ story, onClose, onSave }: CompleteStoryModalProps) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title:     story.title.startsWith('Detected story') ? '' : story.title,
    situation: story.situation ?? '',
    conflict:  story.conflict  ?? '',
    outcome:   story.outcome   ?? '',
    lesson:    story.lesson    ?? '',
    tone:      (story.tone ?? 'inspiring') as StoryTone,
    topics:    story.topics?.join(', ') ?? '',
  });

  const set = (field: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await updateStory(story.id!, {
        title:     form.title.trim() || `Story — ${new Date().toLocaleDateString()}`,
        situation: form.situation.trim() || undefined,
        conflict:  form.conflict.trim()  || undefined,
        outcome:   form.outcome.trim()   || undefined,
        lesson:    form.lesson.trim()    || undefined,
        tone:      form.tone,
        topics:    form.topics ? form.topics.split(',').map((t) => t.trim()).filter(Boolean) : [],
      });
      onSave(updated);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <div>
            <h2 className="text-lg font-semibold text-white">Complete this story</h2>
            <p className="text-xs text-gray-500 mt-0.5">Voxa detected a story moment. Fill it in to save it properly.</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Raw excerpt from session */}
        {story.rawExcerpt && (
          <div className="mx-6 mt-4 px-4 py-3 bg-gray-950 border border-gray-800 rounded-xl">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">What you said</p>
            <p className="text-sm text-gray-400 italic leading-relaxed">"{story.rawExcerpt}"</p>
          </div>
        )}

        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          <Field label="Story title *">
            <input value={form.title} onChange={set('title')} placeholder="Give this story a name…" autoFocus
              className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500 transition-colors" />
          </Field>
          <Field label="Situation" hint="Where were you? What was happening?">
            <textarea value={form.situation} onChange={set('situation')} rows={2} placeholder="Set the scene…"
              className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500 transition-colors resize-none" />
          </Field>
          <Field label="Conflict or challenge">
            <textarea value={form.conflict} onChange={set('conflict')} rows={2} placeholder="What was the tension or problem?"
              className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500 transition-colors resize-none" />
          </Field>
          <Field label="Outcome">
            <textarea value={form.outcome} onChange={set('outcome')} rows={2} placeholder="How did it resolve?"
              className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500 transition-colors resize-none" />
          </Field>
          <Field label="Core lesson">
            <input value={form.lesson} onChange={set('lesson')} placeholder="What's the one-line takeaway?"
              className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500 transition-colors" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Tone">
              <select value={form.tone} onChange={set('tone')}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500 transition-colors">
                {(['inspiring','funny','vulnerable','dramatic','reflective','cautionary'] as StoryTone[]).map((t) => (
                  <option key={t} value={t} className="capitalize">{t}</option>
                ))}
              </select>
            </Field>
            <Field label="Topics" hint="comma-separated">
              <input value={form.topics} onChange={set('topics')} placeholder="leadership, failure…"
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500 transition-colors" />
            </Field>
          </div>
        </div>

        <div className="p-6 border-t border-gray-800 flex gap-3">
          <button onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium rounded-xl transition-colors border border-gray-700">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white text-sm font-medium rounded-xl transition-colors">
            {saving ? 'Saving…' : 'Save story'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function StoriesPage() {
  const [stories, setStories] = useState<Story[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [completeTarget, setCompleteTarget] = useState<Story | null>(null);

  const fetchStories = async () => {
    try { setStories(await getStories()); } catch { /* ignore */ }
  };

  useEffect(() => { fetchStories(); }, []);

  const handleDelete = async (id: string) => {
    if (window.confirm('Delete this story?')) {
      await deleteStory(id);
      setStories((prev) => prev.filter((s) => s.id !== id));
    }
  };

  const handleSaved = (story: Story) => {
    setStories((prev) => [story, ...prev]);
    setShowAddModal(false);
  };

  const handleCompleted = (updated: Story) => {
    setStories((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    setCompleteTarget(null);
  };

  // A story is "incomplete" if it was auto-detected (has rawExcerpt but no situation filled in)
  const isIncomplete = (s: Story) => !!(s.rawExcerpt && !s.situation && !s.conflict && !s.outcome);
  const incompleteCount = stories.filter(isIncomplete).length;

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-white">Story Bank</h1>
            <p className="text-sm text-gray-500 mt-1">
              {stories.length > 0
                ? `${stories.length} ${stories.length === 1 ? 'story' : 'stories'} saved${incompleteCount > 0 ? ` · ${incompleteCount} to complete` : ''}`
                : 'Your personal library of stories to use in any conversation.'}
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-xl transition-colors"
          >
            <Plus size={16} /> Add Story
          </button>
        </div>

        {/* Empty state */}
        {stories.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 border border-dashed border-gray-800 rounded-2xl text-center">
            <BookOpen size={32} className="text-gray-700 mb-3" />
            <p className="text-gray-400 font-medium mb-1">No stories yet</p>
            <p className="text-gray-600 text-sm max-w-sm">
              Stories are saved automatically when Voxa detects a story in your sessions. You can also add them manually.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-6 px-5 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-xl transition-colors border border-gray-700"
            >
              Add your first story
            </button>
          </div>
        )}

        {/* Stories list */}
        {stories.length > 0 && (
          <div className="space-y-3">
            {stories.map((story) => (
              <StoryCard
                key={story.id}
                story={story}
                isExpanded={expandedId === story.id}
                incomplete={isIncomplete(story)}
                onToggle={() => setExpandedId(expandedId === story.id ? null : story.id!)}
                onDelete={() => handleDelete(story.id!)}
                onComplete={() => setCompleteTarget(story)}
              />
            ))}
          </div>
        )}
      </div>

      {showAddModal && (
        <AddStoryModal onClose={() => setShowAddModal(false)} onSave={handleSaved} />
      )}
      {completeTarget && (
        <CompleteStoryModal
          story={completeTarget}
          onClose={() => setCompleteTarget(null)}
          onSave={handleCompleted}
        />
      )}
    </div>
  );
}

// ─── Story card ─────────────────────────────────────────────────────────────────

function StoryCard({ story, isExpanded, incomplete, onToggle, onDelete, onComplete }: {
  story: Story;
  isExpanded: boolean;
  incomplete?: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onComplete?: () => void;
}) {
  return (
    <div className={`bg-gray-900 border rounded-2xl overflow-hidden transition-colors ${
      incomplete
        ? 'border-amber-900/50 hover:border-amber-800/70'
        : isExpanded ? 'border-gray-700' : 'border-gray-800 hover:border-gray-700'
    }`}>
      <button className="w-full p-5 flex justify-between items-start text-left" onClick={onToggle}>
        <div className="flex-1 min-w-0 pr-4">
          {/* Detected badge for auto-detected incomplete stories */}
          {incomplete && (
            <div className="flex items-center gap-1.5 mb-2">
              <Sparkles size={12} className="text-amber-400" />
              <span className="text-xs text-amber-400 font-medium">Detected by Voxa · tap to complete</span>
            </div>
          )}
          <h3 className="font-medium text-white text-base mb-2">
            {story.title.startsWith('Detected story') ? 'Story moment detected' : story.title}
          </h3>
          {/* Show raw excerpt for detected stories */}
          {incomplete && story.rawExcerpt && (
            <p className="text-xs text-gray-500 italic leading-relaxed mb-2 line-clamp-2">
              "{story.rawExcerpt}"
            </p>
          )}
          <div className="flex gap-2 flex-wrap items-center">
            {story.tone && (
              <span className="px-2 py-0.5 bg-gray-800 border border-gray-700 rounded-full text-xs text-gray-400 capitalize">
                {story.tone}
              </span>
            )}
            {story.topics?.slice(0, 3).map((t) => (
              <span key={t} className="px-2 py-0.5 bg-violet-950/30 border border-violet-900/40 rounded-full text-xs text-violet-400">
                {t}
              </span>
            ))}
          </div>
        </div>
        <span className="text-gray-600 flex-shrink-0 mt-0.5">
          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </span>
      </button>

      {isExpanded && (
        <div className="px-5 pb-5 border-t border-gray-800 space-y-4 bg-gray-950/30">
          {/* Complete story CTA — shown prominently for incomplete detected stories */}
          {incomplete && onComplete && (
            <div className="pt-4">
              <button
                onClick={(e) => { e.stopPropagation(); onComplete(); }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-amber-950/30 hover:bg-amber-950/50 border border-amber-900/50 hover:border-amber-800 text-amber-300 text-sm font-medium rounded-xl transition-colors"
              >
                <PenLine size={15} />
                Complete this story
              </button>
            </div>
          )}

          <div className="pt-4 space-y-4 text-sm">
            {story.situation && <DetailRow label="Situation" value={story.situation} />}
            {story.conflict && <DetailRow label="Conflict" value={story.conflict} />}
            {story.outcome && <DetailRow label="Outcome" value={story.outcome} />}
            {story.lesson && (
              <div className="bg-violet-950/20 border border-violet-900/30 rounded-xl px-4 py-3">
                <p className="text-xs font-semibold text-violet-400 uppercase tracking-wider mb-1">Core Lesson</p>
                <p className="text-violet-100">{story.lesson}</p>
              </div>
            )}
          </div>
          <div className="flex justify-end pt-2">
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="flex items-center gap-1.5 text-xs text-red-600 hover:text-red-400 transition-colors"
            >
              <Trash2 size={13} /> Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-gray-300 leading-relaxed">{value}</p>
    </div>
  );
}
