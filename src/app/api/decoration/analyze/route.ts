import { NextRequest, NextResponse } from 'next/server';
import { analyzeProducts } from '@/lib/services/claude-ai';

export async function POST(request: NextRequest) {
  console.log('Analyze endpoint called');
  
  try {
    const body = await request.json();
    console.log('Request body received:', { 
      hasOriginal: !!body.originalImage, 
      hasDecorated: !!body.decoratedImage,
      theme: body.theme 
    });
    
    const { originalImage, decoratedImage, theme } = body;

    if (!originalImage || !decoratedImage) {
      return NextResponse.json(
        { error: 'Original and decorated images are required' },
        { status: 400 }
      );
    }

    console.log('Calling analyzeProducts...');
    const products = await analyzeProducts(
      originalImage,
      decoratedImage,
      theme || 'halloween'
    );

    console.log('Products analyzed successfully');
    return NextResponse.json({ products });
  } catch (error: any) {
    console.error('Error in analyze endpoint:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to analyze products' },
      { status: 500 }
    );
  }
}