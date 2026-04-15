import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, MessageSquare, Settings, ShieldCheck, Zap, Search, Mic } from 'lucide-react';
import { Session, Message } from './types';
import { generateStreamingResponse } from './services/geminiService';
import ChatBubble from './components/ChatBubble';
import StatusPanel from './components/StatusPanel';
import SpecsPanel from './components/SpecsPanel';

export default function App() {
  const [sessions, setSessions] = useState<Session[]>([
    { id: '1', title: 'Nexus Core Initialization', messages: [], lastUpdated: Date.now() }
  ]);
  const [activeSessionId, setActiveSessionId] = useState('1');
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];

  useEffect(() => {
    if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'zh-HK'; // Default to Cantonese for Nexus

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputValue(prev => prev + transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeSession.messages]);

  const handleSend = async () => {
    if (!inputValue.trim() || isTyping) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: Date.now(),
    };

    const assistantMessageId = (Date.now() + 1).toString();
    const initialAssistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
    };

    setSessions(prev => prev.map(s => {
      if (s.id === activeSessionId) {
        return {
          ...s,
          messages: [...s.messages, userMessage, initialAssistantMessage],
          lastUpdated: Date.now(),
        };
      }
      return s;
    }));

    setInputValue('');
    setIsTyping(true);

    try {
      const history = activeSession.messages.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      }));

      const stream = generateStreamingResponse(inputValue, history);
      let fullContent = '';

      for await (const chunk of stream) {
        fullContent += chunk;
        setSessions(prev => prev.map(s => {
          if (s.id === activeSessionId) {
            return {
              ...s,
              messages: s.messages.map(m => 
                m.id === assistantMessageId ? { ...m, content: fullContent } : m
              ),
              lastUpdated: Date.now(),
            };
          }
          return s;
        }));
      }
    } catch (error) {
      console.error("Failed to generate response:", error);
    } finally {
      setIsTyping(false);
    }
  };

  const createNewSession = () => {
    const newSession: Session = {
      id: Date.now().toString(),
      title: `New Session ${sessions.length + 1}`,
      messages: [],
      lastUpdated: Date.now(),
    };
    setSessions([newSession, ...sessions]);
    setActiveSessionId(newSession.id);
  };

  return (
    <div className="relative h-screen w-screen bg-nexus-bg overflow-hidden selection:bg-white/20">
      {/* Ambient Lighting Layers */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[10%] w-[60%] h-[60%] bg-blue-500/10 rounded-full blur-[160px] animate-pulse" />
        <div className="absolute bottom-[-20%] right-[10%] w-[60%] h-[60%] bg-purple-500/10 rounded-full blur-[160px] animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <StatusPanel />

      {/* Main Layout */}
      <div className="relative z-10 h-full flex flex-col items-center pt-24 pb-16 px-12">
        
        {/* Session Switcher (macOS Dock Style) */}
        <div className="flex items-center gap-4 mb-12 p-2.5 glass-morphism rounded-[28px] shadow-2xl">
          <button 
            onClick={createNewSession}
            className="flex-shrink-0 w-10 h-10 rounded-[18px] bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all hover:scale-110 active:scale-90 group"
          >
            <Plus size={18} className="group-hover:rotate-90 transition-transform duration-300" />
          </button>
          <div className="w-[1px] h-8 bg-white/10 mx-1" />
          <div className="flex items-center gap-2">
            {sessions.map(session => (
              <button
                key={session.id}
                onClick={() => setActiveSessionId(session.id)}
                className={`flex-shrink-0 px-5 py-2.5 rounded-[18px] text-[13px] font-semibold transition-all duration-500 ${
                  activeSessionId === session.id 
                    ? 'bg-white text-black scale-105 shadow-[0_10px_30px_rgba(255,255,255,0.2)]' 
                    : 'text-white/40 hover:text-white/80 hover:bg-white/5'
                }`}
              >
                {session.title}
              </button>
            ))}
          </div>
        </div>

        {/* Main Viewport */}
        <div className="flex-1 w-full flex gap-16 items-start max-w-7xl">
          {/* Chat Container */}
          <div className="flex-1 h-[640px] flex flex-col relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSessionId}
                initial={{ scale: 0.99, opacity: 0, y: 20, filter: 'blur(20px)' }}
                animate={{ scale: 1, opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ scale: 1.01, opacity: 0, y: -20, filter: 'blur(20px)' }}
                transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
                className="h-full flex flex-col"
              >
                <div 
                  ref={scrollRef}
                  className="flex-1 overflow-y-auto no-scrollbar space-y-6 pr-6"
                >
                  {activeSession.messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-30 space-y-8">
                      <motion.div 
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
                        className="w-24 h-24 rounded-full border border-white/10 flex items-center justify-center relative"
                      >
                        <Zap size={48} className="text-white/60" />
                        <div className="absolute inset-0 rounded-full border-t-2 border-blue-500/40" />
                      </motion.div>
                      <div className="space-y-3">
                        <h2 className="text-3xl font-light tracking-[0.3em] uppercase gemini-gradient-text">Nexus Core</h2>
                        <p className="text-sm max-w-sm mx-auto leading-relaxed text-white/60">Atomic-precision AGI interface initialized. All systems nominal. Waiting for high-level command sequence...</p>
                      </div>
                    </div>
                  ) : (
                    activeSession.messages.map(message => (
                      <ChatBubble key={message.id} message={message} />
                    ))
                  )}
                  {isTyping && (
                    <div className="flex justify-start mb-10">
                      <div className="flex items-center gap-4">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#4285F4] to-[#D96570] animate-spin-slow shadow-lg shadow-purple-500/20" />
                        <div className="bg-white/[0.03] px-5 py-4 rounded-[24px] border border-white/[0.05]">
                          <motion.div 
                            animate={{ opacity: [0.3, 1, 0.3] }}
                            transition={{ repeat: Infinity, duration: 2 }}
                            className="flex gap-1.5"
                          >
                            <div className="w-1.5 h-1.5 bg-white/40 rounded-full" />
                            <div className="w-1.5 h-1.5 bg-white/40 rounded-full" />
                            <div className="w-1.5 h-1.5 bg-white/40 rounded-full" />
                          </motion.div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="hidden xl:block sticky top-0">
            <SpecsPanel />
          </div>
        </div>

        {/* Input Section (Gemini Pro Style) */}
        <div className="w-full h-[160px] flex justify-center items-center relative">
          <div className="w-[800px] group relative">
            <div className="absolute -inset-1.5 bg-gradient-to-r from-[#4285F4]/30 via-[#9B72CB]/30 to-[#D96570]/30 rounded-[30px] blur-2xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-1000" />
            <div className="relative h-[60px] glass-morphism rounded-[28px] flex items-center px-6 justify-between border border-white/10 shadow-2xl backdrop-blur-[50px]">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder={isListening ? "Listening..." : "Message Nexus..."}
                className="flex-1 bg-transparent border-none outline-none text-[16px] text-white/90 placeholder:text-white/20"
              />
              <div className="flex items-center gap-5">
                <button 
                  onClick={toggleListening}
                  className={`transition-all duration-300 ${
                    isListening ? 'text-red-500 scale-125 animate-pulse' : 'text-white/20 hover:text-white/60'
                  }`}
                >
                  <Mic size={20} />
                </button>
                <button 
                  onClick={handleSend}
                  disabled={!inputValue.trim() || isTyping}
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                    inputValue.trim() && !isTyping 
                      ? 'bg-white text-black scale-105 hover:scale-115 active:scale-90 shadow-xl' 
                      : 'bg-white/5 text-white/10'
                  }`}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M12 1v22M5 8l7-7 7 7"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="mt-6 flex items-center gap-12 text-white/10">
          <button className="hover:text-white/50 transition-all hover:scale-110"><MessageSquare size={20} /></button>
          <button className="hover:text-white/50 transition-all hover:scale-110"><ShieldCheck size={20} /></button>
          <button className="hover:text-white/50 transition-all hover:scale-110"><Settings size={20} /></button>
        </div>
      </div>

      {/* Floating Anchor (macOS Style) */}
      <motion.div 
        drag
        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
        dragElastic={0.1}
        className="fixed bottom-1/2 right-6 w-5 h-5 rounded-full bg-white/20 border border-white/10 shadow-[0_0_30px_rgba(255,255,255,0.15)] cursor-grab active:cursor-grabbing z-50 translate-y-1/2 backdrop-blur-md"
      />
    </div>
  );
}
