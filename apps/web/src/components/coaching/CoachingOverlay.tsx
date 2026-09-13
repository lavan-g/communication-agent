import { useState, useEffect } from 'react';
import type { CoachingEvent } from '@communication-agent/types';
import FillerWordCounter from './FillerWordCounter';
import { ChevronDown, ChevronUp } from 'lucide-react';

export default function CoachingOverlay({ events }: { events: CoachingEvent[] }) {
  const [visibleEvent, setVisibleEvent] = useState<CoachingEvent | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    // Find most recent non-level-0 event
    const activeEvents = events.filter(e => e.level > 0);
    if (activeEvents.length > 0) {
      const latest = activeEvents[activeEvents.length - 1];
      setVisibleEvent(latest);
      setExpanded(false);

      // Auto dismiss logic
      const timeoutMs = latest.level === 1 ? 8000 : latest.level === 2 ? 15000 : 0;
      if (timeoutMs > 0) {
        const timer = setTimeout(() => {
          setVisibleEvent(curr => (curr?.id === latest.id ? null : curr));
        }, timeoutMs);
        return () => clearTimeout(timer);
      }
    }
  }, [events]);

  if (!visibleEvent) {
    return (
      <div className="fixed bottom-0 left-56 right-0 h-24 pointer-events-none">
        <div className="absolute top-4 right-8 pointer-events-auto">
           <FillerWordCounter events={events} />
        </div>
      </div>
    );
  }

  const isPositive = visibleEvent.category === 'positive';
  
  let borderColor = 'border-gray-800';
  let icon = '';
  let textColor = 'text-gray-300';
  
  if (isPositive) {
    borderColor = 'border-green-900/50';
    icon = '🟢';
    textColor = 'text-green-400';
  } else {
    switch(visibleEvent.level) {
      case 1: icon = '•'; textColor = 'text-gray-400'; break;
      case 2: icon = '🟡'; textColor = 'text-yellow-400'; borderColor = 'border-yellow-900/30'; break;
      case 3: icon = '🟠'; textColor = 'text-orange-400'; borderColor = 'border-orange-900/50'; break;
      case 4: icon = '🔴'; textColor = 'text-red-400'; borderColor = 'border-red-900/50'; break;
    }
  }

  return (
    <div className="fixed bottom-0 left-[220px] right-0 flex justify-center pb-8 pointer-events-none z-50">
      <div className="absolute top-[-40px] right-8 pointer-events-auto">
        <FillerWordCounter events={events} />
      </div>
      
      <div className={`coaching-appear pointer-events-auto max-w-2xl w-full mx-4 bg-gray-900/95 backdrop-blur-md rounded-2xl border-t border-l border-r border-b shadow-2xl ${borderColor} p-4 transition-all`}>
        <div className="flex items-start gap-4">
          <div className="text-xl mt-1">{icon}</div>
          <div className="flex-1">
            <p className={`text-lg font-medium ${textColor}`}>
              {visibleEvent.message}
            </p>
            {visibleEvent.principle && (
              <p className="text-sm text-gray-500 mt-1">{visibleEvent.principle}</p>
            )}
            
            {visibleEvent.suggestedVersion && (
              <div className="mt-3">
                <button 
                  onClick={() => setExpanded(!expanded)}
                  className="text-xs flex items-center text-gray-400 hover:text-gray-200 transition-colors"
                >
                  {expanded ? <ChevronUp size={14} className="mr-1"/> : <ChevronDown size={14} className="mr-1"/>}
                  {expanded ? 'Hide Example' : 'See Example'}
                </button>
                {expanded && (
                  <div className="mt-2 p-3 rounded-lg bg-gray-950/50 border border-gray-800 text-gray-300 text-sm">
                    "{visibleEvent.suggestedVersion}"
                  </div>
                )}
              </div>
            )}
          </div>
          <button 
            onClick={() => setVisibleEvent(null)}
            className="text-gray-600 hover:text-gray-400 px-2"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
}
