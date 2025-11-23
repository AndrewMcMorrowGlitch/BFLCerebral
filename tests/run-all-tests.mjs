/**
 * Test Runner: Run all atomic tests in sequence
 * Usage: node tests/run-all-tests.mjs
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const tests = [
  '4-test-server-status.mjs',
  '3-test-endpoint-validation.mjs', 
  '1-test-decorate-endpoint.mjs',
  '2-test-analyze-endpoint.mjs',
];

console.log('🧪 ATOMIC TEST SUITE');
console.log('===================\n');

async function runTest(testFile) {
  return new Promise((resolve) => {
    console.log(`\n🔬 Running: ${testFile}`);
    console.log('─'.repeat(40));
    
    const child = spawn('node', [join(__dirname, testFile)], {
      stdio: 'inherit'
    });

    child.on('close', (code) => {
      console.log(`\n📊 ${testFile} completed with code: ${code}`);
      resolve(code);
    });

    child.on('error', (error) => {
      console.log(`❌ ${testFile} failed to start: ${error.message}`);
      resolve(1);
    });
  });
}

async function runAllTests() {
  console.log('Running tests in order...\n');
  
  for (const test of tests) {
    const code = await runTest(test);
    if (code !== 0) {
      console.log(`\n⚠️  Test ${test} had issues (code: ${code})`);
    }
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n🏁 All atomic tests completed!');
  console.log('\n💡 Debug tips:');
  console.log('   - Run individual tests: node tests/1-test-decorate-endpoint.mjs');
  console.log('   - Check server logs for detailed errors');
  console.log('   - Verify environment variables in .env');
}

runAllTests().catch(console.error);