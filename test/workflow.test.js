import axios from 'axios';
import { logger } from '../src/utils/logger.js';

const API_URL = 'http://localhost:3000';

// Test data
const testData = {
  brandInfo: 'Test Brand - A modern tech company focused on AI solutions for enterprise automation. Founded in 2020, we help businesses streamline their operations through intelligent automation and machine learning. Our flagship product, AutoFlow, has helped over 500 companies reduce operational costs by 40% while improving efficiency.',
  campaignGoals: 'Increase brand awareness and drive product adoption',
  targetAudience: 'Tech-savvy professionals and enterprise decision makers',
  pitchDeckDetails: [
    {
      title: "Opening Hook",
      content: "A dynamic visualization of modern business challenges and opportunities",
      visualElements: ["Futuristic office environment", "Data visualization", "Team collaboration"],
      motionTransitions: ["Smooth fade", "Dynamic zoom"]
    },
    {
      title: "Brand Story",
      content: "Our journey from startup to industry leader",
      visualElements: ["Timeline visualization", "Growth metrics", "Team photos"],
      motionTransitions: ["Slide transition", "Fade through"]
    },
    {
      title: "Solution Showcase",
      content: "How AutoFlow transforms business operations",
      visualElements: ["Product interface", "Before/After scenarios", "Customer testimonials"],
      motionTransitions: ["Split screen", "Morph transition"]
    }
  ]
};

