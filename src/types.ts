export type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
};

export type Session = {
  id: string;
  title: string;
  messages: Message[];
  lastUpdated: number;
};

export type AtomicState = {
  fps: number;
  memory: string;
  securityStatus: 'SECURE' | 'SCANNING' | 'HEALING';
  latency: number;
  gpuUsage: number;
};
