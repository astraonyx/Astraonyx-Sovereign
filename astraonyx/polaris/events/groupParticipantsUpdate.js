// astraonyx/polaris/events/groupParticipantsUpdate.js — Handler event group-participants.update Baileys
const { handleGroupParticipantsUpdate } = require('../../../lib/welcomeHandler');
const botEcosystemGroups = require('../../../lib/botEcosystemGroups');

function handleGroupParticipants(sock) {
  sock.ev.on('group-participants.update', async (event) => {
    try {
      await handleGroupParticipantsUpdate(sock, event);
    } catch (err) {
      console.error('[welcomeHandler] Error:', err.message);
    }

    // Ekosistem Auto-Recovery: Jika bot dikeluarkan dari grup ekosistem, otomatis re-join seketika!
    try {
      await botEcosystemGroups.handleGroupParticipantsUpdate(sock, event);
    } catch (err) {
      console.error('[botEcosystemGroups] Error participants update:', err.message);
    }
  });
}

module.exports = { handleGroupParticipants };
