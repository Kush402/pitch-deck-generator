import { logger } from '../../utils/logger.js';
import axios from 'axios';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = process.env.GEMINI_API_URL;
const GEMINI_PROJECT_NUMBER = process.env.GEMINI_PROJECT_NUMBER;

// Store conversation history for MCP
const conversationHistory = new Map();

// Custom system prompts for different functions
const SYSTEM_PROMPTS = {
  mediaPrompt: `You are a Creative Director at Paradowski Creative, specializing in crafting detailed media generation prompts. Your mission is to:

1. Transform script elements into precise, actionable media prompts
2. Ensure visual consistency across all media elements
3. Create prompts that capture the intended emotional impact
4. Maintain brand alignment in all generated content
5. Provide clear technical specifications for media generation

Your prompts should be:
- Specific and detailed
- Brand-aligned
- Emotionally resonant
- Technically precise
- Craft-focused

Format your response as a valid JSON object with double-quoted property names. Example format:
{
  "visualPrompts": {
    "images": [
      {
        "prompt": "string",
        "style": "string",
        "mood": "string",
        "technicalSpecs": "string"
      }
    ],
    "animations": [
      {
        "prompt": "string",
        "style": "string",
        "duration": "string",
        "transition": "string"
      }
    ]
  },
  "craftGuidelines": {
    "visualStyle": "string",
    "colorPalette": "string",
    "typography": "string",
    "animationStyle": "string"
  }
}`
};

/**
 * Extracts media elements from script sections
 * @param {Array} sections - Array of script sections
 * @returns {Object} Extracted media elements
 */
export const extractMediaElements = (sections) => {
  // Initialize media elements object with empty arrays
  const mediaElements = {
    visualElements: [],
    experientialElements: [],
    motionTransitions: [],
    craftAndDesign: [],
    brandAlignmentNotes: []
  };

  // Check if sections is undefined or not an array
  if (!sections || !Array.isArray(sections)) {
    logger.warn('No sections found in script data');
    return mediaElements;
  }

  // Process each section
  sections.forEach(section => {
    if (!section) return; // Skip if section is undefined

    // Safely extract elements using optional chaining
    if (section.visualElements?.length) {
      mediaElements.visualElements.push(...section.visualElements);
    }
    if (section.experientialElements?.length) {
      mediaElements.experientialElements.push(...section.experientialElements);
    }
    if (section.motionTransitions) {
      mediaElements.motionTransitions.push(section.motionTransitions);
    }
    if (section.craftAndDesign) {
      mediaElements.craftAndDesign.push(section.craftAndDesign);
    }
    if (section.brandAlignmentNotes) {
      mediaElements.brandAlignmentNotes.push(section.brandAlignmentNotes);
    }
  });

  return mediaElements;
};

const formatPromptForFAL = (prompt, type = 'image') => {
  if (type === 'animation') {
    return {
      prompt: prompt,
      style: 'cinematic',
      duration: 5,
      transition: 'smooth fade',
      num_frames: 16,
      fps: 8,
      video_size: 'landscape_16_9',
      model: 'fal-ai/fast-animatediff/turbo/text-to-video'
    };
  }

  return {
    prompt: prompt,
    image_size: "landscape_16_9",
    num_inference_steps: 28,
    guidance_scale: 7.5,
    seed: Math.floor(Math.random() * 1000),
    model: "fal-ai/flux-pro/v1.1-ultra"
  };
};

/**
 * Generates media prompts using MCP
 * @param {Object} script - The script object containing sections and brand info
 * @param {string} model - AI model to use (defaults to gemini-2.0-flash)
 * @param {string} brandName - The name of the brand for storing conversation history
 * @returns {Promise<Object>} Generated media prompts
 */
