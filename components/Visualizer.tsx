import React, { useEffect, useRef } from 'react';

interface VisualizerProps {
  volume: number;
  isAgentSpeaking: boolean;
}

export const Visualizer: React.FC<VisualizerProps> = ({ volume, isAgentSpeaking }) => {
  const bars = 5;
  
  return (
    <div className="relative w-64 h-64 flex items-center justify-center">
      {/* Central Circle */}
      <div 
        className={`absolute w-32 h-32 rounded-full transition-all duration-200 ease-out z-10 flex items-center justify-center
          ${isAgentSpeaking ? 'bg-indigo-500 shadow-[0_0_40px_rgba(99,102,241,0.6)]' : 'bg-slate-700 shadow-none'}
        `}
        style={{
          transform: `scale(${isAgentSpeaking ? 1 + Math.random() * 0.1 : 1 + volume})`,
        }}
      >
        <div className="text-4xl">
            {isAgentSpeaking ? '🤖' : '🎙️'}
        </div>
      </div>

      {/* Ripple Rings (Decorations) */}
      <div className={`absolute inset-0 rounded-full border-2 border-slate-700 opacity-20 ${isAgentSpeaking ? 'animate-ping' : ''}`} />
      <div className={`absolute inset-4 rounded-full border border-slate-600 opacity-20 ${isAgentSpeaking ? 'animate-pulse' : ''}`} />

      {/* User Voice Waves */}
      {!isAgentSpeaking && volume > 0.01 && (
        <div className="absolute flex gap-1 items-center justify-center h-full w-full opacity-60 pointer-events-none">
           {[...Array(bars)].map((_, i) => (
             <div
               key={i}
               className="w-2 bg-emerald-400 rounded-full transition-all duration-75"
               style={{
                 height: `${Math.max(10, volume * 100 * (Math.random() + 0.5))}%`,
                 opacity: 0.8
               }}
             />
           ))}
        </div>
      )}
    </div>
  );
};
