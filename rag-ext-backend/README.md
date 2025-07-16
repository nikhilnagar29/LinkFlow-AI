# RAG Extension Backend

This backend service provides API endpoints for saving conversation context and processing it using RAG (Retrieval-Augmented Generation) techniques. It uses Redis for queueing with BullMQ and Qdrant for vector storage.

## Features

- Save conversation context via API
- Process context in a background worker using BullMQ
- Generate text embeddings using Google's embedding-001 model
- Store embeddings in Qdrant vector database
- Generate responses using Gemini API
- Monitor queues with Bull Board UI

## Prerequisites

- Node.js 16+
- Docker and Docker Compose

## Setup

1. Clone the repository
2. Create a `.env` file in the root directory with the following content:

   ```
   # API Keys
   GOOGLE_API_KEY=your_google_api_key_here
   GEMINI_API_KEY=your_gemini_api_key_here

   # Service URLs
   REDIS_HOST=localhost
   REDIS_PORT=6379
   QDRANT_URL=http://localhost:6333

   # Collection settings
   QDRANT_COLLECTION=langchainjs-testing
   ```

3. Install dependencies:
   ```
   npm install
   ```
4. Start the required services using Docker Compose:
   ```
   docker-compose up -d
   ```
5. Initialize the Qdrant collection:
   ```
   node scripts/init-qdrant.js
   ```

## Running the Application

1. Start the main API server:
   ```
   node index.js
   ```
2. Start the embeddings worker in a separate terminal:
   ```
   node start-worker.js
   ```

For development with auto-reload:

```
nodemon index.js
```

## API Endpoints

### Save Context

```
POST /api/save-context
```

Request body:

```json
{
  "context": "This is the conversation context to be processed"
}
```

Response:

```json
{
  "success": true,
  "message": "Context saved in queue",
  "jobId": "1"
}
```

### Generate Response

```
POST /ask
```

Request body:

```json
{
  "receiver": "Recipient Name",
  "messages": [
    {
      "role": "User Name",
      "message": "Message content"
    }
  ],
  "description": "Conversation description"
}
```

Response:

```json
{
  "response": "Generated response text"
}
```

### Health Check

```
GET /health
```

Response:

```json
{
  "status": "ok",
  "message": "Server is running"
}
```

### Bull Board UI

```
GET /admin/queues
```

A web-based UI for monitoring and managing BullMQ queues.

## Architecture

- **API Server**: Express.js server handling HTTP requests
- **Queue**: Redis with BullMQ for storing context to be processed
- **Worker**: Background process for generating embeddings
- **Vector Store**: Qdrant for storing and retrieving embeddings
- **LLM Integration**: Gemini API for generating responses

## Docker Services

- **Redis**: In-memory database for queueing
- **Qdrant**: Vector database for storing embeddings
