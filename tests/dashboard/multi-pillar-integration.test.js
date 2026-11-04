const fs = require('fs');
const assert = require('assert');

// 1. Verify index.html contains links to all new multi-pillar assets
const indexHtml = fs.readFileSync('dashboard/index.html', 'utf8');

assert(indexHtml.includes('css/pillar-switcher.css'), 'index.html must include pillar-switcher.css');
assert(indexHtml.includes('css/pillar-rails.css'), 'index.html must include pillar-rails.css');
assert(indexHtml.includes('css/role-surface.css'), 'index.html must include role-surface.css');

assert(indexHtml.includes('js/pillar-router.js'), 'index.html must include pillar-router.js');
assert(indexHtml.includes('js/pillar-rails.js'), 'index.html must include pillar-rails.js');
assert(indexHtml.includes('js/pillar-switcher.js'), 'index.html must include pillar-switcher.js');
assert(indexHtml.includes('js/role-surface.js'), 'index.html must include role-surface.js');

// 2. Verify all 9 HD icons are used in macro rail
const expectedPillars = ['astraonyx', 'polaris', 'polarium', 'luminary', 'starlium', 'nebula', 'atomic', 'sirium', 'sanctum'];
expectedPillars.forEach(p => {
  assert(indexHtml.includes(`assets/icons/hd/${p}.png`), `Macro rail must include HD icon for ${p}`);
});

// 3. Verify mix-blend-mode: screen is used for rail icons
assert(indexHtml.includes('mix-blend-mode:screen'), 'Macro rail icons must use mix-blend-mode:screen');

// 4. Verify no em-dash or en-dash in new controllers
const filesToCheck = [
  'dashboard/js/pillar-router.js',
  'dashboard/js/pillar-switcher.js',
  'dashboard/js/pillar-rails.js',
  'dashboard/js/role-surface.js',
  'dashboard/css/pillar-switcher.css',
  'dashboard/css/pillar-rails.css',
  'dashboard/css/role-surface.css'
];

filesToCheck.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  assert(!/[\u2014\u2013]/.test(content), `File ${file} must not contain em-dashes or en-dashes`);
});

// 5. Verify Baileys elements exist unregressed
const baileysElements = [
  'qr-container',
  'terminal-body',
  'pane-overview',
  'pane-commands',
  'pane-groups',
  'pane-autoresponder'
];

baileysElements.forEach(id => {
  assert(indexHtml.includes(id), `Baileys element ${id} must remain intact in index.html`);
});

console.log('Ticket 5 Multi-Pillar App Shell Integration Tests PASSED');
