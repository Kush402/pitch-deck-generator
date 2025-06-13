import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_PROJECT_NUMBER = process.env.OPENAI_PROJECT_NUMBER;
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

// Test data
const testPrompts = {
  simple: "What is the capital of France?",
  creative: "Write a short story about a robot learning to paint",
  technical: "Explain how a neural network works in simple terms",
  business: "Create a marketing strategy for a new tech startup"
};

// Test configurations
const testConfigs = {
  gpt4: {
    model: "gpt-4-turbo-preview",
    temperature: 0.7,
    max_tokens: 150
  },
  gpt35: {
    model: "gpt-3.5-turbo",
    temperature: 0.7,
    max_tokens: 150
  }
};

async function checkQuota() {
  try {
    // Try a minimal request to check quota
    const response = await axios.post(
      OPENAI_API_URL,
      {
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: "test" }],
        max_tokens: 5
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return true;
  } catch (error) {
    if (error.response?.status === 429 || error.response?.data?.error?.code === 'insufficient_quota') {
      console.error('\n❌ Quota exceeded. Please check your OpenAI account:');
      console.error('1. Visit https://platform.openai.com/account/billing');
      console.error('2. Add a payment method if not already added');
      console.error('3. Check your usage limits and remaining credits');
      console.error('\nError details:', error.response?.data?.error || error.message);
      process.exit(1);
    }
    throw error;
  }
}

