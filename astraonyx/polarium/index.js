// astraonyx/polarium/index.js — Polarium Social Media Platform Core
const {
  socialQueries,
  storyQueries,
  dmQueries,
  friendQueries,
  userQueries,
} = require('../shared/database');

module.exports = {
  pillar: 'polarium',
  name: 'Polarium Social Media Platform',
  queries: {
    socialQueries,
    storyQueries,
    dmQueries,
    friendQueries,
    userQueries,
  },
};
