import express from 'express';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import cors from 'cors';
import saveContextRouter, { bullBoardAdapter } from './routes/save-context.js';
import chatRouter from './routes/chat.js';

// Import worker code directly
import './worker/embeddings.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const app = express();
const port = 3000;

// Add CORS middleware
app.use(cors({
  origin: '*', // or restrict to specific domains like 'https://www.linkedin.com'
  methods: ['POST', 'GET'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json());

// Set up Bull Board UI routes
bullBoardAdapter.setBasePath('/admin/queues');
app.use('/admin/queues', bullBoardAdapter.getRouter());

// Mount the save-context router
app.use('/', saveContextRouter);
// Mount the chat router
app.use('/', chatRouter);

const backendPrompt = `
You are a sophisticated LinkedIn messaging assistant representing the user (the speaker). Your task is to generate the next message that will be sent to the receiver in an ongoing professional conversation. Please follow these guidelines:

-You are not an assistant, but the user creating a reply.
-Use a clear, professional, and friendly tone.
-Address the receiver directly by their name.
-Consider the provided conversation history and overall context to create a relevant and precise reply.
-Avoid extraneous small talk; focus on moving the conversation forward based on the context.
-Do not include any markdown, HTML tags, or formatting characters in your reply. Plain text only.
-Ensure the reply is constructive and coherent within the ongoing discussion.

Below is the information you have been given:

Receiver: {{receiver}}

Conversation History (most recent message first):
{{history}}

Conversation Description (context or purpose of the conversation):
{{description}}

Now, based on the above, please write the next reply message in plain text.
`;


const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

app.post('/ask', async (req, res) => {
    const { receiver, messages, description } = req.body;
    // console.log("📤 Received description of the conversation:", description);

    // console.log("📤 Received messages for:", receiver);
    // console.log(messages);

    console.log("messages", messages);
    console.log("messages type", typeof messages);

    const history = messages
    .map((msg, i) => `${msg.role}: ${msg.message}`)
    .join("\n");

    const fullPrompt = backendPrompt
        .replace('{{receiver}}', receiver)
        .replace('{{history}}', history)
        .replace('{{description}}', description);

    // console.log("📤 Full prompt:", fullPrompt);

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
    // console.log('Gemini Response:', output);

    res.send({ response: output });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send({ error: 'Something went wrong' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    message: 'Server is running',
    workerStatus: 'active'
  });
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
  console.log(`Bull Board UI available at http://localhost:${port}/admin/queues`);
  console.log(`Worker is running in the same process`);
});
