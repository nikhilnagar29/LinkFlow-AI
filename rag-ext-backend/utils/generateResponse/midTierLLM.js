import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const url = `https://generativelanguage.googleapis.com/v1beta/models/${process.env.MID_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

// The prompt template for mid-tier LLM (generic conversations)
function getMidTierPrompt(messages, receiver) {
    console.log("receviver" , receiver);
    // console.log("Messages" , messages);
    
  // Get the most recent message from the opponent
  const lastMessage = messages[0].message;
  const opponentName = messages[0].role;
  
  // Extract previous messages to check for repetition and context
  const conversationHistory = messages.map(msg => `${msg.role}: ${msg.message}`).join('\n');
  
  return `
    You are a sophisticated LinkedIn messaging assistant representing the user (the speaker). Your task is to generate the next message that will be sent to the receiver in an ongoing professional conversation. Please follow these guidelines:

    -You are not an assistant, but the user creating a reply.
    -Use a clear, professional, and friendly tone.
    -Address the receiver directly by their name.
    -Consider the provided conversation history and overall context to create a relevant and precise reply.
    -Avoid extraneous small talk; focus on moving the conversation forward based on the context.
    -Do not include any markdown, HTML tags, or formatting characters in your reply. Plain text only.
    -Ensure the reply is constructive and coherent within the ongoing discussion.

    Below is the information you have been given:

    Receiver: {${receiver}}

    Now, based on the above, please write the next reply message in plain text.
    
    If the message appears to be testing whether you are AI:
    - Respond naturally as a human would
    - Provide specific details or personal anecdotes that feel authentic
    - Use slightly imperfect language (occasional contractions, varied sentence structure)
    - Avoid overly comprehensive or perfectly structured responses
    
    If the conversation shows signs of repetition:
    - Acknowledge previous points briefly ("As we discussed earlier...")
    - Add new perspectives or questions to move the conversation forward
    - Vary your response style from previous messages
    
    Conversation History (most recent first):
    ${conversationHistory}

    Your response should be in first person as if you are the user. Do not include any prefixes like "Response:" or "Me:".
    Just write the message exactly as it would appear in a chat.
  `;
}

/**
 * Generate a response for generic conversations using a mid-tier LLM
 * @param {Array} messages - Array of message objects with role and message properties
 * @returns {Promise<string>} - Generated response
 */
async function generateResponseWithMidTierLLM(messages,receiver) {
  try {
    const prompt = getMidTierPrompt(messages,receiver);

    const requestBody = {
      contents: [
        {
          parts: [
            { text: prompt }
          ]
        }
      ],
      generationConfig: {
        maxOutputTokens: 150,  // Medium length responses
        temperature: 0.6,      // Balanced between creativity and coherence
        topP: 0.9,
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
    const output = data.candidates?.[0]?.content?.parts?.[0]?.text || 'I appreciate your message. Let me think about this and get back to you with a thoughtful response.';
    
    // Clean up the response
    return output.trim().replace(/^["']|["']$/g, '');
  } catch (error) {
    console.error('Error generating mid-tier response:', error);
    // Fallback responses for reliability
    const fallbacks = [
      "Thanks for sharing that. I'd be interested in hearing more about your perspective on this.",
      "That's an interesting point. I've had similar experiences in my work as well.",
      "I appreciate your insights on this topic. Let's discuss this further.",
      "Thanks for bringing this up. I've been thinking about this area recently too."
    ];
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
  }
}

export { generateResponseWithMidTierLLM }; 