import React from 'react';
import { motion } from 'motion/react';
import { Sparkles, Compass, Heart, BookOpen, Coffee } from 'lucide-react';
import { UserProfile } from '../types';

interface EmptyStateProps {
  userProfile: UserProfile;
  onSelectPrompt: (prompt: string) => void;
  memoryCount: number;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  userProfile,
  onSelectPrompt,
  memoryCount,
}) => {
  const name = userProfile.name?.trim() || userProfile.nickname?.trim();
  const greeting = name ? `Good day, ${name}` : 'Welcome to Achat';

  const prompts = [
    {
      icon: Coffee,
      title: 'Untangle a thought',
      text: "I have something on my mind and I'd like to think through it with you.",
    },
    {
      icon: Compass,
      title: 'Reflect on my day',
      text: 'Help me reflect on how today went and what stood out to me.',
    },
    {
      icon: Heart,
      title: 'Mindful pause',
      text: 'Just taking a quiet moment to check in. How are you today?',
    },
    {
      icon: BookOpen,
      title: 'What do you remember?',
      text: 'What are some key things you remember about me so far?',
    },
  ];

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 max-w-xl mx-auto text-center select-none">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full flex flex-col items-center"
      >
        {/* Minimalist Monogram / Icon */}
        <div className="w-14 h-14 rounded-2xl bg-white shadow-[0_4px_16px_rgba(0,0,0,0.03)] border border-gray-100 flex items-center justify-center mb-5 text-indigo-600">
          <Sparkles className="w-6 h-6 text-indigo-600" />
        </div>

        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#111111] mb-2">
          {greeting}
        </h1>

        <p className="text-[14.5px] text-gray-500 leading-relaxed max-w-md mb-8">
          A calm, persistent confidant that listens, remembers, and is always here for a quiet conversation.
        </p>

        {/* Thoughtful prompt starters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full text-left">
          {prompts.map((p, index) => {
            const Icon = p.icon;
            return (
              <motion.button
                key={p.title}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                onClick={() => onSelectPrompt(p.text)}
                className="group flex flex-col p-4 bg-white hover:bg-gray-50/70 rounded-2xl border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.04)] transition-all active:scale-[0.98]"
              >
                <div className="flex items-center gap-2.5 mb-1.5">
                  <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100 transition-colors">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[13.5px] font-semibold text-[#111111]">{p.title}</span>
                </div>
                <p className="text-[12.5px] text-gray-400 line-clamp-2 leading-relaxed">
                  {p.text}
                </p>
              </motion.button>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
};
