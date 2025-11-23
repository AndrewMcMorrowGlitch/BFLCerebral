import Anthropic from '@anthropic-ai/sdk';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

export interface Product {
  name: string;
  category: string;
  quantity?: number;
  description: string;
  searchTerms: string[];
}

export interface ProductAnalysisResult {
  products: Product[];
  overallTheme: string;
  colorScheme: string[];
  estimatedTotalItems: number;
}

export async function analyzeProducts(
  originalImage: string,
  decoratedImage: string,
  theme: string = 'halloween'
): Promise<ProductAnalysisResult> {
  console.log('analyzeProducts called with theme:', theme);
  
  if (!ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY not found');
    throw new Error('ANTHROPIC_API_KEY is not configured');
  }

  console.log('Initializing Anthropic client...');
  const anthropic = new Anthropic({
    apiKey: ANTHROPIC_API_KEY,
  });

  try {
    console.log('Preparing Claude API call...');
    const prompt = `Describe what ${theme} decorations were added to the image compared to the original image, and provide a structured shopping list of all items needed to recreate this look.

Please analyze the differences between these two images and provide:
1. A comprehensive list of all decorative items added
2. Categories for each item
3. Suggested quantities where visible
4. Amazon-friendly search terms for each item

Return the response in a structured format.`;

    // Parse image data safely
    const parseImageData = (imageStr: string) => {
      if (!imageStr.includes('data:') || !imageStr.includes('base64,')) {
        // If it's just base64 without the data URI prefix
        return {
          media_type: 'image/png' as const,
          data: imageStr
        };
      }
      
      const [metadata, data] = imageStr.split('base64,');
      const mediaType = metadata.match(/data:([^;]+)/)?.[1] || 'image/png';
      return {
        media_type: mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
        data: data || imageStr
      };
    };

    const originalImageData = parseImageData(originalImage);
    const decoratedImageData = parseImageData(decoratedImage);
    
    console.log('Calling Claude API...');
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2048,
      temperature: 0,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                ...originalImageData
              },
            },
            {
              type: 'image',
              source: {
                type: 'base64',
                ...decoratedImageData
              },
            },
            {
              type: 'text',
              text: prompt,
            },
          ],
        },
      ],
    });

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
    
    const products = parseProductsFromResponse(responseText, theme);
    
    return products;
  } catch (error) {
    console.error('Error calling Claude AI:', error);
    throw error;
  }
}

function parseProductsFromResponse(response: string, theme: string): ProductAnalysisResult {
  const products: Product[] = [];
  const lines = response.split('\n');
  
  const categories = {
    'webbing': ['spider web', 'web material', 'gauze', 'netting'],
    'bats': ['bat cutout', 'bat silhouette', 'bat decoration'],
    'pumpkins': ['pumpkin', 'jack-o-lantern', 'jack o lantern'],
    'spiders': ['spider', 'plastic spider'],
    'garland': ['garland', 'hanging decoration', 'chain', 'swag'],
    'wall': ['wall decoration', 'wall hanging', 'wall decal', 'sticker'],
    'lights': ['light', 'LED', 'string light'],
    'other': [],
  };

  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    
    for (const [category, keywords] of Object.entries(categories)) {
      for (const keyword of keywords) {
        if (lowerLine.includes(keyword)) {
          const item = extractItemFromLine(line, category, keyword);
          if (item && !products.some(p => p.name === item.name)) {
            products.push(item);
          }
          break;
        }
      }
    }
  }

  if (products.length === 0) {
    products.push(
      {
        name: `${theme} Spider Web Decoration`,
        category: 'webbing',
        quantity: 1,
        description: 'Stretchy spider web material for furniture and walls',
        searchTerms: [`${theme} spider web`, 'halloween cobweb decoration', 'stretchy spider web'],
      },
      {
        name: `Black Bat Cutouts`,
        category: 'bats',
        quantity: 12,
        description: 'Assorted sizes of bat silhouettes for walls',
        searchTerms: ['halloween bat decorations', '3D bat wall stickers', 'black bat cutouts'],
      },
      {
        name: `Mini Pumpkin Decorations`,
        category: 'pumpkins',
        quantity: 6,
        description: 'Small orange pumpkins and jack-o-lanterns',
        searchTerms: ['mini pumpkins decoration', 'small jack o lantern', `${theme} pumpkin set`],
      },
      {
        name: `Plastic Spiders`,
        category: 'spiders',
        quantity: 8,
        description: 'Realistic plastic spiders in various sizes',
        searchTerms: ['halloween plastic spiders', 'realistic fake spiders', 'spider decorations'],
      },
      {
        name: `${theme} Garland`,
        category: 'garland',
        quantity: 1,
        description: `Black garland with ${theme} accents`,
        searchTerms: [`${theme} garland`, 'halloween paper garland', 'black orange garland'],
      }
    );
  }

  const colorScheme = theme.toLowerCase() === 'halloween' 
    ? ['black', 'orange', 'white', 'gray']
    : ['varies'];

  return {
    products,
    overallTheme: theme,
    colorScheme,
    estimatedTotalItems: products.reduce((sum, p) => sum + (p.quantity || 1), 0),
  };
}

function extractItemFromLine(line: string, category: string, keyword: string): Product | null {
  const cleanedLine = line.replace(/[-*•]/g, '').trim();
  
  if (!cleanedLine) return null;

  const quantityMatch = cleanedLine.match(/(\d+)\s+/);
  const quantity = quantityMatch ? parseInt(quantityMatch[1]) : 1;

  const name = cleanedLine
    .replace(/^\d+\s+/, '')
    .replace(/[()]/g, '')
    .trim()
    .split(/[,.:]/)[0]
    .trim();

  if (!name || name.length < 3) return null;

  const searchTerms = [
    keyword,
    name.toLowerCase(),
    `halloween ${category}`,
  ].filter(term => term.length > 2);

  return {
    name: name.charAt(0).toUpperCase() + name.slice(1),
    category,
    quantity,
    description: cleanedLine,
    searchTerms,
  };
}