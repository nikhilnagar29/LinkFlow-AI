import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const url = `https://generativelanguage.googleapis.com/v1beta/models/${process.env.LOW_MODEL}:generateContent?key=${GEMINI_API_KEY}`;



// Define your categories clearly
const INTENT_CATEGORIES = [
//   'GREETING',          // Simple hellos, how are you?
  'COMPLEX_QUESTION',  // A multi-part question needing detailed info.
  'GENERIC'            // Anything that doesn't fit the above.
].join(', ');

// The prompt template
function getClassificationPrompt(message) {
  return `
    You are a hyper-logical Intent Classification Engine. 
    Your sole purpose is to analyze a user's message and classify it into exact one of categories based on a strict set of rules: 
    [${INTENT_CATEGORIES}].
    

    Your classification decision MUST follow these detailed definitions:

    ---
    **CATEGORY DEFINITIONS**

    1.  **GREETING:**
        * **What it is:** This category is strictly for simple social interactions, pleasantries, and conversational openings or closings.
        * **Keywords/Phrases:** "Hi", "Hello", "How are you?", "Thanks!", "Sounds good", "Have a great day."
        * **Rule:** If the message is purely social and does not contain a request for information or action, it is a GREETING.

    
    2.  **COMPLEX_QUESTION:**
        * **What it is:** This category is for any question or statement that is **NOT self-contained** and requires additional context to be understood or answered.
        * **Rule:** The message is dependent on prior information. This is true if the message includes pronouns like 'it', 'that', 'those', or phrases like 'what about...', 'can you explain that further?', 'following up on...', or any query that logically builds upon a missing piece of information from a previous turn.

    ---
    **DECISION FRAMEWORK**

    To decide, ask yourself these questions in order:
    1.  Is the message a simple social pleasantry with no real query?
        * If YES -> Classify as **GREETING**.
    2.  If NO, then ask: To understand or answer this message, do I need to know what we were talking about before or some other details ? Is there a missing piece of context?
        * If YES -> Classify as **COMPLEX_QUESTION**.
    

    ---
    **EXAMPLES**

    Message: "Hey, what's up?" 
    Category: GREETING


    Message: "Okay, and how would I implement that in my project?"
    Category: COMPLEX_QUESTION

    Message: "Thanks for the help!"
    Category: GREETING

 

    Message: "Why did you give me that previous answer?"
    Category: COMPLEX_QUESTION

    ---
    **YOUR TASK**

    Analyze the message below based on all the rules above. Return ONLY the single, most appropriate category name and nothing else.

    last Message: "${message}"
    
    Category:
    `;
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