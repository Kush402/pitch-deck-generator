// Set test environment
process.env.NODE_ENV = 'test';

import axios from 'axios';

const API_URL = 'http://localhost:3000';

// Test data
const testData = {
  brandInfo: 'Test Brand - A modern tech company focused on AI solutions for enterprise automation. Founded in 2020, we help businesses streamline their operations through intelligent automation and machine learning. Our flagship product, AutoFlow, has helped over 500 companies reduce operational costs by 40% while improving efficiency.',
  campaignGoals: 'Increase brand awareness and drive product adoption',
  targetAudience: 'Tech-savvy professionals and enterprise decision makers',
  model: 'gpt4'
};

// Test functions
async function runTests() {
  console.log('🚀 Starting API tests...\n');

  // Health check test
  try {
    const healthResponse = await axios.get(`${API_URL}/health`);
    console.log('✅ Health check passed:', healthResponse.data);
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
  console.log('\n---\n');

  // Script generation test - Research phase
  try {
    console.log('Testing brand research phase...');
    const researchResponse = await axios.post(`${API_URL}/generate/script`, {
      step: 'research',
      brandInfo: testData.brandInfo,
      campaignGoals: testData.campaignGoals,
      targetAudience: testData.targetAudience,
      model: testData.model
    });
    console.log('✅ Brand research test passed');
    console.log('Research results:', JSON.stringify(researchResponse.data.research, null, 2));
  } catch (error) {
    console.error('❌ Brand research test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
  console.log('\n---\n');

  // Script generation test - Generate phase
  try {
    console.log('Testing script generation phase...');
    const scriptResponse = await axios.post(`${API_URL}/generate/script`, {
      step: 'generate',
      brandInfo: testData.brandInfo,
      campaignGoals: testData.campaignGoals,
      targetAudience: testData.targetAudience,
      model: testData.model,
      creativeDirection: 'Modern, innovative, and solution-focused'
    });
    console.log('✅ Script generation test passed');
    console.log('Generated script:', JSON.stringify(scriptResponse.data.script, null, 2));
  } catch (error) {
    console.error('❌ Script generation test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
  console.log('\n---\n');

  // Media generation test
  try {
    const mediaResponse = await axios.post(`${API_URL}/generate/media`, {
      type: 'image',
      params: {
        prompt: 'Test image generation',
        style: 'modern'
      }
    });
    console.log('✅ Media generation test passed');
    console.log('Generated assets:', mediaResponse.data.assets);
  } catch (error) {
    console.error('❌ Media generation test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
  console.log('\n---\n');

  // Asset storage test
  try {
    const storageResponse = await axios.post(`${API_URL}/store/assets`, {
      filePath: './test.txt',
      fileName: 'test.txt',
      service: 'drive',
      metadata: { description: 'Test file' }
    });
    console.log('✅ Asset storage test passed');
    console.log('Stored asset location:', storageResponse.data.location);
  } catch (error) {
    console.error('❌ Asset storage test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
  console.log('\n---\n');

  console.log('✨ Tests completed!');
}

// Run tests
runTests().catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
}); 