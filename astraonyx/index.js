// astraonyx/index.js — Master Umbrella for Astraonyx Ataraxia
const polaris = require('./polaris');
const polarium = require('./polarium');
const luminary = require('./luminary');
const starlium = require('./starlium');
const sanctum = require('./sanctum');
const mori = require('./mori');
const shared = require('./shared');

module.exports = {
  ecosystem: 'Astraonyx Ataraxia',
  pillars: {
    polaris,
    polarium,
    luminary,
    starlium,
    sanctum,
  },
  utility: {
    mori,
  },
  shared,
};
