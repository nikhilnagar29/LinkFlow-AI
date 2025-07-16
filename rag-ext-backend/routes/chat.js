import express from 'express';

import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { QdrantVectorStore } from '@langchain/qdrant';
import { handleUserMessage } from '../utils/handleMessage.js';


const router = express.Router();


router.post('/api/chat' , async (req , res) => {
    try {
        let {messages ,receiver } = req.body.messages;

        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return res.status(400).json({ success: false, error: 'Invalid messages format' });
        }

        // Ensure each message has the required fields
        const validMessages = messages.every(msg => 
            msg && typeof msg === 'object' && 
            'role' in msg && 'message' in msg);
            
        if (!validMessages) {
            return res.status(400).json({ success: false, error: 'Invalid message structure' });
        }

        const response = await handleUserMessage(messages , receiver);

        res.json({
            success: true,
            response: response,
            message: 'Message processed successfully'
        });

    }
    catch(error){
        console.log("Error in /api/chat" , error) ;
        res.status(500).send({
            status: 'error',
            message: 'An error occurred while processing your request.'
        })
    }
    
})

export default router;