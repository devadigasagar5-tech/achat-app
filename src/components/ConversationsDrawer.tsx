import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, Search, Trash2, MessageSquare, Pin, Calendar, Download } from 'lucide-react';
import { Conversation } from '../types';

interface ConversationsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  conversations: Conversation[];
  activeConversationId: string;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onDeleteConversation: (id: string) => void;
  onClearAll: () => void;
}

export const ConversationsDrawer: React.FC<ConversationsDrawerProps> = ({
  isOpen,
  onClose,
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  onClearAll,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const filteredConversations = conversations.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.title.toLowerCase().includes(q) ||
      c.messages.some((m) => m.content.toLowerCase().includes(q))
    );
  });

  const exportAllChats = () => {
    const text = conversations
      .map((c) => {
        const dateStr = new Date(c.createdAt).toLocaleDateString();
        const body = c.messages
          .map((m) => `${m.role === 'user' ? 'You' : 'Achat'} [${new Date(m.timestamp).toLocaleTimeString()}]:\n${m.content}`)
          .join('\n\n');
        return `# ${c.title} (${dateStr})\n\n${body}\n\n---\n`;
      })
      .join('\n');

    const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `achat-history-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-start bg-black/20 backdrop-blur-xs">
        {/* Backdrop click */}
        <div className="absolute inset-0" onClick={onClose} />

        <motion.div
          initial={{ x: '-100%' }}
          animate={{ x: 0 }}
          exit={{ x: '-100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          className="relative w-full max-w-sm h-full bg-[#FAFAFA] shadow-2xl flex flex-col z-10 border-r border-gray-200/80"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-indigo-600" />
              <h2 className="font-semibold text-sm text-[#111111]">Conversations</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-[#111111] hover:bg-black/[0.03] rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* New Chat Button & Search */}
          <div className="p-3.5 space-y-2">
            <button
              onClick={() => {
                onNewChat();
                onClose();
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition-all active:scale-[0.98] shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Conversation</span>
            </button>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8.5 pr-3 py-2 bg-white border border-gray-200/80 rounded-xl text-xs text-[#111111] placeholder:text-gray-400 focus:outline-none focus:border-indigo-600 transition-colors shadow-2xs"
              />
            </div>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto px-3 py-1 space-y-1">
            {filteredConversations.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-xs">
                {searchQuery ? 'No matching conversations' : 'No previous conversations'}
              </div>
            ) : (
              filteredConversations.map((c) => {
                const isActive = c.id === activeConversationId;
                const formattedDate = new Intl.DateTimeFormat('en-US', {
                  month: 'short',
                  day: 'numeric',
                }).format(new Date(c.updatedAt));

                return (
                  <div
                    key={c.id}
                    className={`group relative flex items-center justify-between p-2.5 rounded-xl transition-all ${
                      isActive
                        ? 'bg-white shadow-[0_2px_8px_rgba(0,0,0,0.03)] border border-gray-100 text-[#111111]'
                        : 'hover:bg-white/60 text-[#333333] hover:text-[#111111]'
                    }`}
                  >
                    <button
                      onClick={() => {
                        onSelectConversation(c.id);
                        onClose();
                      }}
                      className="flex-1 min-w-0 text-left pr-2"
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <span className={`text-xs truncate ${isActive ? 'text-indigo-600 font-semibold' : 'font-medium'}`}>
                          {c.title || 'Untitled Chat'}
                        </span>
                        <span className="text-[10px] text-gray-400 shrink-0 ml-1">
                          {formattedDate}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400 truncate">
                        {c.messages.length > 0
                          ? c.messages[c.messages.length - 1].content
                          : 'Empty conversation'}
                      </p>
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteConversation(c.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-all shrink-0"
                      title="Delete conversation"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer actions */}
          <div className="p-3 border-t border-gray-100 bg-white/50 flex items-center justify-between text-xs text-gray-500">
            <button
              onClick={exportAllChats}
              className="flex items-center gap-1.5 hover:text-[#111111] p-1.5 rounded-lg hover:bg-black/[0.03] transition-colors"
              title="Export all chats as Markdown"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export History</span>
            </button>

            {conversations.length > 0 && (
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to clear all conversation history?')) {
                    onClearAll();
                  }
                }}
                className="text-rose-600 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50 transition-colors font-medium"
              >
                Clear All
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
