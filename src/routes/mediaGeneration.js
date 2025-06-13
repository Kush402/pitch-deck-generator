import express from 'express';
import { generateImage, generateVideo } from '../services/media/mediaGenerator.js';
import { saveAssetsToDrive } from '../services/storage/storageService.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

router.post('/generate', async (req, res) => {
  try {
    const { type, params } = req.body;

    if (!type || !params) {
      return res.status(400).json({
        ok: false,
        error: 'Type and params are required'
      });
    }

    logger.info('Generating media with params:', {
      type,
      params,
      timestamp: new Date().toISOString()
    });

    let assets = [];

    if (type === 'image') {
      if (!params.prompts || !Array.isArray(params.prompts)) {
        return res.status(400).json({
          ok: false,
          error: 'Prompts array is required for image generation'
        });
      }

      // Generate images for each prompt
      for (const prompt of params.prompts) {
        try {
          const imageUrl = await generateImage({
            prompt: prompt.prompt,
            style: params.style || 'modern',
            mood: 'professional',
            technicalSpecs: 'high quality, detailed',
            ...prompt
          });

          assets.push({
            type: 'image',
            url: imageUrl,
            metadata: {
              prompt: prompt.prompt,
              ...prompt
            }
          });
        } catch (error) {
          logger.error('Error generating image:', error);
        }
      }
    } else if (type === 'video') {
      try {
        const videoUrl = await generateVideo({
          prompt: params.prompt,
          style: params.style || 'cinematic',
          duration: params.duration || 5,
          transition: params.transition || 'smooth fade'
        });

        assets.push({
          type: 'animation',
          url: videoUrl,
          metadata: {
            prompt: params.prompt,
            style: params.style,
            duration: params.duration,
            transition: params.transition,
            num_frames: params.num_frames,
            fps: params.fps,
            video_size: params.video_size
          }
        });
      } catch (error) {
        logger.error('Error generating video:', error);
        throw error;
      }
    } else {
      return res.status(400).json({
        ok: false,
        error: 'Invalid media type. Use "image" or "video"'
      });
    }

    // Save assets to storage
    const savedAssets = await saveAssetsToDrive(assets);

    return res.json({
      ok: true,
      assets: savedAssets,
      metadata: {
        timestamp: new Date().toISOString(),
        totalAssets: savedAssets.length,
        assetTypes: [...new Set(savedAssets.map(asset => asset.type))]
      }
    });
  } catch (error) {
    logger.error('Error generating media:', error);
    return res.status(500).json({
      ok: false,
      error: 'Failed to generate media'
    });
  }
});

export default router; 