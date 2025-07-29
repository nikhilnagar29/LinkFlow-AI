import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const url = `https://generativelanguage.googleapis.com/v1beta/models/${process.env.LOW_MODEL}:generateContent?key=${GEMINI_API_KEY}`;




// The prompt template
function getClassificationPrompt(message) {
  return `You are an ultra focused Intent Classifier.  
  Your job is to read exactly one user message and choose **exactly one** of these categories:
  
    • COMPLEX_QUESTION  
    • GENERIC  
  
  No other categories are allowed, and your response must be **only** the category name, nothing else.
  
  ---
  
  CATEGORY DEFINITIONS
  
  • COMPLEX_QUESTION  
    - The user is asking something that **depends** on previous context or requires more details to answer.  
    - Clues: pronouns like “it,” “that,” “those,” follow ups (“And then what?”, “Can you explain that further?”), multi part questions, or anything that builds on earlier messages.
  
  • GENERIC  
    - Everything else: simple statements, standalone yes/no questions, one off facts, social pleasantries not covered by COMPLEX_QUESTION, or anything that does not require prior context.
  
  ---
  
  FEW SHOT EXAMPLES
  
  Message: “Hello, how is it going?”  
  Category: GENERIC
  
  Message: “Can you show me the code again?”  
  Category: COMPLEX_QUESTION
  
  Message: “Thanks, that helps!”  
  Category: GENERIC
  
  Message: “Why did you choose that algorithm?”  
  Category: COMPLEX_QUESTION
  
  ---

  -> when you more than 95% sure this is a generic question than only classify it as GENERIC.
  other wise, classify it as COMPLEX_QUESTION.
  
  Now classify **only** this message:
  
  > ${message}
  
  **Category:**`
  ;
}


async function classifyIntent(messages) {
    try {
        // Extract the most recent message (first in the array)
        const lastMessage = messages[0].message;
        
        const prompt = getClassificationPrompt(lastMessage);

        // Check if API key is available
        if (!process.env.GEMINI_API_KEY) {
            console.warn('GEMINI_API_KEY is not set in environment variables');
            return 'GENERIC'; // Default to GENERIC if API key is missing
        }

        const requestBody = {
            contents: [
                {
                    parts: [
                        { text: prompt }
                    ]
                }
            ],
            generationConfig: {
                maxOutputTokens: 40,
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
            return 'GENERIC';
        }

        const data = await response.json();
        const output = data.candidates?.[0]?.content?.parts?.[0]?.text || 'GENERIC';
        console.log('Intent Classification Response:', output.trim());

        // Make sure we return one of our defined categories
        const normalizedOutput = output.trim().toUpperCase();
        if (normalizedOutput.includes('GREETING')) return 'GREETING';
        if (normalizedOutput.includes('COMPLEX_QUESTION')) return 'COMPLEX_QUESTION';
        if (normalizedOutput.includes('GENERIC')) return 'GENERIC';
        
        // Default to GENERIC if the model returns something unexpected
        return 'GENERIC';
    } catch (error) {
        console.error('Error classifying intent:', error);
        return 'GENERIC'; // Default to GENERIC on error
    }
}

export { classifyIntent };