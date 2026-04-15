import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  MessageSquare, 
  Settings, 
  ShieldCheck, 
  Zap, 
  Search, 
  Mic, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  Archive, 
  X, 
  Filter, 
  Calendar, 
  User, 
  BarChart2, 
  ChevronLeft, 
  ChevronRight,
  Edit3,
  RotateCcw
} from 'lucide-react';
import { Session, Message } from './types';
import { generateStreamingResponse } from './services/geminiService';
import ChatBubble from './components/ChatBubble';
import StatusPanel from './components/StatusPanel';
import SpecsPanel from './components/SpecsPanel';
import Modal from './components/Modal';

function Tooltip({ children, text }: { children: React.ReactNode; text: string }) {
  return (
    <div className="group relative flex items-center justify-center">
      {children}
      <div className="absolute bottom-full mb-2 hidden group-hover:block z-[100]">
        <div className="bg-black/80 backdrop-blur-md border border-white/10 text-white text-[10px] px-2 py-1 rounded-md whitespace-nowrap shadow-xl">
          {text}
        </div>
      </div>
    </div>
  );
}

import { auth, db, signInWithGoogle, logout, saveSessionToFirestore, deleteSessionFromFirestore } from './lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState('');

  // Firebase Auth Sync
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) {
        // Fallback to local storage if not logged in
        const saved = localStorage.getItem('nexus_sessions');
        setSessions(saved ? JSON.parse(saved) : [
          { id: '1', title: 'Nexus Core Initialization', messages: [], lastUpdated: Date.now() }
        ]);
      }
    });
    return () => unsubscribe();
  }, []);

  // Firestore Sync
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'users', user.uid, 'sessions'),
      orderBy('lastUpdated', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => doc.data() as Session);
      if (docs.length > 0) {
        setSessions(docs);
        if (!activeSessionId) setActiveSessionId(docs[0].id);
      } else {
        // Initialize if empty
        const initialSession: Session = { id: '1', title: 'Nexus Core Initialization', messages: [], lastUpdated: Date.now() };
        setSessions([initialSession]);
        setActiveSessionId('1');
      }
    });

    return () => unsubscribe();
  }, [user]);
  const [inputValue, setInputValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [lastSaved, setLastSaved] = useState<number>(Date.now());
  const [isArchiveView, setIsArchiveView] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<Session | null>(null);
  const [sessionToRename, setSessionToRename] = useState<Session | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [searchFilters, setSearchFilters] = useState({
    role: 'all' as 'all' | 'user' | 'assistant',
    dateRange: 'all' as 'all' | 'today' | 'week' | 'month',
    minWords: 0,
  });
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0] || { id: '', title: '', messages: [], lastUpdated: Date.now() };

  // Persistence - Reactive
  useEffect(() => {
    localStorage.setItem('nexus_sessions', JSON.stringify(sessions));
    setLastSaved(Date.now());
  }, [sessions]);

  useEffect(() => {
    localStorage.setItem('nexus_active_session_id', activeSessionId);
  }, [activeSessionId]);

  // Persistence - 30s Heartbeat (Atomic Backup)
  useEffect(() => {
    const interval = setInterval(() => {
      localStorage.setItem('nexus_sessions', JSON.stringify(sessions));
      localStorage.setItem('nexus_active_session_id', activeSessionId);
      setLastSaved(Date.now());
      console.log('Nexus Atomic Backup completed at:', new Date().toLocaleTimeString());
    }, 30000);

    return () => clearInterval(interval);
  }, [sessions, activeSessionId]);

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

  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsTyping(false);
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeSession?.messages]);

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

    setSessions(prev => {
      const updated = prev.map(s => {
        if (s.id === activeSessionId) {
          const newSession = {
            ...s,
            messages: [...s.messages, userMessage, initialAssistantMessage],
            lastUpdated: Date.now(),
          };
          if (user) saveSessionToFirestore(user.uid, newSession);
          return newSession;
        }
        return s;
      });
      return updated;
    });

    setInputValue('');
    setIsTyping(true);
    abortControllerRef.current = new AbortController();

    try {
      const history = activeSession.messages.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      }));

      const stream = generateStreamingResponse(userMessage.content, history);
      let fullContent = '';

      for await (const chunk of stream) {
        if (abortControllerRef.current?.signal.aborted) break;
        
        fullContent += chunk;
        setSessions(prev => {
          const updated = prev.map(s => {
            if (s.id === activeSessionId) {
              const newSession = {
                ...s,
                messages: s.messages.map(m => 
                  m.id === assistantMessageId ? { ...m, content: fullContent } : m
                ),
                lastUpdated: Date.now(),
              };
              if (user) saveSessionToFirestore(user.uid, newSession);
              return newSession;
            }
            return s;
          });
          return updated;
        });
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log("Generation aborted");
      } else {
        console.error("Failed to generate response:", error);
      }
    } finally {
      setIsTyping(false);
      abortControllerRef.current = null;
    }
  };

  const createNewSession = () => {
    const newSession: Session = {
      id: Date.now().toString(),
      title: `New Session ${sessions.length + 1}`,
      messages: [],
      lastUpdated: Date.now(),
    };
    if (user) {
      saveSessionToFirestore(user.uid, newSession);
    } else {
      setSessions([newSession, ...sessions]);
    }
    setActiveSessionId(newSession.id);
  };

  const deleteSession = (id: string) => {
    if (user) {
      deleteSessionFromFirestore(user.uid, id);
    } else {
      const updatedSessions = sessions.filter(s => s.id !== id);
      setSessions(updatedSessions);
      if (activeSessionId === id) {
        setActiveSessionId(updatedSessions[0]?.id || '');
      }
    }
    setSessionToDelete(null);
  };

  const toggleArchive = (id: string) => {
    setSessions(prev => {
      const updated = prev.map(s => {
        if (s.id === id) {
          const newSession = { ...s, archived: !s.archived };
          if (user) saveSessionToFirestore(user.uid, newSession);
          return newSession;
        }
        return s;
      });
      return updated;
    });
  };

  const renameSession = (id: string, title: string) => {
    setSessions(prev => {
      const updated = prev.map(s => {
        if (s.id === id) {
          const newSession = { ...s, title };
          if (user) saveSessionToFirestore(user.uid, newSession);
          return newSession;
        }
        return s;
      });
      return updated;
    });
    setSessionToRename(null);
    setNewTitle('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const filteredSessions = sessions.filter(s => {
    const matchesSearch = s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.messages.some(m => m.content.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesArchive = isArchiveView ? s.archived : !s.archived;
    
    if (!matchesSearch || !matchesArchive) return false;

    // Advanced Filters
    if (searchFilters.role !== 'all') {
      const hasRole = s.messages.some(m => m.role === searchFilters.role);
      if (!hasRole) return false;
    }

    if (searchFilters.dateRange !== 'all') {
      const now = Date.now();
      const day = 24 * 60 * 60 * 1000;
      if (searchFilters.dateRange === 'today' && now - s.lastUpdated > day) return false;
      if (searchFilters.dateRange === 'week' && now - s.lastUpdated > 7 * day) return false;
      if (searchFilters.dateRange === 'month' && now - s.lastUpdated > 30 * day) return false;
    }

    if (searchFilters.minWords > 0) {
      const totalWords = s.messages.reduce((acc, m) => acc + m.content.split(/\s+/).length, 0);
      if (totalWords < searchFilters.minWords) return false;
    }

    return true;
  });

  return (
    <div className="relative h-screen w-screen bg-nexus-bg overflow-hidden selection:bg-white/20">
      {/* Ambient Lighting Layers */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[10%] w-[60%] h-[60%] bg-blue-500/10 rounded-full blur-[160px] animate-pulse" />
        <div className="absolute bottom-[-20%] right-[10%] w-[60%] h-[60%] bg-purple-500/10 rounded-full blur-[160px] animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <StatusPanel />

      {/* Session Sidebar */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div 
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              exit={{ x: -320 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 bottom-0 w-80 glass-morphism border-r border-white/10 z-[60] shadow-2xl flex flex-col p-6 pt-24"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-[12px] font-bold uppercase tracking-[0.2em] text-white/40">Nexus Sessions</h2>
                <button 
                  onClick={() => setIsSidebarOpen(false)}
                  className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all"
                >
                  <X size={16} className="text-white/40" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar space-y-3">
                {sessions.map(session => (
                  <div 
                    key={session.id}
                    onClick={() => {
                      setActiveSessionId(session.id);
                      setIsSidebarOpen(false);
                    }}
                    className={`group relative rounded-2xl p-4 cursor-pointer border transition-all duration-300 ${
                      activeSessionId === session.id 
                        ? 'bg-white/10 border-white/10 shadow-lg' 
                        : 'border-transparent hover:bg-white/5'
                    } ${session.archived ? 'opacity-40' : ''}`}
                  >
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-medium text-white/80 truncate">{session.title}</span>
                      <span className="text-[10px] text-white/20 uppercase tracking-wider">
                        {new Date(session.lastUpdated).toLocaleDateString()} • {session.messages.length} units
                      </span>
                    </div>
                    
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSessionToRename(session);
                          setNewTitle(session.title);
                        }}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-all"
                      >
                        <Edit3 size={12} />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleArchive(session.id);
                        }}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-all"
                      >
                        <Archive size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <button 
                onClick={createNewSession}
                className="mt-6 w-full py-3 rounded-2xl bg-white text-black font-bold text-[12px] uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <Plus size={16} />
                New Session
              </button>
            </motion.div>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[55]"
            />
          </>
        )}
      </AnimatePresence>

      {/* Main Layout */}
      <div className="relative z-10 h-full flex flex-col items-center pt-24 pb-16 px-12">
        
        {/* Session Switcher (macOS Dock Style) */}
        <div className="flex flex-col items-center gap-4 mb-12">
          <div className="flex items-center gap-4 p-2.5 glass-morphism rounded-[28px] shadow-2xl">
            <Tooltip text="Create New Session">
              <button 
                onClick={createNewSession}
                className="flex-shrink-0 w-10 h-10 rounded-[18px] bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all hover:scale-110 active:scale-90 group"
              >
                <Plus size={18} className="group-hover:rotate-90 transition-transform duration-300" />
              </button>
            </Tooltip>
            <div className="w-[1px] h-8 bg-white/10 mx-1" />
            
            <Tooltip text={isArchiveView ? "View Active Sessions" : "View Archived Sessions"}>
              <button 
                onClick={() => setIsArchiveView(!isArchiveView)}
                className={`flex-shrink-0 w-10 h-10 rounded-[18px] flex items-center justify-center transition-all hover:scale-110 active:scale-90 ${
                  isArchiveView ? 'bg-purple-500/20 text-purple-400' : 'bg-white/10 text-white/40 hover:text-white/80'
                }`}
              >
                <Archive size={18} />
              </button>
            </Tooltip>

            <div className="w-[1px] h-8 bg-white/10 mx-1" />

            {/* Search Input */}
            <div className="relative flex items-center">
              <Search size={14} className="absolute left-3 text-white/20" />
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search sessions..."
                className="bg-white/5 border border-white/5 rounded-[14px] pl-9 pr-4 py-1.5 text-[12px] w-[160px] focus:w-[240px] focus:bg-white/10 transition-all outline-none placeholder:text-white/10"
              />
              <button 
                onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
                className={`ml-2 p-1.5 rounded-lg transition-all ${showAdvancedSearch ? 'bg-white/20 text-white' : 'text-white/20 hover:text-white/40'}`}
              >
                <Filter size={14} />
              </button>

              <AnimatePresence>
                {showAdvancedSearch && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute top-full mt-4 right-0 w-64 glass-morphism p-4 rounded-2xl border border-white/10 shadow-2xl z-[100] space-y-4"
                  >
                    <div className="space-y-2">
                      <label className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Message Role</label>
                      <div className="flex gap-2">
                        {['all', 'user', 'assistant'].map(role => (
                          <button
                            key={role}
                            onClick={() => setSearchFilters({...searchFilters, role: role as any})}
                            className={`flex-1 py-1.5 rounded-lg text-[10px] uppercase font-bold transition-all ${
                              searchFilters.role === role ? 'bg-white text-black' : 'bg-white/5 text-white/40 hover:bg-white/10'
                            }`}
                          >
                            {role}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Time Range</label>
                      <select 
                        value={searchFilters.dateRange}
                        onChange={(e) => setSearchFilters({...searchFilters, dateRange: e.target.value as any})}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[11px] text-white/80 outline-none"
                      >
                        <option value="all">All Time</option>
                        <option value="today">Today</option>
                        <option value="week">This Week</option>
                        <option value="month">This Month</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <label className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Min Word Count</label>
                        <span className="text-[10px] text-white/60">{searchFilters.minWords}</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" 
                        max="1000" 
                        step="50"
                        value={searchFilters.minWords}
                        onChange={(e) => setSearchFilters({...searchFilters, minWords: parseInt(e.target.value)})}
                        className="w-full accent-blue-500 h-1 bg-white/10 rounded-full appearance-none cursor-pointer"
                      />
                    </div>

                    <button 
                      onClick={() => {
                        setSearchFilters({ role: 'all', dateRange: 'all', minWords: 0 });
                        setSearchQuery('');
                      }}
                      className="w-full py-2 rounded-xl bg-white/5 text-white/40 text-[10px] uppercase font-bold hover:bg-white/10 transition-all"
                    >
                      Reset Filters
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="w-[1px] h-8 bg-white/10 mx-1" />

            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar max-w-[400px]">
              {filteredSessions.map(session => (
                <Tooltip key={session.id} text={`Switch to ${session.title}`}>
                  <button
                    onClick={() => setActiveSessionId(session.id)}
                    className={`flex-shrink-0 px-5 py-2.5 rounded-[18px] text-[13px] font-semibold transition-all duration-500 whitespace-nowrap ${
                      activeSessionId === session.id 
                        ? 'bg-white text-black scale-105 shadow-[0_10px_30px_rgba(255,255,255,0.2)]' 
                        : 'text-white/40 hover:text-white/80 hover:bg-white/5'
                    }`}
                  >
                    {session.title}
                  </button>
                </Tooltip>
              ))}
              {filteredSessions.length === 0 && (
                <span className="text-[11px] text-white/20 px-4">No sessions found</span>
              )}
            </div>
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
        <div className="w-full flex flex-col items-center gap-4 mt-8">
          <div className="w-[800px] group relative">
            <div className="absolute -inset-1.5 bg-gradient-to-r from-[#4285F4]/30 via-[#9B72CB]/30 to-[#D96570]/30 rounded-[30px] blur-2xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-1000" />
            <div className="relative min-h-[60px] glass-morphism rounded-[28px] flex items-end px-6 py-3 justify-between border border-white/10 shadow-2xl backdrop-blur-[50px]">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isListening ? "Listening..." : "Message Nexus..."}
                rows={1}
                className="flex-1 bg-transparent border-none outline-none text-[16px] text-white/90 placeholder:text-white/20 resize-none py-2 max-h-[200px] overflow-y-auto no-scrollbar"
                style={{ height: 'auto' }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = `${target.scrollHeight}px`;
                }}
              />
              <div className="flex items-center gap-5 pb-1">
                <Tooltip text={isListening ? "Stop Listening" : "Start Voice Input"}>
                  <button 
                    onClick={toggleListening}
                    className={`transition-all duration-300 ${
                      isListening ? 'text-red-500 scale-125 animate-pulse' : 'text-white/20 hover:text-white/60'
                    }`}
                  >
                    <Mic size={20} />
                  </button>
                </Tooltip>
                
                {isTyping ? (
                  <Tooltip text="Stop Generation">
                    <button 
                      onClick={stopGeneration}
                      className="w-9 h-9 rounded-full flex items-center justify-center bg-white/10 text-white hover:bg-white/20 transition-all"
                    >
                      <div className="w-3 h-3 bg-white rounded-sm" />
                    </button>
                  </Tooltip>
                ) : (
                  <Tooltip text="Send Message">
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
                  </Tooltip>
                )}
              </div>
            </div>
          </div>
          
          {/* Auto-save Indicator */}
          <div className="flex items-center gap-2 text-[10px] text-white/20 uppercase tracking-widest font-medium">
            <div className="w-1 h-1 rounded-full bg-green-500/50 animate-pulse" />
            Nexus Atomic Sync: {new Date(lastSaved).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="mt-6 flex items-center gap-12 text-white/10">
          <Tooltip text="Manage Sessions">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="hover:text-white/50 transition-all hover:scale-110"
            >
              <MessageSquare size={20} />
            </button>
          </Tooltip>
          <Tooltip text="Security Status"><button className="hover:text-white/50 transition-all hover:scale-110"><ShieldCheck size={20} /></button></Tooltip>
          <Tooltip text="System Settings"><button className="hover:text-white/50 transition-all hover:scale-110"><Settings size={20} /></button></Tooltip>
        </div>
      </div>

      {/* Rename Modal */}
      <Modal 
        isOpen={!!sessionToRename} 
        onClose={() => setSessionToRename(null)} 
        title="Rename Session"
      >
        <div className="space-y-6">
          <input 
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-white/30 transition-all"
            placeholder="Enter new title..."
            autoFocus
          />
          <div className="flex gap-3">
            <button 
              onClick={() => renameSession(sessionToRename!.id, newTitle)}
              className="flex-1 bg-white text-black font-semibold py-3 rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              Save Changes
            </button>
            <button 
              onClick={() => setSessionToRename(null)}
              className="flex-1 bg-white/5 text-white font-semibold py-3 rounded-xl hover:bg-white/10 transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal 
        isOpen={!!sessionToDelete} 
        onClose={() => setSessionToDelete(null)} 
        title="Confirm Deletion"
      >
        <div className="space-y-6">
          <p className="text-white/60 leading-relaxed">
            Are you sure you want to delete <span className="text-white font-semibold">"{sessionToDelete?.title}"</span>? 
            This action is permanent and all conversation data will be lost.
          </p>
          <div className="flex gap-3">
            <button 
              onClick={() => deleteSession(sessionToDelete!.id)}
              className="flex-1 bg-red-500 text-white font-semibold py-3 rounded-xl hover:bg-red-600 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              Delete Permanently
            </button>
            <button 
              onClick={() => setSessionToDelete(null)}
              className="flex-1 bg-white/5 text-white font-semibold py-3 rounded-xl hover:bg-white/10 transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      {/* Floating Anchor (macOS Style) */}
      <Tooltip text="Drag to reposition anchor">
        <motion.div 
          drag
          dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
          dragElastic={0.1}
          className="fixed bottom-1/2 right-6 w-5 h-5 rounded-full bg-white/20 border border-white/10 shadow-[0_0_30px_rgba(255,255,255,0.15)] cursor-grab active:cursor-grabbing z-50 translate-y-1/2 backdrop-blur-md"
        />
      </Tooltip>
    </div>
  );
}
