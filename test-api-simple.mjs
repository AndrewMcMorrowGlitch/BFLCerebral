#!/usr/bin/env node

/**
 * Simple API Test Script
 * Usage: node test-api-simple.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_BASE = 'http://localhost:3000';

// Load test image
const imageBuffer = fs.readFileSync(path.join(__dirname, 'test_image.webp'));
const imageBase64 = `data:image/webp;base64,${imageBuffer.toString('base64')}`;

console.log('🧪 Simple API Test\n');

// Test 1: Decoration API
async function testDecoration() {
  console.log('1️⃣ Testing Decoration API (Fal AI)...');
  
  const formData = new FormData();
  const blob = new Blob([imageBuffer], { type: 'image/webp' });
  formData.append('image', blob, 'test.webp');
  formData.append('prompt', 'halloween');
  
  try {
    const response = await fetch(`${API_BASE}/api/decoration/decorate`, {
      method: 'POST',
      body: formData
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('   ✅ Success! Decorated image URL:', data.decoratedImage?.substring(0, 60) + '...');
      return data.decoratedImage;
    } else {
      console.log('   ❌ Failed:', response.status, response.statusText);
      return null;
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message);
    return null;
  }
}

// Test 2: Analyze API with Gemini
async function testAnalyze(decoratedImage) {
  console.log('\n2️⃣ Testing Analyze API (Gemini)...');
  
  try {
    const response = await fetch(`${API_BASE}/api/decoration/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        originalImage: imageBase64,
        decoratedImage: decoratedImage || imageBase64,
        theme: 'halloween',
        provider: 'gemini'  // Using Gemini since it has credits
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('   ✅ Success! Found', data.products?.products?.length || 0, 'products');
      
      if (data.products?.products?.length > 0) {
        console.log('\n   📦 Products found:');
        data.products.products.slice(0, 3).forEach(p => {
          console.log(`      • ${p.name} (${p.quantity || 1}x)`);
        });
      }
    } else {
      const error = await response.text();
      console.log('   ❌ Failed:', response.status);
      console.log('   Error:', error.substring(0, 100) + '...');
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message);
  }
}

// Run tests
async function runTests() {
  // Check if server is running
  try {
    await fetch(API_BASE);
    console.log('✅ Server is running on', API_BASE);
  } catch (error) {
    console.log('❌ Server is not running!');
    console.log('   Start it with: npm run dev');
    return;
  }
  
  console.log('─'.repeat(40) + '\n');
  
  const decoratedImage = await testDecoration();
  await testAnalyze(decoratedImage);
  
  console.log('\n' + '─'.repeat(40));
  console.log('✨ Test complete!\n');
}

runTests().catch(console.error);