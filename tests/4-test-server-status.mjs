/**
 * ATOMIC TEST 4: Test server status only
 * Tests: Server running, endpoint existence
 * Focus: Basic connectivity, no business logic
 */

console.log('🌐 ATOMIC TEST: Server Status');
console.log('============================\n');

async function testServerStatus() {
  console.log('1. Basic server connectivity:');
  
  try {
    const response = await fetch('http://localhost:3000', {
      method: 'GET',
    });
    
    console.log(`   Server response: ${response.status} ${response.ok ? '✅ Server running' : '⚠️ Unexpected status'}`);
  } catch (error) {
    console.log(`   ❌ Server not reachable: ${error.message}`);
    console.log('   💡 Start server with: npm run dev');
    return;
  }

  console.log('\n2. Endpoint existence (should return 405 for GET):');
  
  // Test decoration endpoint exists
  try {
    const response = await fetch('http://localhost:3000/api/decoration/decorate', {
      method: 'GET',
    });
    
    console.log(`   /api/decoration/decorate: ${response.status} ${response.status === 405 ? '✅ Exists (Method Not Allowed)' : '❓ Unexpected'}`);
  } catch (error) {
    console.log(`   /api/decoration/decorate: ❌ ${error.message}`);
  }

  // Test analyze endpoint exists
  try {
    const response = await fetch('http://localhost:3000/api/decoration/analyze', {
      method: 'GET',
    });
    
    console.log(`   /api/decoration/analyze: ${response.status} ${response.status === 405 ? '✅ Exists (Method Not Allowed)' : '❓ Unexpected'}`);
  } catch (error) {
    console.log(`   /api/decoration/analyze: ❌ ${error.message}`);
  }

  console.log('\n3. Response times:');
  
  const start = Date.now();
  try {
    await fetch('http://localhost:3000/api/decoration/decorate', { method: 'GET' });
    const duration = Date.now() - start;
    console.log(`   Endpoint response time: ${duration}ms ${duration < 1000 ? '✅ Fast' : '⚠️ Slow'}`);
  } catch (error) {
    console.log(`   Response time test failed: ${error.message}`);
  }
}

// Run test
testServerStatus();