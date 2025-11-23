/**
 * ATOMIC TEST 2: Test analyze endpoint only
 * Tests: POST /api/decoration/analyze
 * Focus: JSON parsing, request validation, response format
 */

import { loadTestImage } from './load-test-image.mjs';

const testImage = loadTestImage();

console.log('📦 ATOMIC TEST: Analyze Endpoint');
console.log('===============================\n');

async function testAnalyzeEndpoint() {
  try {
    const requestBody = {
      originalImage: testImage.dataUrl,
      decoratedImage: testImage.dataUrl,
      theme: 'halloween'
    };

    console.log('Sending POST to /api/decoration/analyze...');
    console.log(`Request body size: ${JSON.stringify(requestBody).length} chars`);

    const response = await fetch('http://localhost:3000/api/decoration/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    console.log(`Status: ${response.status}`);
    console.log(`Content-Type: ${response.headers.get('content-type')}`);

    const responseText = await response.text();
    console.log(`Response length: ${responseText.length} chars`);

    if (response.status === 200) {
      try {
        const json = JSON.parse(responseText);
        console.log('✅ PASS: Valid JSON response');
        console.log(`Has products: ${!!json.products}`);
        console.log(`Products.products count: ${json.products?.products?.length || 0}`);
        console.log(`Theme: ${json.products?.overallTheme || 'N/A'}`);
        
        if (json.products?.products?.length > 0) {
          console.log(`First product: ${json.products.products[0].name}`);
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
testAnalyzeEndpoint();