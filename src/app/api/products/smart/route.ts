import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import sharp from 'sharp';

type CropRegion = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type RainforestSearchResult = {
  title?: string;
  link?: string;
  image?: string;
  asin?: string;
  price?: {
    display?: string;
  };
};

const anthropicClient = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

const RAINFOREST_API_KEY = process.env.RAINFOREST_API_KEY;
const RAINFOREST_ENDPOINT = 'https://api.rainforestapi.com/request';

async function fetchImageBuffer(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image (${response.status})`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function cropBuffer(buffer: Buffer, region?: CropRegion) {
  if (!region) {
    return buffer;
  }

  const image = sharp(buffer);
  const metadata = await image.metadata();
  const width = metadata.width ?? region.width;
  const height = metadata.height ?? region.height;

  const left = Math.max(0, Math.min(Math.round(region.x), Math.max(0, width - 1)));
  const top = Math.max(0, Math.min(Math.round(region.y), Math.max(0, height - 1)));
  const cropWidth = Math.max(
    1,
    Math.min(Math.round(region.width), width - left),
  );
  const cropHeight = Math.max(
    1,
    Math.min(Math.round(region.height), height - top),
  );

  return await image
    .extract({ left, top, width: cropWidth, height: cropHeight })
    .toBuffer();
}

async function getKeywordsFromClaude(
  imageBase64: string,
  userPrompt?: string,
) {
  if (!anthropicClient) {
    throw new Error('ANTHROPIC_API_KEY is not configured');
  }

  const response = await anthropicClient.messages.create({
    model: 'claude-3-7-sonnet-20250219',
    max_tokens: 120,
    temperature: 0,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text' as const,
            text:
              'Provide a concise, high-intent Amazon search query (3-6 words) that describes the highlighted product. ' +
              'Focus on furniture/decor keywords like color, material, and style. Return only the keyword string.',
          },
          {
            type: 'image' as const,
            source: {
              type: 'base64',
              media_type: 'image/png',
              data: imageBase64,
            },
          },
          ...(userPrompt
            ? [
                {
                  type: 'text' as const,
                  text: `User request/context: ${userPrompt}`,
                },
              ]
            : []),
        ],
      },
    ],
  });

  const textContent = response.content
    .filter((item) => item.type === 'text')
    .map((item) => item.text)
    .join(' ')
    .trim();

  if (!textContent) {
    throw new Error('Claude did not return keywords');
  }

  return textContent.replace(/["']/g, '').trim();
}

async function searchRainforest(keywords: string) {
  if (!RAINFOREST_API_KEY) {
    throw new Error('RAINFOREST_API_KEY is not configured');
  }

  const params = new URLSearchParams({
    api_key: RAINFOREST_API_KEY,
    type: 'search',
    amazon_domain: 'amazon.com',
    search_term: keywords,
    sort_by: 'featured',
    page: '1',
  });

  const response = await fetch(`${RAINFOREST_ENDPOINT}?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Rainforest API failed (${response.status})`);
  }

  const payload = await response.json();
  const results: RainforestSearchResult[] = payload?.search_results ?? [];

  return results.slice(0, 3).map((item) => ({
    name: item.title,
    category: 'Detected item',
    description: item.price?.display
      ? `${item.title} (${item.price.display})`
      : item.title,
    quantity: 1,
    searchTerms: [keywords],
    linkUrl: item.link ?? (item.asin ? `https://www.amazon.com/dp/${item.asin}` : undefined),
    imageUrl: item.image,
    price: item.price?.display,
    asin: item.asin,
  }));
}

export async function POST(request: Request) {
  let body: {
    imageUrl?: string;
    userPrompt?: string;
    cropRegion?: CropRegion;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.imageUrl) {
    return NextResponse.json(
      { error: 'imageUrl is required' },
      { status: 400 },
    );
  }

  try {
    const originalBuffer = await fetchImageBuffer(body.imageUrl);
    const croppedBuffer = await cropBuffer(originalBuffer, body.cropRegion);
    const base64Image = croppedBuffer.toString('base64');

    const keywords = await getKeywordsFromClaude(base64Image, body.userPrompt);
    const products = await searchRainforest(keywords);

    if (!products.length) {
      return NextResponse.json(
        { error: 'No matching products found', keywords },
        { status: 404 },
      );
    }

    return NextResponse.json({
      keywords,
      products,
    });
  } catch (error) {
    console.error('Smart product lookup failed:', error);
    const message =
      error instanceof Error ? error.message : 'Smart lookup failed';
    return NextResponse.json(
      { error: message },
      { status: message.includes('configured') ? 500 : 502 },
    );
  }
}
