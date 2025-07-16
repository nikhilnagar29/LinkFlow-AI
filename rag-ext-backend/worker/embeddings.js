import { Worker } from 'bullmq';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { QdrantVectorStore } from '@langchain/qdrant';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import dotenv from 'dotenv';
import { QdrantClient } from '@qdrant/js-client-rest';

// Load environment variables (will be skipped if already loaded by main process)
dotenv.config();

console.log('Initializing embeddings worker...');

// Initialize the worker
const worker = new Worker(
  'context-queue',
  async (job) => {
    try {
      console.log(`Processing job ${job.id}`);
      
      // Get documents from job data
      const { documents } = job.data;
      
      if (!documents || !Array.isArray(documents)) {
        throw new Error('Invalid job data: documents array is required');
      }
      
      console.log(`Processing ${documents.length} documents`);
      
      // Process each document
      for (const doc of documents) {
        await processDocument(doc);
      }
      
      console.log(`Job ${job.id} completed successfully`);
      return { success: true, processedCount: documents.length };
    } catch (error) {
      console.error(`Error processing job ${job.id}:`, error);
      throw error; // Rethrow to mark job as failed
    }
  },
  {
    connection: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    },
    // Add concurrency to process multiple jobs at once if needed
    concurrency: 2,
  }
);

/**
 * Process a single document
 */
async function processDocument(document) {
  try {
    const { text, metadata } = document;
    
    if (!text) {
      throw new Error('Document text is required');
    }
    
    // Create text splitter with chunk size of 1000 characters
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 200,
      chunkOverlap: 10,
    });
    
    // Split text into chunks
    console.log(`Splitting text into chunks...`);
    const docs = await textSplitter.createDocuments([text]);


    // Add metadata to each document
    const enhancedDocs = docs.map(doc => {
      doc.metadata = {
        ...doc.metadata,
        ...metadata,
        chunkTimestamp: Date.now(),
      };
      return doc;
    });
    
    // First, check the collection's vector dimensions
    const client = new QdrantClient({
      url: process.env.QDRANT_URL || 'http://localhost:6333',
    });
    
    const collectionName = process.env.QDRANT_COLLECTION || 'langchainjs-testing';
    
    let vectorSize = 3072; // Default to 3072 if we can't determine
    
    try {
      // Get collection info to determine the vector dimensions
      const collectionInfo = await client.getCollection(collectionName);
      vectorSize = collectionInfo.config.params.vectors.size;
      console.log(`Collection ${collectionName} has vector size: ${vectorSize}`);
    } catch (error) {
      console.log(`Could not get collection info, using default vector size of ${vectorSize}`);
    }
    
    // Initialize Google Generative AI embeddings with correct model and dimensions
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
    
    // Add documents to vector store
    console.log(`Adding documents to vector store...`);
    await vectorStore.addDocuments(enhancedDocs);
    console.log(`All docs are added to vector store`);
    
    return enhancedDocs.length;
  } catch (error) {
    console.error('Error processing document:', error);
    throw error;
  }
}

// Handle worker events
worker.on('completed', job => {
  console.log(`Job ${job.id} completed successfully`);
});

worker.on('failed', (job, error) => {
  console.error(`Job ${job?.id} failed:`, error);
});

worker.on('error', error => {
  console.error('Worker error:', error);
});

console.log('Embeddings worker started and waiting for jobs...');

// Export worker for potential external use
export default worker;



