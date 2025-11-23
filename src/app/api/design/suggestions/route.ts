import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { jsonrepair } from 'jsonrepair';

const anthropicClient = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

export async function POST(request: Request) {
  if (!anthropicClient) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY is not configured' },
      { status: 500 },
    );
  }

  let body: {
    imageUrl?: string;
    spatialJson?: any;
    userPrompt?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.imageUrl || !body.spatialJson) {
    return NextResponse.json(
      { error: 'imageUrl and spatialJson are required' },
      { status: 400 },
    );
  }

  try {
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
                'You are an interior design strategist. Given the spatial JSON describing a room layout, ' +
                'identify layout issues, suggest improvements referencing region IDs, and propose generic product ideas ' +
                'that can be passed to an e-commerce search. Respond ONLY in JSON with:\n' +
                '{\n' +
                '  "layout_issues": [{ "id": "...", "description": "...", "region_ref": "sofa-1" }],\n' +
                '  "improvement_suggestions": [{ "id": "...", "description": "...", "region_ref": "window-1" }],\n' +
                '  "product_suggestions": [{ "id": "...", "query": "sheer curtains", "notes": "for window-1" }],\n' +
                '  "measurements": [{ "id": "walkway-1", "description": "Walkway approx 2.1 ft", "region_ref": "path-1" }]\n' +
                '}\n' +
                'Tie regions back to the spatial JSON (use the provided IDs). ' +
                'Product suggestions should be generic item types (e.g., "round side table", "sheer curtains", "5x8 rug"). ' +
                'Measurements can be proportional estimates even if approximate.',
            },
            {
              type: 'text',
              text: `Spatial JSON:\n${JSON.stringify(body.spatialJson)}`,
            },
            ...(body.userPrompt
              ? [
                  {
                    type: 'text',
                    text: `User instructions/context: ${body.userPrompt}`,
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
      throw new Error('Claude returned no suggestions');
    }

    const sanitized = textContent
      .replace(/```(?:json)?/gi, '')
      .replace(/```/g, '')
      .trim();

    const jsonMatch = sanitized.match(/\{[\s\S]*\}$/);
    const jsonPayload = jsonMatch ? jsonMatch[0] : sanitized;

    let parsed;
    try {
      parsed = JSON.parse(jsonPayload);
    } catch (parseError) {
      try {
        const repaired = jsonrepair(jsonPayload);
        parsed = JSON.parse(repaired);
      } catch (repairError) {
        console.error('Design suggestions parse failed', {
          original: jsonPayload,
          parseError,
          repairError,
        });
        throw parseError instanceof Error ? parseError : new Error('Invalid JSON');
      }
    }

    return NextResponse.json(parsed);
  } catch (error) {
    console.error('Design suggestions failed:', error);
    const message =
      error instanceof Error ? error.message : 'Design suggestions failed';
    return NextResponse.json(
      { error: message },
      { status: message.includes('configured') ? 500 : 502 },
    );
  }
}
