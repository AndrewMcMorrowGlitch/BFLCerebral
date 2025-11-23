import { NextResponse } from 'next/server';
import * as fal from '@fal-ai/serverless-client';

// Configure FAL client
fal.config({
  credentials: process.env.FAL_KEY,
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { imageUrl, prompt } = body;

    if (!imageUrl || !prompt) {
      return NextResponse.json(
        { error: 'imageUrl and prompt are required' },
        { status: 400 }
      );
    }

    if (!process.env.FAL_KEY) {
      console.warn('FAL_KEY missing; returning original image.');
      return NextResponse.json({
        imageUrl: imageUrl,
        warning: 'FAL_KEY missing; returning original image as placeholder.',
      });
    }

    console.log('Starting image generation with prompt:', prompt);

    // Call FAL API using the SDK
    const result = await fal.subscribe('fal-ai/flux/dev/image-to-image', {
      input: {
        prompt: prompt,
        image_url: imageUrl,
        strength: 0.75, // Moderate strength for visible changes while keeping room structure
        guidance_scale: 3.5,
        num_inference_steps: 28,
        enable_safety_checker: false,
      },
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === 'IN_PROGRESS') {
          console.log('Generation in progress...');
        }
      },
    });

    console.log('FAL API response:', result);

    if (result.data && result.data.images && result.data.images.length > 0) {
      return NextResponse.json({
        imageUrl: result.data.images[0].url
      });
    }

    console.error('No image returned from FAL');
    return NextResponse.json({
      imageUrl: imageUrl,
      warning: 'No image generated'
    });

  } catch (error: any) {
    console.error('Error in /api/render:', error);
    return NextResponse.json({
      error: error.message || 'Internal Server Error',
      imageUrl: null
    }, { status: 500 });
  }
}
