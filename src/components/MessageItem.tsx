import React, { useState } from 'react';
import { motion } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { Copy, Check, Volume2, VolumeX, RotateCw, Sparkles } from 'lucide-react';
import { Message } from '../types';
import { speakMessage, stopSpeaking } from '../utils/audio';

interface MessageItemProps {
  message: Message;
  isLatestAssistant?: boolean;
  onRetry?: () => void;
}

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  isLatestAssistant,
  onRetry,
}) => {
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const isUser = message.role === 'user';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleToggleSpeak = () => {
    if (isSpeaking) {
      stopSpeaking();
      setIsSpeaking(false);
    } else {
      setIsSpeaking(true);
      speakMessage(message.content, () => setIsSpeaking(false));
    }
  };

  const formattedTime = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: 'numeric',
    hour12: true,
  }).format(new Date(message.timestamp));

  return (
    <motion.div
      id={`message-${message.id}`}
      initial={{ opacity: 0, y: 8, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className={`group flex flex-col ${isUser ? 'items-end' : 'items-start'} my-3 w-full`}
    >
      <div className={`relative max-w-[85%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
        {/* Bubble */}
        <div
          className={`relative px-5 py-3.5 rounded-[22px] text-[15px] leading-relaxed transition-all ${
            isUser
              ? 'bg-indigo-600 text-white shadow-[0_4px_15px_rgba(79,70,229,0.15)] selection:bg-white/30 selection:text-white'
              : 'bg-white text-[#333333] rounded-[22px] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-gray-100/50 selection:bg-indigo-600 selection:text-white'
          }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap font-normal break-words">{message.content}</p>
          ) : (
            <div className="prose prose-sm max-w-none text-[#333333] font-normal leading-relaxed">
              <ReactMarkdown
                components={{
                  p: ({ children }) => <p className="mb-2.5 last:mb-0 text-[15px] leading-relaxed">{children}</p>,
                  ul: ({ children }) => <ul className="list-disc pl-4 mb-2.5 space-y-1">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal pl-4 mb-2.5 space-y-1">{children}</ol>,
                  li: ({ children }) => <li className="text-[14.5px] leading-relaxed">{children}</li>,
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-2 border-indigo-500/40 pl-3 italic my-2 text-gray-500">
                      {children}
                    </blockquote>
                  ),
                  code: ({ children, className }) => {
                    const isInline = !className;
                    return isInline ? (
                      <code className="bg-gray-100 text-[#111111] px-1.5 py-0.5 rounded text-[13px] font-mono">
                        {children}
                      </code>
                    ) : (
                      <code className="block bg-[#1A1A1A] text-zinc-100 p-3.5 rounded-xl text-[13px] font-mono overflow-x-auto my-2">
                        {children}
                      </code>
                    );
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>

              {message.isStreaming && (
                <span className="inline-block w-1.5 h-4 ml-1 bg-indigo-600 align-middle animate-pulse rounded-full" />
              )}
            </div>
          )}
        </div>

        {/* Action bar and timestamp */}
        <div
          className={`flex items-center gap-2 mt-2 px-1 text-[10px] text-gray-400 font-medium transition-opacity duration-200 ${
            isUser ? 'mr-3' : 'ml-3'
          } ${message.isStreaming ? 'opacity-0' : 'opacity-70 group-hover:opacity-100'}`}
        >
          <span>{formattedTime}</span>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={handleCopy}
              className="p-1 hover:text-[#111111] hover:bg-black/[0.04] rounded-md transition-colors"
              title="Copy message"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
            </button>

            {!isUser && (
              <button
                onClick={handleToggleSpeak}
                className="p-1 hover:text-[#111111] hover:bg-black/[0.04] rounded-md transition-colors"
                title={isSpeaking ? 'Stop reading' : 'Read aloud'}
              >
                {isSpeaking ? (
                  <VolumeX className="w-3 h-3 text-indigo-600" />
                ) : (
                  <Volume2 className="w-3 h-3" />
                )}
              </button>
            )}

            {!isUser && isLatestAssistant && onRetry && (
              <button
                onClick={onRetry}
                className="p-1 hover:text-[#111111] hover:bg-black/[0.04] rounded-md transition-colors"
                title="Regenerate response"
              >
                <RotateCw className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Extracted memory notification pill */}
        {message.extractedMemories && message.extractedMemories.length > 0 && (
          <div className="mt-1.5 flex items-center gap-1.5 bg-indigo-50 text-indigo-700 border border-indigo-100/70 px-3 py-1 rounded-full text-[11px] font-medium shadow-2xs">
            <Sparkles className="w-3 h-3 text-indigo-500" />
            <span>Remembered: {message.extractedMemories[0]}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
};
