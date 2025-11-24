import React, { useState } from 'react';
import { useGeminiLive } from './hooks/useGeminiLive';
import { LANGUAGES } from './constants';
import { Language, ConnectionStatus } from './types';
import { LanguageSelector } from './components/LanguageSelector';
import { Visualizer } from './components/Visualizer';
import { Transcript } from './components/Transcript';

export default function App() {
  const [selectedLanguage, setSelectedLanguage] = useState<Language>(LANGUAGES[4]); // Default English
  const { status, connect, disconnect, transcripts, volume, isAgentSpeaking } = useGeminiLive({
    language: selectedLanguage
  });

  const isActive = status === ConnectionStatus.CONNECTED || status === ConnectionStatus.CONNECTING;

  const handleToggleConnection = () => {
    if (isActive) {
      disconnect();
    } else {
      connect();
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 font-sans">
      {/* Header */}
      <header className="flex-none p-4 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md flex justify-between items-center z-20">
        <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-emerald-400">
                Polyglot AI
            </h1>
        </div>
        
        <LanguageSelector 
            selected={selectedLanguage} 
            onSelect={setSelectedLanguage} 
            disabled={isActive}
        />
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        
        {/* Left Panel: Visualizer & Controls (Center stage on mobile) */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 relative bg-gradient-to-b from-slate-900 to-slate-950">
            
            {/* Status Indicator */}
            <div className="absolute top-6 left-1/2 -translate-x-1/2 flex items-center space-x-2 bg-slate-800/80 rounded-full px-3 py-1 backdrop-blur-sm border border-slate-700/50">
                <div className={`w-2 h-2 rounded-full ${
                    status === ConnectionStatus.CONNECTED ? 'bg-emerald-500 animate-pulse' :
                    status === ConnectionStatus.CONNECTING ? 'bg-yellow-500' :
                    status === ConnectionStatus.ERROR ? 'bg-red-500' :
                    'bg-slate-500'
                }`} />
                <span className="text-xs font-medium text-slate-300 uppercase tracking-wide">
                    {status === ConnectionStatus.CONNECTED ? (isAgentSpeaking ? 'Agent Speaking' : 'Listening') : status}
                </span>
            </div>

            <Visualizer volume={volume} isAgentSpeaking={isAgentSpeaking} />

            <div className="mt-12 w-full max-w-xs flex flex-col items-center space-y-4 z-10">
                <p className="text-slate-400 text-sm text-center min-h-[1.25rem]">
                    {status === ConnectionStatus.DISCONNECTED && "Ready to start practicing?"}
                    {status === ConnectionStatus.CONNECTING && "Establishing connection..."}
                    {status === ConnectionStatus.CONNECTED && isAgentSpeaking && "Listening to tutor..."}
                    {status === ConnectionStatus.CONNECTED && !isAgentSpeaking && "Your turn to speak..."}
                </p>

                <button
                    onClick={handleToggleConnection}
                    className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl
                        ${isActive 
                            ? 'bg-red-500 hover:bg-red-600 shadow-red-900/20 rotate-0' 
                            : 'bg-emerald-500 hover:bg-emerald-400 shadow-emerald-900/20 hover:scale-105'
                        }
                    `}
                >
                    {isActive ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                            <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                        </svg>
                    )}
                </button>
                <div className="text-xs text-slate-500 uppercase font-semibold tracking-wider">
                    {isActive ? 'End Session' : 'Start Conversation'}
                </div>
            </div>
        </div>

        {/* Right Panel: Transcript (Slide-over on mobile, split on desktop) */}
        <div className="flex-1 border-l border-slate-800 bg-slate-900 flex flex-col h-1/2 md:h-auto min-h-0">
            <div className="flex-none p-4 border-b border-slate-800 bg-slate-900 flex justify-between items-center">
                <h2 className="text-sm font-semibold text-slate-300">Live Transcript</h2>
                <div className="flex items-center space-x-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-xs text-emerald-500 font-medium">REAL-TIME</span>
                </div>
            </div>
            <Transcript items={transcripts} />
        </div>

      </main>
    </div>
  );
}
