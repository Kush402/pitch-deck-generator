import axios from 'axios';
import { logger } from './src/utils/logger.js';

const BASE_URL = 'http://localhost:3000';

// Helper function to format visual elements for VAL AI
function formatVisualElementsForVAL(visualElements) {
  if (!visualElements) return [];

  // Handle object with image, motion, etc.
  if (typeof visualElements === 'object' && visualElements.image) {
    return [{
      prompt: visualElements.image,
      type: 'image',
      style: visualElements.colorPalette || 'modern, clean, professional',
      mood: visualElements.motion ? 'dynamic, engaging' : 'professional, innovative',
      technicalSpecs: visualElements.typography ? '4K resolution, high quality, typography: ' + visualElements.typography : '4K resolution, high quality'
    }];
  }
  
  // Handle array of visual elements
  if (Array.isArray(visualElements)) {
    return visualElements.map(element => ({
      prompt: element.description || element,
      type: element.type || 'image',
      style: element.style || 'modern, clean, professional',
      mood: element.mood || 'professional, innovative',
      technicalSpecs: element.technicalSpecs || '4K resolution, high quality'
    }));
  }
  
  // Handle string
  if (typeof visualElements === 'string') {
    return [{
      prompt: visualElements,
      type: 'image',
      style: 'modern, clean, professional',
      mood: 'professional, innovative',
      technicalSpecs: '4K resolution, high quality'
    }];
  }

  return [];
}

async function runWorkflowTest() {
  try {
    console.log('🚀 Starting workflow test...\n');

    // Step 1: Script Generation
    console.log('Testing script generation phase...');
    const scriptResponse = await axios.post(`${BASE_URL}/generate/script`, {
      step: 'generate',
      brandInfo: 'Test Brand - A modern tech company focused on AI solutions for enterprise automation. Founded in 2020, we help businesses streamline their operations through intelligent automation and machine learning. Our flagship product, AutoFlow, has helped over 500 companies reduce operational costs by 40% while improving efficiency.',
      campaignGoals: 'Increase brand awareness and drive product adoption',
      targetAudience: 'Tech-savvy professionals and enterprise decision makers',
      model: 'gemini-2.0-flash',
      creativeDirection: 'Modern, innovative, and solution-focused'
    });

    if (!scriptResponse.data || !scriptResponse.data.script) {
      throw new Error('Invalid script response: Missing script data');
    }

    console.log('✅ Script generation test passed');
    console.log('Generated script:', JSON.stringify(scriptResponse.data, null, 2));

    // Step 2: Media Prompts Generation
    console.log('\n---\nTesting media prompts generation phase...');
    const slides = scriptResponse.data.script.concepts[0].summary.slides;
    
    if (!slides || !Array.isArray(slides) || slides.length === 0) {
      throw new Error('No slides found in script response');
    }

    const formattedPrompts = slides.map(slide => {
      const visualElements = slide.visualElements;
      return formatVisualElementsForVAL(visualElements);
    }).flat();

    if (formattedPrompts.length === 0) {
      throw new Error('No valid visual elements found in slides');
    }

    const mediaPromptsResponse = await axios.post(`${BASE_URL}/media-prompts`, {
      script: scriptResponse.data.script,
      visualElements: formattedPrompts
    });

    if (!mediaPromptsResponse.data || !mediaPromptsResponse.data.prompts) {
      throw new Error('Invalid media prompts response: Missing prompts data');
    }

    console.log('✅ Media prompts generation test passed');
    console.log('Generated media prompts:', JSON.stringify(mediaPromptsResponse.data, null, 2));

    // Step 3: Media Generation
    console.log('\n---\nTesting media generation phase...');
    const mediaResponse = await axios.post(`${BASE_URL}/generate/media`, {
      prompts: mediaPromptsResponse.data.prompts,
      type: 'image'
    });

    if (!mediaResponse.data || !mediaResponse.data.assets) {
      throw new Error('Invalid media response: Missing assets data');
    }

    console.log('✅ Media generation test passed');
    console.log('Generated media:', JSON.stringify(mediaResponse.data, null, 2));

    console.log('\n✨ Workflow test completed successfully!');
  } catch (error) {
    console.error('❌ Workflow test failed:');
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
      if (error.response.status === 500) {
        console.error('Server error details:', error.response.data.error || 'Unknown server error');
      }
    } else if (error.request) {
      console.error('No response received:', error.request);
    } else {
      console.error('Error details:', error.message);
    }
    process.exit(1);
  }
}

runWorkflowTest(); 