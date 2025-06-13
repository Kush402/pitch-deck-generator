import { fal } from '@fal-ai/client';

fal.config({ credentials: process.env.FAL_AI_KEY });

(async () => {
  try {
    const models = await fal.listModels();
    models.forEach(model => {
      console.log(`${model.id} - ${model.description}`);
    });
  } catch (err) {
    console.error('Error fetching model list:', err.message);
  }
})(); 