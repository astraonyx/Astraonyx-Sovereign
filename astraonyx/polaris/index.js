// astraonyx/polaris/index.js — Polaris WhatsApp Bot Platform Core
const { dispatchCommand, isSpamming, reactCommand } = require('./router/commandDispatcher');
const hermes = require('./hermes');
const shields = require('./shields');

module.exports = {
  pillar: 'polaris',
  name: 'Polaris WhatsApp Automation Platform',
  dispatchCommand,
  isSpamming,
  reactCommand,
  hermes,
  shields,
};
