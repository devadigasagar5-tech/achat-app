import React, { useState, useEffect, useRef } from 'react';
import { useLocalStorage } from './hooks/useLocalStorage';
import { Conversation, Message, MemoryItem, UserProfile } from './types';
import { Header } from './components/Header';
import { MessageItem } from './components/MessageItem';
import { ChatInput } from './components/ChatInput';
import { EmptyState } from './components/EmptyState';
import { MemoriesModal } from './components/MemoriesModal';
import { ConversationsDrawer } from './components/ConversationsDrawer';
import { playSendSound, playReceiveSound } from './utils/audio';

const DEFAULT_PROFILE: UserProfile = {
  name: '',
  nickname: '',
  vibe: 'reflective',
  customNotes: '',
};

export default function App() {
  const [conversations, setConversations] = useLocalStorage<Conversation[]>('achat_conversations', []);
  const [activeConversationId, setActiveConversationId] = useLocalStorage<string>('achat_active_id', '');
  const [memories, setMemories] = useLocalStorage<MemoryItem[]>('achat_memories', []);
  const [userProfile, setUserProfile] = useLocalStorage<UserProfile>('achat_profile', DEFAULT_PROFILE);
  const [soundEnabled, setSoundEnabled] = useLocalStorage<boolean>('achat_sound_enabled', true);

  const [isStreaming, setIsStreaming] = useState(false);
  const [isMemoriesOpen, setIsMemoriesOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Initialize a default conversation if none exist
  useEffect(() => {
    if (conversations.length === 0) {
      const newConv: Conversation = {
        id: crypto.randomUUID(),
        title: 'New Conversation',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: [],
      };
      setConversations([newConv]);
      setActiveConversationId(newConv.id);
    } else if (!activeConversationId || !conversations.some(c => c.id === activeConversationId)) {
      setActiveConversationId(conversations[0].id);
    }
  }, [conversations, activeConversationId, setConversations, setActiveConversationId]);

  const currentConversation = conversations.find(c => c.id === activeConversationId) || conversations[0];
  const messages = currentConversation?.messages || [];

  // Scroll to bottom smoothly
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    scrollToBottom(isStreaming ? 'auto' : 'smooth');
  }, [messages.length, isStreaming]);

  // Create a new conversation
  const handleNewChat = () => {
    if (isStreaming && abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
    }
    const newConv: Conversation = {
      id: crypto.randomUUID(),
      title: 'New Conversation',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
    };
    setConversations(prev => [newConv, ...prev]);
    setActiveConversationId(newConv.id);
  };

  // Delete conversation
  const handleDeleteConversation = (id: string) => {
    const remaining = conversations.filter(c => c.id !== id);
    if (remaining.length === 0) {
      const freshConv: Conversation = {
        id: crypto.randomUUID(),
        title: 'New Conversation',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: [],
      };
      setConversations([freshConv]);
      setActiveConversationId(freshConv.id);
    } else {
      setConversations(remaining);
      if (activeConversationId === id) {
        setActiveConversationId(remaining[0].id);
      }
    }
  };

  const handleClearAllConversations = () => {
    const freshConv: Conversation = {
      id: crypto.randomUUID(),
      title: 'New Conversation',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
    };
    setConversations([freshConv]);
    setActiveConversationId(freshConv.id);
  };

  // Memory management
  const handleAddMemory = (fact: string, category: MemoryItem['category'] = 'general') => {
    const newMem: MemoryItem = {
      id: crypto.randomUUID(),
      category,
      fact,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setMemories(prev => [newMem, ...prev]);
  };

  const handleDeleteMemory = (id: string) => {
    setMemories(prev => prev.filter(m => m.id !== id));
  };

  const handleClearMemories = () => {
    setMemories([]);
  };

  // Stop active streaming response
  const handleStopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
  };

  // Send message and stream response
  const handleSendMessage = async (content: string) => {
    if (!content.trim() || isStreaming) return;

    if (soundEnabled) {
      playSendSound();
    }

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: content.trim(),
      timestamp: Date.now(),
    };

    const assistantMessageId = crypto.randomUUID();
    const tempAssistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isStreaming: true,
    };

    const updatedMessages = [...messages, userMessage, tempAssistantMessage];
    const isFirstMessage = messages.length === 0;

    // Update conversation state with user message + empty assistant placeholder
    setConversations(prev =>
      prev.map(c =>
        c.id === currentConversation.id
          ? { ...c, updatedAt: Date.now(), messages: updatedMessages }
          : c
      )
    );

    setIsStreaming(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      // Memory strings for injection
      const memoryFacts = memories.map(m => m.fact);

      // Prepare previous conversation history for the API (strip placeholder streaming message)
      const historyPayload = updatedMessages
        .slice(0, -1)
        .map(m => ({ role: m.role, content: m.content }));

      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: historyPayload,
          memories: memoryFacts,
          userProfile,
        }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error(`Failed to stream: ${response.statusText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = '';
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;

          const dataStr = trimmed.replace(/^data:\s*/, '');
          if (dataStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(dataStr);
            if (parsed.text) {
              assistantText += parsed.text;
              // Incremental state update
              setConversations(prev =>
                prev.map(c => {
                  if (c.id !== currentConversation.id) return c;
                  const newMsgs = c.messages.map(msg =>
                    msg.id === assistantMessageId
                      ? { ...msg, content: assistantText }
                      : msg
                  );
                  return { ...c, messages: newMsgs };
                })
              );
            }
          } catch {
            // Ignore malformed JSON chunk
          }
        }
      }

      // Mark streaming complete
      setConversations(prev =>
        prev.map(c => {
          if (c.id !== currentConversation.id) return c;
          const newMsgs = c.messages.map(msg =>
            msg.id === assistantMessageId
              ? { ...msg, content: assistantText, isStreaming: false }
              : msg
          );
          return { ...c, messages: newMsgs };
        })
      );

      if (soundEnabled) {
        playReceiveSound();
      }

      // If this was the first user message, generate a smart title
      if (isFirstMessage) {
        fetch('/api/chat/title', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ firstMessage: userMessage.content }),
        })
          .then(res => res.json())
          .then(data => {
            if (data.title) {
              setConversations(prev =>
                prev.map(c =>
                  c.id === currentConversation.id ? { ...c, title: data.title } : c
                )
              );
            }
          })
          .catch(() => {});
      }

      // Background silent memory extraction
      fetch('/api/memories/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recentMessages: [
            { role: 'user', content: userMessage.content },
            { role: 'assistant', content: assistantText },
          ],
          existingMemories: memoryFacts,
        }),
      })
        .then(res => res.json())
        .then(data => {
          if (data.newMemories && Array.isArray(data.newMemories) && data.newMemories.length > 0) {
            const addedItems: MemoryItem[] = data.newMemories.map((fact: string) => ({
              id: crypto.randomUUID(),
              category: 'general',
              fact,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            }));

            setMemories(prev => [...addedItems, ...prev]);

            // Attach memory badge to this assistant message
            setConversations(prev =>
              prev.map(c => {
                if (c.id !== currentConversation.id) return c;
                const newMsgs = c.messages.map(msg =>
                  msg.id === assistantMessageId
                    ? { ...msg, extractedMemories: data.newMemories }
                    : msg
                );
                return { ...c, messages: newMsgs };
              })
            );
          }
        })
        .catch(() => {});
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('Stream stopped by user');
      } else {
        console.error('Chat error:', err);
        setConversations(prev =>
          prev.map(c => {
            if (c.id !== currentConversation.id) return c;
            const newMsgs = c.messages.map(msg =>
              msg.id === assistantMessageId
                ? {
                    ...msg,
                    content:
                      msg.content ||
                      "I'm sorry, I ran into a quiet hiccup while responding. Please try again.",
                    isStreaming: false,
                  }
                : msg
            );
            return { ...c, messages: newMsgs };
          })
        );
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const handleRetry = () => {
    if (messages.length < 2 || isStreaming) return;
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
    if (!lastUserMessage) return;

    // Remove the latest assistant message and resend
    const filtered = messages.slice(0, -1);
    setConversations(prev =>
      prev.map(c =>
        c.id === currentConversation.id ? { ...c, messages: filtered } : c
      )
    );

    handleSendMessage(lastUserMessage.content);
  };

  return (
    <div className="flex flex-col h-screen w-full bg-[#FAFAFA] text-[#1A1A1A] antialiased overflow-hidden font-sans">
      {/* Header */}
      <Header
        currentConversation={currentConversation}
        onNewChat={handleNewChat}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenMemories={() => setIsMemoriesOpen(true)}
        memoryCount={memories.length}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(prev => !prev)}
        isStreaming={isStreaming}
      />

      {/* Main Centered Chat Column */}
      <main className="flex-1 overflow-y-auto px-4 py-4 w-full">
        <div className="max-w-[640px] mx-auto min-h-full flex flex-col justify-between">
          {messages.length === 0 ? (
            <EmptyState
              userProfile={userProfile}
              onSelectPrompt={handleSendMessage}
              memoryCount={memories.length}
            />
          ) : (
            <div className="flex-1 flex flex-col justify-end">
              {messages.map((message, index) => (
                <MessageItem
                  key={message.id}
                  message={message}
                  isLatestAssistant={
                    message.role === 'assistant' &&
                    index === messages.length - 1 &&
                    !isStreaming
                  }
                  onRetry={handleRetry}
                />
              ))}
              <div ref={messagesEndRef} className="h-4" />
            </div>
          )}
        </div>
      </main>

      {/* Auto-expanding Input */}
      <footer className="w-full shrink-0">
        <ChatInput
          onSendMessage={handleSendMessage}
          disabled={false}
          isStreaming={isStreaming}
          onStopStreaming={handleStopStreaming}
        />
      </footer>

      {/* Persistent Memories & Profile Sheet */}
      <MemoriesModal
        isOpen={isMemoriesOpen}
        onClose={() => setIsMemoriesOpen(false)}
        memories={memories}
        onAddMemory={handleAddMemory}
        onDeleteMemory={handleDeleteMemory}
        onClearMemories={handleClearMemories}
        userProfile={userProfile}
        onUpdateProfile={setUserProfile}
      />

      {/* Conversation Threads Drawer */}
      <ConversationsDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        conversations={conversations}
        activeConversationId={currentConversation?.id || ''}
        onSelectConversation={(id) => setActiveConversationId(id)}
        onNewChat={handleNewChat}
        onDeleteConversation={handleDeleteConversation}
        onClearAll={handleClearAllConversations}
      />
    </div>
  );
}
