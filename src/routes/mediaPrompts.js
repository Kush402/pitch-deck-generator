import express from 'express';
import { logger } from '../utils/logger.js';
import { getMediaPrompts } from '../services/ai/mediaPromptGenerator.mcp.js';
import { getStoredScript } from '../services/ai/scriptGenerator.mcp.js';

const router = express.Router();

// GET endpoint to retrieve media prompts
router.get('/', async (req, res) => {
  try {
    const { brand } = req.query;
    
    if (!brand) {
      return res.status(400).json({ error: 'Brand name is required' });
    }

    logger.info('Retrieving media prompts for brand:', { brand });
    
    // First try to get from stored script
    const storedData = await getStoredScript(brand);
    if (storedData?.mediaPrompts) {
      logger.info('Found media prompts in stored data for brand:', { brand });
      return res.json({
        ok: true,
        mediaPrompts: storedData.mediaPrompts,
        metadata: {
          model: 'gemini-2.0-flash',
          timestamp: storedData.timestamp,
          mcp: true
        },
        message: 'Media prompts retrieved successfully from stored data.'
      });
    }
    
    // If not found in stored script, try direct media prompts
    const mediaPrompts = await getMediaPrompts(brand);
    
    if (!mediaPrompts) {
      logger.warn('No media prompts found for brand:', { brand });
      return res.status(404).json({ error: 'No media prompts found for this brand' });
    }

    logger.info('Retrieved media prompts directly for brand:', { brand });
    res.json({
      ok: true,
      mediaPrompts,
      metadata: {
        model: 'gemini-2.0-flash',
        timestamp: new Date().toISOString(),
        mcp: true
      },
      message: 'Media prompts retrieved successfully.'
    });
  } catch (error) {
    logger.error('Error in media prompts generation:', error);
    res.status(500).json({ error: 'Failed to generate media prompts' });
  }
});

export default router; 