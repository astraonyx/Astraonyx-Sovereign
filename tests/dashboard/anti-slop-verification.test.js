const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { execSync } = require('child_process');

console.log('=== RUNNING TICKET 7 AUDIT ===');

const TARGET_FILES = [
  'dashboard/index.html',
  'dashboard/css/tokens.css',
  'dashboard/js/pillar-router.js',
  'dashboard/js/pillar-switcher.js',
  'dashboard/css/pillar-switcher.css',
  'dashboard/js/pillar-rails.js',
  'dashboard/css/pillar-rails.css',
  'dashboard/js/role-surface.js',
  'dashboard/css/role-surface.css',
  'dashboard/js/ecosystem-orbit.js',
  'dashboard/css/ecosystem-orbit.css',
  'dashboard/js/polaris-nav.js',
  'dashboard/js/app.js'
];

// 1. Strict Em-Dash / En-Dash Check
let emDashFails = 0;
TARGET_FILES.forEach(filePath => {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  const matches = content.match(/[\u2014\u2013]/g);
  if (matches) {
    console.error(`EM-DASH VIOLATION in ${filePath}: found ${matches.length} matches`);
    emDashFails++;
  }
});
assert.strictEqual(emDashFails, 0, 'No em-dashes allowed');
console.log('PASS: Zero em-dash check');

// 2. Anti-Slop Vocabulary Check in new files
const NEW_FILES = [
  'dashboard/js/pillar-router.js',
  'dashboard/js/pillar-switcher.js',
  'dashboard/css/pillar-switcher.css',
  'dashboard/js/pillar-rails.js',
  'dashboard/css/pillar-rails.css',
  'dashboard/js/role-surface.js',
  'dashboard/css/role-surface.css'
];

const BANNED_SLOP = [
  /\bdelve\b/i,
  /\btestament\b/i,
  /\btapestry\b/i,
  /\bgame[- ]changer\b/i,
  /\bdive into\b/i,
  /\bharness the power\b/i,
  /\bleveraging\b/i,
  /\bseamlessly\b/i
];

NEW_FILES.forEach(filePath => {
  const content = fs.readFileSync(filePath, 'utf8');
  BANNED_SLOP.forEach(regex => {
    assert(!regex.test(content), `AI Slop phrase "${regex}" detected in ${filePath}`);
  });
});
console.log('PASS: Zero AI-slop vocabulary check');

// 3. Node Syntax Verification for all js files in dashboard/js/
const jsFiles = fs.readdirSync('dashboard/js').filter(f => f.endsWith('.js'));
jsFiles.forEach(file => {
  const fullPath = path.join('dashboard/js', file);
  try {
    execSync(`node --check "${fullPath}"`, { stdio: 'pipe' });
  } catch (err) {
    console.error(`SYNTAX ERROR in ${fullPath}`);
    throw err;
  }
});
console.log(`PASS: Node syntax check passed on all ${jsFiles.length} JavaScript files in dashboard/js/`);

console.log('=== ALL TICKET 7 CHECKS PASSED ===');
