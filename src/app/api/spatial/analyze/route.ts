import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { jsonrepair } from 'jsonrepair';

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
              'Analyze this room photo and describe all spatial elements in STRICT JSON (normalized coordinates). ' +
              'Include windows, doors, furniture, walkways, empty zones, obstructions, depth cues, and metadata (notes + circulation). ' +
              'Example keys:\n' +
              '{\n' +
              '  "windows": [{ "id": "...", "box": { "x": 0-1, "y": 0-1, "width": 0-1, "height": 0-1 }, "note": "" }],\n' +
              '  "doors": [...],\n' +
              '  "furniture": [{ "id": "sofa-1", "label": "navy sofa", "box": {...}, "note": "" }],\n' +
              '  "walkways": [{ "id": "path-1", "points": [{"x":0.1,"y":0.8}, ...], "note": "" }],\n' +
              '  "empty_zones": [{ "id": "corner-1", "box": {...}, "note": "" }],\n' +
              '  "obstructions": [{ "id": "chair-block", "label": "", "box": {...} }],\n' +
              '  "depth_cues": ["strong diagonal perspective", ...],\n' +
              '  "metadata": { "notes": ["door swings inward"], "circulation": ["entry -> sofa -> window"] }\n' +
              '}',
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
      try {
        const repaired = jsonrepair(jsonPayload);
        parsed = JSON.parse(repaired);
      } catch (repairError) {
        console.error('Failed to parse spatial JSON:', err, jsonPayload);
        throw err instanceof Error ? err : new Error('Invalid JSON');
      }
    }

    const enriched = computeProportions(parsed);

    return NextResponse.json(enriched);
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

function computeProportions(spatial: any) {
  const width = 1;
  const height = 1;

  const furniture = spatial.furniture ?? [];
  const walkways = spatial.walkways ?? [];
  const windows = spatial.windows ?? [];
  const doors = spatial.doors ?? [];

  const roomWidth = 1;
  const sofa =
    furniture.find((item: any) =>
      (item.label || '').toLowerCase().includes('sofa'),
    ) || null;

  const walkwayWidths = walkways.map((path: any) => {
    if (!Array.isArray(path.points) || path.points.length < 2) {
      return null;
    }
    let minX = 1;
    let maxX = 0;
    let minY = 1;
    let maxY = 0;
    path.points.forEach((p: any) => {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    });
    return Math.max(maxX - minX, maxY - minY);
  }).filter(Boolean) as number[];

  const averageWalkway = walkwayWidths.length
    ? walkwayWidths.reduce((sum, w) => sum + w, 0) / walkwayWidths.length
    : null;

  const proportions = {
    sofa_room_width_ratio: sofa ? sofa.box.width : null,
    sofa_room_height_ratio: sofa ? sofa.box.height : null,
    walkway_width_ratio: averageWalkway,
    estimated_room_depth: spatial.depth_cues?.length
      ? Math.min(1, spatial.depth_cues.length * 0.1 + 0.5)
      : 0.6,
    window_wall_ratio: windows.length
      ? windows.reduce((sum: number, win: any) => sum + win.box.width, 0)
      : null,
    door_wall_ratio: doors.length
      ? doors.reduce((sum: number, door: any) => sum + door.box.width, 0)
      : null,
  };

  const measurements = [
    sofa
      ? {
          id: sofa.id,
          label: sofa.label ?? 'sofa',
          width_ratio: sofa.box.width,
          height_ratio: sofa.box.height,
        }
      : null,
    averageWalkway
      ? {
          id: 'walkway-avg',
          label: 'average walkway width',
          width_ratio: averageWalkway,
        }
      : null,
    windows.length
      ? {
          id: 'windows-total',
          label: 'total window width',
          width_ratio: windows.reduce(
            (sum: number, win: any) => sum + win.box.width,
            0,
          ),
        }
      : null,
    doors.length
      ? {
          id: 'doors-total',
          label: 'door width',
          width_ratio: doors.reduce(
            (sum: number, door: any) => sum + door.box.width,
            0,
          ),
        }
      : null,
  ].filter(Boolean);

  return {
    ...spatial,
    proportions,
    measurements,
  };
}
