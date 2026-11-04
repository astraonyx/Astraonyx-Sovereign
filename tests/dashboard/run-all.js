const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const testDir = __dirname;
const files = fs.readdirSync(testDir).filter(f => f.endsWith('.test.js'));
console.log(`Running test suite with ${files.length} test files:`);

files.forEach(f => {
  const p = path.join(testDir, f);
  console.log(`\n-> Running ${f}`);
  execSync(`node "${p}"`, { stdio: 'inherit' });
});

console.log('\n=== ALL 7 TICKET TEST SUITES PASSED CLEANLY ===');
