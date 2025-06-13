// Import environment config first
import './config/env.js';

// Load environment variables first, before any other imports
import { config } from 'dotenv';
config();

// Log environment variables for debugging
console.log('GEMINI_API_URL:', process.env.GEMINI_API_URL);
console.log('GEMINI_API_KEY:', process.env.GEMINI_API_KEY);

import express from 'express';
import bodyParser from 'body-parser';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { logger } from './utils/logger.js';
import { handlePitchKitCommand } from './services/slack/commands.js';
import { generateScript, generateBrandResearch } from './services/ai/scriptGenerator.mcp.js';
import { generateImage, generateVideo } from './services/media/mediaGenerator.js';
import { saveImageToDrive, saveAssetsToDrive } from './services/storage/storageService.js';
import { generateMediaPrompts, getMediaPrompts } from './services/ai/mediaPromptGenerator.mcp.js';
import scriptRouter from './routes/script.js';
import mediaRouter from './routes/media.js';
import mediaPromptsRouter from './routes/mediaPrompts.js';
import mediaGenerationRouter from './routes/mediaGeneration.js';

// Validate required environment variables
const requiredEnvVars = [
  'GEMINI_API_KEY',
  'GEMINI_API_URL',
  'FAL_AI_KEY'
];

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingEnvVars.length > 0) {
  logger.error('Missing required environment variables:', missingEnvVars);
  process.exit(1);
}

const expressApp = express();
const PORT = process.env.PORT || 3000;

// Middleware
expressApp.use(cors());
expressApp.use(helmet());
expressApp.use(morgan('dev'));
expressApp.use(bodyParser.json());
expressApp.use(bodyParser.urlencoded({ extended: true }));

// Add request logging middleware
expressApp.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    body: req.body,
    query: req.query,
    timestamp: new Date().toISOString()
  });
  next();
});

// Mock implementations for testing
const isTestMode = process.env.NODE_ENV === 'test';

// Initialize Slack app only if not in test mode and Slack token is present
let appSlack;
if (!isTestMode && process.env.SLACK_BOT_TOKEN) {
  const { App } = require('@slack/bolt');
  appSlack = new App({
    token: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    socketMode: true,
    appToken: process.env.SLACK_APP_TOKEN
  });
}

// Slack event handling
if (!isTestMode && process.env.SLACK_BOT_TOKEN) {
  appSlack.command('/pitch-kit', async ({ command, ack, client }) => {
    await ack();
    await handlePitchKitCommand(command, client);
  });
}

// API Routes
expressApp.post('/slack/events', async (req, res) => {
  if (isTestMode) {
    return res.status(200).send('OK');
  }
  
  try {
    await appSlack.processEvent(req.body);
    res.status(200).send('OK');
  } catch (error) {
    logger.error('Error processing Slack event:', error);
    res.status(500).send('Error processing event');
  }
});

// Add Slack command endpoint
expressApp.post('/slack/command', async (req, res) => {
  try {
    const { command, text, user_id, channel_id, response_url } = req.body;
    
    if (isTestMode) {
      return res.json({
        response_type: 'in_channel',
        text: `[TEST] Received command: ${command} with text: ${text}`
      });
    }

    // Initialize Slack client for the request
    const { WebClient } = require('@slack/web-api');
    const client = new WebClient(process.env.SLACK_BOT_TOKEN);

    // Handle the command
    await handlePitchKitCommand({
      command,
      text,
      user_id,
      channel_id,
      response_url
    }, client);

    res.status(200).send('OK');
  } catch (error) {
    logger.error('Error handling Slack command:', error);
    res.status(500).json({ error: 'Failed to process command' });
  }
});

// Store research results in memory (in production, this would be in a database)
const researchStore = new Map();

// Store the latest script data for media prompt generation
let latestScriptData = null;

// Store the latest media prompts for asset generation
let latestMediaPrompts = null;

