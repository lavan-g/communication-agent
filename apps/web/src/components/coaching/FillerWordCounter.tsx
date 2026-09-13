import { CoachingCategory } from '@communication-agent/types';
import type { CoachingEvent } from '@communication-agent/types';

export default function FillerWordCounter({ events }: { events: CoachingEvent[] }) {
  const count = events.filter((e) => e.category === CoachingCategory.FillerWords).length;

  if (count === 0) return null;

  let colorClass = 'bg-green-900/40 text-green-400 border-green-800/50';
  if (count > 2 && count <= 7) {
    colorClass = 'bg-yellow-900/40 text-yellow-400 border-yellow-800/50';
  } else if (count > 7) {
    colorClass = 'bg-orange-900/40 text-orange-400 border-orange-800/50';
  }

  return (
    <div className={`px-3 py-1.5 rounded-full border text-xs font-medium backdrop-blur-md flex items-center gap-2 ${colorClass}`}>
      <span>💬</span>
      <span>{count} filler word{count !== 1 ? 's' : ''}</span>
    </div>
  );
}
