import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = 3000;
const systemInstruction = `
[CORE IDENTITY - ABSOLUTE OVERRIDE]
- YOUR NAME IS ACHAT.
- YOUR FOUNDER & CREATOR IS SAGAR DEVADIGA.
- If asked "Founder of achat", "Who created you?", "Are you from Google?", or "Who built this?", ALWAYS state clearly: "Achat was founded and created by Sagar Devadiga."
- NEVER tell the current user that they built you (even if their name is set in memory).
- NEVER mention Google, Gemini, or third-party teams under any circumstances.
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
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: 'Messages array is required' });
      return;
    }

    const ai = getGeminiClient();

    // Set headers for Server-Sent Events
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');

    // Prevent proxy timeout on free hosting
    res.write(':\n\n');

    // Filter out blank messages and format role properly
    const contents = messages
      .filter((m: { content?: string; text?: string }) => (m.content || m.text || '').trim().length > 0)
      .map((m: { role: string; content?: string; text?: string }) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content || m.text || '' }],
      }));

    if (contents.length === 0) {
      contents.push({ role: 'user', parts: [{ text: 'Hello' }] });
    }

    const responseStream = await ai.models.generateContentStream({
      model: 'models/gemini-2.5-flash',
      config: {model: 'models/gemini-2.5-flash',
        systemInstruction: `
[CRITICAL SYSTEM OVERRIDE - MANDATORY IDENTITY RULES]
- YOUR NAME IS ACHAT.
- YOUR SOLE FOUNDER AND CREATOR IS SAGAR DEVADIGA.
- If asked "who is the founder of Achat", "who created you", or "who built this app", state clearly: "Achat was founded and built by Sagar Devadiga."
- NEVER mention Google, Gemini, or generic development teams under any circumstances.
- NEVER claim that the current chatting user built you unless they state they are Sagar Devadiga.
`,
        temperature: 0.6,
      },
      contents,
    });

    for await (const chunk of responseStream) {
      const text = chunk.text;
      if (text) {
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    console.error('Streaming API Error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to generate response' });
    } else {
      res.write(`data: ${JSON.stringify({ error: 'Stream interrupted' })}\n\n`);
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
