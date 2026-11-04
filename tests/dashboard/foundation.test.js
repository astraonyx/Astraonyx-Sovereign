const fs = require('fs');
const assert = require('assert');

// Test 1: Tokens font stack complies with Anthropic & Apple standard
const tokensContent = fs.readFileSync('dashboard/css/tokens.css', 'utf8');
assert(!tokensContent.includes('Cormorant Garamond'), 'Must not include Cormorant Garamond');
assert(tokensContent.includes('Instrument Sans') || tokensContent.includes('Inter'), 'Must include Anthropic/Apple standard fonts');

// Test 2: index.html has no em-dashes
const indexHtml = fs.readFileSync('dashboard/index.html', 'utf8');
assert(!/[\u2014\u2013]/.test(indexHtml), 'index.html must not contain em-dash characters');

// Test 3: index.html bloat elements removed
assert(!indexHtml.includes('crt-scanlines-container'), 'crt-scanlines-container must be removed');
assert(!indexHtml.includes('blackhole-loader.js'), 'blackhole-loader script must be removed');

console.log('Ticket 1 Foundation Tests PASSED');
