import { fal } from '@fal-ai/client';
import { logger } from '../../utils/logger.js';
import axios from 'axios';

// Configure Fal.ai client
fal.config({
  credentials: process.env.FAL_AI_KEY,
});

// Model configurations
const MODEL_CONFIGS = {
  image: {
    model: 'fal-ai/flux-pro/v1.1-ultra',
    params: {
      prompt: '',
      num_inference_steps: 28,
      guidance_scale: 7.5,
      width: 1024,
      height: 1024
    }
  },
  video: {
    model: 'fal-ai/fast-animatediff/turbo/text-to-video',
    params: {
      prompt: '',
      num_frames: 16,
      fps: 8,
      video_size: 'landscape_16_9'
    }
  }
};

/**
 * Polls the status of a fal.ai request until completion
 * @param {string} statusUrl - URL to check request status
 * @param {number} interval - Polling interval in milliseconds
 * @param {number} timeout - Maximum time to wait in milliseconds
 * @returns {Promise<Object>} Final status response
 */
async function pollStatus(statusUrl, interval = 20000, timeout = 300000) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    try {
      const response = await axios.get(statusUrl, {
        headers: {
          'Authorization': `Bearer ${process.env.FAL_AI_KEY}`
        }
      });

      logger.info('Status check response:', {
        status: response.data.status,
        timestamp: new Date().toISOString()
      });

      if (response.data.status === 'COMPLETED') {
        return response.data;
      } else if (response.data.status === 'FAILED') {
        throw new Error(`Request failed: ${response.data.error || 'Unknown error'}`);
      }

      // Wait for the specified interval before next check
      await new Promise(resolve => setTimeout(resolve, interval));
    } catch (error) {
      logger.error('Error checking status:', error);
      throw error;
    }
  }

  throw new Error('Request timed out');
}

/**
 * Executes a model request with fallback to queue-based execution
 * @param {string} modelId - Model ID to use
 * @param {Object} input - Input parameters for the model
 * @returns {Promise<Object>} Model execution result
 */
async function executeModelRequest(modelId, input) {
  try {
    // Try immediate execution first
    logger.info('Attempting immediate execution for model:', modelId);
    const response = await fal.request(modelId, { input });
    
    // If we get a status URL, start polling
    if (response.status_url) {
      logger.info('Starting status polling for request:', {
        modelId,
        statusUrl: response.status_url
      });
      
      const finalStatus = await pollStatus(response.status_url);
      return {
        data: finalStatus.output,
        requestId: response.request_id
      };
    }
    
    return response;
  } catch (error) {
    // Log detailed error information for 404s
    if (error.response?.status === 404) {
      logger.error('404 Error Details:', {
        modelId,
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers
      });
    }

    // Fall back to queue-based execution
    logger.info('Falling back to queue-based execution for model:', modelId);
    const queueResponse = await fal.subscribe(modelId, {
      input,
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === "IN_PROGRESS") {
          logger.info('Queue progress update:', {
            modelId,
            logs: update.logs.map(log => log.message)
          });
        } else if (update.status === "FAILED") {
          logger.error('Queue execution failed:', {
            modelId,
            error: update.error,
            logs: update.logs
          });
        } else if (update.status === "COMPLETED") {
          logger.info('Queue execution completed:', {
            modelId,
            output: update.output
          });
        }
      },
    });

    // If queue response includes a status URL, poll it
    if (queueResponse.status_url) {
      logger.info('Starting status polling for queued request:', {
        modelId,
        statusUrl: queueResponse.status_url
      });
      
      const finalStatus = await pollStatus(queueResponse.status_url);
      return {
        data: finalStatus.output,
        requestId: queueResponse.request_id
      };
    }

    return queueResponse;
  }
}

/**
 * Generates an image using Fal.ai's text-to-image model
 * @param {Object} params - Parameters for image generation
 * @param {string} params.prompt - Image generation prompt
 * @param {string} params.style - Image style
 * @param {string} params.mood - Image mood
 * @param {string} params.technicalSpecs - Technical specifications
 * @returns {Promise<string>} Generated image URL
 */
async function generateImage({ 
  prompt, 
  style = 'photorealistic',
  mood = 'professional',
  technicalSpecs = 'high quality, detailed'
}) {
  try {
    // Construct the full prompt with style, mood, and technical specs
    const fullPrompt = `${prompt} Style: ${style}. Mood: ${mood}. ${technicalSpecs}`;
    
    logger.info('Sending request to Fal.ai', { 
      modelId: MODEL_CONFIGS.image.model,
      prompt: fullPrompt
    });

    const result = await executeModelRequest(MODEL_CONFIGS.image.model, {
      prompt: fullPrompt
    });

    logger.info('Fal.ai response received', {
      hasData: !!result.data,
      requestId: result.requestId
    });

    if (!result.data) {
      throw new Error('No data received from Fal.ai');
    }

    // Extract image URL from response
    const imageUrl = result.data.images?.[0]?.url;
    if (!imageUrl) {
      logger.error('Image URL not found in response:', result.data);
      throw new Error('Image URL not found in response');
    }

    return {
      url: imageUrl,
      metadata: {
        style,
        mood,
        technicalSpecs
      }
    };
  } catch (error) {
    logger.error('Error generating image:', error);
    throw new Error(`Failed to generate image: ${error.message}`);
  }
}

/**
 * Generates a video using Fal.ai's video model
 * @param {Object} params - Parameters for video generation
 * @param {string} params.prompt - Video prompt
 * @param {string} params.style - Video style
 * @param {number} params.duration - Video duration
 * @param {string} params.transition - Video transition
 * @returns {Promise<string>} Generated video URL
 */
async function generateVideo({ 
  prompt, 
  style = 'cinematic',
  duration = 5,
  transition = 'smooth fade'
}) {
  try {
    // Construct the full prompt with style and motion details
    const fullPrompt = `${prompt} Style: ${style}. Motion: ${JSON.stringify({
      style,
      duration,
      transition
    })}`;
    
    logger.info('Sending request to Fal.ai for video', { 
      modelId: MODEL_CONFIGS.video.model,
      prompt: fullPrompt
    });

    const videoParams = {
      prompt: fullPrompt,
      num_frames: 16,
      fps: 8,
      video_size: 'landscape_16_9'
    };

    const result = await executeModelRequest(MODEL_CONFIGS.video.model, videoParams);

    logger.info('Fal.ai response received for video', {
      hasData: !!result.data,
      requestId: result.requestId,
      responseData: result.data
    });

    if (!result.data) {
      throw new Error('No data received from Fal.ai');
    }

    // Extract video URL from response
    const videoUrl = result.data.video_url || result.data.video?.url;
    if (!videoUrl) {
      logger.error('Video URL not found in response:', result.data);
      throw new Error('Video URL not found in response');
    }

    return {
      url: videoUrl,
      metadata: {
        style,
        duration,
        transition
      }
    };
  } catch (error) {
    logger.error('Error generating video:', error);
    throw new Error(`Failed to generate video: ${error.message}`);
  }
}

// Export functions
export { generateImage, generateVideo };