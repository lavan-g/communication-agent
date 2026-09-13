import { useEffect, useRef } from 'react';
import type { TranscriptChunk } from '@communication-agent/types';

export default function TranscriptFeed({ chunks, liveText }: { chunks: TranscriptChunk[], liveText: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [chunks, liveText]);

  return (
    <div 
      ref={containerRef}
      className="flex-1 overflow-y-auto p-8 font-sans text-lg tracking-wide max-w-4xl mx-auto w-full space-y-6 scroll-smooth"
    >
      {chunks.map((chunk, idx) => (
        <div key={idx} className="flex gap-6 group">
          <div className="text-sm text-gray-600 select-none pt-1 w-12 text-right opacity-0 group-hover:opacity-100 transition-opacity">
            {new Date(chunk.timestamp).toLocaleTimeString([], { minute: '2-digit', second: '2-digit' })}
          </div>
          <div className="flex-1 text-gray-200 leading-relaxed">
            {chunk.text}
          </div>
        </div>
      ))}
      
      {liveText && (
        <div className="flex gap-6">
           <div className="w-12 pt-1">
             <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse ml-auto" />
           </div>
           <div className="flex-1 text-gray-500 leading-relaxed italic">
             {liveText}
           </div>
        </div>
      )}
      
      <div className="h-32" /> {/* Bottom padding */}
    </div>
  );
}
