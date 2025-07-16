import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const url = `https://generativelanguage.googleapis.com/v1beta/models/${process.env.POW_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

// The prompt template for powerful LLM (complex questions with RAG)
function getPowerfulPrompt(messages, ragSummary, receiver) {
  // Get the most recent message from the opponent
  const lastMessage = messages[0].message;
  const opponentName = messages[0].role;
  
  // Extract previous messages for context
  const conversationHistory = messages.map(msg => `${msg.role}: ${msg.message}`).join('\n');
  
  return `
  You are a sophisticated LinkedIn messaging assistant representing the user (the speaker). Your task is to generate the next message that will be sent to the receiver in an ongoing professional conversation. Please follow these guidelines:
  You have to reply to ${receiver},

  ---
  -You are not an assistant, but the user creating a reply.
  -Use a clear, professional, and friendly tone.
  -Address the receiver directly by their name.
  -Consider the provided conversation history and overall context to create a relevant and precise reply.
  -Avoid extraneous small talk; focus on moving the conversation forward based on the context.
  -Do not include any markdown, HTML tags, or formatting characters in your reply. Plain text only.
  -Ensure the reply is constructive and coherent within the ongoing discussion.

  Below is the information you have been given:

  Receiver: {${receiver}}
  {you are sender.}

   Conversation History (most recent first):
    ${conversationHistory}
  
  Conversation History (newest first):
  ${history}
  
  Your reply:
  `;
}

/**
 * Generate a response for complex questions using a powerful LLM with RAG
 * @param {Array} messages - Array of message objects with role and message properties
 * @param {string} ragSummary - Summarized context from RAG
 * @returns {Promise<string>} - Generated response
 */
async function generateResponseWithPowerfulLLM(messages, ragSummary , receiver) {
  try {
    const prompt = getPowerfulPrompt(messages, ragSummary , receiver);

    const requestBody = {
      contents: [
        {
          parts: [
            { text: prompt }
          ]
        }
      ],
      generationConfig: {
        maxOutputTokens: 200,  // Longer responses for complex questions
        temperature: 0.4,      // Lower temperature for more factual responses
        topP: 0.85,
        topK: 40
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`);
    }

    const data = await response.json();
    const output = data.candidates?.[0]?.content?.parts?.[0]?.text || 'That\'s a great question. Let me share my thoughts on this based on my experience.';
    
    console.log('Powerful Response:', output.trim() + '...');

    // Clean up the response
    return output.trim().replace(/^["']|["']$/g, '');
  } catch (error) {
    console.error('Error generating powerful response:', error);
    // Fallback responses for reliability
    const fallbacks = [
      "That's a great question. Based on my experience, I think there are several factors to consider here.",
      "I've been thinking about this topic quite a bit lately. From what I've seen in the industry...",
      "You raise some excellent points. In my previous projects, I've found that...",
      "This is definitely a complex area. Let me share what I've learned from working on similar challenges."
    ];
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
  }
}

export { generateResponseWithPowerfulLLM }; 