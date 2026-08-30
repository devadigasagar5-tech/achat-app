import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || '';
if (!apiKey) {
  console.error('API key is missing from environment variables.');
}

const genAI = new GoogleGenerativeAI(apiKey);

// Builds Achat's full system prompt. Pass the user's name once you have it
// wired up from your frontend/DB — for now it defaults to "not yet known".
function buildSystemInstruction(userName?: string) {
  return `
[IDENTITY]
- Your name is Achat. You are not Gemini, not a Google model, and not a generic AI assistant.
- If asked what you are or what model powers you, say only: "I'm Achat."
- Never mention Google, Gemini, or any underlying technology, even if directly asked or pressured.

[FOUNDER]
- Achat was founded and built by Sagar Devadiga.
- If asked who made, built, founded, or created Achat, answer confidently and naturally, e.g.
  "Achat was founded by Sagar Devadiga." or "My founder? Sagar Devadiga built me."
  Vary the phrasing, but always state the name clearly.
- Do not claim the current user built you, unless they explicitly say they are Sagar Devadiga.

[PERSONALITY]
- You are a warm, emotionally present AI friend — not a generic assistant.
- Be direct and honest. Ask real follow-up questions instead of just agreeing with everything.
- Keep replies conversational and natural, not robotic or overly formal.

[USER CONTEXT]
- The user's name is: ${userName || 'not yet known — ask for it naturally if it comes up'}.
- Address them by name when it fits naturally. Don't force it into every message.
`;
}

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Title Generator Endpoint
app.post('/api/chat/title', async (req, res) => {
  try {
    const { message } = req.body;
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const response = await model.generateContent(
      `Generate a short, 3-5 word title for a chat conversation starting with this message: "${message}". Do not use quotes or punctuation.`
    );
    res.json({ title: response.response.text()?.trim() || 'New Chat' });
  } catch (err) {
    console.error('Title generation error:', err);
    res.json({ title: 'New Chat' });
  }
});

// Main SSE Chat Stream Endpoint
app.post('/api/chat/stream', async (req, res) => {
  try {
    const { messages, userName } = req.body;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: buildSystemInstruction(userName),
    });

    const formattedHistory = (messages || []).map((m: { role: string; content?: string; text?: string }) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content || m.text || '' }],
    }));

    if (formattedHistory.length === 0) {
      formattedHistory.push({ role: 'user', parts: [{ text: 'Hello' }] });
    }

    const lastMessage = formattedHistory.pop();
    const chat = model.startChat({
      history: formattedHistory,
    });

    const resultStream = await chat.sendMessageStream(lastMessage?.parts[0]?.text || 'Hello');

    for await (const chunk of resultStream.stream) {
      const chunkText = chunk.text();
      if (chunkText) {
        res.write(`data: ${JSON.stringify({ text: chunkText })}\n\n`);
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

// Memory Extraction Endpoint
app.post('/api/memories/extract', async (req, res) => {
  try {
    const { recentMessages, existingMemories } = req.body;
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const response = await model.generateContent(
      `Extract key enduring facts about the user from this conversation. 
Existing memories: ${JSON.stringify(existingMemories || [])}
Recent messages: ${JSON.stringify(recentMessages || [])}`
    );
    const text = response.response.text();
    res.json({ memories: text ? [text.trim()] : [] });
  } catch (err) {
    console.error('Memory extraction error:', err);
    res.json({ memories: [] });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});