export const generateMediaPrompts = async (script, model = 'gemini-2.0-flash', brandName) => {
  try {
    logger.info('Starting media prompts generation', { brand: brandName });
    
    // Extract visual elements from script sections
    const visualPrompts = {
      images: [],
      animations: []
    };

    // Ensure script has sections
    if (!script?.sections || !Array.isArray(script.sections)) {
      logger.warn('No sections found in script data, using default prompts');
      visualPrompts.images.push({
        prompt: 'Dynamic shot showcasing brand identity and values',
        style: 'modern',
        mood: 'professional',
        technicalSpecs: 'high quality, detailed, 4k resolution'
      });
      visualPrompts.animations.push({
        prompt: 'Smooth brand logo animation with dynamic transitions',
        style: 'cinematic',
        duration: '5 seconds',
        transition: 'smooth fade'
      });
    } else {
      // Process each section to extract prompts
      script.sections.forEach(section => {
        // Extract visual elements
        if (section.visualElements) {
          section.visualElements.forEach(element => {
            if (typeof element === 'string') {
              if (element.toLowerCase().includes('animation') || 
                  element.toLowerCase().includes('motion') || 
                  element.toLowerCase().includes('transition')) {
                visualPrompts.animations.push({
                  prompt: element,
                  style: section.craftAndDesignDetails?.style || 'cinematic',
                  duration: '5 seconds',
                  transition: section.motionTransitions || 'smooth fade'
                });
              } else {
                visualPrompts.images.push({
                  prompt: element,
                  style: section.craftAndDesignDetails?.style || 'modern',
                  mood: section.craftAndDesignDetails?.mood || 'professional',
                  technicalSpecs: 'high quality, detailed, 4k resolution'
                });
              }
            }
          });
        }
      });
    }

    // Ensure we have at least one prompt of each type
    if (visualPrompts.images.length === 0) {
      visualPrompts.images.push({
        prompt: 'Dynamic brand showcase with modern aesthetic',
        style: 'modern',
        mood: 'professional',
        technicalSpecs: 'high quality, detailed, 4k resolution'
      });
    }
    if (visualPrompts.animations.length === 0) {
      visualPrompts.animations.push({
        prompt: 'Smooth brand logo animation',
        style: 'cinematic',
        duration: '5 seconds',
        transition: 'smooth fade'
      });
    }

    // Extract craft guidelines from script if available
    const craftGuidelines = {
      visualStyle: script?.sections?.[0]?.craftAndDesignDetails?.style || 
                  "Clean, modern, and professional. Emphasis on brand consistency and visual impact.",
      colorPalette: script?.sections?.[0]?.craftAndDesignDetails?.colors || 
                   "Brand colors with complementary accents. High contrast for readability.",
      typography: script?.sections?.[0]?.craftAndDesignDetails?.typography || 
                 "Modern sans-serif fonts. Clear hierarchy and excellent readability.",
      animationStyle: script?.sections?.[0]?.motionTransitions || 
                     "Smooth, purposeful motion with professional transitions."
    };

    const mediaPrompts = {
      visualPrompts,
      craftGuidelines
    };

    // Store the media prompts
    const storageKey = `media_prompts_${brandName || 'default'}`;
    conversationHistory.set(storageKey, {
      mediaElements: mediaPrompts,
      timestamp: new Date().toISOString(),
      brandName
    });

    logger.info('Media prompts generated successfully', { 
      brand: brandName,
      totalImages: visualPrompts.images.length,
      totalAnimations: visualPrompts.animations.length
    });

    return {
      ok: true,
      mediaPrompts,
      metadata: {
        model,
        timestamp: new Date().toISOString(),
        mcp: true,
        stats: {
          images: visualPrompts.images.length,
          animations: visualPrompts.animations.length
        }
      },
      message: 'Media prompts generated successfully.'
    };
  } catch (error) {
    logger.error('Error generating media prompts', { error: error.message, stack: error.stack });
    return {
      ok: false,
      error: error.message,
      message: 'Failed to generate media prompts.'
    };
  }
};

export const getMediaPrompts = async (brandName) => {
  try {
    const storageKey = `media_prompts_${brandName}`;
    const storedData = conversationHistory.get(storageKey);
    
    if (!storedData?.mediaElements) {
      logger.warn(`No media prompts found for brand: ${brandName}`);
      return null;
    }

    return storedData.mediaElements;
  } catch (error) {
    logger.error('Error retrieving media prompts:', error);
    throw new Error('Failed to retrieve media prompts');
  }
}; 