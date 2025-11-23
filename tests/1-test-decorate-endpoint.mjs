/**
 * ATOMIC TEST 1: Test decoration endpoint only
 * Tests: POST /api/decoration/decorate
 * Focus: Request handling, FormData parsing, response format
 */

import { loadTestImage } from './load-test-image.mjs';

const testImage = loadTestImage();

console.log('🎨 ATOMIC TEST: Decoration Endpoint');
console.log('==================================\n');

async function testDecorateEndpoint() {
  try {
    // Create FormData with real test image
    const formData = new FormData();
    const blob = new Blob([testImage.buffer], { type: 'image/webp' });
    
    formData.append('image', blob, 'test_image.webp');
    formData.append('prompt', 'halloween');

    console.log('Sending POST to /api/decoration/decorate...');
    
    const response = await fetch('http://localhost:3000/api/decoration/decorate', {
      method: 'POST',
      body: formData,
    });

    console.log(`Status: ${response.status}`);
    console.log(`Content-Type: ${response.headers.get('content-type')}`);

    const responseText = await response.text();
    console.log(`Response length: ${responseText.length} chars`);

    if (response.status === 200) {
      try {
        const json = JSON.parse(responseText);
        console.log('✅ PASS: Valid JSON response');
        console.log(`Has decoratedImage: ${!!json.decoratedImage}`);
        if (json.decoratedImage) {
          console.log(`Image URL preview: ${json.decoratedImage.substring(0, 50)}...`);
        }
      } catch (e) {
        console.log('❌ FAIL: Invalid JSON response');
        console.log(`Raw response: ${responseText.substring(0, 200)}...`);
      }
    } else if (response.status === 400) {
      console.log('⚠️  Expected 400 error (check validation)');
      console.log(`Error: ${responseText}`);
    } else if (response.status === 500) {
      console.log('❌ FAIL: Server error');
      console.log(`Error: ${responseText}`);
    } else {
      console.log(`❓ Unexpected status: ${response.status}`);
      console.log(`Response: ${responseText}`);
    }

  } catch (error) {
    console.log('❌ FAIL: Request failed');
    console.log(`Error: ${error.message}`);
  }
}

// Run test
testDecorateEndpoint();