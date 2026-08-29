import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Brain, Plus, Trash2, User, Sparkles, Sliders, ShieldCheck, Download } from 'lucide-react';
import { MemoryItem, UserProfile, FriendVibe } from '../types';

interface MemoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  memories: MemoryItem[];
  onAddMemory: (fact: string, category: MemoryItem['category']) => void;
  onDeleteMemory: (id: string) => void;
  onClearMemories: () => void;
  userProfile: UserProfile;
  onUpdateProfile: (profile: UserProfile) => void;
}

export const MemoriesModal: React.FC<MemoriesModalProps> = ({
  isOpen,
  onClose,
  memories,
  onAddMemory,
  onDeleteMemory,
  onClearMemories,
  userProfile,
  onUpdateProfile,
}) => {
  const [activeTab, setActiveTab] = useState<'memories' | 'persona' | 'profile'>('memories');
  const [newFact, setNewFact] = useState('');
  const [newCategory, setNewCategory] = useState<MemoryItem['category']>('general');
  const [profileName, setProfileName] = useState(userProfile.name || '');
  const [profileNickname, setProfileNickname] = useState(userProfile.nickname || '');
  const [profileVibe, setProfileVibe] = useState<FriendVibe>(userProfile.vibe || 'reflective');
  const [customNotes, setCustomNotes] = useState(userProfile.customNotes || '');

  if (!isOpen) return null;

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFact.trim()) return;
    onAddMemory(newFact.trim(), newCategory);
    setNewFact('');
  };

  const handleSaveProfile = () => {
    onUpdateProfile({
      name: profileName.trim(),
      nickname: profileNickname.trim(),
      vibe: profileVibe,
      customNotes: customNotes.trim(),
    });
  };

  const vibes: { id: FriendVibe; label: string; description: string }[] = [
    {
      id: 'reflective',
      label: 'Calm & Reflective',
      description: 'Attentive, gentle, thoughtful, and deep-listening.',
    },
    {
      id: 'warm',
      label: 'Warm & Supportive',
      description: 'Nurturing, empathetic, encouraging, and kind.',
    },
    {
      id: 'candid',
      label: 'Direct & Candid',
      description: 'Clear, perceptive, honest, and grounded.',
    },
    {
      id: 'playful',
      label: 'Playful & Witty',
      description: 'Lighthearted, curious, conversational, and energetic.',
    },
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/25 backdrop-blur-xs">
        <div className="absolute inset-0" onClick={onClose} />

        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-lg bg-[#FAFAFA] rounded-[24px] shadow-2xl border border-gray-200/80 overflow-hidden flex flex-col max-h-[85vh] z-10"
        >
          {/* Header */}
          <div className="p-5 pb-3 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                <Brain className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-semibold text-sm text-[#111111]">Achat Memory & Presence</h2>
                <p className="text-[11.5px] text-gray-400">Continuous memory across your conversations</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-[#111111] hover:bg-black/[0.03] rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Segmented Control / Tabs */}
          <div className="px-5 pt-3">
            <div className="flex bg-gray-200/50 p-1 rounded-xl text-xs font-medium">
              <button
                onClick={() => setActiveTab('memories')}
                className={`flex-1 py-1.5 rounded-lg transition-all ${
                  activeTab === 'memories'
                    ? 'bg-white text-[#111111] shadow-2xs font-semibold'
                    : 'text-gray-500 hover:text-[#111111]'
                }`}
              >
                Memories ({memories.length})
              </button>
              <button
                onClick={() => setActiveTab('persona')}
                className={`flex-1 py-1.5 rounded-lg transition-all ${
                  activeTab === 'persona'
                    ? 'bg-white text-[#111111] shadow-2xs font-semibold'
                    : 'text-gray-500 hover:text-[#111111]'
                }`}
              >
                Friend Vibe
              </button>
              <button
                onClick={() => setActiveTab('profile')}
                className={`flex-1 py-1.5 rounded-lg transition-all ${
                  activeTab === 'profile'
                    ? 'bg-white text-[#111111] shadow-2xs font-semibold'
                    : 'text-gray-500 hover:text-[#111111]'
                }`}
              >
                About You
              </button>
            </div>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {activeTab === 'memories' && (
              <div className="space-y-4">
                {/* Add new memory manually */}
                <form onSubmit={handleAddSubmit} className="space-y-2">
                  <label className="text-xs font-semibold text-[#111111] block">
                    Teach Achat something to remember
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g., Prefers writing in the morning, has a golden retriever named Luna..."
                      value={newFact}
                      onChange={(e) => setNewFact(e.target.value)}
                      className="flex-1 px-3.5 py-2 bg-white border border-gray-200/80 rounded-xl text-xs text-[#111111] placeholder:text-gray-400 focus:outline-none focus:border-indigo-600 transition-colors shadow-2xs"
                    />
                    <button
                      type="submit"
                      disabled={!newFact.trim()}
                      className="px-3.5 py-2 bg-indigo-600 disabled:bg-gray-200 text-white rounded-xl text-xs font-semibold transition-colors hover:bg-indigo-700 active:scale-95 shrink-0 shadow-xs"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </form>

                {/* Memories List */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-gray-400 pt-2">
                    <span>What Achat knows ({memories.length})</span>
                    {memories.length > 0 && (
                      <button
                        onClick={() => {
                          if (confirm('Clear all learned memories?')) {
                            onClearMemories();
                          }
                        }}
                        className="text-rose-600 hover:underline text-[11px] font-medium"
                      >
                        Clear All
                      </button>
                    )}
                  </div>

                  {memories.length === 0 ? (
                    <div className="p-6 text-center bg-white rounded-2xl border border-gray-100 text-xs text-gray-400 leading-relaxed shadow-2xs">
                      <Sparkles className="w-5 h-5 mx-auto mb-2 text-indigo-500" />
                      Achat automatically learns and remembers key details as you chat, or you can add them above.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {memories.map((m) => (
                        <div
                          key={m.id}
                          className="group flex items-center justify-between p-3.5 bg-white rounded-2xl border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] text-xs text-[#111111]"
                        >
                          <div className="flex-1 pr-3">
                            <p className="font-normal leading-relaxed text-[#333333]">{m.fact}</p>
                            <span className="text-[10px] text-gray-400 block mt-0.5 font-medium">
                              {new Date(m.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <button
                            onClick={() => onDeleteMemory(m.id)}
                            className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-all shrink-0"
                            title="Forget memory"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'persona' && (
              <div className="space-y-3">
                <p className="text-xs text-gray-400">
                  Choose the conversational presence and tone you prefer from Achat.
                </p>

                <div className="space-y-2">
                  {vibes.map((v) => {
                    const isSelected = profileVibe === v.id;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => {
                          setProfileVibe(v.id);
                          onUpdateProfile({
                            ...userProfile,
                            vibe: v.id,
                          });
                        }}
                        className={`w-full text-left p-3.5 rounded-2xl transition-all border ${
                          isSelected
                            ? 'bg-white border-indigo-600 shadow-[0_2px_12px_rgba(79,70,229,0.08)] ring-1 ring-indigo-600'
                            : 'bg-white border-gray-100 hover:bg-gray-50/80 shadow-2xs'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-[#111111]">{v.label}</span>
                          {isSelected && (
                            <span className="w-2 h-2 rounded-full bg-indigo-600" />
                          )}
                        </div>
                        <p className="text-[11.5px] text-gray-400 leading-normal">{v.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === 'profile' && (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-[#111111] block mb-1">
                    Your Name
                  </label>
                  <input
                    type="text"
                    placeholder="How should Achat address you?"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    onBlur={handleSaveProfile}
                    className="w-full px-3.5 py-2 bg-white border border-gray-200/80 rounded-xl text-xs text-[#111111] placeholder:text-gray-400 focus:outline-none focus:border-indigo-600 transition-colors shadow-2xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#111111] block mb-1">
                    Custom Context or Journaling Goals (Optional)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="e.g., I'm focusing on building deep work habits, journaling my startup journey..."
                    value={customNotes}
                    onChange={(e) => setCustomNotes(e.target.value)}
                    onBlur={handleSaveProfile}
                    className="w-full px-3.5 py-2 bg-white border border-gray-200/80 rounded-xl text-xs text-[#111111] placeholder:text-gray-400 focus:outline-none focus:border-indigo-600 transition-colors resize-none shadow-2xs"
                  />
                </div>

                <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl text-[11px] text-emerald-900 flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    Your memories and preferences stay in your browser and are injected seamlessly into conversation requests.
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-100 bg-white/50 flex items-center justify-end">
            <button
              onClick={() => {
                handleSaveProfile();
                onClose();
              }}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition-all active:scale-95 shadow-xs"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
