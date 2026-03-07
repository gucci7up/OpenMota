import express from 'express';
import { config } from '../config.js';
import { runAgentLoop } from '../agent/loop.js';
import { memoryStore } from '../db/index.js';

const app = express();
app.use(express.json());

// Security Middleware
const authMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey || apiKey !== config.OPENMOTA_API_KEY) {
        return res.status(401).json({ error: 'Unauthorized: Invalid or missing API Key' });
    }
    next();
};

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', version: '1.0.0-PRO' });
});

// Chat Endpoint
app.post('/chat', authMiddleware, async (req, res) => {
    const { message } = req.body;

    if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'Missing or invalid "message" in request body' });
    }

    console.log(`\n🌐 API Request received: "${message.substring(0, 50)}..."`);

    try {
        const response = await runAgentLoop(message);
        res.json({ response });
    } catch (error: any) {
        console.error('❌ API Error:', error);
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
});

// Stats Endpoint for Dashboard
app.get('/stats', authMiddleware, async (req, res) => {
    try {
        const stats = await memoryStore.getMemoryStats();
        res.json(stats);
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// Memory Explorer Endpoint
app.get('/memory', authMiddleware, async (req, res) => {
    try {
        const memories = await memoryStore.getMemories(50);
        res.json(memories);
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to fetch memories' });
    }
});

export function startServer() {
    const port = config.PORT;
    app.listen(port, '0.0.0.0', () => {
        console.log(`📡 OpenMota API Server running at http://0.0.0.0:${port}`);
        console.log(`🔑 Secure access enabled with x-api-key`);
    });
}
