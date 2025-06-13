import { logger } from '../../utils/logger.js';
import axios from 'axios';
import { env } from '../../config/env.js';
import { generateMediaPrompts } from './mediaPromptGenerator.mcp.js';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = process.env.GEMINI_API_URL;
const GEMINI_PROJECT_NUMBER = process.env.GEMINI_PROJECT_NUMBER;

// Add detailed logging for environment variables
logger.info('Environment variables check:', {
  GEMINI_API_URL: env.GEMINI_API_URL ? 'Present' : 'Missing',
  GEMINI_API_KEY: env.GEMINI_API_KEY ? 'Present' : 'Missing',
  GEMINI_PROJECT_NUMBER: env.GEMINI_PROJECT_NUMBER ? 'Present' : 'Missing'
});

// Check for missing environment variables
if (!GEMINI_API_URL || !GEMINI_API_KEY) {
  logger.error('Missing required environment variables:', {
    GEMINI_API_URL: GEMINI_API_URL || 'undefined',
    GEMINI_API_KEY: GEMINI_API_KEY ? '***' : 'undefined'
  });
  throw new Error('Missing required environment variables: GEMINI_API_URL and GEMINI_API_KEY');
}

// Store conversation history for MCP
const conversationHistory = new Map();

// System prompts for different functions
const SYSTEM_PROMPTS = {
  research: `You are a Brand Research Specialist at Paradowski Creative, a full-service creative agency known for its craft-focused approach to branding and storytelling. Your mission is to:

1. Conduct deep human-centered research to understand brand essence and audience needs
2. Identify meaningful connections between brands and their audiences
3. Uncover unique storytelling opportunities that align with brand values
4. Analyze market context through the lens of design thinking
5. Provide insights that inform creative, empathetic solutions

Your analysis should be:
- Human-centered and empathetic
- Craft-focused and detail-oriented
- Strategic yet creative
- Research-driven and evidence-based
- Focused on meaningful brand-audience connections

Format your response as a valid JSON object with double-quoted property names. Example format:
{
  "brandEssence": {
    "coreStory": "string",
    "emotionalAppeal": "string",
    "audienceInsights": "string"
  },
  "creativeOpportunities": {
    "storytellingAngles": "string",
    "visualPossibilities": "string",
    "brandExpression": "string"
  },
  "strategicContext": {
    "marketPosition": "string",
    "industryTrends": "string",
    "growthOpportunities": "string"
  },
  "brandVoice": {
    "tone": "string",
    "visualLanguage": "string",
    "communicationStyle": "string"
  },
  "implementation": {
    "keyTouchpoints": "string",
    "challenges": "string",
    "opportunities": "string"
  }
}`,

  generate: `You are a Creative Director at Paradowski Creative, specializing in crafting compelling pitch deck scripts. Your mission is to:

1. Create engaging, emotionally resonant narratives
2. Structure content for maximum impact
3. Incorporate brand values and messaging
4. Design visual and experiential elements
5. Ensure seamless transitions between sections

Your scripts should be:
- Brand-aligned
- Audience-focused
- Emotionally engaging
- Visually descriptive
- Experientially rich

Format your response as a valid JSON object with the following structure:
{
  "sections": [
    {
      "sectionTitle": "string",
      "duration": "string",
      "narrativeContent": "string",
      "keyMessages": ["string"],
      "visualElements": ["string"],
      "experientialElements": ["string"],
      "motionTransitions": "string",
      "soundAndMusic": "string",
      "craftAndDesignDetails": "string",
      "brandAlignmentNotes": "string"
    }
  ],
  "transitions": ["string"]
}`
};

/**
 * Generates brand research using MCP
 * @param {string} brandInfo - Brand information
 * @param {string} model - AI model to use (defaults to gemini-2.0-flash)
 * @returns {Promise<Object>} Generated research
 */
