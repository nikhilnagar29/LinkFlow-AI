import express from 'express';
import { handleUserMessage } from '../utils/handleMessage.js';

const router = express.Router();

router.post('/chat', async (req, res) => {
  try {
    const { messages, receiver } = req.body;        // <-- fixed here


    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ success: false, error: 'Invalid messages format' });
    }

    if (!messages.every(m => m.role && m.message)) {
      return res.status(400).json({ success: false, error: 'Invalid message structure' });
    }

    const response = await handleUserMessage(messages, receiver);

    return res.json({
      success: true,
      response,
      message: 'Message processed successfully'
    });
  } catch (error) {
    console.error("Error in /api/chat", error);
    return res.status(500).json({ success: false, error: 'An error occurred while processing your request.' });
  }
});

export default router;