// Research endpoint
expressApp.post('/generate/research', async (req, res) => {
  try {
    const { brandInfo, model = 'gemini-2.0-flash' } = req.body;

    if (!brandInfo) {
      logger.warn('Research generation failed: Missing brand info', {
        received: req.body,
        timestamp: new Date().toISOString()
      });
      return res.status(400).json({ error: 'Brand information is required' });
    }

    // Create a simple key based on brand name
    const researchKey = typeof brandInfo === 'object' ? brandInfo.name : brandInfo.split(' ')[0];

    logger.info('Starting brand research generation', { 
      brand: researchKey,
      model,
      timestamp: new Date().toISOString()
    });

    const result = await generateBrandResearch(brandInfo, model);
    
    // Store research in the researchStore with simple key
    researchStore.set(researchKey, {
      research: result.research,
      brandInfo: brandInfo,
      timestamp: new Date().toISOString()
    });

    logger.info('Research generation completed', {
      brand: researchKey,
      hasResearch: !!result.research,
      timestamp: new Date().toISOString()
    });
    
    return res.json({
      ok: true,
      research: result.research,
      sessionId: researchKey,
      message: 'Research completed successfully. Please proceed with script generation.',
      metadata: result.metadata
    });
  } catch (error) {
    logger.error('Research generation failed', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    res.status(500).json({ error: 'Failed to generate research' });
  }
});

// Script generation endpoint
expressApp.post('/generate/script', async (req, res) => {
  try {
    const { sessionId, campaignGoals, targetAudience, creativeDirection, model = 'gemini-2.0-flash' } = req.body;

    if (!sessionId || !campaignGoals || !targetAudience) {
      logger.warn('Missing required fields for script generation', { 
        hasSessionId: !!sessionId,
        hasCampaignGoals: !!campaignGoals,
        hasTargetAudience: !!targetAudience
      });
      return res.status(400).json({
        ok: false,
        error: 'Missing required fields',
        message: 'Please provide sessionId, campaignGoals, and targetAudience'
      });
    }

    logger.info('Starting script generation', { 
      sessionId,
      hasCampaignGoals: !!campaignGoals,
      hasTargetAudience: !!targetAudience
    });

    // Get research from store
    const research = researchStore.get(sessionId);
    if (!research) {
      logger.warn('No research found for session', { sessionId });
      return res.status(400).json({
        ok: false,
        error: 'No research found',
        message: 'Please generate research first'
      });
    }

    logger.info('Starting script generation with inputs', {
      brandInfo: research.brandInfo,
      research: research.research,
      campaignGoals,
      targetAudience,
      timestamp: new Date().toISOString()
    });

    // Generate script
    const script = await generateScript({
      brandInfo: research.brandInfo,
      research: research.research,
      campaignGoals,
      targetAudience,
      creativeDirection,
      model
    });

    if (!script) {
      logger.error('Script generation failed', { sessionId });
      return res.status(500).json({
        ok: false,
        error: 'Failed to generate script',
        message: 'Please try again'
      });
    }

    logger.info('Script generation completed', { 
      sessionId,
      hasScript: !!script
    });

    // Generate media prompts
    logger.info('Starting media prompts generation', { sessionId });
    const mediaPrompts = await generateMediaPrompts(script, model, sessionId);
    
    if (!mediaPrompts.ok) {
      logger.error('Media prompts generation failed', { 
        sessionId,
        error: mediaPrompts.error
      });
      return res.status(500).json({
        ok: false,
        error: 'Failed to generate media prompts',
        message: 'Please try again'
      });
    }

    logger.info('Media prompts generated successfully', { 
      sessionId,
      hasPrompts: !!mediaPrompts.mediaPrompts
    });

    // Generate assets
    logger.info('Generating assets', { sessionId });
    const assets = [];

    // Generate images
    if (mediaPrompts.mediaPrompts.visualPrompts.images.length > 0) {
      logger.info('Generating images', { count: mediaPrompts.mediaPrompts.visualPrompts.images.length });
      for (const prompt of mediaPrompts.mediaPrompts.visualPrompts.images.slice(0, 2)) { // Limit to 2 images
        try {
          const image = await generateImage({
            prompt: prompt.prompt,
            style: mediaPrompts.mediaPrompts.craftGuidelines.visualStyle,
            mood: 'professional'
          });
          if (image) {
            assets.push({
              type: 'image',
              url: image.url,
              prompt,
              metadata: {
                style: mediaPrompts.mediaPrompts.craftGuidelines.visualStyle,
                colorPalette: mediaPrompts.mediaPrompts.craftGuidelines.colorPalette
              }
            });
            logger.info('Image generated successfully', { prompt: prompt.prompt });
          }
        } catch (error) {
          logger.error('Failed to generate image', { error: error.message, prompt });
        }
      }
    }

    // Generate animations
    if (mediaPrompts.mediaPrompts.visualPrompts.animations.length > 0) {
      logger.info('Generating animations', { count: mediaPrompts.mediaPrompts.visualPrompts.animations.length });
      for (const prompt of mediaPrompts.mediaPrompts.visualPrompts.animations.slice(0, 1)) { // Limit to 1 animation
        try {
          const animation = await generateVideo({
            prompt: prompt.prompt,
            style: mediaPrompts.mediaPrompts.craftGuidelines.animationStyle,
            duration: 5,
            transition: 'smooth fade'
          });
          if (animation) {
            assets.push({
              type: 'animation',
              url: animation.url,
              prompt,
              metadata: {
                style: mediaPrompts.mediaPrompts.craftGuidelines.animationStyle,
                duration: 5,
                transition: 'smooth fade'
              }
            });
            logger.info('Animation generated successfully', { prompt: prompt.prompt });
          }
        } catch (error) {
          logger.error('Failed to generate animation', { error: error.message, prompt });
        }
      }
    }

    logger.info('Assets generated successfully', { 
      sessionId,
      totalAssets: assets.length,
      assetTypes: [...new Set(assets.map(asset => asset.type))]
    });

    // Save assets to Drive
    logger.info('Saving assets to Drive', { sessionId });
    const savedAssets = await saveAssetsToDrive(assets, research.brandInfo.name, sessionId);
    logger.info('Assets saved to Drive successfully', { 
      sessionId,
      totalSaved: savedAssets.length,
      folders: savedAssets[0]?.folderId ? [{
        id: savedAssets[0].folderId,
        name: savedAssets[0].folderName,
        url: savedAssets[0].folderUrl
      }] : []
    });

    // Store script and media prompts
    latestScriptData = {
      script,
      mediaPrompts: mediaPrompts.mediaPrompts,
      timestamp: new Date().toISOString()
    };

    res.json({
      ok: true,
      message: 'Script, media prompts, and assets generated successfully',
      script,
      mediaPrompts: mediaPrompts.mediaPrompts,
      assets: savedAssets,
      folders: savedAssets[0]?.folderId ? [{
        id: savedAssets[0].folderId,
        name: savedAssets[0].folderName,
        url: savedAssets[0].folderUrl
      }] : [],
      metadata: {
        model,
        timestamp: new Date().toISOString(),
        totalAssets: savedAssets.length,
        assetTypes: [...new Set(savedAssets.map(asset => asset.type))],
        folderUrls: savedAssets[0]?.folderId ? [savedAssets[0].folderUrl] : []
      }
    });
  } catch (error) {
    logger.error('Error in script generation', { 
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({
      ok: false,
      error: error.message,
      message: 'Failed to generate script'
    });
  }
});

// Media prompts endpoint
expressApp.get('/generate/media-prompts', async (req, res) => {
  try {
    const { brand } = req.query;
    
    if (!brand) {
      return res.status(400).json({ error: 'Brand name is required' });
    }

    logger.info('Retrieving media prompts for brand:', { brand });
    
    const mediaPrompts = await getMediaPrompts(brand);
    
    if (!mediaPrompts) {
      return res.status(404).json({ error: 'No media prompts found for this brand' });
    }

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

expressApp.post('/generate/media', async (req, res) => {
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
            ...prompt // Include other parameters like image_size, num_inference_steps, etc.
          });

          assets.push({
            type: 'image',
            url: imageUrl,
            metadata: {
              prompt: prompt.prompt,
              ...prompt
            }
          });

          logger.info('Generated image successfully:', {
            prompt: prompt.prompt,
            url: imageUrl
          });
        } catch (error) {
          logger.error('Error generating image for prompt:', {
            prompt: prompt.prompt,
            error: error.message
          });
        }
      }
    } else if (type === 'video') {
      // Handle video generation
      const videoUrl = await generateVideo(params);
      assets.push({ type: 'video', url: videoUrl, metadata: params });
    } else {
      return res.status(400).json({
        ok: false,
        error: 'Invalid media type. Use "image" or "video"'
      });
    }

    if (assets.length === 0) {
      return res.status(500).json({
        ok: false,
        error: 'No assets were generated successfully'
      });
    }

    res.json({
      ok: true,
      assets,
      metadata: {
        timestamp: new Date().toISOString(),
        totalGenerated: assets.length,
        types: [...new Set(assets.map(a => a.type))]
      }
    });
  } catch (error) {
    logger.error('Error generating media:', error);
    res.status(500).json({ 
      ok: false,
      error: 'Failed to generate media',
      details: error.message
    });
  }
});

