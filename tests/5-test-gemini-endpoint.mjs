/**
 * ATOMIC TEST 5: Test Gemini integration for analyze endpoint
 * Tests: POST /api/decoration/analyze with provider=gemini
 * Focus: Gemini 2.0 Flash integration
 */

import { loadTestImage } from './load-test-image.mjs';

const testImage = loadTestImage();

console.log('🤖 ATOMIC TEST: Gemini Integration');
console.log('=================================\n');

async function testGeminiAnalyze() {
  try {
    const requestBody = {
      originalImage: testImage.dataUrl,
      decoratedImage: testImage.dataUrl,
      theme: 'halloween',
      provider: 'gemini'  // 🔥 Test Gemini!
    };

    console.log('Sending POST to /api/decoration/analyze with provider=gemini...');
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
        console.log('✅ PASS: Valid JSON response from Gemini');
        console.log(`Has products: ${!!json.products}`);
        console.log(`Products.products count: ${json.products?.products?.length || 0}`);
        console.log(`Theme: ${json.products?.overallTheme || 'N/A'}`);
        console.log(`Provider used: Gemini 2.0 Flash`);
        
        if (json.products?.products?.length > 0) {
          console.log(`\n🎯 Gemini Results Preview:`);
          json.products.products.slice(0, 3).forEach((p, i) => {
            console.log(`  ${i + 1}. ${p.name}`);
            console.log(`     Category: ${p.category} | Qty: ${p.quantity || 1}`);
          });
        }
      } catch (e) {
        console.log('❌ FAIL: Invalid JSON response');
        console.log(`Raw response: ${responseText.substring(0, 200)}...`);
      }
    } else if (response.status === 400) {
      console.log('⚠️  Expected 400 error (check validation)');
      console.log(`Error: ${responseText}`);
    } else if (response.status === 500) {
      console.log('❌ FAIL: Gemini server error');
      console.log(`Error: ${responseText}`);
      
      // Parse error for more details
      try {
        const error = JSON.parse(responseText);
        if (error.error?.includes('GOOGLE_API_KEY')) {
          console.log('💡 Tip: Check GOOGLE_API_KEY in .env file');
        } else if (error.error?.includes('quota') || error.error?.includes('limit')) {
          console.log('💡 Tip: Check Google AI API quota/limits');
        }
      } catch (e) {
        // Error parsing failed
      }
    } else {
      console.log(`❓ Unexpected status: ${response.status}`);
      console.log(`Response: ${responseText}`);
    }

  } catch (error) {
    console.log('❌ FAIL: Request failed');
    console.log(`Error: ${error.message}`);
  }
}

// Compare with Claude
async function testClaudeVsGemini() {
  console.log('\n🔬 Bonus: Claude vs Gemini Comparison');
  console.log('====================================');
  
  const baseRequest = {
    originalImage: testImage.dataUrl,
    decoratedImage: testImage.dataUrl,
    theme: 'halloween'
  };

  console.log('\n1. Testing Claude (default):');
  try {
    const claudeResp = await fetch('http://localhost:3000/api/decoration/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...baseRequest, provider: 'claude' }),
    });
    console.log(`   Claude: ${claudeResp.status} ${claudeResp.ok ? '✅' : '❌'}`);
  } catch (e) {
    console.log(`   Claude: ❌ ${e.message}`);
  }

  console.log('\n2. Testing Gemini:');
  try {
    const geminiResp = await fetch('http://localhost:3000/api/decoration/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...baseRequest, provider: 'gemini' }),
    });
    console.log(`   Gemini: ${geminiResp.status} ${geminiResp.ok ? '✅' : '❌'}`);
  } catch (e) {
    console.log(`   Gemini: ❌ ${e.message}`);
  }
}

// Run tests
testGeminiAnalyze().then(() => testClaudeVsGemini());