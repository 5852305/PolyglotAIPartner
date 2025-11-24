import { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { ConnectionStatus, TranscriptItem, Language } from '../types';
import { createBlob, decode, decodeAudioData } from '../utils/audioUtils';
import { MODEL_NAME } from '../constants';

interface UseGeminiLiveProps {
  language: Language;
}

export const useGeminiLive = ({ language }: UseGeminiLiveProps) => {
  const [status, setStatus] = useState<ConnectionStatus>(ConnectionStatus.DISCONNECTED);
  const [transcripts, setTranscripts] = useState<TranscriptItem[]>([]);
  const [volume, setVolume] = useState<number>(0); // 0 to 1 for visualizer
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);

  // Audio Contexts and Nodes
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const outputNodeRef = useRef<GainNode | null>(null);
  
  // State refs for async access
  const streamRef = useRef<MediaStream | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  
  // Transcription accumulators
  const currentInputTranscriptionRef = useRef('');
  const currentOutputTranscriptionRef = useRef('');

  const connect = useCallback(async () => {
    if (!process.env.API_KEY) {
      alert("API Key not found. Please set process.env.API_KEY.");
      return;
    }

    try {
      setStatus(ConnectionStatus.CONNECTING);

      // Initialize Audio Contexts
      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      const outputNode = outputAudioContextRef.current.createGain();
      outputNode.connect(outputAudioContextRef.current.destination);
      outputNodeRef.current = outputNode;

      // Get User Media
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const sessionPromise = ai.live.connect({
        model: MODEL_NAME,
        callbacks: {
          onopen: () => {
            console.log('Gemini Live Connected');
            setStatus(ConnectionStatus.CONNECTED);
            
            // Setup Input Stream
            if (!inputAudioContextRef.current || !streamRef.current) return;
            
            const source = inputAudioContextRef.current.createMediaStreamSource(streamRef.current);
            const scriptProcessor = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
              const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
              
              // Calculate volume for visualizer
              let sum = 0;
              for (let i = 0; i < inputData.length; i++) {
                sum += inputData[i] * inputData[i];
              }
              const rms = Math.sqrt(sum / inputData.length);
              setVolume(Math.min(1, rms * 5)); // Boost slightly for visual effect

              const pcmBlob = createBlob(inputData);
              sessionPromiseRef.current?.then((session) => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };

            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContextRef.current.destination);
            
            inputSourceRef.current = source;
            processorRef.current = scriptProcessor;
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle Transcriptions
            if (message.serverContent?.outputTranscription) {
              const text = message.serverContent.outputTranscription.text;
              currentOutputTranscriptionRef.current += text;
              updateTranscript('agent', currentOutputTranscriptionRef.current, false);
            } else if (message.serverContent?.inputTranscription) {
              const text = message.serverContent.inputTranscription.text;
              currentInputTranscriptionRef.current += text;
              updateTranscript('user', currentInputTranscriptionRef.current, false);
            }

            if (message.serverContent?.turnComplete) {
              // Finalize transcripts
              if (currentInputTranscriptionRef.current) {
                updateTranscript('user', currentInputTranscriptionRef.current, true);
                currentInputTranscriptionRef.current = '';
              }
              if (currentOutputTranscriptionRef.current) {
                updateTranscript('agent', currentOutputTranscriptionRef.current, true);
                currentOutputTranscriptionRef.current = '';
              }
              setIsAgentSpeaking(false);
            }

            // Handle Audio Output
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio && outputAudioContextRef.current && outputNodeRef.current) {
              setIsAgentSpeaking(true);
              const ctx = outputAudioContextRef.current;
              
              // Sync time
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              
              const audioBuffer = await decodeAudioData(
                decode(base64Audio),
                ctx,
                24000,
                1
              );
              
              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputNodeRef.current);
              
              source.addEventListener('ended', () => {
                sourcesRef.current.delete(source);
                if (sourcesRef.current.size === 0) {
                    setIsAgentSpeaking(false);
                }
              });

              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
            }

            // Handle Interruption
            if (message.serverContent?.interrupted) {
              console.log('Interrupted');
              sourcesRef.current.forEach(source => source.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
              setIsAgentSpeaking(false);
              currentOutputTranscriptionRef.current = ''; // Clear partial text if interrupted
            }
          },
          onclose: () => {
            console.log('Gemini Live Closed');
            setStatus(ConnectionStatus.DISCONNECTED);
          },
          onerror: (err) => {
            console.error('Gemini Live Error', err);
            setStatus(ConnectionStatus.ERROR);
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: language.voiceName } },
          },
          systemInstruction: `You are a friendly, patient, and helpful language tutor helping the user practice speaking ${language.name}. 
          Conversations should be casual and suitable for a beginner to intermediate learner. 
          If the user makes a grammar mistake, gently correct them in a natural way before continuing the conversation. 
          Keep your responses concise (under 40 words) to encourage back-and-forth dialogue.`,
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
      });

      sessionPromiseRef.current = sessionPromise;

    } catch (error) {
      console.error("Connection failed", error);
      setStatus(ConnectionStatus.ERROR);
    }
  }, [language]);

  const disconnect = useCallback(async () => {
    if (sessionPromiseRef.current) {
        /*
          NOTE: session.close() is not strictly defined in the provided snippets 
          but usually exists on the session object or we just stop sending/receiving.
          The snippets say "When the conversation is finished, use session.close()".
        */
        const session = await sessionPromiseRef.current;
        // Check if close exists before calling to be safe with types
        if (session && typeof session.close === 'function') {
            session.close();
        }
    }
    
    // Cleanup Audio
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (inputAudioContextRef.current) {
      inputAudioContextRef.current.close();
      inputAudioContextRef.current = null;
    }

    if (outputAudioContextRef.current) {
        outputAudioContextRef.current.close();
        outputAudioContextRef.current = null;
    }

    if (processorRef.current) {
        processorRef.current.disconnect();
        processorRef.current = null;
    }

    sourcesRef.current.forEach(s => s.stop());
    sourcesRef.current.clear();
    
    setStatus(ConnectionStatus.DISCONNECTED);
    setVolume(0);
    setIsAgentSpeaking(false);
  }, []);

  const updateTranscript = (sender: 'user' | 'agent', text: string, isComplete: boolean) => {
    setTranscripts(prev => {
      const last = prev[prev.length - 1];
      // If the last message is from the same sender and not complete, update it
      // Otherwise add new
      if (last && last.sender === sender && !last.isComplete) {
        const updated = [...prev];
        updated[updated.length - 1] = { ...last, text, isComplete };
        return updated;
      } else {
         // Prevent empty bubbles
         if (text.trim() === '') return prev;
         
         return [...prev, {
           id: Date.now().toString(),
           sender,
           text,
           timestamp: new Date(),
           isComplete
         }];
      }
    });
  };

  return {
    status,
    connect,
    disconnect,
    transcripts,
    volume,
    isAgentSpeaking,
  };
};
