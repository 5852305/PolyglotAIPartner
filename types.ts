export interface TranscriptItem {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  timestamp: Date;
  isComplete: boolean;
}

export interface Language {
  code: string;
  name: string;
  voiceName: string; // Gemini voice name
}

export enum ConnectionStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  ERROR = 'error',
}
