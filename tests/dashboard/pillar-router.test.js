const assert = require('assert');

// Simulate DOM environment for test
global.window = global;
global.localStorage = {
  store: {},
  getItem(k) { return this.store[k] || null; },
  setItem(k, v) { this.store[k] = String(v); }
};
global.CustomEvent = class CustomEvent {
  constructor(name, opts = {}) {
    this.name = name;
    this.detail = opts.detail || {};
  }
};
global.document = {
  documentElement: {
    setAttribute() {},
    getAttribute() { return null; }
  },
  getElementById() { return null; },
  dispatchEvent(e) {
    if (global._eventListeners[e.name]) {
      global._eventListeners[e.name].forEach(fn => fn(e));
    }
  },
  addEventListener(name, fn) {
    if (!global._eventListeners[name]) global._eventListeners[name] = [];
    global._eventListeners[name].push(fn);
  }
};
global._eventListeners = {};

// Load module
require('../../dashboard/js/pillar-router.js');

const router = window.PillarRouter;
assert(router, 'PillarRouter should be defined on window');

// Test 9 pillars registered
const pillars = router.getPillars();
assert.strictEqual(pillars.length, 9, 'Should have exactly 9 sovereign pillars');

const expectedIds = ['astraonyx', 'polaris', 'polarium', 'luminary', 'atomic', 'nebula', 'starlium', 'sirium', 'sanctum'];
expectedIds.forEach(id => {
  assert(pillars.some(p => p.id === id), `Pillar ${id} must be in registry`);
});

// Test switching
let captured = null;
router.subscribe(event => { captured = event; });

router.switchPillar('luminary');
assert.strictEqual(router.getActivePillar(), 'luminary', 'Active pillar should be luminary');
assert.strictEqual(captured.pillarId, 'luminary', 'Subscriber must receive luminary');
assert.strictEqual(global.localStorage.getItem('astraonyx_active_pillar'), 'luminary', 'localStorage must be updated');

console.log('Ticket 2 PillarRouter Tests PASSED');
