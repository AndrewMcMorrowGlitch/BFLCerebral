import { NextResponse } from 'next/server';
import { fal } from '@fal-ai/client';

const FAL_ENDPOINT = 'fal-ai/beta-image-232/edit';
const CUSTOM_IMAGE_SIZE = { width: 1920, height: 1080 };

const ensureFalConfigured = (() => {
  let configured = false;
  return () => {
    if (configured) {
      return;
    }
    const falKey = process.env.FAL_KEY;
    if (!falKey) {
      throw new Error('FAL_KEY is not configured');
    }
    fal.config({
      credentials: falKey,
    });
    configured = true;
  };
})();

export async function POST(request: Request) {
  try {
    // 1. Robust Request Parsing
    let bodyText = '';
    try {
      bodyText = await request.text();
    } catch (e) {
      console.error('Failed to read request body:', e);
      return NextResponse.json({ error: 'Failed to read request body' }, { status: 400 });
    }

    if (!bodyText) {
      console.error('Empty request body');
      return NextResponse.json({ error: 'Empty request body' }, { status: 400 });
    }

    let imageUrl: string;
    let prompt: string;

    try {
      const parsed = JSON.parse(bodyText);
      imageUrl = parsed.imageUrl;
      prompt = parsed.prompt;
    } catch (e) {
      console.error('JSON Parse Error on Request Body:', e);
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    if (!process.env.FAL_KEY) {
      console.warn('FAL_KEY missing; returning original image.');
      return NextResponse.json({
        imageUrl: imageUrl,
        warning: 'FAL_KEY missing; returning original image as placeholder.',
      });
    }

    ensureFalConfigured();

    try {
      const result = await fal.subscribe(FAL_ENDPOINT, {
        input: {
          prompt,
          image_urls: [imageUrl],
          guidance_scale: 6,
          num_inference_steps: 40,
          num_images: 1,
          image_size: CUSTOM_IMAGE_SIZE,
          enable_prompt_expansion: false,
          enable_safety_checker: false,
          output_format: 'png',
        },
      });

      const output = (result as any)?.data ?? result;
      const generatedUrl =
        (Array.isArray(output?.images) && output.images[0]?.url) ||
        output?.image?.url;

      if (generatedUrl) {
        return NextResponse.json({ imageUrl: generatedUrl });
      }

      console.warn('FAL result missing images; returning original image.');
      return NextResponse.json({ imageUrl, warning: 'FAL result did not include an image.' });
    } catch (falError) {
      console.error('FAL request failed:', falError);
      return NextResponse.json({ imageUrl, warning: 'Generation failed on server.' });
    }

  } catch (error) {
    console.error('Error in /api/render:', error);
    return NextResponse.json({ imageUrl: null, error: 'Internal Server Error' }, { status: 500 });
  }
}
