import React from 'react';
import { Sparkles, MessageSquarePlus, History, Volume2, VolumeX, Brain } from 'lucide-react';
import { Conversation } from '../types';

interface HeaderProps {
  currentConversation?: Conversation;
  onNewChat: () => void;
  onOpenHistory: () => void;
  onOpenMemories: () => void;
  memoryCount: number;
  soundEnabled: boolean;
  onToggleSound: () => void;
  isStreaming: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentConversation,
  onNewChat,
  onOpenHistory,
  onOpenMemories,
  memoryCount,
  soundEnabled,
  onToggleSound,
  isStreaming,
}) => {
  return (
    <header id="achat-header" className="sticky top-0 z-20 backdrop-blur-md bg-[#FAFAFA]/90 border-b border-gray-100/70 px-6 py-4 transition-colors">
      <div className="max-w-[640px] mx-auto flex items-center justify-between">
        {/* Left: Chat history & New Chat */}
        <div className="flex items-center gap-1">
          <button
            id="history-btn"
            onClick={onOpenHistory}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-[#111111] hover:bg-black/[0.03] rounded-xl transition-all active:scale-95"
            title="Chat History"
          >
            <History className="w-4 h-4 text-gray-400" />
            <span className="hidden sm:inline truncate max-w-[120px] font-medium">
              {currentConversation?.title || 'History'}
            </span>
          </button>

          <button
            id="new-chat-btn"
            onClick={onNewChat}
            className="p-2 text-gray-400 hover:text-[#111111] hover:bg-black/[0.03] rounded-xl transition-all active:scale-95"
            title="Start New Chat"
          >
            <MessageSquarePlus className="w-4 h-4" />
          </button>
        </div>

        {/* Center: Brand & Status */}
        <div className="flex flex-col items-center cursor-default select-none">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#111111] leading-tight">
            Achat
          </h1>
          <div className="flex items-center gap-1.5 mt-0.5">
            <div
              className={`w-1.5 h-1.5 rounded-full transition-colors duration-500 ${
                isStreaming ? 'bg-indigo-600 animate-ping' : 'bg-indigo-500'
              }`}
            />
            <span className="text-[10px] uppercase tracking-[0.1em] text-gray-400 font-medium">
              {isStreaming ? 'Reflecting' : 'Connected'}
            </span>
          </div>
        </div>

        {/* Right: Sound toggle & Memories trigger */}
        <div className="flex items-center gap-1">
          <button
            id="sound-toggle-btn"
            onClick={onToggleSound}
            className="p-2 text-gray-400 hover:text-[#111111] hover:bg-black/[0.03] rounded-xl transition-all active:scale-95"
            title={soundEnabled ? 'Mute chimes' : 'Enable chimes'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <button
            id="memories-btn"
            onClick={onOpenMemories}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#1A1A1A] bg-white hover:bg-gray-50 rounded-xl transition-all active:scale-95 border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)]"
            title="AI Memories & Profile"
          >
            <Brain className="w-3.5 h-3.5 text-indigo-600" />
            <span className="hidden xs:inline font-medium">Memory</span>
            {memoryCount > 0 && (
              <span className="text-[10px] bg-indigo-600 text-white font-semibold px-1.5 py-0.5 rounded-full leading-none">
                {memoryCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
