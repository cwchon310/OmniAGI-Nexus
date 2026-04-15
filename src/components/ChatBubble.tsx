import React from "react";
import { motion } from "motion/react";
import { Message } from "../types";
import { Sparkles } from "lucide-react";

interface ChatBubbleProps {
  message: Message;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-10 group`}
    >
      <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[80%]`}>
        {!isUser && (
          <div className="flex items-center gap-3 mb-3 px-1">
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#4285F4] via-[#9B72CB] to-[#D96570] flex items-center justify-center shadow-xl shadow-purple-500/30">
              <Sparkles size={14} className="text-white" />
            </div>
            <span className="text-[12px] font-semibold gemini-gradient-text uppercase tracking-[0.15em]">Nexus Intelligence</span>
          </div>
        )}
        <div
          className={`px-6 py-4 rounded-[24px] text-[16px] leading-relaxed transition-all duration-500 ${
            isUser 
              ? 'glass-morphism text-white shadow-2xl shadow-white/5 border-white/10' 
              : 'bg-white/[0.03] text-[#F5F5F7] border border-white/[0.05] hover:bg-white/[0.05]'
          }`}
        >
          {message.content}
        </div>
        {isUser && (
          <span className="text-[10px] text-white/30 mt-3 px-3 uppercase tracking-widest font-medium">Authorized Identity</span>
        )}
      </div>
    </motion.div>
  );
};

export default ChatBubble;
