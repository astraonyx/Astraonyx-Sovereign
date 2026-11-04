const assert = require('assert');

global.window = global;
global.document = {
  getElementById(id) {
    if (id === 'role-action-surface') return global._roleElement;
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
      addEventListener(type, fn) {
        if (!this.listeners[type]) this.listeners[type] = [];
        this.listeners[type].push(fn);
      }
    };
  }
};

let mockUser = { username: 'testuser', role: 'moon_sentinel' };
global.PolarisAuth = {
  getCurrentUser() { return mockUser; }
};

// Require role surface
require('../../dashboard/js/role-surface.js');

const surface = global.RoleSurface;
assert(surface, 'RoleSurface should be defined');

// Test Sentinel tier config
const sentinelConfig = surface.getTierConfig('moon_sentinel');
assert(sentinelConfig.ctaLabel, 'Should have ctaLabel');
assert(!sentinelConfig.ctaLabel.includes('\n'), 'CTA label must be single line');
assert(!/[\u2014\u2013]/.test(sentinelConfig.description), 'Must not contain em-dashes');

// Test Cosmos tier config
const cosmosConfig = surface.getTierConfig('cosmos');
assert(cosmosConfig.title.includes('Sovereign'), 'Cosmos tier should have Sovereign in title');
assert(!/[\u2014\u2013]/.test(cosmosConfig.description), 'Cosmos config must not contain em-dashes');

console.log('Ticket 6 RoleSurface Tests PASSED');