async function runWorkflowTest() {
  console.log('🚀 Starting Workflow Test...\n');
  let researchData;
  let scriptData;
  let mediaPrompts;
  let mediaAssets;

  try {
    // Step 1: Research Phase
    console.log('📊 Testing Research Phase...');
    const researchResponse = await axios.post(`${API_URL}/generate/script`, {
      step: 'research',
      brandInfo: testData.brandInfo,
      model: 'gemini-2.0-flash'
    });

    if (researchResponse.data.ok && researchResponse.data.research) {
      console.log('✅ Research Phase Passed');
      researchData = researchResponse.data.research;
      console.log('Research Results:', JSON.stringify(researchData, null, 2));
    } else {
      throw new Error('Research phase failed: ' + JSON.stringify(researchResponse.data));
    }
    console.log('\n---\n');

    // Step 2: Script Generation with Pitch Deck
    console.log('📝 Testing Script Generation Phase...');
    const scriptResponse = await axios.post(`${API_URL}/generate/script`, {
      step: 'generate',
      brandInfo: testData.brandInfo,
      campaignGoals: testData.campaignGoals,
      targetAudience: testData.targetAudience,
      model: 'gemini-2.0-flash',
      creativeDirection: 'Modern, innovative, and solution-focused',
      pitchDeckDetails: testData.pitchDeckDetails
    });

    if (scriptResponse.data.ok && scriptResponse.data.script) {
      console.log('✅ Script Generation Phase Passed');
      scriptData = scriptResponse.data.script;
      mediaPrompts = scriptResponse.data.mediaPrompts;
      console.log('Generated Script:', JSON.stringify(scriptData, null, 2));
      console.log('Generated Media Prompts:', JSON.stringify(mediaPrompts, null, 2));
    } else {
      throw new Error('Script generation phase failed: ' + JSON.stringify(scriptResponse.data));
    }
    console.log('\n---\n');

    // Test script generation phase
    console.log('\n---\nTesting script generation phase...');
    const scriptResponse = await axios.post(`${API_URL}/generate/script`, {
      brand: 'Test Brand - A modern tech company focused on AI solutions for enterprise automation. Founded in 2020, we help businesses streamline their operations through intelligent automation and machine learning. Our flagship product, AutoFlow, has helped over 500 companies reduce operational costs by 40% while improving efficiency.',
      concepts: [
        {
          title: 'Mastercard Brand Pitch',
          summary: {
            pitchDeckTitle: 'Test Brand: Automate the Mundane, Unleash the Human',
            overallCreativeDirection: 'Future-Forward Facilitator - Innovative, Reliable, and Human. A clean, modern, and data-driven aesthetic focusing on the human impact of AI. Confident, intelligent, and approachable tone.',
            brandConsistencyGuidelines: 'Use Test Brand's logo, colors, and fonts consistently throughout the presentation. Emphasize data-driven results through clear and concise visualizations. Maintain a focus on the human impact of AI, showcasing employee empowerment and improved work-life balance. Ensure all messaging aligns with Test Brand's core story of empowering businesses to work smarter, not harder.',
            implementationConsiderations: 'Leverage Test Brand's existing website, sales materials, and customer success stories. Focus on building trust and credibility by addressing concerns about AI bias and unintended consequences. Highlight Test Brand's ease of implementation and commitment to ethical AI. Consider a multi-channel marketing approach that includes targeted online advertising, webinars, and industry events.',
            sections: [
              {
                sectionTitle: 'Opening Hook (15-20 seconds)',
                narrativeContent: 'Imagine a world where your team isn't bogged down by tedious tasks, but instead, they're empowered to innovate, create, and drive your business forward. At Test Brand, we believe the future of work is about leveraging AI to free human potential.',
                keyMessages: [
                  'Emphasize the human impact of AI.',
                  'Introduce Test Brand's core story of empowering businesses.',
                  'Highlight the desire for control, efficiency, and innovation.'
                ],
                visualAndExperientialElements: {
                  visuals: 'Start with a dynamic montage of short, impactful clips showcasing employees looking stressed and overworked, interspersed with glimpses of automated processes running seamlessly in the background. Transition to visuals of employees smiling, collaborating, and focusing on creative tasks.',
                  motion: 'Smooth, slow zoom-in on the initial stressed employee visuals, then a faster-paced transition to the empowered employee visuals.',
                  sound: 'Start with frantic, stressful background noise that gradually fades into a more upbeat and inspiring soundtrack.',
                  craftAndDesign: 'Clean, minimalist design with a focus on the human face. Use a muted color palette initially, gradually introducing pops of vibrant accent colors as the visuals transition to the empowered employees.',
                  experiential: 'Consider a subtle haptic feedback on devices during the stressed visuals, gradually fading as the visuals transition. (If a live presentation, a quick interactive poll to the audience: 'How much time do you spend on repetitive tasks?')',
                  brandAlignmentNotes: 'Reflects the brand's essence by connecting emotionally with the audience's pain points and offering a solution that promises a more fulfilling future of work.'
                },
                transition: 'Smooth crossfade into the next section, maintaining the upbeat and inspiring soundtrack.'
              }
            ]
          },
          alignment: 'Campaign Goals: Increase brand awareness and drive product adoption\nTarget Audience: Tech-savvy professionals and enterprise decision makers\nCreative Direction: gpt4',
          research: researchData
        }
      ]
    });

    console.log('✅ Script generation test passed');
    console.log('Generated script:', JSON.stringify(scriptResponse.data, null, 2));

    // Test media prompts generation phase
    console.log('\n---\nTesting media prompts generation phase...');
    const mediaPromptsResponse = await axios.post(`${API_URL}/media-prompts`, {
      script: scriptResponse.data,
      visualElements: scriptResponse.data.concepts[0].summary.sections[0].visualAndExperientialElements.visuals,
    });

    console.log('✅ Media prompts generation test passed');
    console.log('Generated media prompts:', JSON.stringify(mediaPromptsResponse.data, null, 2));

    // Test media generation phase
    console.log('\n---\nTesting media generation phase...');
    const mediaResponse = await axios.post(`${API_URL}/generate/media`, {
      prompts: mediaPromptsResponse.data.prompts,
      type: 'image',
    });

    if (mediaResponse.data.ok && mediaResponse.data.assets) {
      console.log('✅ Media Generation Phase Passed');
      mediaAssets = mediaResponse.data.assets;
      console.log('Generated Assets:', JSON.stringify(mediaAssets, null, 2));
      
      // Verify asset types
      const assetTypes = new Set(mediaAssets.map(asset => asset.type));
      console.log('Generated Asset Types:', Array.from(assetTypes));
      
      // Verify URLs
      const validUrls = mediaAssets.every(asset => asset.url && asset.url.startsWith('http'));
      console.log('All Assets Have Valid URLs:', validUrls);
    } else {
      throw new Error('Media generation phase failed: ' + JSON.stringify(mediaResponse.data));
    }
    console.log('\n---\n');

    // Final Summary
    console.log('✨ Workflow Test Summary:');
    console.log('1. Research Phase:', researchData ? '✅' : '❌');
    console.log('2. Script Generation:', scriptData ? '✅' : '❌');
    console.log('3. Media Prompts:', mediaPrompts ? '✅' : '❌');
    console.log('4. Media Assets:', mediaAssets ? '✅' : '❌');
    console.log('\n🎉 Workflow Test Completed Successfully!');

  } catch (error) {
    console.error('❌ Workflow Test Failed:', error && (error.message || error));
    if (error.response) {
      console.error('Response Data:', error.response.data);
    } else if (error.request) {
      console.error('No response received. Error request:', error.request);
    } else {
      console.error('Error:', error);
    }
    if (error.stack) {
      console.error('Stack Trace:', error.stack);
    }
    process.exit(1);
  }
}

// Run the test
runWorkflowTest(); 