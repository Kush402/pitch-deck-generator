import express from 'express';
import { logger } from '../utils/logger.js';
import { generateImage, generateVideo } from '../services/media/mediaGenerator.js';

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { mediaPrompts } = req.body;
    
    if (!mediaPrompts) {
      return res.status(400).json({ 
        ok: false,
        error: 'Media prompts are required' 
      });
    }

    const assets = [];

    // Generate images
    if (mediaPrompts.visualPrompts?.images?.length > 0) {
      for (const prompt of mediaPrompts.visualPrompts.images) {
        try {
          const image = await generateImage({
            prompt: prompt.prompt,
            style: mediaPrompts.craftGuidelines?.visualStyle || 'modern',
            mood: 'professional',
            technicalSpecs: 'high quality, detailed'
          });
          assets.push({
            type: 'image',
            ...image,
            metadata: {
              prompt: prompt.prompt,
              style: mediaPrompts.craftGuidelines?.visualStyle
            }
          });
        } catch (error) {
          logger.error('Error generating image:', error);
        }
      }
    }

    // Generate animations
    if (mediaPrompts.visualPrompts?.animations?.length > 0) {
      for (const prompt of mediaPrompts.visualPrompts.animations) {
        try {
          const video = await generateVideo({
            prompt: prompt.prompt,
            style: mediaPrompts.craftGuidelines?.animationStyle || 'cinematic',
            duration: 5,
            transition: 'smooth fade'
          });
          assets.push({
            type: 'animation',
            ...video,
            metadata: {
              prompt: prompt.prompt,
              style: mediaPrompts.craftGuidelines?.animationStyle
            }
          });
        } catch (error) {
          logger.error('Error generating animation:', error);
        }
      }
    }

    res.json({
      ok: true,
      assets,
      metadata: {
        model: 'fal-ai/flux-pro/v1.1-ultra',
        timestamp: new Date().toISOString(),
        totalAssets: assets.length,
        assetTypes: [...new Set(assets.map(asset => asset.type))]
      }
    });
  } catch (error) {
    logger.error('Error generating media:', error);
    res.status(500).json({ 
      ok: false,
      error: 'Failed to generate media' 
    });
  }
});

export default router; 