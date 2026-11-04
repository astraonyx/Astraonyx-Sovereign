// astraonyx/polaris/shields/index.js — Polaris Security Shields & Auto-Moderation
const virtexShield = require('../../../lib/virtexShield');
const moderationEngine = require('../../../lib/moderationEngine');
const antidelete = require('../../../lib/antidelete');
const welcomeHandler = require('../../../lib/welcomeHandler');

module.exports = {
  virtexShield,
  moderationEngine,
  antidelete,
  welcomeHandler,
};
