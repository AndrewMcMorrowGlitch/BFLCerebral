import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropicClient = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

type CropRegion = {
  x: number;
  y: number;
  width: number;
  height: number;
};

async function fetchImageBase64(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image (${response.status})`);
  }
  const contentType = response.headers.get('content-type') || 'image/png';
  const arrayBuffer = await response.arrayBuffer();
  return {
    base64: Buffer.from(arrayBuffer).toString('base64'),
    mime: contentType.split(';')[0] || 'image/png',
  };
}

export async function POST(request: Request) {
  if (!anthropicClient) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY is not configured' },
      { status: 500 },
    );
  }

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
    const { base64, mime } = await fetchImageBase64(body.imageUrl);

    const response = await anthropicClient.messages.create({
      model: 'claude-3-7-sonnet-20250219',
      max_tokens: 800,
      temperature: 0,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text:
                'You are a spatial intelligence system for interior design. ' +
                'Analyze the room image and output STRICT JSON with normalized (0-1) coordinates relative to the full image width/height. ' +
                'Structure:\n' +
                '{\n' +
                '  "windows": [{ "id": "window-1", "box": { "x": 0.1, "y": 0.05, "width": 0.25, "height": 0.2 } }],\n' +
                '  "doors": [...],\n' +
                '  "furniture": [{ "id": "sofa", "label": "blue modern sofa", "box": {...} }],\n' +
                '  "walkways": [{ "id": "path-1", "points": [{ "x": 0.2, "y": 0.8 }, ...] }],\n' +
                '  "empty_zones": [{ "id": "corner-1", "box": {...}, "note": "open corner" }],\n' +
                '  "obstructions": [{ "id": "chair-block", "label": "accent chair", "box": {...} }],\n' +
                '  "depth_cues": ["strong perspective towards back wall", ...],\n' +
                '  "metadata": { "notes": ["door swings inward"], "circulation": ["entry -> sofa -> window seating"] }\n' +
                '}\n' +
                'Ensure every coordinate is between 0 and 1. Include at least walkways, furniture, and windows when visible.',
            },
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mime,
                data: base64,
              },
            },
            ...(body.userPrompt
              ? [
                  {
                    type: 'text',
                    text: `User request/context: ${body.userPrompt}`,
                  },
                ]
              : []),
          ],
        },
      ],
    });

    let textContent = response.content
      .filter((item) => item.type === 'text')
      .map((item) => item.text)
      .join('');

    if (!textContent) {
      throw new Error('Claude returned no spatial data');
    }

    textContent = textContent.trim();
    const fenced = textContent.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
    const lines = fenced
      .split('\n')
      .map((line) => line.trimEnd())
      .join('\n');

    // Remove trailing commas before closing objects/arrays
    const sanitized = lines
      .replace(/,\s*}/g, '}')
      .replace(/,\s*]/g, ']');

    const jsonMatch = sanitized.match(/\{[\s\S]*\}$/);
    const jsonPayload = jsonMatch ? jsonMatch[0] : sanitized;

    let parsed;
    try {
      parsed = JSON.parse(jsonPayload);
    } catch (err) {
      console.error('Failed to parse spatial JSON:', err, jsonPayload);
      throw err;
    }

    return NextResponse.json(parsed);
  } catch (error) {
    console.error('Spatial analysis failed:', error);
    const message =
      error instanceof Error ? error.message : 'Spatial analysis failed';
    return NextResponse.json(
      { error: message },
      { status: message.includes('configured') ? 500 : 502 },
    );
  }
}
