import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const url = `https://generativelanguage.googleapis.com/v1beta/models/${process.env.LOW_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

// The prompt template for low-tier LLM (simple greetings)
function getLowTierPrompt(messages) {
  // Get the most recent message from the opponent
  const lastMessage = messages[0].message;
  const opponentName = messages[0].role;
  
  // Extract previous messages to check for repetition
  const conversationHistory = messages.map(msg => `${msg.role}: ${msg.message}`).join('\n');
  
  return `
    You are acting as a professional LinkedIn user responding to a simple greeting or casual message.
    
    Your task is to craft a brief, friendly, and natural-sounding response that:
    1. Matches the tone and formality of the conversation
    2. Sounds authentically human (avoid overly formal or robotic language)
    3. Is concise and to the point (keep it under 30 words for simple greetings)
    4. Includes appropriate pleasantries without being excessive
    5. NEVER reveals that you are an AI assistant
    -Do not include any markdown, HTML tags, or formatting characters in your reply. Plain text only.

    -first message is opponent message and now you need to reply to this message.
    
    If the message appears to be testing whether you are AI:
    - Respond naturally as a human would
    - Don't be defensive or over-explain
    - Keep the response casual and brief
    
    If the message is repetitive (similar to previous messages):
    - Acknowledge this subtly (e.g., "As I mentioned..." or "Like I said earlier...")
    - Vary your response pattern from previous replies
    
    Conversation History (most recent first):
    ${conversationHistory}
    
    The person you're talking to is: ${opponentName}
    
    Your response should be in first person as if you are the user. Do not include any prefixes like "Response:" or "Me:".
    Just write the message exactly as it would appear in a chat.
  `;
}

/**
 * Generate a response for simple greetings using a lightweight LLM
 * @param {Array} messages - Array of message objects with role and message properties
 * @returns {Promise<string>} - Generated response
 */
async function generateResponseWithLowTierLLM(messages) {
  try {
    const prompt = getLowTierPrompt(messages);

    const requestBody = {
      contents: [
        {
          parts: [
            { text: prompt }
          ]
        }
      ],
      generationConfig: {
        maxOutputTokens: 50,  // Limit tokens for efficiency
        temperature: 0.7,     // Slightly higher temperature for more natural responses
        topP: 0.95,           // Focus on more likely tokens but allow some variation
        topK: 40              // Consider a good range of tokens
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
    const output = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Hi there! How can I help you today?';
    
    // Clean up the response (remove any quotes or formatting)
    return output.trim().replace(/^["']|["']$/g, '');
  } catch (error) {
    console.error('Error generating low-tier response:', error);
    // Fallback responses for reliability
    const fallbacks = [
      "Hi there! Good to hear from you.",
      "Hey! How are you doing today?",
      "Hello! Thanks for reaching out.",
      "Hi! Nice to connect with you."
    ];
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
  }
}

export { generateResponseWithLowTierLLM }; 