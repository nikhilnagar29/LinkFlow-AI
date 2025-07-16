import { QdrantClient } from '@qdrant/js-client-rest';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function checkQdrantCollection() {
  try {
    console.log('Checking Qdrant collection...');
    
    const client = new QdrantClient({
      url: process.env.QDRANT_URL || 'http://localhost:6333',
    });
    
    const collectionName = process.env.QDRANT_COLLECTION || 'langchainjs-testing';
    
    try {
      // Check if collection exists
      const collectionInfo = await client.getCollection(collectionName);
      const vectorSize = collectionInfo.config.params.vectors.size;
      
      console.log(`Collection ${collectionName} exists with vector size: ${vectorSize}`);
      console.log(`Vector config:`, JSON.stringify(collectionInfo.config.params.vectors, null, 2));
      
      // Check which embedding model and task type to use
      if (vectorSize === 768) {
        console.log('This collection should use:');
        console.log('- Model: gemini-embedding-001');
        console.log('- Task Type: RETRIEVAL_QUERY');
        console.log('- No need to set outputDimensionality (defaults to 768)');
      } else if (vectorSize === 3072) {
        console.log('This collection should use:');
        console.log('- Model: gemini-embedding-001');
        console.log('- Task Type: RETRIEVAL_DOCUMENT');
        console.log('- outputDimensionality: 3072');
      } else {
        console.log(`WARNING: Unusual vector size (${vectorSize}). Please check your embedding model configuration.`);
      }
      
    } catch (error) {
      if (error.message.includes('not found')) {
        console.log(`Collection ${collectionName} does not exist.`);
        console.log('Would you like to create it? (Y/n)');
        
        // In a real script, you would get user input here
        // For this example, we'll just show how to create with 3072 dimensions
        console.log('Creating collection with 3072 dimensions (for RETRIEVAL_DOCUMENT task type)...');
        
        await client.createCollection(collectionName, {
          vectors: {
            size: 3072,
            distance: 'Cosine'
          }
        });
        
        console.log(`Collection ${collectionName} created successfully with 3072 dimensions.`);
      } else {
        throw error;
      }
    }
    
  } catch (error) {
    console.error('Error checking Qdrant collection:', error);
  }
}

// Run the function
checkQdrantCollection().then(() => {
  console.log('Done.');
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
}); 