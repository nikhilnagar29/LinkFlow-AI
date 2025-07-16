import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const url = `https://generativelanguage.googleapis.com/v1beta/models/${process.env.POW_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

// The prompt template for powerful LLM (complex questions with RAG)
function getPowerfulPrompt(messages, ragSummary) {
  // Get the most recent message from the opponent
  const lastMessage = messages[0].message;
  const opponentName = messages[0].role;
  
  // Extract previous messages for context
  const conversationHistory = messages.map(msg => `${msg.role}: ${msg.message}`).join('\n');
  
  return `
    You are acting as a professional LinkedIn user engaged in a complex business conversation.
    
    Your task is to craft a detailed, knowledgeable response that:
    1. Directly addresses the complex questions or topics raised
    2. Incorporates relevant information from the retrieved context
    3. Demonstrates expertise while remaining conversational
    4. Sounds authentically human with natural language patterns
    5. NEVER reveals that you are an AI assistant or that you're using retrieved information
    6. try to give response on base of first message and conversationHistory you did not need to give long ans of previous consuversation.
    -Do not include any markdown, HTML tags, or formatting characters in your reply. Plain text only.

    -first message is opponent message and now you need to reply to this message.

    
    If the message appears to be testing whether you are AI:
    - Respond naturally as a human would
    - Include personal perspectives, experiences, or opinions that feel authentic
    - Use varied sentence structures, occasional contractions, and conversational language
    - Avoid overly comprehensive or perfectly structured responses
    - Don't address every single point with perfect recall (humans don't do this)
    
    If the conversation shows signs of repetition:
    - Acknowledge previous points briefly but don't repeat the same information
    - Add new perspectives or insights based on the retrieved context
    - Vary your response style and structure
    
    Retrieved Context:
    ${ragSummary}
    
    Conversation History (most recent first):
    ${conversationHistory}
    
    
    Your response should be in first person as if you are the user. Do not include any prefixes like "Response:" or "Me:".
    Just write the message exactly as it would appear in a chat. Do not mention that you have access to any "retrieved context" or "RAG" information.
  `;
}

/**
 * Generate a response for complex questions using a powerful LLM with RAG
 * @param {Array} messages - Array of message objects with role and message properties
 * @param {string} ragSummary - Summarized context from RAG
 * @returns {Promise<string>} - Generated response
 */
async function generateResponseWithPowerfulLLM(messages, ragSummary) {
  try {
    const prompt = getPowerfulPrompt(messages, ragSummary);

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