import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const API_URL = 'http://localhost:3000';

// Test data
const testData = {
  brandInfo: {
    brandVoice: "Bold, innovative, and future-focused",
    description: "Tesla is an American electric vehicle and clean energy company based in Austin, Texas. We design, develop, manufacture, and sell fully electric vehicles, energy generation and storage systems.",
    name: "Tesla",
    targetAudience: "Environmentally conscious consumers and tech enthusiasts",
    values: ["Innovation", "Sustainability", "Performance", "Safety", "Accessibility"],
    visualIdentity: "Minimalist, sleek design with red and white color scheme"
  },
  campaignGoals: "Increase brand awareness and drive product adoption",
  targetAudience: "Tech-savvy professionals and enterprise decision makers",
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

async function debugGenerationPhase() {
  console.log('🚀 Starting Generation Phase Debug...\n');
  const startTime = Date.now();

  try {
    // Step 1: First get the research data to use as context
    console.log('📊 Getting Research Data...');
    const researchResponse = await axios.post(`${API_URL}/generate/script`, {
      step: 'research',
      brandInfo: testData.brandInfo,
      model: 'gemini-2.0-flash'
    });

    if (!researchResponse.data.ok || !researchResponse.data.research) {
      throw new Error('Failed to get research data: ' + JSON.stringify(researchResponse.data));
    }

    const researchData = researchResponse.data.research;
    console.log('✅ Research Data Retrieved');
    console.log('Session ID:', researchResponse.data.sessionId);

    // Step 2: Test Generation Phase
    console.log('\n📝 Testing Generation Phase...');
    const generateResponse = await axios.post(`${API_URL}/generate/script`, {
      step: 'generate',
      brandInfo: testData.brandInfo,
      campaignGoals: testData.campaignGoals,
      targetAudience: testData.targetAudience,
      model: 'gemini-2.0-flash',
      creativeDirection: 'Modern, innovative, and solution-focused',
      pitchDeckDetails: testData.pitchDeckDetails,
      research: researchData // Include research data as context
    });

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log('✅ Generation Phase Completed');
    console.log(`⏱️ Duration: ${duration}ms`);
    console.log('📊 Response Status:', generateResponse.status);
    
    // Validate response structure
    if (generateResponse.data.ok && generateResponse.data.script) {
      console.log('✅ Valid Response Structure');
      
      // Check script data structure
      const script = generateResponse.data.script;
      const requiredSections = ['title', 'sections', 'transitions', 'mediaPrompts'];
      
      console.log('\n📋 Script Data Validation:');
      requiredSections.forEach(section => {
        if (script[section]) {
          console.log(`✅ ${section}: Present`);
          console.log(`   Content length: ${JSON.stringify(script[section]).length} chars`);
        } else {
          console.log(`❌ ${section}: Missing`);
        }
      });

      // Show sample script data
      console.log('\n📋 Sample Script Output:');
      if (script.title) {
        console.log('Title:', script.title);
      }
      if (script.sections && script.sections.length > 0) {
        console.log('First Section Preview:', script.sections[0].content?.substring(0, 200) + '...');
      }
      
      if (script.mediaPrompts) {
        console.log('✅ Media Prompts Generated:', script.mediaPrompts.length);
      }

      console.log('\n✅ Generation Phase Debug Completed Successfully!');
      return {
        success: true,
        script: script,
        duration: duration
      };
    } else {
      throw new Error('Invalid response structure: ' + JSON.stringify(generateResponse.data));
    }

  } catch (error) {
    console.error('\n❌ Generation Phase Debug Failed:');
    if (error.response) {
      console.error('Response Status:', error.response.status);
      console.error('Response Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
    return {
      success: false,
      error: error.message
    };
  }
}

// Additional helper function to test different generation scenarios
async function testDifferentGenerationScenarios() {
  console.log('\n🧪 Testing Different Generation Scenarios...\n');

  const scenarios = [
    {
      name: 'Full Details',
      data: testData
    },
    {
      name: 'Minimal Details',
      data: {
        brandInfo: testData.brandInfo,
        campaignGoals: testData.campaignGoals,
        targetAudience: testData.targetAudience
      }
    }
  ];

  for (const scenario of scenarios) {
    console.log(`📋 Testing ${scenario.name}...`);
    try {
      const response = await axios.post(`${API_URL}/generate/script`, {
        step: 'generate',
        ...scenario.data,
        model: 'gemini-2.0-flash'
      });
      
      console.log(`✅ ${scenario.name} - Success`);
      console.log('Script Generated:', response.data.script ? 'Yes' : 'No');
      console.log('Media Prompts:', response.data.script?.mediaPrompts?.length || 0);
      
    } catch (error) {
      console.error(`❌ ${scenario.name} - Failed:`, error.response?.data || error.message);
    }
    console.log('---');
  }
}

// Main debug function
async function runFullDebug() {
  console.log('🔍 Starting Full Generation Debug...\n');

  // Run main generation debug
  const result = await debugGenerationPhase();
  
  if (result.success) {
    // Run additional scenario tests
    await testDifferentGenerationScenarios();
  }

  return result;
}

// Export for use in other tests
export { debugGenerationPhase, testDifferentGenerationScenarios };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runFullDebug()
    .then(result => {
      if (result.success) {
        console.log('\n🎉 All debug tests completed successfully!');
        process.exit(0);
      } else {
        console.log('\n💥 Debug tests failed');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('💥 Debug script error:', error);
      process.exit(1);
    });
} 