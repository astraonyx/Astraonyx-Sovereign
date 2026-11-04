// astraonyx/polaris/events/index.js — Master Baileys Event Registry for Polaris
const { handleConnectionUpdate } = require('./connectionUpdate');
const { handleContactsAndGroupsUpdate } = require('./contactsUpdate');
const { handleGroupParticipants } = require('./groupParticipantsUpdate');

function registerPolarisEvents(sock, options = {}) {
  // 1. Connection Update (QR, reconnect, open, schedulers)
  handleConnectionUpdate(sock, options);

  // 2. Contacts and Groups Update
  handleContactsAndGroupsUpdate(sock);

  // 3. Group Participants Update (welcome, anti-fake, ecosystem auto-rejoin)
  handleGroupParticipants(sock);
}

module.exports = {
  registerPolarisEvents,
  handleConnectionUpdate,
  handleContactsAndGroupsUpdate,
  handleGroupParticipants,
};
