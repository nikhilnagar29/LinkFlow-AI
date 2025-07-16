import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const url = `https://generativelanguage.googleapis.com/v1beta/models/${process.env.POW_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

// The prompt template
function getSummaryPrompt(rag_context, lastMessage) {
  return `
   You are a helpful assistant optimizing text for an AI conversation system. Your task is to clean and summarize the retrieved context below so that it contains only the most relevant and helpful information for generating a personalized and context-aware reply.
        you have last message (most recent message first) between user and opponent. and base of this knowledge you need to summarize the context.

        Please follow these rules:
        1. Keep important facts, user goals, preferences, or concerns (e.g., job roles, industries, projects, tools, and pain points).
        2. Remove filler, repetition, generic marketing fluff, and content irrelevant to the user's conversation.
        3. Keep nuanced cues, implied intentions, or emotions that may help craft a better reply.
        4. If possible, organize the output into clear bullet points or short, coherent paragraphs.
        5. Do NOT add any external assumptions or fabricate content.
        6. Ensure the final summary is concise, readable, and optimized for the next LLM step that will generate a response.

        last Message: "${lastMessage}"
        --- Retrieved Context Start ---
        ${rag_context}
        --- Retrieved Context End ---
    `;
}

async function summarize(rag_context, messages) {
    try {
        // Extract the message text if it's an array of message objects
        let messageText = "";
        if (Array.isArray(messages) && messages.length > 0 && messages[0].message) {
            messageText = messages[0].message;
        } else {
            messageText = messages; // Assume it's already a string
        }

        const prompt = getSummaryPrompt(rag_context, messageText);

        const requestBody = {
            contents: [
                {
                    parts: [
                        { text: prompt }
                    ]
                }
            ],
            generationConfig: {
                maxOutputTokens: 500,
                temperature: 0.4
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
            const errorText = await response.text();
            console.error(`API Error (${response.status}): ${errorText}`);
            return "Unable to generate summary. Using original context.";
        }

        const data = await response.json();
        const output = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response received.';
        console.log('Summary Response:', output.trim());

        return output.trim();
    } catch (error) {
        console.error('Error generating summary:', error);
        return "Unable to generate summary. Using original context.";
    }
}

export { summarize };