expressApp.post('/store/assets', async (req, res) => {
  try {
    const { filePath, fileName, metadata } = req.body;
    
    if (isTestMode) {
      return res.json({
        ok: true,
        location: `https://test-storage.com/drive/${fileName}`,
        files: [fileName]
      });
    }
    
    const url = await saveImageToDrive({ 
      url: filePath, 
      fileName, 
      metadata 
    });
    
    res.json({
      ok: true,
      location: url,
      files: [fileName]
    });
  } catch (error) {
    logger.error('Error storing assets:', error);
    res.status(500).json({ 
      ok: false,
      error: 'Failed to store assets',
      response_type: "ephemeral"
    });
  }
});

// Generate assets endpoint
expressApp.get('/generate/assets', async (req, res) => {
  try {
    const { brand } = req.query;
    if (!brand) {
      logger.warn('No brand specified for asset generation');
      return res.status(400).json({
        ok: false,
        error: 'Brand name is required',
        message: 'Please specify a brand name'
      });
    }

    logger.info('Starting asset generation request', { brand });

    // Get media prompts for the brand
    const mediaPromptsResponse = await getMediaPrompts(brand);
    if (!mediaPromptsResponse.ok) {
      logger.error('Failed to get media prompts', { brand, error: mediaPromptsResponse.error });
      return res.status(400).json({
        ok: false,
        error: 'No media prompts found',
        message: 'Please generate media prompts first'
      });
    }

    const mediaPrompts = mediaPromptsResponse.mediaPrompts;
    logger.info('Retrieved media prompts', { 
      brand,
      hasVisualPrompts: mediaPrompts.visualPrompts.images.length > 0 || mediaPrompts.visualPrompts.animations.length > 0,
      hasAudioPrompts: mediaPrompts.audioPrompts.music.length > 0 || mediaPrompts.audioPrompts.soundEffects.length > 0
    });

    // Generate assets
    const assets = await generateAssets(mediaPrompts, brand);
    logger.info('Assets generated', { 
      brand,
      totalAssets: assets.length,
      assetTypes: [...new Set(assets.map(asset => asset.type))]
    });

    // Save assets to Drive
    const savedAssets = await saveAssetsToDrive(assets, brand);
    logger.info('Assets saved to Drive', { 
      brand,
      totalSaved: savedAssets.length,
      savedUrls: savedAssets.map(asset => asset.url)
    });

    res.json({
      ok: true,
      assets: savedAssets,
      metadata: {
        timestamp: new Date().toISOString(),
        totalAssets: savedAssets.length,
        assetTypes: [...new Set(savedAssets.map(asset => asset.type))],
        promptLimits: {
          images: 2,
          animations: 1,
          audio: {
            music: 1,
            soundEffects: 1
          }
        }
      }
    });
  } catch (error) {
    logger.error('Error generating assets', { error: error.message, stack: error.stack });
    res.status(500).json({
      ok: false,
      error: error.message,
      message: 'Failed to generate assets'
    });
  }
});

