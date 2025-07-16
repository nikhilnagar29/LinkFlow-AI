import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { QdrantVectorStore } from '@langchain/qdrant';
import { summarize } from './summary.js';
import dotenv from 'dotenv';
import { QdrantClient } from '@qdrant/js-client-rest';

// Load environment variables
dotenv.config();

/**
 * Retrieve relevant context from Qdrant based on the conversation
 * @param {Array} messages - Array of message objects with role and message properties
 * @returns {Promise<string>} - Retrieved context as a string
 */
async function retrieveFromQdrant(messages) {
  try {
    // First, check the collection's vector dimensions
    const client = new QdrantClient({
      url: process.env.QDRANT_URL || 'http://localhost:6333',
    });
    
    const collectionName = process.env.QDRANT_COLLECTION || 'langchainjs-testing';
    
    // Get collection info to determine the vector dimensions
    const collectionInfo = await client.getCollection(collectionName);
    const vectorSize = collectionInfo.config.params.vectors.size;
    
    console.log(`Collection ${collectionName} has vector size: ${vectorSize}`);
    
    // Create a query from the most recent messages
    const lastMessage = messages[0].message;
    
    // Initialize Google Generative AI embeddings with the correct dimensions
    const embedding = new GoogleGenerativeAIEmbeddings({
        model: 'gemini-embedding-001',
        taskType: "RETRIEVAL_QUERY",        // for queries
        apiKey: process.env.GEMINI_API_KEY,
        outputDimensionality: 3072,         // explicit
      });
      
    // Initialize Qdrant vector store
    const vectorStore = new QdrantVectorStore(
      embedding,
      {
        url: process.env.QDRANT_URL || 'http://localhost:6333',
        collectionName: collectionName,
      }
    );

    // Use a Set to store unique documents based on their pageContent
    const uniqueDocuments = new Set();
    const resultsArray = [];

    try {
      console.log(`Searching Qdrant for context related to last message: ${lastMessage.substring(0, 100)}...`);
      const resultsLastMessage = await vectorStore.similaritySearch(lastMessage, 5);
      resultsLastMessage.forEach(doc => {
        if (!uniqueDocuments.has(doc.pageContent)) {
          uniqueDocuments.add(doc.pageContent);
          resultsArray.push(doc);
        }
      });
    } catch (searchError) {
      console.warn('Error searching with last message:', searchError);
      // If there's a dimension error, try to recreate the collection with the correct dimensions
      if (searchError.toString().includes('Vector dimension error')) {
        console.log('Dimension mismatch detected. Please ensure your collection matches the embedding model dimensions.');
      }
    }

    // Only try summary search if the first search was successful
    if (resultsArray.length > 0) {
      try {
        // Try to get a message summary, but don't fail if it errors
        const messageSummary = await summarize("for now i want summary of last few messages", messages);
        
        console.log(`Searching Qdrant for context related to message summary: ${messageSummary.substring(0, 100)}...`);
        const resultsMessageSummary = await vectorStore.similaritySearch(messageSummary, 5);
        resultsMessageSummary.forEach(doc => {
          if (!uniqueDocuments.has(doc.pageContent)) {
            uniqueDocuments.add(doc.pageContent);
            resultsArray.push(doc);
          }
        });
      } catch (summaryError) {
        console.warn('Error with message summary search:', summaryError);
      }
    }
    
    // Format the results
    const formattedResults = resultsArray.map(doc => {
      return `--- Document (${doc.metadata.source || 'unknown'}) ---\n${doc.pageContent}\n`;
    }).join('\n');
    
    console.log(`Found ${resultsArray.length} relevant documents in Qdrant`);
    return formattedResults || "No relevant context found.";
  } catch (error) {
    console.error('Error retrieving from Qdrant:', error);
    return "Error retrieving context. Proceeding without additional information.";
  }
}

export { retrieveFromQdrant }; 