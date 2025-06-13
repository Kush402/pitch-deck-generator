import { expect } from 'chai';
import { generateImage, generateVideo } from '../src/services/media/mediaGenerator.js';

describe('FAL.ai Integration Tests', () => {
  it('should generate an image successfully', async () => {
    const result = await generateImage({
      prompt: 'A beautiful sunset over a modern city skyline',
      style: 'photorealistic',
      mood: 'peaceful',
      technicalSpecs: 'high quality, 4k resolution'
    });
    
    expect(result).to.be.an('object');
    expect(result.url).to.be.a('string');
  });

  it('should generate a video successfully', async () => {
    const result = await generateVideo({
      prompt: 'A flowing river in a forest',
      style: 'cinematic',
      duration: 5,
      transition: 'smooth fade'
    });
    
    expect(result).to.be.an('object');
    expect(result.url).to.be.a('string');
  });
}); 