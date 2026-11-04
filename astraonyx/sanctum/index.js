// astraonyx/sanctum/index.js — Sanctum Owner-Only Master Control Pillar
const { handleOpenCvc, handleChPost } = require('../../commands/owner');
const opencocCmd = require('../../commands/opencoc');
const { handleWhitelistCommand } = require('../../commands/whitelist');
const { handleEcosystemCommand } = require('../../commands/ecosystem');
const { handleCleartmp, handleTmpStatus } = require('../../commands/cleanup');
const { handleUpSwCommand, handleDelSwCommand } = require('../../commands/story');

const SANCTUM_COMMAND_NAMES = new Set([
  'opencvc', 'opencoc', 'openvc', 'buka', 'coc',
  'cleartmp', 'tmpstatus',
  'upsw', 'sw', 'postsw', 'story', 'delsw', 'delstatus', 'hapussw',
  'adduser', 'deluser', 'listuser', 'setlevel', 'setowner', 'unsetowner',
  'allowgroup', 'disallowgroup',
  'bindeco', 'synceco', 'inteco', 'listeco',
]);

async function dispatchSanctumCommand(context) {
  const { command, isOwner, reply } = context;
  const cleanCmd = String(command || '').toLowerCase().replace(/^[!./#]/, '');

  if (!SANCTUM_COMMAND_NAMES.has(cleanCmd)) {
    return false;
  }

  // Pengamanan mutlak: Sanctum hanya bisa dieksekusi oleh Owner
  if (!isOwner) {
    if (typeof reply === 'function') {
      await reply('⛔ Akses ditolak. Command ini khusus Owner (Sanctum Pillar).');
    }
    return true;
  }

  // 1. ViewOnce Vault (opencvc / opencoc)
  if (['opencvc', 'openvc', 'buka'].includes(cleanCmd)) {
    await handleOpenCvc(context);
    return true;
  }
  if (['opencoc', 'coc'].includes(cleanCmd)) {
    if (typeof opencocCmd === 'function') {
      await opencocCmd(context);
    } else if (opencocCmd?.handleOpenCoc) {
      await opencocCmd.handleOpenCoc(context);
    }
    return true;
  }

  // 2. Storage & Tmp Diagnostics
  if (cleanCmd === 'cleartmp') {
    await handleCleartmp(context);
    return true;
  }
  if (cleanCmd === 'tmpstatus') {
    await handleTmpStatus(context);
    return true;
  }

  // 3. Status & Story Broadcaster
  if (['upsw', 'sw', 'postsw', 'story'].includes(cleanCmd)) {
    await handleUpSwCommand(context);
    return true;
  }
  if (['delsw', 'delstatus', 'hapussw'].includes(cleanCmd)) {
    await handleDelSwCommand(context);
    return true;
  }

  // 4. Whitelist & Multi-Owner Authority
  if (['adduser', 'deluser', 'listuser', 'setlevel', 'setowner', 'unsetowner'].includes(cleanCmd)) {
    await handleWhitelistCommand(context);
    return true;
  }

  // 5. Ecosystem Federation
  if (['bindeco', 'synceco', 'inteco', 'listeco'].includes(cleanCmd)) {
    await handleEcosystemCommand(context);
    return true;
  }

  return false;
}

module.exports = {
  pillar: 'sanctum',
  name: 'Sanctum Owner-Only Master Control',
  commandNames: SANCTUM_COMMAND_NAMES,
  dispatch: dispatchSanctumCommand,
  handlers: {
    handleOpenCvc,
    handleChPost,
    opencocCmd,
    handleWhitelistCommand,
    handleEcosystemCommand,
    handleCleartmp,
    handleTmpStatus,
    handleUpSwCommand,
    handleDelSwCommand,
  },
};
