import { GoogleGenerativeAI } from '@google/generative-ai';
import { Product, ProductAnalysisResult } from '@/types/decoration';

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

export async function analyzeProductsWithGemini(
  originalImage: string,
  decoratedImage: string,
  theme: string = 'halloween'
): Promise<ProductAnalysisResult> {
  console.log('analyzeProductsWithGemini called with theme:', theme);
  
  if (!GOOGLE_API_KEY) {
    console.error('GOOGLE_API_KEY not found');
    throw new Error('GOOGLE_API_KEY is not configured');
  }

  console.log('Initializing Gemini client...');
  const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

  try {
    console.log('Preparing Gemini API call...');
    
    const prompt = `Analyze these two room images and identify what ${theme} decorations were added to create a shopping list.

Compare the original image (first) with the decorated image (second) and provide:
1. A comprehensive list of all decorative items that were added
2. Categories for each item (webbing, bats, pumpkins, spiders, garland, lights, wall decorations, etc.)
3. Estimated quantities for each item
4. Amazon-friendly search terms for purchasing

Please return a structured response with:
- Product name
- Category
- Quantity
- Description
- Search terms for online shopping

Focus on identifying specific decorative elements that were added, not the existing furniture.`;

    // Parse image data safely for Gemini
    const parseImageForGemini = (imageStr: string) => {
      if (!imageStr.includes('data:') || !imageStr.includes('base64,')) {
        return {
          inlineData: {
            data: imageStr,
            mimeType: 'image/png'
          }
        };
      }
      
      const [metadata, data] = imageStr.split('base64,');
      const mimeType = metadata.match(/data:([^;]+)/)?.[1] || 'image/png';
      return {
        inlineData: {
          data: data || imageStr,
          mimeType: mimeType as string
        }
      };
    };

    const originalImageData = parseImageForGemini(originalImage);
    const decoratedImageData = parseImageForGemini(decoratedImage);
    
    console.log('Calling Gemini API...');
    const result = await model.generateContent([
      prompt,
      originalImageData,
      decoratedImageData
    ]);

    const response = await result.response;
    const responseText = response.text();
    
    console.log('Gemini API response received, parsing products...');
    const products = parseProductsFromGeminiResponse(responseText, theme);
    
    return products;
  } catch (error) {
    console.error('Error calling Gemini AI:', error);
    throw error;
  }
}

function parseProductsFromGeminiResponse(response: string, theme: string): ProductAnalysisResult {
  const products: Product[] = [];
  const lines = response.split('\n');
  
  // Gemini might format responses differently, so we'll parse more flexibly
  let currentProduct: Partial<Product> | null = null;
  
  for (const line of lines) {
    const cleanLine = line.trim();
    if (!cleanLine) continue;
    
    // Look for product indicators
    if (cleanLine.match(/^\d+\.|^-|^\*/) || cleanLine.toLowerCase().includes('product') || cleanLine.toLowerCase().includes('item')) {
      // Save previous product if exists
      if (currentProduct && currentProduct.name) {
        products.push(completeProduct(currentProduct, theme));
      }
      
      // Start new product
      currentProduct = {
        name: extractProductName(cleanLine),
        category: inferCategory(cleanLine),
        description: cleanLine
      };
    } else if (currentProduct) {
      // Add details to current product
      if (cleanLine.toLowerCase().includes('quantity') || cleanLine.match(/\d+/)) {
        const qty = extractQuantity(cleanLine);
        if (qty) currentProduct.quantity = qty;
      }
      
      if (cleanLine.toLowerCase().includes('category')) {
        currentProduct.category = extractCategory(cleanLine) || currentProduct.category;
      }
    }
  }
  
  // Don't forget the last product
  if (currentProduct && currentProduct.name) {
    products.push(completeProduct(currentProduct, theme));
  }

  // If no products were parsed, provide fallback products
  if (products.length === 0) {
    products.push(
      {
        name: `${theme.charAt(0).toUpperCase() + theme.slice(1)} Spider Web Decoration`,
        category: 'webbing',
        quantity: 2,
        description: 'Stretchy spider web material for furniture and walls',
        searchTerms: [`${theme} spider web`, 'cobweb decoration', 'stretchy spider web'],
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

function extractProductName(line: string): string {
  // Remove bullets, numbers, and clean up
  return line
    .replace(/^\d+\.\s*/, '')
    .replace(/^[-*]\s*/, '')
    .replace(/[()]/g, '')
    .trim()
    .split(/[,.:]/)[0]
    .trim();
}

function inferCategory(line: string): string {
  const lowerLine = line.toLowerCase();
  
  if (lowerLine.includes('spider') || lowerLine.includes('web')) return 'webbing';
  if (lowerLine.includes('bat')) return 'bats';
  if (lowerLine.includes('pumpkin') || lowerLine.includes('jack')) return 'pumpkins';
  if (lowerLine.includes('garland') || lowerLine.includes('chain')) return 'garland';
  if (lowerLine.includes('light') || lowerLine.includes('led')) return 'lights';
  if (lowerLine.includes('wall') || lowerLine.includes('sticker')) return 'wall';
  
  return 'other';
}

function extractQuantity(line: string): number | undefined {
  const match = line.match(/(\d+)\s*(pieces?|items?|units?)?/i);
  return match ? parseInt(match[1]) : undefined;
}

function extractCategory(line: string): string | undefined {
  const match = line.match(/category:\s*([^,\n]+)/i);
  return match ? match[1].trim().toLowerCase() : undefined;
}

function completeProduct(partial: Partial<Product>, theme: string): Product {
  const name = partial.name || 'Unknown Item';
  const category = partial.category || 'other';
  
  return {
    name: name.charAt(0).toUpperCase() + name.slice(1),
    category,
    quantity: partial.quantity || 1,
    description: partial.description || name,
    searchTerms: [
      name.toLowerCase(),
      `${theme} ${category}`,
      `${category} decoration`
    ].filter(term => term.length > 2),
  };
}