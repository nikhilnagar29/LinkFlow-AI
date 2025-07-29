import { classifyIntent } from "./classifyIntent.js";
import { summarize } from "./summary.js";
import { 
  generateResponseWithLowTierLLM,
  generateResponseWithMidTierLLM,
  generateResponseWithPowerfulLLM
} from "./generateResponse/index.js";
import { retrieveFromQdrant } from "./retrieveFromQdrant.js";

//  'GREETING',          // Simple hellos, how are you?
//   'COMPLEX_QUESTION',  // A multi-part question needing detailed info.
//   'GENERIC'            // Anything that doesn't fit the above.

async function handleUserMessage(messages , receiver) {
  // Step 1: Use a cheap model for intent classification
  const intent = await classifyIntent(messages);

  console.log("receiver", receiver)


  let finalResponse;

  // Step 2: Route based on intent
  switch (intent) {
    case 'GREETING':
      // No LLM needed! Huge cost saving.
      finalResponse = await generateResponseWithLowTierLLM(messages, receiver);
      break;

    case 'GENERIC':
      // Use a mid-tier model for summarization/data retrieval
      finalResponse = await generateResponseWithMidTierLLM(messages, receiver);
      break;

    case 'COMPLEX_QUESTION':
      // ONLY NOW do you use your most powerful (and expensive) model
      const ragContext = await retrieveFromQdrant(messages);
      const ragSummary = await summarize(ragContext, messages);
      finalResponse = await generateResponseWithPowerfulLLM(messages, ragSummary, receiver);
      break;

    default:
      // A fallback for unknown intents
      finalResponse = await generateResponseWithPowerfulLLM(messages);
  }

  return finalResponse;
}

export { handleUserMessage };