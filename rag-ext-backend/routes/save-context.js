import express from 'express';

import { ExpressAdapter } from '@bull-board/express';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter.js'; // Fixed import path with .js extension
import { createBullBoard } from '@bull-board/api';

import { Queue } from 'bullmq';

const router = express.Router();

const contextQueue = new Queue('context-queue', {
  connection: {
    host: 'localhost',
    port: 6379,
  },
});

// Set up Bull Board (queue monitoring UI)
const serverAdapter = new ExpressAdapter();
const { addQueue, removeQueue, setQueues, replaceQueues } = createBullBoard({
  queues: [
    new BullMQAdapter(contextQueue), // Use the contextQueue we defined above
  ],
  serverAdapter: serverAdapter,
});

// Export the serverAdapter to be used in the main index.js file
export const bullBoardAdapter = serverAdapter;

/**
 * @route POST /api/save-context
 * @desc Save context to queue for processing
 * @access Public
 */
router.post('/api/save-context', async (req, res) => {
  try {
    const { context } = req.body;

    // Validate request
    if (!context || typeof context !== 'string') {
      return res.status(400).json({ success: false, error: 'Context is required and must be a string' });
    }

    // Create documents array for processing
    const documents = [{
      text: context,
      metadata: {
        timestamp: Date.now(),
        source: 'linkedin-conversation'
      }
    }];

    // Add job to the queue
    const job = await contextQueue.add(
      'context-ready',
      { documents }
    );

    return res.json({ 
      message: 'Context saved in queue',
      jobId: job.id,
      success: true
    });

  } catch (error) {
    console.error('Error saving context:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

export default router;