async function testOpenAIAPI() {
  console.log('🚀 Starting OpenAI API Tests...\n');

  // Validate API key
  if (!OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY is not set in environment variables');
    process.exit(1);
  }

  // Log project number status
  if (OPENAI_PROJECT_NUMBER) {
    console.log('ℹ️ Project Number is set:', OPENAI_PROJECT_NUMBER);
  } else {
    console.log('ℹ️ No Project Number set - using standard API');
  }

  try {
    // Check quota before running tests
    console.log('📝 Checking API quota...');
    try {
      await checkQuota();
      console.log('✅ Quota check passed');
    } catch (error) {
      console.error('❌ Quota check failed:', error.message);
      process.exit(1);
    }
    console.log('\n---\n');

    // Test 1: Basic API Connection
    console.log('📝 Test 1: Basic API Connection');
    const headers = {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    };

    // Add project number to headers if it exists
    if (OPENAI_PROJECT_NUMBER) {
      headers['OpenAI-Project'] = OPENAI_PROJECT_NUMBER;
    }

    try {
      const basicResponse = await axios.post(
        OPENAI_API_URL,
        {
          model: testConfigs.gpt35.model,
          messages: [{ role: "user", content: testPrompts.simple }],
          temperature: testConfigs.gpt35.temperature,
          max_tokens: testConfigs.gpt35.max_tokens
        },
        { headers }
      );

      console.log('✅ Basic API Connection Test Passed');
      console.log('Response:', basicResponse.data.choices[0].message.content);
    } catch (error) {
      if (error.response?.status === 429 || error.response?.data?.error?.code === 'insufficient_quota') {
        console.error('\n❌ Quota exceeded. Please check your OpenAI account:');
        console.error('1. Visit https://platform.openai.com/account/billing');
        console.error('2. Add a payment method if not already added');
        console.error('3. Check your usage limits and remaining credits');
        console.error('\nError details:', error.response?.data?.error || error.message);
        process.exit(1);
      }
      throw error;
    }
    console.log('\n---\n');

    // Test 2: Different Models
    console.log('📝 Test 2: Different Models');
    for (const [modelName, config] of Object.entries(testConfigs)) {
      console.log(`Testing ${modelName}...`);
      try {
        const modelResponse = await axios.post(
          OPENAI_API_URL,
          {
            model: config.model,
            messages: [{ role: "user", content: testPrompts.technical }],
            temperature: config.temperature,
            max_tokens: config.max_tokens
          },
          { headers }
        );
        console.log(`✅ ${modelName} Test Passed`);
        console.log('Response:', modelResponse.data.choices[0].message.content);
      } catch (error) {
        if (error.response?.status === 429 || error.response?.data?.error?.code === 'insufficient_quota') {
          console.error('\n❌ Quota exceeded. Please check your OpenAI account:');
          console.error('1. Visit https://platform.openai.com/account/billing');
          console.error('2. Add a payment method if not already added');
          console.error('3. Check your usage limits and remaining credits');
          console.error('\nError details:', error.response?.data?.error || error.message);
          process.exit(1);
        }
        throw error;
      }
    }
    console.log('\n---\n');

    // Test 3: Different Prompt Types
    console.log('📝 Test 3: Different Prompt Types');
    for (const [promptType, prompt] of Object.entries(testPrompts)) {
      console.log(`Testing ${promptType} prompt...`);
      try {
        const promptResponse = await axios.post(
          OPENAI_API_URL,
          {
            model: testConfigs.gpt4.model,
            messages: [{ role: "user", content: prompt }],
            temperature: testConfigs.gpt4.temperature,
            max_tokens: testConfigs.gpt4.max_tokens
          },
          { headers }
        );
        console.log(`✅ ${promptType} Prompt Test Passed`);
        console.log('Response:', promptResponse.data.choices[0].message.content);
      } catch (error) {
        if (error.response?.status === 429 || error.response?.data?.error?.code === 'insufficient_quota') {
          console.error('\n❌ Quota exceeded. Please check your OpenAI account:');
          console.error('1. Visit https://platform.openai.com/account/billing');
          console.error('2. Add a payment method if not already added');
          console.error('3. Check your usage limits and remaining credits');
          console.error('\nError details:', error.response?.data?.error || error.message);
          process.exit(1);
        }
        throw error;
      }
    }
    console.log('\n---\n');

    // Test 4: Error Handling
    console.log('📝 Test 4: Error Handling');
    try {
      await axios.post(
        OPENAI_API_URL,
        {
          model: "invalid-model",
          messages: [{ role: "user", content: "Test" }]
        },
        { headers }
      );
    } catch (error) {
      if (error.response?.status === 429 || error.response?.data?.error?.code === 'insufficient_quota') {
        console.error('\n❌ Quota exceeded. Please check your OpenAI account:');
        console.error('1. Visit https://platform.openai.com/account/billing');
        console.error('2. Add a payment method if not already added');
        console.error('3. Check your usage limits and remaining credits');
        console.error('\nError details:', error.response?.data?.error || error.message);
        process.exit(1);
      }
      console.log('✅ Error Handling Test Passed');
      console.log('Expected Error:', error.response?.data?.error?.message || error.message);
    }
    console.log('\n---\n');

    // Test 5: Rate Limiting
    console.log('📝 Test 5: Rate Limiting');
    const startTime = Date.now();
    const requests = Array(5).fill().map(() => 
      axios.post(
        OPENAI_API_URL,
        {
          model: testConfigs.gpt35.model,
          messages: [{ role: "user", content: testPrompts.simple }],
          temperature: testConfigs.gpt35.temperature,
          max_tokens: testConfigs.gpt35.max_tokens
        },
        { headers }
      )
    );

    try {
      const results = await Promise.allSettled(requests);
      const endTime = Date.now();
      
      console.log('✅ Rate Limiting Test Completed');
      console.log(`Time taken: ${endTime - startTime}ms`);
      console.log('Results:', results.map(r => r.status));
    } catch (error) {
      if (error.response?.status === 429 || error.response?.data?.error?.code === 'insufficient_quota') {
        console.error('\n❌ Quota exceeded. Please check your OpenAI account:');
        console.error('1. Visit https://platform.openai.com/account/billing');
        console.error('2. Add a payment method if not already added');
        console.error('3. Check your usage limits and remaining credits');
        console.error('\nError details:', error.response?.data?.error || error.message);
        process.exit(1);
      }
      throw error;
    }
    console.log('\n---\n');

    // Test 6: API Configuration
    console.log('📝 Test 6: API Configuration');
    console.log('API URL:', OPENAI_API_URL);
    console.log('Headers:', JSON.stringify(headers, null, 2));
    console.log('✅ API Configuration Test Completed');
    console.log('\n---\n');

    console.log('✨ All Tests Completed Successfully!');

  } catch (error) {
    console.error('❌ Test Failed:', error.message);
    if (error.response) {
      console.error('Response Data:', error.response.data);
    }
    process.exit(1);
  }
}

// Run the tests
testOpenAIAPI(); 