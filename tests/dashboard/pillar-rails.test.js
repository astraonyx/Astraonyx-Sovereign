const assert = require('assert');

global.window = global;
global.document = {
  getElementById(id) {
    if (id === 'pillar-subnav-rail') return global._railElement;
    return null;
  },
  createElement(tag) {
    return {
      tagName: tag.toUpperCase(),
      id: '',
      className: '',
      innerHTML: '',
      style: {},
      listeners: {},
      attributes: {},
      setAttribute(k, v) { this.attributes[k] = String(v); },
      getAttribute(k) { return this.attributes[k] || null; },
      addEventListener(type, fn) {
        if (!this.listeners[type]) this.listeners[type] = [];
        this.listeners[type].push(fn);
      },
      click() {
        if (this.listeners['click']) {
          this.listeners['click'].forEach(fn => fn({ preventDefault() {} }));
        }
      },
      querySelector() { return null; },
      querySelectorAll() { return []; }
    };
  }
};

// Mock PillarRouter
const callbacks = [];
global.PillarRouter = {
  getActivePillar() { return 'astraonyx'; },
  getActivePillarMeta() {
    return { id: 'astraonyx', name: 'Astraonyx Core', title: 'Sovereign Command Matrix', badge: 'Kernel' };
  },
  subscribe(fn) { callbacks.push(fn); }
};

// Require module
require('../../dashboard/js/pillar-rails.js');

const railEngine = global.PillarRailEngine;
assert(railEngine, 'PillarRailEngine must exist on window');

// Test subroutes for all 9 pillars exist
const registry = railEngine.getSubroutesRegistry();
const keys = Object.keys(registry);
assert.strictEqual(keys.length, 9, 'All 9 pillars must have dedicated sub-routes');

['astraonyx', 'polaris', 'polarium', 'luminary', 'atomic', 'nebula', 'starlium', 'sirium', 'sanctum'].forEach(p => {
  assert(registry[p] && registry[p].length > 0, `Pillar ${p} must have at least 1 sub-route`);
});

// Test rendering for astraonyx
const astraonyxRoutes = registry['astraonyx'];
assert.strictEqual(astraonyxRoutes[0].id, 'matrix');

console.log('Ticket 4 PillarRails Tests PASSED');
