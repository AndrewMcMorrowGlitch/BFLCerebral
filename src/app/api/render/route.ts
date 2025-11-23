import { NextResponse } from 'next/server';

const FAL_ENDPOINT = 'https://queue.fal.run/fal-ai/flux/dev/image-to-image';

type FalQueuedResponse = {
  request_id?: string;
  images?: { url?: string }[];
  image?: { url?: string };
  status?: string;
  warning?: string;
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

    // 2. Call FAL API (FLUX Image-to-Image)
    const response = await fetch(FAL_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Key ${process.env.FAL_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: prompt,
        image_url: imageUrl,
        strength: 0.85, // High strength for redesign
        guidance_scale: 7.5,
        num_inference_steps: 40,
        enable_safety_checker: false
      }),
    });

    // 3. Robust Response Parsing
    const responseText = await response.text();

    if (!response.ok) {
      console.error(`FAL API Error (${response.status}):`, responseText);
      return NextResponse.json({ imageUrl: imageUrl, warning: 'FAL call failed.' });
    }

    let result: FalQueuedResponse;
    try {
      result = JSON.parse(responseText) as FalQueuedResponse;
    } catch (parseError) {
      console.error('JSON Parse Error on FAL Response:', parseError);
      return NextResponse.json({ imageUrl: imageUrl, warning: 'Invalid JSON from FAL.' });
    }

    // Handle queued responses with polling
    if (result.request_id) {
      const requestId = result.request_id;
      if (!requestId) {
        return NextResponse.json({ imageUrl: imageUrl, warning: 'Missing request id from FLUX.' });
      }
      for (let i = 0; i < 60; i++) { // Increased timeout for higher quality
        await new Promise((res) => setTimeout(res, 1000));

        try {
          const statusRes = await fetch(`https://queue.fal.run/fal-ai/flux/dev/requests/${requestId}`, {
            headers: { Authorization: `Key ${process.env.FAL_KEY}` },
          });

          if (!statusRes.ok) {
            continue;
          }

          const statusText = await statusRes.text();
          let statusJson: FalQueuedResponse;

          try {
            statusJson = JSON.parse(statusText) as FalQueuedResponse;
          } catch {
            continue;
          }

          if (statusJson.status === 'COMPLETED') {
            const output = statusJson.images?.[0]?.url || statusJson.image?.url;
            if (output) return NextResponse.json({ imageUrl: output });
          }

          if (statusJson.status === 'FAILED') {
            console.error('FAL Request Failed:', statusJson);
            return NextResponse.json({ imageUrl: imageUrl, warning: 'Generation failed on server.' });
          }
        } catch (pollError) {
          console.error('Polling network error:', pollError);
          continue;
        }
      }
      return NextResponse.json({ imageUrl: imageUrl, warning: 'Timed out waiting for FLUX.' });
    }

    if (result.images && result.images.length > 0) {
      return NextResponse.json({ imageUrl: result.images[0].url });
    }

    return NextResponse.json({ imageUrl: imageUrl, warning: 'No image from FLUX.' });
  } catch (error) {
    console.error('Error in /api/render:', error);
    return NextResponse.json({ imageUrl: null, error: 'Internal Server Error' }, { status: 500 });
  }
}
