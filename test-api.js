import dotenv from 'dotenv';
import axios from 'axios';

// Load environment variables
dotenv.config();

// Log environment variables
console.log('GEMINI_API_URL:', process.env.GEMINI_API_URL);
console.log('GEMINI_API_KEY:', process.env.GEMINI_API_KEY);

// Test Gemini API
async function testGeminiAPI() {
  try {
    const response = await axios.post(
      `${process.env.GEMINI_API_URL}?key=${process.env.GEMINI_API_KEY}`,
      {
        contents: [
          {
            parts: [
              {
                text: 'Hello, Gemini!'
              }
            ]
          }
        ]
      }
    );
    console.log('API Response:', response.data);
  } catch (error) {
    console.error('API Error:', error.message);
  }
}

testGeminiAPI(); 