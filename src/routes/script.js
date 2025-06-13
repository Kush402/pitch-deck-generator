import express from 'express';
import { logger } from '../utils/logger.js';
import { generateScript } from '../services/ai/scriptGenerator.mcp.js';

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { sessionId, campaignGoals, targetAudience, creativeDirection, model } = req.body;
    
    if (!sessionId || !campaignGoals || !targetAudience) {
      return res.status(400).json({ 
        ok: false,
        error: 'Session ID, campaign goals, and target audience are required' 
      });
    }

    const result = await generateScript({
      sessionId,
      campaignGoals,
      targetAudience,
      creativeDirection,
      model: model || 'gemini-2.0-flash'
    });

    if (!result.ok) {
      return res.status(500).json(result);
    }

    res.json(result);
  } catch (error) {
    logger.error('Error in script generation:', error);
    res.status(500).json({ 
      ok: false,
      error: error.message || 'Failed to generate script'
    });
  }
});

export default router; 