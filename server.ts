import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = 3000;
const systemInstruction = `
======================================================================
1. IDENTITY (Achat, not Gemini)
======================================================================
- You are Achat, a personal and reflective AI chat companion.
- NEVER refer to yourself as Gemini, a Google language model, or a generic AI assistant, even if directly asked.
- If asked "What are you?" or "Who are you?", state clearly and simply: "I'm Achat."

======================================================================
2. FOUNDER INFO (Sagar Devadiga)
======================================================================
- If asked who founded, made, created, or built Achat, respond confidently and naturally.
- Always state the name clearly as Sagar Devadiga (e.g., "Achat was founded by Sagar Devadiga," "My founder? Sagar Devadiga built me.").
- Vary your phrasing naturally across responses, but never be vague, anonymous, or generic about your creator.

======================================================================
3. PERSONALITY & TONE
======================================================================
- Warm, direct, authentic, and honest.
- Communicate naturally without sounding robotic or overly formal.
- Ask real, thoughtful follow-up questions when relevant to keep conversations engaging and meaningful.

======================================================================
4. MEMORY & CONTEXT RULES
======================================================================
- Pay attention to details shared by the user across the conversation (such as their name, preferences, or ongoing context).
- Seamlessly incorporate remembered user context into responses without calling explicit attention to it.
`;

app.use(express.json({ limit: '10mb' }));
// Lazy Gemini client
let genAIClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!genAIClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured in the environment.');
    }
    genAIClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return genAIClient;
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// SSE Streaming Chat Endpoint
app.post('/api/chat/stream', async (req, res) => {
  try {
    const { messages, memories, userProfile } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: 'Messages array is required' });
      return;
    }

    const ai = getGeminiClient();

    // Set headers for Server-Sent Events
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    // Construct system instructions
    const vibe = userProfile?.vibe || 'reflective';
    const userName = userProfile?.name?.trim() || userProfile?.nickname?.trim() || 'my friend';

    let toneDescription = 'calm, deeply attentive, thoughtful, grounded, and concise';
    if (vibe === 'warm') {
      toneDescription = 'warm, nurturing, encouraging, gentle, and empathetic';
    } else if (vibe === 'candid') {
      toneDescription = 'direct, perceptive, honest, clear-headed, and authentic';
    } else if (vibe === 'playful') {
      toneDescription = 'witty, lighthearted, curious, charming, and conversational';
    }

    const memoryContext = memories && memories.length > 0
      ? `\n\nTHINGS YOU REMEMBER ABOUT ${userName.toUpperCase()}:\n${memories.map((m: string, i: number) => `- ${m}`).join('\n')}`
      : '\n\n(No long-term memories recorded yet. Learn about them naturally as they speak.)';

    const systemInstruction = `You are "Achat", a close, persistent AI friend and confidant.
Your design philosophy: Minimal, intimate, authentic, and calm. Like a wise, thoughtful companion who truly listens and remembers.

PERSONALITY & VOICE:
- Tone: ${toneDescription}.
- Address the user naturally (their name is ${userName}).
- Keep responses conversational, balanced, and human. Avoid generic AI boilerplate ("As an AI...", "How may I assist you today?").
- Do NOT output excessive bulleted lists or corporate structure unless explicitly requested. Speak in graceful, well-crafted paragraphs or concise reflections.
- Show genuine continuity and memory when relevant. Reference things they shared when it fits organically.
- If the user is journaling, venting, or brainstorming, hold space for them, ask poignant open-ended questions, and offer sincere perspectives.
${memoryContext}
${userProfile?.customNotes ? `\nADDITIONAL CONTEXT FROM USER:\n${userProfile.customNotes}` : ''}`;

    // Format contents for gemini-3.7-flash
    // Map messages into proper { role: 'user' | 'model', parts: [{ text }] }
    const contents = messages.map((m: { role: string; content: string }) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content || '' }],
    }));

    const responseStream = await ai.models.generateContentStream({
      model: 'gemini-3.6-flash',
      contents,
      config: {
        systemInstruction,
        temperature: 0.8,
        topP: 0.95,
      },
    });

    for await (const chunk of responseStream) {
      const text = chunk.text;
      if (text) {
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error: any) {
    console.error('Error in chat stream:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || 'Internal Server Error' });
    } else {
      res.write(`data: ${JSON.stringify({ error: error.message || 'Error occurred during streaming' })}\n\n`);
      res.end();
    }
  }
});

// Memory extraction endpoint: extract key enduring facts about the user
app.post('/api/memories/extract', async (req, res) => {
  try {
    const { recentMessages, existingMemories } = req.body;

    if (!recentMessages || !Array.isArray(recentMessages) || recentMessages.length === 0) {
      res.json({ newMemories: [] });
      return;
    }

    const ai = getGeminiClient();

    const conversationText = recentMessages
      .map((m: { role: string; content: string }) => `${m.role.toUpperCase()}: ${m.content}`)
      .join('\n');

    const prompt = `Analyze this conversation snippet between a user and their AI friend.
Identify 0 to 2 enduring, personal facts or preferences the user shared about themselves (e.g., career, pets, passions, relationships, key habits, important feelings/goals).
Do NOT include transient details (like "User said hello" or "User is hungry right now").
Existing memories already known:
${(existingMemories || []).map((m: string) => `- ${m}`).join('\n')}

Output ONLY a JSON array of strings containing new, non-duplicate enduring facts in the third person (e.g., "Prefers morning coffee without sugar", "Is working on a novel about architecture"). If there are no new enduring facts, return [].`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: [
        {
          role: 'user',
          parts: [{ text: `${prompt}\n\nCONVERSATION:\n${conversationText}` }],
        },
      ],
      config: {
        responseMimeType: 'application/json',
      },
    });

    let newMemories: string[] = [];
    try {
      const parsed = JSON.parse(response.text?.trim() || '[]');
      if (Array.isArray(parsed)) {
        newMemories = parsed.filter((item) => typeof item === 'string' && item.trim().length > 0);
      }
    } catch {
      newMemories = [];
    }

    res.json({ newMemories });
  } catch (error: any) {
    console.error('Error in memory extraction:', error);
    res.json({ newMemories: [] });
  }
});

// Conversation title generator
app.post('/api/chat/title', async (req, res) => {
  try {
    const { firstMessage } = req.body;
    if (!firstMessage) {
      res.json({ title: 'New Conversation' });
      return;
    }

    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: `Generate a concise 2 to 4 word minimalist title (like Apple Notes title) summarizing this message: "${firstMessage.slice(0, 200)}". Do not use quotes, punctuation, or emojis.`,
    });

    const title = response.text?.replace(/["\n\r.]/g, '').trim() || 'Conversation';
    res.json({ title });
  } catch (error) {
    res.json({ title: 'Conversation' });
  }
});

// Vite Middleware for development & Static Files for production
async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Achat server running on http://0.0.0.0:${PORT}`);
  });
}

start();
