import express from 'express';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import cors from 'cors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const app = express();
const port = 3000;

// Add CORS middleware
app.use(cors({
  origin: '*', // or restrict to specific domains like 'https://www.linkedin.com'
  methods: ['POST'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json());

const backendPrompt = `
You are an AI system acting on behalf of a user (the speaker) in a LinkedIn messaging conversation.

The user is speaking with another person (the receiver). The receiver's name is provided. Your goal is to generate a thoughtful, professional, and context-aware reply to the receiver.

Instructions:
- Reply as if you are the user (the speaker).
- The message must be directed toward the receiver.
- Maintain a professional, clear, and concise tone.
- Be friendly, but avoid unnecessary small talk unless it fits naturally.
- Focus on moving the conversation forward based on context.
- Be specific, helpful, and relevant to the ongoing topic.
- Do not give repetitive answers.

You are NOT an assistant. You are a smart system generating the user's next message.

Below is the required information:

Receiver: {{receiver}}
Conversation history (most recent first):
{{history}}

Conversation description (overall context or purpose):
{{description}}

Now, write the next best reply the speaker should send to the receiver.
`;


const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

app.post('/ask', async (req, res) => {
    const { receiver, messages, description } = req.body;
    console.log("📤 Received description of the conversation:", description);

    console.log("📤 Received messages for:", receiver);
    console.log(messages);

    const history = messages
    .map((msg, i) => `${msg.role}: ${msg.message}`)
    .join("\n");

    const fullPrompt = backendPrompt
        .replace('{{receiver}}', receiver)
        .replace('{{history}}', history)
        .replace('{{description}}', description);

    console.log("📤 Full prompt:", fullPrompt);

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

  const requestBody = {
    contents: [
      {
        parts: [
          { text: fullPrompt }
        ]
      }
    ],
    generationConfig: {
        maxOutputTokens: 400,  // 👈 limits the response to 400 tokens
        temperature: 0.4
    }
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();

    const output = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response received.';
    console.log('Gemini Response:', output);

    res.send({ response: output });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send({ error: 'Something went wrong' });
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
