// astraonyx/shared/database/index.js — Shared Database Access Layer
const db = require('../../../server/db');
const dataBridge = require('../../../server/dataBridge');

module.exports = {
  ...db,
  dataBridge,
};
