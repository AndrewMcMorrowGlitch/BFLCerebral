const FAL_API_KEY = process.env.FAL_KEY;
const FAL_API_URL = 'https://fal.run/fal-ai/beta-image-232/edit';

interface FalAIResponse {
  images: Array<{
    url: string;
    width: number;
    height: number;
    content_type: string;
    file_name: string;
    file_size: number;
  }>;
  timings?: {
    inference: number;
  };
  has_nsfw_concepts: boolean[];
  seed: number;
  prompt: string;
}

export async function decorateImage(imageDataUrl: string, prompt: string): Promise<string> {
  if (!FAL_API_KEY) {
    throw new Error('FAL_KEY is not configured');
  }

  try {
    const response = await fetch(FAL_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${FAL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_urls: [imageDataUrl],
        prompt: `Add ${prompt} decorations to the room, while keeping the original furniture.`,
        image_size: 'landscape_16_9',
        num_inference_steps: 30,
        guidance_scale: 2.5,
        num_images: 1,
        enable_safety_checker: true,
        output_format: 'png',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Fal AI API error:', errorText);
      throw new Error(`Fal AI API failed: ${response.statusText}`);
    }

    const data: FalAIResponse = await response.json();
    
    if (data.images && data.images.length > 0) {
      return data.images[0].url;
    } else {
      throw new Error('No image generated');
    }
  } catch (error) {
    console.error('Error calling Fal AI:', error);
    throw error;
  }
}