import React, { useState, useEffect } from "react";
import { auth, signInWithGoogle, logout } from "../lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { LogIn, LogOut, User as UserIcon } from "lucide-react";

export function WindowControls() {
  return (
    <div className="flex gap-2 px-4">
      <div title="Close" className="w-3 h-3 rounded-full bg-[#FF5F56] border border-[#E0443E] cursor-pointer" />
      <div title="Minimize" className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-[#DEA123] cursor-pointer" />
      <div title="Maximize" className="w-3 h-3 rounded-full bg-[#27C93F] border border-[#1AAB29] cursor-pointer" />
    </div>
  );
}

export function StatusPills() {
  return (
    <div className="flex gap-2 absolute bottom-5 left-10 z-50">
      <div className="text-[9px] px-2.5 py-1 border border-white/20 rounded-full text-white/60 uppercase tracking-wider">Zero-Latent</div>
      <div className="text-[9px] px-2.5 py-1 border border-white/20 rounded-full text-white/60 uppercase tracking-wider">Military-Grade</div>
      <div className="text-[9px] px-2.5 py-1 border border-white/20 rounded-full text-white/60 uppercase tracking-wider">MoE Active</div>
    </div>
  );
}

export default function StatusPanel() {
  const [time, setTime] = useState(new Date());
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return () => {
      clearInterval(timer);
      unsubscribe();
    };
  }, []);

  const formattedTime = time.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit', 
    hour12: true 
  });

  const formattedDate = time.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });

  return (
    <>
      <div className="fixed top-0 left-0 right-0 flex justify-between items-center px-6 py-4 bg-gradient-to-b from-black/80 to-transparent z-50">
        <div className="flex items-center gap-6">
          <WindowControls />
          <div className="flex items-center gap-2 font-medium text-[14px] text-white/80">
            <div className="w-4 h-4 border border-white/40 rounded-full flex items-center justify-center text-[10px]">∞</div>
            OmniAGI Nexus
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          {user ? (
            <div className="flex items-center gap-3 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || ''} className="w-5 h-5 rounded-full" referrerPolicy="no-referrer" />
              ) : (
                <UserIcon size={14} className="text-white/40" />
              )}
              <span className="text-[11px] text-white/80 font-medium">{user.displayName?.split(' ')[0]}</span>
              <button 
                onClick={logout}
                className="text-white/20 hover:text-red-400 transition-colors ml-1"
                title="Logout"
              >
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            <button 
              onClick={signInWithGoogle}
              className="flex items-center gap-2 bg-white text-black px-4 py-1.5 rounded-full text-[11px] font-bold hover:scale-105 active:scale-95 transition-all shadow-lg"
            >
              <LogIn size={14} />
              Login
            </button>
          )}

          <div className="flex items-center gap-6 text-[11px] text-white/60 font-medium">
            <div className="flex items-center gap-2 uppercase tracking-[0.1em] text-white/30">
              <span>v1.0.0-infinity</span>
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            </div>
            <div className="flex items-center gap-3 border-l border-white/10 pl-6">
              <span className="opacity-60">{formattedDate}</span>
              <span className="font-semibold">{formattedTime}</span>
            </div>
          </div>
        </div>
      </div>
      <StatusPills />
    </>
  );
}
