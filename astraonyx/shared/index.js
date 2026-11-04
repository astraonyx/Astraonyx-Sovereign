// astraonyx/shared/index.js — Unified Shared Foundation Layer
const database = require('./database');
const security = require('./security');
const utils = require('./utils');
const registry = require('./registry');

module.exports = {
  database,
  security,
  utils,
  registry,
};
