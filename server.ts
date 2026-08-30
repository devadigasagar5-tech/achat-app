import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
if (!apiKey) {
  console.error('API key is missing from environment variables.');
}

const ai = new GoogleGenAI({ apiKey: apiKey || '' });

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Title Generator Endpoint
app.post('/api/chat/title', async (req, res) => {
  try {
    const { message } = req.body;
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Generate a short, 3-5 word title for a chat conversation starting with this message: "${message}". Do not use quotes or punctuation.`,
    });
    res.json({ title: response.text?.trim() || 'New Chat' });
  } catch (err) {
    console.error('Title generation error:', err);
    res.json({ title: 'New Chat' });
  }
});

// Main SSE Chat Stream Endpoint
app.post('/api/chat/stream', async (req, res) => {
  try {
    const { messages } = req.body;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const contents = (messages || []).map((m: { role: string; content?: string; text?: string }) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content || m.text || '' }],
    }));

    if (contents.length === 0) {
      contents.push({ role: 'user', parts: [{ text: 'Hello' }] });
    }

    const responseStream = await ai.models.generateContentStream({
      model: 'gemini-2.5-flash',
      config: {
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
      if (chunk.text) {
        res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
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
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Extract key enduring facts about the user from this conversation. 
Existing memories: ${JSON.stringify(existingMemories || [])}
Recent messages: ${JSON.stringify(recentMessages || [])}`,
    });
    res.json({ memories: response.text ? [response.text.trim()] : [] });
  } catch (err) {
    console.error('Memory extraction error:', err);
    res.json({ memories: [] });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});