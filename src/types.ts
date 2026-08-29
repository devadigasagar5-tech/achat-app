export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  extractedMemories?: string[];
  isStreaming?: boolean;
}

export interface MemoryItem {
  id: string;
  category: 'preference' | 'life' | 'work' | 'relationship' | 'goal' | 'general';
  fact: string;
  createdAt: number;
  updatedAt: number;
}

export type FriendVibe = 'reflective' | 'warm' | 'candid' | 'playful';

export interface UserProfile {
  name: string;
  nickname: string;
  vibe: FriendVibe;
  customNotes?: string;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: Message[];
  pinned?: boolean;
}

export interface ChatStreamRequest {
  messages: { role: 'user' | 'assistant'; content: string }[];
  memories: string[];
  userProfile: UserProfile;
}
