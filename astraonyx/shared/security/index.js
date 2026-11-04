// astraonyx/shared/security/index.js — Access Control & Security Resolvers
const accessControl = require('../../../lib/accessControl');
const helpers = require('../../../lib/helpers');
const groupSettings = require('../../../lib/groupSettings');
const privateChatSettings = require('../../../lib/privateChatSettings');

module.exports = {
  ...accessControl,
  ...helpers,
  groupSettings,
  privateChatSettings,
};