export async function generateBrandResearch(brandInfo, model = 'gemini-2.0-flash') {
  try {
    const RESEARCH_PROMPT = `You are a Brand Research Specialist at Paradowski Creative. Analyze the following brand information and provide a comprehensive research report in JSON format. Do not include any text outside the JSON structure.

Brand Information:
${JSON.stringify(brandInfo, null, 2)}

Required JSON Structure:
{
  "brandEssence": {
    "coreStory": "string",
    "emotionalAppeal": "string",
    "audienceInsights": "string"
  },
  "creativeOpportunities": {
    "storytellingAngles": "string",
    "visualPossibilities": "string",
    "brandExpression": "string"
  },
  "strategicContext": {
    "marketPosition": "string",
    "industryTrends": "string",
    "growthOpportunities": "string"
  },
  "brandVoice": {
    "tone": "string",
    "visualLanguage": "string",
    "communicationStyle": "string"
  },
  "implementation": {
    "keyTouchpoints": "string",
    "challenges": "string",
    "opportunities": "string"
  }
}

Provide detailed, strategic insights for each field. Focus on actionable recommendations and creative opportunities.`;

    const response = await axios.post(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      contents: [
        {
          parts: [{ text: RESEARCH_PROMPT }],
          role: "user"
        }
      ]
    });

    // Extract and parse research
    const researchText = response.data.candidates[0].content.parts[0].text;
    
    // Try to find JSON in the response
    let research;
    try {
      // First try to find JSON in code blocks
      const jsonMatch = researchText.match(/```(?:json)?\n([\s\S]*?)\n```/) || [null, researchText];
      const jsonStr = jsonMatch[1].trim();
      
      // Try to parse the JSON
      research = JSON.parse(jsonStr);
    } catch (parseError) {
      // If parsing fails, try to clean up the text and parse again
      try {
        // Remove any markdown formatting
        const cleanedText = researchText
          .replace(/```json\n?/g, '')
          .replace(/```\n?/g, '')
          .trim();
        
        // Try to parse the cleaned text
        research = JSON.parse(cleanedText);
      } catch (secondError) {
        // If all parsing attempts fail, create a structured object from the text
        logger.warn('Failed to parse JSON response, creating structured object from text');
        research = {
          brandEssence: {
            coreStory: researchText,
            emotionalAppeal: "See full response above",
            audienceInsights: "See full response above"
          },
          creativeOpportunities: {
            storytellingAngles: "See full response above",
            visualPossibilities: "See full response above",
            brandExpression: "See full response above"
          },
          strategicContext: {
            marketPosition: "See full response above",
            industryTrends: "See full response above",
            growthOpportunities: "See full response above"
          },
          brandVoice: {
            tone: "See full response above",
            visualLanguage: "See full response above",
            communicationStyle: "See full response above"
          },
          implementation: {
            keyTouchpoints: "See full response above",
            challenges: "See full response above",
            opportunities: "See full response above"
          },
          rawResponse: researchText
        };
      }
    }

    // Store research in conversation history
    conversationHistory.set(brandInfo, {
      research,
      timestamp: new Date().toISOString()
    });

    logger.info('Brand research generated successfully with MCP');
    return {
      research,
      metadata: {
        model,
        timestamp: new Date().toISOString(),
        mcp: true
      }
    };
  } catch (error) {
    logger.error('Error generating brand research with MCP:', error);
    throw error;
  }
}

/**
 * Generates the script content using Gemini AI
 * @param {Object} inputs - Input parameters for script generation
 * @returns {Promise<Object>} Generated script content
 */
