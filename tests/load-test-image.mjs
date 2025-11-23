/**
 * Helper: Load test image and convert to base64
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function loadTestImage() {
  try {
    const imagePath = path.join(__dirname, '..', 'test_image.webp');
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');
    const dataUrl = `data:image/webp;base64,${base64Image}`;
    
    console.log(`📷 Loaded test image: ${Math.round(imageBuffer.length / 1024)}KB`);
    return {
      dataUrl,
      buffer: imageBuffer,
      size: imageBuffer.length
    };
  } catch (error) {
    console.error('❌ Failed to load test_image.webp:', error.message);
    console.log('💡 Make sure test_image.webp exists in the root folder');
    process.exit(1);
  }
}