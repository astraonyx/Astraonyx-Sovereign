// astraonyx/polaris/events/contactsUpdate.js — Handler event contacts dan groups Baileys
const contactsManager = require('../../../lib/contactsManager');
const groupsManager = require('../../../lib/groupsManager');

function handleContactsAndGroupsUpdate(sock) {
  // Listener sinkronisasi kontak WhatsApp
  sock.ev.on('contacts.upsert', (contacts) => {
    contactsManager.recordContactsBatch(contacts);
  });

  sock.ev.on('contacts.update', (updates) => {
    contactsManager.recordContactsBatch(updates);
  });

  // Listener pembaruan nama & info grup WhatsApp
  sock.ev.on('groups.update', async (updates) => {
    try {
      for (const u of updates) {
        if (u.id && u.subject) {
          groupsManager.recordGroup(u.id, u.subject, u);
        }
      }
    } catch (_) {}
  });
}

module.exports = { handleContactsAndGroupsUpdate };