// Test Fal.ai integration
expressApp.get('/test/fal-ai', async (req, res) => {
  try {
    const testPrompt = "A serene, abstract representation of interconnectedness using flowing lines and subtle gradients";
    const imageUrl = await generateImage({
      prompt: testPrompt,
      style: 'abstract',
      mood: 'serene',
      technicalSpecs: 'high quality, detailed'
    });
    
    res.json({
      ok: true,
      message: 'Fal.ai integration test successful',
      imageUrl,
      prompt: testPrompt
    });
  } catch (error) {
    logger.error('Fal.ai integration test failed:', error);
    res.status(500).json({
      ok: false,
      error: 'Fal.ai integration test failed',
      details: error.message
    });
  }
});

// Health check endpoint
expressApp.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Debug endpoint to check environment variables
expressApp.get('/debug/env', (req, res) => {
  const envVars = {
    NODE_ENV: process.env.NODE_ENV,
    FAL_AI_KEY: process.env.FAL_AI_KEY ? 'Set (hidden)' : 'Not set',
    GEMINI_API_KEY: process.env.GEMINI_API_KEY ? 'Set (hidden)' : 'Not set',
    GEMINI_API_URL: process.env.GEMINI_API_URL,
    PORT: process.env.PORT
  };
  
  res.json({
    ok: true,
    environment: envVars,
    message: 'Environment variables status'
  });
});

// Register routes
expressApp.use('/generate/script', scriptRouter);
expressApp.use('/generate/media', mediaRouter);
expressApp.use('/generate/media-prompts', mediaPromptsRouter);
expressApp.use('/generate/media-assets', mediaGenerationRouter);

// Start the Express server
const server = expressApp.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
});

// Start the Slack app if not in test mode and it was initialized
if (!isTestMode && appSlack) {
  (async () => {
    try {
      await appSlack.start();
      logger.info('⚡️ Bolt app is running!');
    } catch (error) {
      logger.error('Failed to start Slack app:', error);
    }
  })();
}

// Error handling
process.on('unhandledRejection', (error) => {
  logger.error('Unhandled promise rejection:', error);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received. Closing HTTP server...');
  expressApp.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

export default expressApp; 