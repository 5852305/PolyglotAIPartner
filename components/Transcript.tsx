import React, { useEffect, useRef } from 'react';
import { TranscriptItem } from '../types';

interface TranscriptProps {
  items: TranscriptItem[];
}

export const Transcript: React.FC<TranscriptProps> = ({ items }) => {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [items]);

  if (items.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-500 text-sm italic">
        Conversation transcript will appear here...
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
      {items.map((item, idx) => (
        <div
          key={item.id + idx}
          className={`flex w-full ${item.sender === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          <div
            className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm
              ${item.sender === 'user' 
                ? 'bg-emerald-600 text-white rounded-tr-sm' 
                : 'bg-slate-800 text-slate-200 rounded-tl-sm border border-slate-700'
              }
              ${!item.isComplete ? 'opacity-70' : 'opacity-100'}
            `}
          >
            <p>{item.text}</p>
          </div>
        </div>
      ))}
      <div ref={endRef} />
    </div>
  );
};
