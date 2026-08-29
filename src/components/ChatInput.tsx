import React, { useRef, useEffect, useState } from 'react';
import { ArrowUp, Mic, MicOff, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ChatInputProps {
  onSendMessage: (content: string) => void;
  disabled: boolean;
  isStreaming: boolean;
  onStopStreaming?: () => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  disabled,
  isStreaming,
  onStopStreaming,
}) => {
  const [text, setText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  // Auto-resize textarea based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(scrollHeight, 160)}px`;
    }
  }, [text]);

  // Web Speech API for voice dictation
  const handleToggleVoice = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join('');
        setText(prev => (prev ? `${prev} ${transcript}` : transcript));
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if (isStreaming && onStopStreaming) {
      onStopStreaming();
      return;
    }

    const trimmed = text.trim();
    if (!trimmed || disabled) return;

    onSendMessage(trimmed);
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  return (
    <div className="w-full max-w-[640px] mx-auto px-4 pb-5 pt-2">
      <div
        className={`relative flex items-end gap-2 bg-white rounded-[24px] p-2 pl-5 shadow-[0_10px_30px_rgba(0,0,0,0.04)] border border-gray-100 transition-all focus-within:shadow-[0_12px_36px_rgba(0,0,0,0.06)] focus-within:border-gray-200 ${
          disabled && !isStreaming ? 'opacity-60 pointer-events-none' : ''
        }`}
      >
        <textarea
          id="chat-input-textarea"
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Talk to Achat..."
          rows={1}
          disabled={disabled && !isStreaming}
          className="w-full resize-none bg-transparent py-2.5 text-[15px] text-[#111111] placeholder:text-gray-400 placeholder:font-normal focus:outline-none max-h-40 overflow-y-auto leading-relaxed"
        />

        <div className="flex items-center gap-1.5 pb-0.5 pr-0.5 shrink-0">
          {/* Voice dictation button */}
          <button
            id="voice-dictation-btn"
            type="button"
            onClick={handleToggleVoice}
            className={`p-2.5 rounded-full transition-all ${
              isListening
                ? 'bg-rose-50 text-rose-600 animate-pulse'
                : 'text-gray-400 hover:text-[#111111] hover:bg-black/[0.03]'
            }`}
            title={isListening ? 'Stop listening' : 'Voice dictation'}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          {/* Send / Stop Button */}
          {isStreaming ? (
            <button
              id="stop-streaming-btn"
              type="button"
              onClick={onStopStreaming}
              className="w-9 h-9 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center transition-transform active:scale-95 shadow-sm"
              title="Pause response"
            >
              <div className="w-2.5 h-2.5 bg-white rounded-[2px]" />
            </button>
          ) : (
            <button
              id="send-message-btn"
              type="button"
              onClick={handleSubmit}
              disabled={!text.trim()}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-95 ${
                text.trim()
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-300 cursor-not-allowed'
              }`}
              title="Send message"
            >
              <ArrowUp className="w-4 h-4 stroke-[2.5]" />
            </button>
          )}
        </div>
      </div>

      <div className="mt-2.5 flex items-center justify-center gap-3 text-center">
        <span className="text-[11px] uppercase tracking-wider font-semibold text-gray-400">
          Achat reflects & remembers across your conversations
        </span>
      </div>
    </div>
  );
};
