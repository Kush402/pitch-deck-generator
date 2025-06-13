import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env file from project root
config({ path: resolve(__dirname, '../../.env') });

// Export environment variables
export const env = {
  // Gemini API
  GEMINI_API_URL: process.env.GEMINI_API_URL,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  GEMINI_PROJECT_NUMBER: process.env.GEMINI_PROJECT_NUMBER,
  
  // Fal.ai API
  FAL_AI_API_KEY: process.env.FAL_AI_API_KEY || 'fal-ai-test-key',
  FAL_AI_API_URL: process.env.FAL_AI_API_URL || 'https://api.fal.ai/v1/images/generations'
};

// Validate required environment variables
const requiredEnvVars = ['GEMINI_API_URL', 'GEMINI_API_KEY'];
const missingEnvVars = requiredEnvVars.filter(key => !env[key]);

if (missingEnvVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
} 