// astraonyx/polaris/hermes/index.js — Hermes Autonomous AI Core for Polaris
const { handleHermesCommand, handleHermesSkillCommand } = require('../../../commands/hermes');
const { handleAiCommand } = require('../../../commands/ai');

const hermesAgent = require('../../../lib/hermesAgent');
const hermesAdaptive = require('../../../lib/hermesAdaptive');
const hermesIntentEngine = require('../../../lib/hermesIntentEngine');
const aiHelper = require('../../../lib/aiHelper');
const hermesManager = require('../../../server/hermesManager');
const skillManager = require('../../../server/skillManager');

const HERMES_COMMAND_NAMES = new Set([
  'hermes', 'hermes-agent', 'hermesclear', 'hermesstatus', 'aistudio', 'astraonyx', 'astraonyxai',
  'ai', 'aiforget',
]);

async function dispatchHermesCommand(context) {
  const { command } = context;
  const cleanCmd = String(command || '').toLowerCase().replace(/^[!./#]/, '');

  if (!HERMES_COMMAND_NAMES.has(cleanCmd)) {
    return false;
  }

  // 1. Hermes Autonomous AI Agent
  if (['hermes', 'hermes-agent', 'hermesclear', 'hermesstatus', 'aistudio', 'astraonyx', 'astraonyxai'].includes(cleanCmd)) {
    await handleHermesCommand(context);
    return true;
  }

  // 2. AI Chat (Gemini + Groq Fallback)
  if (['ai', 'aiforget'].includes(cleanCmd)) {
    await handleAiCommand(context);
    return true;
  }

  return false;
}

module.exports = {
  name: 'Hermes Autonomous AI Core',
  commandNames: HERMES_COMMAND_NAMES,
  dispatch: dispatchHermesCommand,
  handlers: {
    handleHermesCommand,
    handleHermesSkillCommand,
    handleAiCommand,
  },
  engines: {
    hermesAgent,
    hermesAdaptive,
    hermesIntentEngine,
    aiHelper,
    hermesManager,
    skillManager,
  },
};
