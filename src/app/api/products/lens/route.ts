import { NextResponse } from 'next/server';

const SERPAPI_KEY = process.env.SERPAPI_KEY;
const SERPAPI_ENDPOINT = 'https://serpapi.com/search.json';

type LensProduct = {
  title: string;
  link: string;
  thumbnail?: string;
  source?: string;
  price?: string;
};

function normalizeProduct(match: LensProduct) {
  const hostname = (() => {
    try {
      return new URL(match.link).hostname.replace(/^www\./, '');
    } catch {
      return match.source || 'listing';
    }
  })();

  return {
    name: match.title,
    category: 'Detected item',
    description: `${hostname} listing for ${match.title}`,
    searchTerms: [],
    linkUrl: match.link,
    imageUrl: match.thumbnail,
  };
}
 
function isAmazonProductUrl(url: string) {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes('amazon.')) return false;
    return /\/dp\/|\/gp\//.test(parsed.pathname);
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  if (!SERPAPI_KEY) {
    return NextResponse.json(
      { error: 'SERPAPI_KEY is not configured' },
      { status: 500 },
    );
  }

  let body: { imageUrl?: string; prompt?: string };
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

  const lensUrl = `${SERPAPI_ENDPOINT}?${new URLSearchParams({
    engine: 'google_lens',
    url: body.imageUrl,
    api_key: SERPAPI_KEY,
    hl: 'en',
  }).toString()}`;

  try {
    const response = await fetch(lensUrl, {
      headers: {
        'User-Agent': 'BFLCerebral/1.0',
      },
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('Lens API error', response.status, text);
      return NextResponse.json(
        { error: 'Google Lens lookup failed' },
        { status: 502 },
      );
    }

    const payload = await response.json();
    const matches: LensProduct[] = payload?.visual_matches ?? [];

    const amazonMatch =
      matches.find(
        (match) =>
          (match.source?.toLowerCase().includes('amazon') ||
            isAmazonProductUrl(match.link || '')) &&
          isAmazonProductUrl(match.link || ''),
      ) ||
      matches[0];

    if (!amazonMatch || !amazonMatch.link) {
      return NextResponse.json(
        { error: 'No product match found' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      product: normalizeProduct(amazonMatch),
    });
  } catch (error) {
    console.error('Lens lookup failed:', error);
    return NextResponse.json(
      { error: 'Google Lens lookup failed' },
      { status: 500 },
    );
  }
}
