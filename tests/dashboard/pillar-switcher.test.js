const assert = require('assert');

// Setup mock DOM
global.window = global;
global.document = {
  getElementById(id) {
    if (id === 'bottom-pillar-dock') return global._dockElement;
    if (id === 'polaris-app-shell') return { appendChild: (el) => { global._dockElement = el; } };
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
      },
      click() {
        if (this.listeners['click']) {
          this.listeners['click'].forEach(fn => fn({ preventDefault() {} }));
        }
      },
      setAttribute() {},
      querySelector() { return null; },
      querySelectorAll() { return []; }
    };
  },
  body: {
    appendChild(el) { global._dockElement = el; }
  }
};
global.localStorage = { getItem() { return null; }, setItem() {} };

// Mock PillarRouter
let currentPillar = {
  id: 'polaris',
  name: 'Polaris',
  title: 'Bot Hub & Hermetic AI',
  badge: 'Core Bot',
  icon: 'assets/icons/hd/polaris.png'
};
let registeredSub = null;
global.PillarRouter = {
  getActivePillar() { return currentPillar.id; },
  getActivePillarMeta() { return currentPillar; },
  subscribe(fn) { registeredSub = fn; return () => {}; }
};

let orbitToggled = false;
global.toggleOrbitLauncher = () => { orbitToggled = true; };

// Require module
require('../../dashboard/js/pillar-switcher.js');

// Verify dock was mounted
assert(global._dockElement, 'Dock element should be created');
assert.strictEqual(global._dockElement.id, 'bottom-pillar-dock', 'Element id must be bottom-pillar-dock');

// Test click triggers orbit
global._dockElement.click();
assert.strictEqual(orbitToggled, true, 'Clicking bottom dock must trigger toggleOrbitLauncher');

// Test subscriber updates UI
currentPillar = {
  id: 'luminary',
  name: 'Luminary',
  title: 'Cosmic Academy',
  badge: 'Academy & AI',
  icon: 'assets/icons/hd/luminary.png'
};
registeredSub({ pillarId: 'luminary', meta: currentPillar });

console.log('Ticket 3 PillarSwitcher Tests PASSED');
