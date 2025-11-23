/**
 * ATOMIC TEST 3: Test endpoint validation only
 * Tests: Request validation, error handling
 * Focus: Bad requests, missing data, wrong content types
 */

console.log('🔍 ATOMIC TEST: Endpoint Validation');
console.log('==================================\n');

async function testValidation() {
  console.log('1. Test decoration endpoint validation:');
  
  // Test 1: Missing image
  try {
    const formData = new FormData();
    formData.append('prompt', 'halloween');
    
    const response = await fetch('http://localhost:3000/api/decoration/decorate', {
      method: 'POST',
      body: formData,
    });
    
    console.log(`   Missing image: ${response.status} ${response.ok ? '❌ Should fail' : '✅ Correctly failed'}`);
  } catch (e) {
    console.log(`   Missing image: ❌ Network error: ${e.message}`);
  }

  // Test 2: Missing prompt
  try {
    const formData = new FormData();
    const blob = new Blob(['fake'], { type: 'image/png' });
    formData.append('image', blob, 'test.png');
    
    const response = await fetch('http://localhost:3000/api/decoration/decorate', {
      method: 'POST',
      body: formData,
    });
    
    console.log(`   Missing prompt: ${response.status} ${response.ok ? '❌ Should fail' : '✅ Correctly failed'}`);
  } catch (e) {
    console.log(`   Missing prompt: ❌ Network error: ${e.message}`);
  }

  console.log('\n2. Test analyze endpoint validation:');
  
  // Test 3: Missing originalImage
  try {
    const response = await fetch('http://localhost:3000/api/decoration/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        decoratedImage: 'test',
        theme: 'halloween'
      }),
    });
    
    console.log(`   Missing originalImage: ${response.status} ${response.ok ? '❌ Should fail' : '✅ Correctly failed'}`);
  } catch (e) {
    console.log(`   Missing originalImage: ❌ Network error: ${e.message}`);
  }

  // Test 4: Invalid JSON
  try {
    const response = await fetch('http://localhost:3000/api/decoration/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'invalid json',
    });
    
    console.log(`   Invalid JSON: ${response.status} ${response.ok ? '❌ Should fail' : '✅ Correctly failed'}`);
  } catch (e) {
    console.log(`   Invalid JSON: ❌ Network error: ${e.message}`);
  }

  console.log('\n3. Test HTTP methods:');
  
  // Test 5: Wrong method (GET instead of POST)
  try {
    const response = await fetch('http://localhost:3000/api/decoration/decorate', {
      method: 'GET',
    });
    
    console.log(`   GET to decorate: ${response.status} ${response.status === 405 ? '✅ Method not allowed' : '❌ Should be 405'}`);
  } catch (e) {
    console.log(`   GET to decorate: ❌ Network error: ${e.message}`);
  }
}

// Run test
testValidation();