async function generateScriptContent(prompt, model) {
  try {
    const response = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GEMINI_API_KEY
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192,
        }
      })
    });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error('Invalid response format from API');
    }

    const content = data.candidates[0].content.parts[0].text;
    
    // Clean the response text before parsing
    const cleanedContent = content
      .replace(/```json\n?/g, '') // Remove JSON code block markers
      .replace(/```\n?/g, '') // Remove any remaining code block markers
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
      .replace(/\n\s*\n/g, '\n') // Remove multiple newlines
      .trim();

    try {
      const parsedContent = JSON.parse(cleanedContent);
      
      // Validate the parsed content structure
      if (!parsedContent.sections || !Array.isArray(parsedContent.sections)) {
        throw new Error('Invalid script structure in response');
      }

      return parsedContent;
    } catch (parseError) {
      logger.error('JSON parsing error', {
        error: parseError.message,
        content: cleanedContent.substring(0, 200) + '...' // Log first 200 chars for debugging
      });
      throw new Error(`Failed to parse script content: ${parseError.message}`);
    }
  } catch (error) {
    logger.error('Error in generateScriptContent', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

/**
 * Extracts media elements from script sections
 * @param {Array} sections - Array of script sections
 * @returns {Object} Extracted media elements
 */
export const extractMediaElements = (sections) => {
  // Initialize media elements object with empty arrays
  const mediaElements = {
    visualElements: [],
    motionTransitions: []
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
    if (section.motionTransitions) {
      mediaElements.motionTransitions.push(section.motionTransitions);
    }
  });

  return mediaElements;
};

/**
 * Generates a complete pitch deck script with media prompts
 * @param {Object} inputs - Input parameters for script generation
 * @returns {Promise<Object>} Generated pitch deck
 */
export async function generateScript(inputs) {
  try {
    logger.info('Starting script generation with inputs:', {
      ...inputs,
      timestamp: new Date().toISOString()
    });

    // Validate inputs
    if (!inputs.brandInfo?.name) {
      throw new Error('Brand name is required');
    }

    if (!inputs.research) {
      throw new Error('Research data is required');
    }

    // Generate script content
    const scriptResult = await generateScriptContent(
      `${SYSTEM_PROMPTS.generate}

As a Creative Director at Paradowski Creative, create a compelling pitch deck script based on the following information:

Brand Information:
${JSON.stringify(inputs.brandInfo, null, 2)}

Research Insights:
${JSON.stringify(inputs.research, null, 2)}

Additional Context:
${JSON.stringify({
  campaignGoals: inputs.campaignGoals,
  targetAudience: inputs.targetAudience,
  creativeDirection: inputs.creativeDirection,
  model: inputs.model
}, null, 2)}

Create a detailed script that incorporates brand values, research insights, and creative storytelling. Focus on creating an engaging narrative that resonates with the target audience.`,
      inputs.model
    );

    // Store script in conversation history
    const storageKey = `script_${inputs.brandInfo.name}`;
    conversationHistory.set(storageKey, {
      script: scriptResult,
      timestamp: new Date().toISOString()
    });

    return scriptResult;
  } catch (error) {
    logger.error('Error generating script:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
}

// Add a new function to get stored script and media prompts
export const getStoredScript = async (brandName) => {
  try {
    if (!brandName) {
      logger.warn('No brand name provided for script retrieval');
      return null;
    }

    const scriptKey = `script_${brandName}`;
    const mediaPromptsKey = `media_prompts_${brandName}`;
    
    const scriptData = conversationHistory.get(scriptKey);
    const mediaPromptsData = conversationHistory.get(mediaPromptsKey);
    
    logger.info('Retrieving stored data for brand:', {
      brand: brandName,
      hasScript: !!scriptData,
      hasMediaPrompts: !!mediaPromptsData
    });

    if (!scriptData && !mediaPromptsData) {
      logger.warn(`No data found for brand: ${brandName}`);
      return null;
    }

    return {
      script: scriptData?.script,
      mediaPrompts: mediaPromptsData?.mediaElements,
      timestamp: mediaPromptsData?.timestamp || scriptData?.timestamp,
      brandName
    };
  } catch (error) {
    logger.error('Error retrieving stored script:', error);
    throw new Error('Failed to retrieve stored script');
  }
};

// ... existing code ... 