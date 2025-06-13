import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const API_URL = 'http://localhost:3000';

// Test data for research phase
const testBrandInfo = {
  name: "Tesla",
  description: "Tesla is an American electric vehicle and clean energy company based in Austin, Texas. We design, develop, manufacture, and sell fully electric vehicles, energy generation and storage systems.",
  values: ["Innovation", "Sustainability", "Performance", "Safety", "Accessibility"],
  targetAudience: "Environmentally conscious consumers and tech enthusiasts",
  brandVoice: "Bold, innovative, and future-focused",
  visualIdentity: "Minimalist, sleek design with red and white color scheme"
};

async function debugResearchPhase() {
  console.log('🔍 Starting Research Phase Debug...\n');

  try {
    // Step 1: Check API Health
    console.log('📋 Step 1: Checking API Health...');
    try {
      const healthResponse = await axios.get(`${API_URL}/health`);
      console.log('✅ API Health Check:', healthResponse.data);
    } catch (error) {
      console.error('❌ API Health Check Failed:', error.message);
      process.exit(1);
    }
    console.log('\n---\n');

    // Step 2: Check Environment Variables
    console.log('📋 Step 2: Checking Environment Variables...');
    try {
      const envResponse = await axios.get(`${API_URL}/debug/env`);
      console.log('✅ Environment Check:', envResponse.data);
      
      if (!envResponse.data.environment.GEMINI_API_KEY || envResponse.data.environment.GEMINI_API_KEY === 'Not set') {
        console.error('❌ GEMINI_API_KEY is not set!');
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ Environment Check Failed:', error.message);
    }
    console.log('\n---\n');

    // Step 3: Test Research Phase
    console.log('📋 Step 3: Testing Research Phase...');
    console.log('Brand Info being sent:', JSON.stringify(testBrandInfo, null, 2));
    
    const startTime = Date.now();
    try {
      const researchResponse = await axios.post(`${API_URL}/generate/script`, {
        step: 'research',
        brandInfo: testBrandInfo,
        model: 'gemini-2.0-flash'
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log('✅ Research Phase Completed');
      console.log(`⏱️ Duration: ${duration}ms`);
      console.log('📊 Response Status:', researchResponse.status);
      console.log('🔑 Session ID:', researchResponse.data.sessionId);
      
      // Validate response structure
      if (researchResponse.data.ok && researchResponse.data.research) {
        console.log('✅ Valid Response Structure');
        
        // Check research data structure
        const research = researchResponse.data.research;
        const requiredSections = ['brandEssence', 'creativeOpportunities', 'strategicContext', 'brandVoice', 'implementation'];
        
        console.log('\n📋 Research Data Validation:');
        requiredSections.forEach(section => {
          if (research[section]) {
            console.log(`✅ ${section}: Present`);
            console.log(`   Content length: ${JSON.stringify(research[section]).length} chars`);
          } else {
            console.log(`❌ ${section}: Missing`);
          }
        });

        // Show sample research data
        console.log('\n📋 Sample Research Output:');
        if (research.brandEssence) {
          console.log('Core Story Preview:', research.brandEssence.coreStory?.substring(0, 200) + '...');
        }
        
        if (research.metadata) {
          console.log('✅ MCP Metadata:', research.metadata);
        }

        console.log('\n✅ Research Phase Debug Completed Successfully!');
        return {
          success: true,
          sessionId: researchResponse.data.sessionId,
          research: research,
          duration: duration
        };

      } else {
        console.error('❌ Invalid Response Structure:', researchResponse.data);
        return { success: false, error: 'Invalid response structure' };
      }

    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.error('❌ Research Phase Failed');
      console.error(`⏱️ Duration: ${duration}ms`);
      
      if (error.response) {
        console.error('📊 Response Status:', error.response.status);
        console.error('📋 Response Data:', JSON.stringify(error.response.data, null, 2));
        
        // Specific error analysis
        if (error.response.status === 500) {
          console.error('\n🔍 Server Error Analysis:');
          console.error('- Check if Gemini API key is valid');
          console.error('- Check if Gemini API URL is correct');
          console.error('- Check server logs for detailed error');
        }
        
        if (error.response.status === 400) {
          console.error('\n🔍 Bad Request Analysis:');
          console.error('- Check if brandInfo is properly formatted');
          console.error('- Check if required fields are present');
        }
        
      } else if (error.request) {
        console.error('❌ No response received from server');
        console.error('- Check if server is running on port 3000');
        console.error('- Check network connectivity');
      } else {
        console.error('❌ Request setup error:', error.message);
      }
      
      return { success: false, error: error.message, status: error.response?.status };
    }

  } catch (error) {
    console.error('❌ Debug Failed:', error.message);
    return { success: false, error: error.message };
  }
}

// Additional helper function to test different brand info formats
async function testDifferentBrandFormats() {
  console.log('\n🧪 Testing Different Brand Info Formats...\n');

  const formats = [
    {
      name: 'Object Format',
      data: testBrandInfo
    },
    {
      name: 'String Format',
      data: "Tesla is an innovative electric vehicle company focused on sustainable transportation and clean energy solutions."
    }
  ];

  for (const format of formats) {
    console.log(`📋 Testing ${format.name}...`);
    try {
      const response = await axios.post(`${API_URL}/generate/script`, {
        step: 'research',
        brandInfo: format.data,
        model: 'gemini-2.0-flash'
      });
      
      console.log(`✅ ${format.name} - Success`);
      console.log(`🔑 Session ID: ${response.data.sessionId}`);
      
    } catch (error) {
      console.error(`❌ ${format.name} - Failed:`, error.response?.data || error.message);
    }
    console.log('---');
  }
}

// Run the debug
async function runFullDebug() {
  const result = await debugResearchPhase();
  
  if (result.success) {
    await testDifferentBrandFormats();
  }
  
  return result;
}

// Export for use in other tests
export { debugResearchPhase, testDifferentBrandFormats };

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