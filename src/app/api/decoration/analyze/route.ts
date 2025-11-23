import { NextRequest, NextResponse } from 'next/server';
import { analyzeProducts } from '@/lib/services/claude-ai';
import { analyzeProductsWithGemini } from '@/lib/services/gemini-ai';

export async function POST(request: NextRequest) {
  console.log('Analyze endpoint called');

  try {
    const body = await request.json();
    console.log('Request body received:', {
      hasOriginal: !!body.originalImage,
      hasDecorated: !!body.decoratedImage,
      theme: body.theme,
      provider: body.provider,
    });

    const { originalImage, decoratedImage, theme, provider = 'claude' } = body;

    if (!originalImage || !decoratedImage) {
      return NextResponse.json(
        { error: 'Original and decorated images are required' },
        { status: 400 },
      );
    }

    let products;

    if (provider === 'gemini') {
      console.log('Calling analyzeProductsWithGemini...');
      products = await analyzeProductsWithGemini(
        originalImage,
        decoratedImage,
        theme || 'halloween',
      );
    } else {
      console.log('Calling analyzeProducts (Claude)...');
      products = await analyzeProducts(
        originalImage,
        decoratedImage,
        theme || 'halloween',
      );
    }

    console.log('Products analyzed successfully');
    return NextResponse.json({ products });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to analyze products';
    console.error('Error in analyze endpoint:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
