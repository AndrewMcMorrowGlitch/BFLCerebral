import { NextResponse } from 'next/server';
import { RoomState } from '@/lib/roomState';

const FAL_ENDPOINT = 'https://queue.fal.run/fal-ai/flux/dev/image-to-image';

const buildPrompt = (roomState: RoomState) => {
  const objectSummary = roomState.objects
    .map(
      (obj) =>
        `${obj.type} at (${obj.position.x.toFixed(2)}, ${obj.position.y.toFixed(
          2,
        )}, ${obj.position.z.toFixed(2)}) size (${obj.size.w}w x ${obj.size.h}h x ${obj.size.d}d) color ${obj.material.color}`,
    )
    .join('; ');

  return {
    text: [
      'Photorealistic interior render of the provided clay layout.',
      'Respect camera angle: fixed corner-left three-quarter view.',
      'Preserve relative sizes, layout, and proportions from the clay image.',
      'Soft, natural lighting. No dramatic shadows.',
      'High-detail furniture materials and realistic finishes.',
    ].join(' '),
    prompt_json: {
      camera: roomState.camera,
      objects: roomState.objects.map((obj) => ({
        id: obj.id,
        type: obj.type,
        position: obj.position,
        size: obj.size,
        color: obj.material.color,
      })),
      summary: objectSummary,
      style: 'architectural photography, clean lines, minimal noise',
      referenceImages: roomState.styleReferenceImages,
    },
  };
};

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

    let clayImage: string;
    let roomState: RoomState;

    try {
      const parsed = JSON.parse(bodyText);
      clayImage = parsed.clayImage;
      roomState = parsed.roomState;
    } catch (e) {
      console.error('JSON Parse Error on Request Body:', e);
      console.error('First 100 chars of body:', bodyText.substring(0, 100));
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const prompt = buildPrompt(roomState);

    // If no API key, return clay image so the UI still works in dev.
    if (!process.env.FAL_KEY) {
      console.warn('FAL_KEY missing; returning clay view.');
      return NextResponse.json({
        imageUrl: clayImage,
        warning: 'FAL_KEY missing; returning clay view as placeholder.',
      });
    }

    // 2. Call FAL API
    const response = await fetch(FAL_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Key ${process.env.FAL_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: prompt.text,
        prompt_json: prompt.prompt_json,
        image_url: clayImage,
        reference_images: roomState.styleReferenceImages,
        guidance_scale: 4,
        strength: 0.75,
        num_inference_steps: 24,
      }),
    });

    // 3. Robust Response Parsing
    const responseText = await response.text();

    if (!response.ok) {
      console.error(`FAL API Error (${response.status}):`, responseText);
      return NextResponse.json({ imageUrl: clayImage, warning: 'FAL call failed; returning clay view.' });
    }

    let result: any;
    try {
      result = JSON.parse(responseText);
    } catch (e) {
      console.error('JSON Parse Error on FAL Response:', e);
      console.error('Response Text:', responseText);
      return NextResponse.json({ imageUrl: clayImage, warning: 'Invalid JSON from FAL.' });
    }

    // Handle queued responses with polling
    if (result.request_id) {
      const requestId = result.request_id as string;
      for (let i = 0; i < 20; i++) {
        await new Promise((res) => setTimeout(res, 1000));
        const statusRes = await fetch(`https://queue.fal.run/fal-ai/flux/dev/requests/${requestId}`, {
          headers: { Authorization: `Key ${process.env.FAL_KEY}` },
        });

        // Robust polling response parsing
        const statusText = await statusRes.text();
        let statusJson: any;
        try {
          statusJson = JSON.parse(statusText);
        } catch (e) {
          console.error('JSON Parse Error on Polling Response:', e);
          continue;
        }

        if (statusJson.status === 'COMPLETED') {
          const output = statusJson.images?.[0]?.url || statusJson.image?.url;
          if (output) return NextResponse.json({ imageUrl: output });
        }
        if (statusJson.status === 'FAILED') {
          console.error('FAL Request Failed:', statusJson);
          break;
        }
      }
      return NextResponse.json({ imageUrl: clayImage, warning: 'Timed out waiting for FLUX; showing clay view.' });
    }

    if (result.images && result.images.length > 0) {
      return NextResponse.json({ imageUrl: result.images[0].url });
    }

    return NextResponse.json({ imageUrl: clayImage, warning: 'No image from FLUX; returning clay view.' });
  } catch (error) {
    console.error('Error in /api/render:', error);
    return NextResponse.json({ imageUrl: null, error: 'Internal Server Error' }, { status: 500 });
  }
}
