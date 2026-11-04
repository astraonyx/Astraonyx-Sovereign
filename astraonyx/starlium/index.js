// astraonyx/starlium/index.js — Starlium Gaming & Gamifikasi Hub
const { handleRankCommand } = require('../../commands/rank');
const { handleRaidCommand } = require('../../commands/raid');
const { handleDuelCommand } = require('../../commands/duel');
const { handleFunCommand } = require('../../commands/fun');

const groupLevelEngine = require('../../lib/groupLevelEngine');
const bossRaidEngine = require('../../lib/bossRaidEngine');
const bossRaidScheduler = require('../../lib/bossRaidScheduler');
const duelEngine = require('../../lib/duelEngine');
const groupFunEngine = require('../../lib/groupFunEngine');

const STARLIUM_COMMAND_NAMES = new Set([
  'playrank', 'rank', 'level', 'xp', 'topchat', 'toprank', 'leaderboard', 'tier', 'tierlist', 'levelinfo',
  'raid', 'boss', 'attack',
  'duel', 'terima', 'tolak', 'suit',
  'truth', 'dare', 'tebakkata', 'caklontong', 'tebaktebakan', 'nyerah', 'spin', 'roll',
]);

async function dispatchStarliumCommand(context) {
  const { command } = context;
  const cleanCmd = String(command || '').toLowerCase().replace(/^[!./#]/, '');

  if (!STARLIUM_COMMAND_NAMES.has(cleanCmd)) {
    return false;
  }

  // 1. RPG Rank, Level, XP
  if (['playrank', 'rank', 'level', 'xp', 'topchat', 'toprank', 'leaderboard', 'tier', 'tierlist', 'levelinfo'].includes(cleanCmd)) {
    await handleRankCommand(context);
    return true;
  }

  // 2. Co-Op Boss Raid
  if (['raid', 'boss', 'attack'].includes(cleanCmd)) {
    await handleRaidCommand(context);
    return true;
  }

  // 3. PVP Duel Suit
  if (['duel', 'terima', 'tolak', 'suit'].includes(cleanCmd)) {
    await handleDuelCommand(context);
    return true;
  }

  // 4. Minigames & Fun Games
  if (['truth', 'dare', 'tebakkata', 'caklontong', 'tebaktebakan', 'nyerah', 'spin', 'roll'].includes(cleanCmd)) {
    await handleFunCommand(context);
    return true;
  }

  return false;
}

module.exports = {
  pillar: 'starlium',
  name: 'Starlium Gaming & Gamifikasi Hub',
  commandNames: STARLIUM_COMMAND_NAMES,
  dispatch: dispatchStarliumCommand,
  handlers: {
    handleRankCommand,
    handleRaidCommand,
    handleDuelCommand,
    handleFunCommand,
  },
  engines: {
    groupLevelEngine,
    bossRaidEngine,
    duelEngine,
    groupFunEngine,
    bossRaidScheduler,
  },
};
