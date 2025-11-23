import { NextRequest, NextResponse } from 'next/server';
import { decorateImage } from '@/lib/services/fal-ai';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const image = formData.get('image') as File;
    const prompt = formData.get('prompt') as string;

    if (!image || !prompt) {
      return NextResponse.json(
        { error: 'Image and prompt are required' },
        { status: 400 }
      );
    }

    const imageBuffer = Buffer.from(await image.arrayBuffer());
    const base64Image = imageBuffer.toString('base64');
    const imageDataUrl = `data:${image.type};base64,${base64Image}`;

    const decoratedImage = await decorateImage(imageDataUrl, prompt);

    return NextResponse.json({ decoratedImage });
  } catch (error) {
    console.error('Error decorating image:', error);
    return NextResponse.json(
      { error: 'Failed to decorate image' },
      { status: 500 }
    );
  }
}