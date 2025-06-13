import { generateVideo } from '../src/services/media/mediaGenerator.js';

async function testVideoGeneration() {
  console.log('Testing video generation...\n');

  const testPrompt = {
    prompt: "A smooth transition from a modern office to a collaborative workspace",
    style: "cinematic",
    duration: 5,
    transition: "smooth fade"
  };

  console.log('Test prompt:', JSON.stringify(testPrompt, null, 2), '\n');

  try {
    console.log('Attempting to generate video...');
    const videoUrl = await generateVideo(testPrompt);
    console.log('\n✅ Video generation successful!');
    console.log('Video URL:', videoUrl);
  } catch (error) {
    console.error('\n❌ Video generation failed:');
    console.error('Error:', error.message);
    if (error.response?.data) {
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Run the test
testVideoGeneration(); 